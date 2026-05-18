import React, { useState, useEffect, useMemo } from 'react';
import { resolveAssetPath } from './utils/paths';
import './Menu.css';

const TILE = 16;
const SCALE = 3;
const TILE_PX = TILE * SCALE;

// ---------- Sprite primitive ----------
function Sprite({ atlas, name, scale = SCALE, flipY = false, flipX = false, style }) {
  const sprite = atlas?.byName?.[name];
  if (!sprite) return <div style={{ width: TILE * scale, height: TILE * scale, ...style }} />;
  const transform = [
    flipX ? 'scaleX(-1)' : '',
    flipY ? 'scaleY(-1)' : '',
  ].filter(Boolean).join(' ');
  return (
    <div
      style={{
        width: TILE * scale,
        height: TILE * scale,
        backgroundImage: `url(${resolveAssetPath('/DawnlikeAtlas0.png')})`,
        backgroundPosition: `-${sprite.x * scale}px -${sprite.y * scale}px`,
        backgroundSize: `${atlas.meta.size.w * scale}px ${atlas.meta.size.h * scale}px`,
        transform: transform || undefined,
        ...style,
      }}
      title={name}
    />
  );
}

// ---------- 9-slice frame using gray white parts ----------
// Top row uses 'nw n ne' (the title-bar row), middle rows use 'w c e',
// bottom row reuses 'nw n ne' flipped vertically as 'sw s se' (footer bar).
function Frame({ atlas, w, h, scale = SCALE, children, style }) {
  const cells = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const isTop = y === 0;
      const isBot = y === h - 1;
      const isL = x === 0;
      const isR = x === w - 1;
      let part = 'c';
      let flipY = false;
      if (isTop && isL) part = 'nw';
      else if (isTop && isR) part = 'ne';
      else if (isTop) part = 'n';
      else if (isBot && isL) { part = 'nw'; flipY = true; }
      else if (isBot && isR) { part = 'ne'; flipY = true; }
      else if (isBot) { part = 'n'; flipY = true; }
      else if (isL) part = 'w';
      else if (isR) part = 'e';
      cells.push(
        <div
          key={`${x},${y}`}
          style={{
            position: 'absolute',
            left: x * TILE * scale,
            top: y * TILE * scale,
          }}
        >
          <Sprite atlas={atlas} name={`gray white ${part}`} scale={scale} flipY={flipY} />
        </div>
      );
    }
  }
  return (
    <div style={{
      position: 'relative',
      width: w * TILE * scale,
      height: h * TILE * scale,
      ...style,
    }}>
      {cells}
      {children}
    </div>
  );
}

// ---------- HP/MP gauge using gauge chrome + colored fill ----------
// chrome single = standalone 1-tile gauge; chrome left/center/right tiles
// to extend. The colored fill sprites (full/most/half/low) map to four
// levels of bar fullness; we pick one based on the value 0..1.
function Gauge({ atlas, color, value, segments = 4, scale = 2 }) {
  // Pick fill level per segment based on the value
  const segWidth = 1 / segments;
  const fillLevels = ['low', 'half', 'most', 'full'];
  const pickLevel = (segIdx) => {
    const segStart = segIdx * segWidth;
    const segEnd = (segIdx + 1) * segWidth;
    if (value >= segEnd) return 'full';
    if (value <= segStart) return null;
    // Partial fill: map (value - segStart) / segWidth to a level
    const frac = (value - segStart) / segWidth;
    if (frac > 0.75) return 'full';
    if (frac > 0.5) return 'most';
    if (frac > 0.25) return 'half';
    return 'low';
  };

  return (
    <div style={{ position: 'relative', width: segments * TILE * scale, height: TILE * scale }}>
      {/* Fill layer (under the frame) */}
      {Array.from({ length: segments }).map((_, i) => {
        const level = pickLevel(i);
        return (
          <div key={`fill-${i}`} style={{ position: 'absolute', left: i * TILE * scale, top: 0 }}>
            {level && <Sprite atlas={atlas} name={`gauge ${color} ${level}`} scale={scale} />}
          </div>
        );
      })}
      {/* Frame layer (on top) */}
      {Array.from({ length: segments }).map((_, i) => {
        const part = segments === 1
          ? 'single'
          : i === 0 ? 'left' : i === segments - 1 ? 'right' : 'center';
        return (
          <div key={`frame-${i}`} style={{ position: 'absolute', left: i * TILE * scale, top: 0 }}>
            <Sprite atlas={atlas} name={`gauge chrome ${part}`} scale={scale} />
          </div>
        );
      })}
    </div>
  );
}

// ---------- Main menu button: speech-bubble icon + label ----------
function MenuButton({ atlas, iconName, label, onClick, scale = 4 }) {
  return (
    <button className="menu-button" onClick={onClick}>
      <Sprite atlas={atlas} name={iconName} scale={scale} />
      <span className="menu-button-label">{label}</span>
    </button>
  );
}

// ---------- Sample dialogue / character / inventory data ----------
const DIALOGUE = {
  speaker: 'Old Sage',
  portrait: 'ordinary human',
  text: '"Traveler! The northern caves stir with unrest. The lich of Vorn has awoken from his long slumber. Will you aid us?"',
};

const CHARACTER = {
  name: 'Arden',
  klass: 'Knight',
  portrait: 'knight',
  hp: 24, hpMax: 30,
  mp: 12, mpMax: 20,
  str: 17, dex: 12, intel: 9,
  equipped: ['helmet', 'broadsword', 'small shield'],
};

const INVENTORY = [
  ['broadsword', 1], ['small shield', 1], ['helmet', 1],
  ['ruby potion', 3], ['emerald potion', 2], ['yellow potion', 1],
  ['white scroll', 4], ['gray scroll', 1], ['dusty cyan scroll', 1],
  ['pile of copper coins', 14], ['crystal ball', 1], ['bag', 1],
  ['closed chest', 1], ['short sword', 1], ['large shield', 1],
  ['orange potion', 2], ['dark green potion', 1], ['long scroll', 2],
];

// ---------- Modals ----------
function DialogueModal({ atlas, onClose }) {
  return (
    <Frame atlas={atlas} w={14} h={7}>
      <div className="menu-modal-title">Dialogue</div>
      <button className="menu-modal-close" onClick={onClose}>
        <Sprite atlas={atlas} name="cancel box" scale={1.5} />
      </button>
      <div className="menu-modal-content">
        <div className="menu-dialogue">
          <div className="menu-dialogue-portrait">
            <Sprite atlas={atlas} name={DIALOGUE.portrait} scale={4} />
          </div>
          <div className="menu-dialogue-text">
            <div className="menu-dialogue-speaker">{DIALOGUE.speaker}</div>
            {DIALOGUE.text}
          </div>
        </div>
        <div className="menu-dialogue-actions">
          <button className="menu-action-btn" onClick={onClose}>
            <Sprite atlas={atlas} name="confirm box" scale={2} />
            Accept
          </button>
          <button className="menu-action-btn" onClick={onClose}>
            <Sprite atlas={atlas} name="cancel box" scale={2} />
            Decline
          </button>
        </div>
      </div>
    </Frame>
  );
}

function CharacterModal({ atlas, onClose }) {
  return (
    <Frame atlas={atlas} w={14} h={7}>
      <div className="menu-modal-title">Character</div>
      <button className="menu-modal-close" onClick={onClose}>
        <Sprite atlas={atlas} name="cancel box" scale={1.5} />
      </button>
      <div className="menu-modal-content">
        <div className="menu-character">
          <div className="menu-character-portrait">
            <Sprite atlas={atlas} name={CHARACTER.portrait} scale={4} />
            <div className="menu-character-name">{CHARACTER.name}</div>
            <div className="menu-character-class">{CHARACTER.klass}</div>
          </div>
          <div className="menu-character-stats">
            <div className="menu-stat-row">
              <span className="menu-stat-label">HP</span>
              <Gauge atlas={atlas} color="red" value={CHARACTER.hp / CHARACTER.hpMax} segments={5} scale={1.5} />
              <span>{CHARACTER.hp} / {CHARACTER.hpMax}</span>
            </div>
            <div className="menu-stat-row">
              <span className="menu-stat-label">MP</span>
              <Gauge atlas={atlas} color="blue" value={CHARACTER.mp / CHARACTER.mpMax} segments={5} scale={1.5} />
              <span>{CHARACTER.mp} / {CHARACTER.mpMax}</span>
            </div>
            <div className="menu-stat-row" style={{ marginTop: 8 }}>
              <span className="menu-stat-label">STR</span><span>{CHARACTER.str}</span>
              <span className="menu-stat-label" style={{ marginLeft: 16 }}>DEX</span><span>{CHARACTER.dex}</span>
              <span className="menu-stat-label" style={{ marginLeft: 16 }}>INT</span><span>{CHARACTER.intel}</span>
            </div>
            <div className="menu-equipped">
              <span className="menu-equipped-label">Equipped</span>
              {CHARACTER.equipped.map(item => (
                <Sprite key={item} atlas={atlas} name={item} scale={2} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function InventoryModal({ atlas, onClose }) {
  return (
    <Frame atlas={atlas} w={14} h={8}>
      <div className="menu-modal-title">Inventory</div>
      <button className="menu-modal-close" onClick={onClose}>
        <Sprite atlas={atlas} name="cancel box" scale={1.5} />
      </button>
      <div className="menu-modal-content">
        <div className="menu-inventory-grid">
          {INVENTORY.map(([item, count], i) => (
            <div key={i} className="menu-inventory-slot" title={`${item} (${count})`}>
              <Sprite atlas={atlas} name={item} scale={2} />
              {count > 1 && <span className="menu-inventory-count">{count}</span>}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ---------- Main component ----------
export default function MenuExample() {
  const [atlas, setAtlas] = useState(null);
  const [error, setError] = useState(null);
  const [openModal, setOpenModal] = useState(null);
  const [hp] = useState(0.72);
  const [mp] = useState(0.45);

  useEffect(() => {
    fetch(resolveAssetPath('/DawnlikeAtlas.json'))
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.statusText)))
      .then(setAtlas)
      .catch(err => setError(err.message));
  }, []);

  // Close modal on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpenModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (error) return <div style={{ padding: 24, color: 'crimson' }}>Failed to load atlas: {error}</div>;
  if (!atlas) return <div style={{ padding: 24 }}>Loading atlas…</div>;

  return (
    <div className="menu-stage">
      {/* HUD */}
      <div className="menu-hud">
        <div className="menu-hud-row">
          <Sprite atlas={atlas} name="red heart full" scale={2} />
          <Gauge atlas={atlas} color="red" value={hp} segments={6} scale={2} />
          <span className="menu-hud-label">{Math.round(hp * 100)}</span>
        </div>
        <div className="menu-hud-row">
          <Sprite atlas={atlas} name="blue heart full" scale={2} />
          <Gauge atlas={atlas} color="blue" value={mp} segments={6} scale={2} />
          <span className="menu-hud-label">{Math.round(mp * 100)}</span>
        </div>
      </div>

      {/* Title */}
      <div className="menu-title-block">
        <h1 className="menu-title">DAWNLIKE</h1>
        <p className="menu-subtitle">— Press a button to explore —</p>
      </div>

      {/* Main buttons */}
      <div className="menu-buttons">
        <MenuButton atlas={atlas} iconName="talk box" label="Dialogue" onClick={() => setOpenModal('dialogue')} />
        <MenuButton atlas={atlas} iconName="love box" label="Character" onClick={() => setOpenModal('character')} />
        <MenuButton atlas={atlas} iconName="alert box" label="Inventory" onClick={() => setOpenModal('inventory')} />
      </div>

      {/* Modal overlay */}
      {openModal && (
        <div className="menu-modal-backdrop" onClick={() => setOpenModal(null)}>
          <div className="menu-modal" onClick={e => e.stopPropagation()}>
            {openModal === 'dialogue' && <DialogueModal atlas={atlas} onClose={() => setOpenModal(null)} />}
            {openModal === 'character' && <CharacterModal atlas={atlas} onClose={() => setOpenModal(null)} />}
            {openModal === 'inventory' && <InventoryModal atlas={atlas} onClose={() => setOpenModal(null)} />}
          </div>
        </div>
      )}
    </div>
  );
}
