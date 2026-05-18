import React, { useState, useEffect, useMemo, useRef } from 'react';
import { resolveAssetPath } from './utils/paths';
import './Menu.css';

const TILE = 16;
const SCALE = 3;

// =====================================================================
// Primitives
// =====================================================================

function Sprite({ atlas, name, scale = SCALE, flipY = false, flipX = false, style }) {
  const sprite = atlas?.byName?.[name];
  if (!sprite) return <div style={{ width: TILE * scale, height: TILE * scale, ...style }} />;
  const transform = [flipX ? 'scaleX(-1)' : '', flipY ? 'scaleY(-1)' : ''].filter(Boolean).join(' ');
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

// 9-slice frame. The atlas's frame families ('gray white', 'red black', etc.)
// only provide nw/n/ne/w/c/e/square — we flip the top row vertically for the
// bottom corners/edges so we get a clean rectangular border.
function Frame({ atlas, w, h, family = 'gray white', scale = SCALE, children, style }) {
  const cells = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const isTop = y === 0, isBot = y === h - 1, isL = x === 0, isR = x === w - 1;
      let part = 'c', flipY = false;
      if (isTop && isL) part = 'nw';
      else if (isTop && isR) part = 'ne';
      else if (isTop) part = 'n';
      else if (isBot && isL) { part = 'nw'; flipY = true; }
      else if (isBot && isR) { part = 'ne'; flipY = true; }
      else if (isBot) { part = 'n'; flipY = true; }
      else if (isL) part = 'w';
      else if (isR) part = 'e';
      cells.push(
        <div key={`${x},${y}`} style={{ position: 'absolute', left: x * TILE * scale, top: y * TILE * scale }}>
          <Sprite atlas={atlas} name={`${family} ${part}`} scale={scale} flipY={flipY} />
        </div>
      );
    }
  }
  return (
    <div style={{ position: 'relative', width: w * TILE * scale, height: h * TILE * scale, ...style }}>
      {cells}
      {children}
    </div>
  );
}

// Multi-segment gauge: colored fill under chrome frame.
function Gauge({ atlas, color, value, segments = 4, scale = 2 }) {
  const segWidth = 1 / segments;
  const pickLevel = (i) => {
    const segStart = i * segWidth, segEnd = (i + 1) * segWidth;
    if (value >= segEnd) return 'full';
    if (value <= segStart) return null;
    const frac = (value - segStart) / segWidth;
    if (frac > 0.75) return 'full';
    if (frac > 0.5) return 'most';
    if (frac > 0.25) return 'half';
    return 'low';
  };
  return (
    <div style={{ position: 'relative', width: segments * TILE * scale, height: TILE * scale }}>
      {Array.from({ length: segments }).map((_, i) => {
        const level = pickLevel(i);
        return (
          <div key={`f-${i}`} style={{ position: 'absolute', left: i * TILE * scale, top: 0 }}>
            {level && <Sprite atlas={atlas} name={`gauge ${color} ${level}`} scale={scale} />}
          </div>
        );
      })}
      {Array.from({ length: segments }).map((_, i) => {
        const part = segments === 1 ? 'single' : i === 0 ? 'left' : i === segments - 1 ? 'right' : 'center';
        return (
          <div key={`c-${i}`} style={{ position: 'absolute', left: i * TILE * scale, top: 0 }}>
            <Sprite atlas={atlas} name={`gauge chrome ${part}`} scale={scale} />
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// Hooks
// =====================================================================

function useTypewriter(text, speed = 22) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setShown(''); setDone(false);
    if (!text) { setDone(true); return; }
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i >= text.length) {
        setShown(text); setDone(true); clearInterval(id);
      } else {
        setShown(text.slice(0, i));
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  const skip = () => { setShown(text); setDone(true); };
  return { shown, done, skip };
}

// =====================================================================
// Data
// =====================================================================

const DIALOGUE_SCRIPT = [
  { speaker: 'Old Sage', portrait: 'ordinary human', text: '"Traveler! At long last you have come. The wind itself spoke your name."' },
  { speaker: 'Old Sage', portrait: 'ordinary human', text: '"The northern caves stir with unrest. The lich of Vorn has awoken from his thousand-year slumber."' },
  { speaker: 'Old Sage', portrait: 'ordinary human', text: '"Will you take up the silver blade and ride to meet him?"',
    choices: [
      { label: 'Accept the quest', icon: 'confirm box', next: 'accept' },
      { label: 'Tell me more first', icon: 'talk box', next: 'more' },
      { label: 'Decline politely', icon: 'cancel box', next: 'decline' },
    ],
  },
];

const DIALOGUE_BRANCHES = {
  accept: [
    { speaker: 'Old Sage', portrait: 'ordinary human', text: '"Brave soul! Take this blessed scroll — it will guide you through the dark woods."' },
  ],
  more: [
    { speaker: 'Old Sage', portrait: 'ordinary human', text: '"The lich commands an army of bone — skeletons, wraiths, and worse things still."' },
  ],
  decline: [
    { speaker: 'Old Sage', portrait: 'ordinary human', text: '"…Then the world is truly doomed. May the gods forgive your choice."' },
  ],
};

const CHARACTERS = [
  {
    name: 'Arden', klass: 'Knight of Vorn', portrait: 'knight',
    level: 7, xp: 240, xpMax: 400,
    hp: 24, hpMax: 30, mp: 6, mpMax: 12,
    str: 17, dex: 12, intel: 9,
    resists: { fire: 0.4, cold: 0.2, lightning: 0.1, poison: 0.3 },
    abilities: [
      { name: 'Shield Bash', icon: 'small shield' },
      { name: 'Cleave', icon: 'broadsword' },
      { name: 'Rally', icon: 'red heart full' },
    ],
  },
  {
    name: 'Lyra', klass: 'Archmage of Sael', portrait: 'archmage',
    level: 8, xp: 510, xpMax: 600,
    hp: 14, hpMax: 22, mp: 24, mpMax: 28,
    str: 7, dex: 11, intel: 19,
    resists: { fire: 0.6, cold: 0.7, lightning: 0.5, poison: 0.2 },
    abilities: [
      { name: 'Fireball', icon: 'big flame' },
      { name: 'Ice Lance', icon: 'cyan potion' },
      { name: 'Arcane Mist', icon: 'crystal ball' },
    ],
  },
  {
    name: 'Kael', klass: 'Shadow Ninja', portrait: 'ninja',
    level: 6, xp: 180, xpMax: 350,
    hp: 19, hpMax: 24, mp: 10, mpMax: 16,
    str: 13, dex: 18, intel: 11,
    resists: { fire: 0.2, cold: 0.3, lightning: 0.3, poison: 0.5 },
    abilities: [
      { name: 'Backstab', icon: 'short sword' },
      { name: 'Smoke Veil', icon: 'gray scroll' },
      { name: 'Throw Shuriken', icon: 'shuriken' },
    ],
  },
  {
    name: 'Mira', klass: 'High Priestess', portrait: 'priestess',
    level: 7, xp: 320, xpMax: 400,
    hp: 20, hpMax: 26, mp: 18, mpMax: 24,
    str: 9, dex: 12, intel: 16,
    resists: { fire: 0.3, cold: 0.3, lightning: 0.3, poison: 0.6 },
    abilities: [
      { name: 'Heal', icon: 'red heart full' },
      { name: 'Sanctuary', icon: 'white scroll' },
      { name: 'Smite', icon: 'mace' },
    ],
  },
];

const ITEM_DATA = {
  'broadsword':           { name: 'Broadsword',           type: 'Weapon',  desc: 'A trusted steel blade — perfectly balanced.',          stats: '+8 ATK',         value: 120 },
  'short sword':          { name: 'Short Sword',          type: 'Weapon',  desc: 'Light and quick, favoured by scouts.',                stats: '+5 ATK',         value: 60  },
  'small shield':         { name: 'Small Shield',         type: 'Armor',   desc: 'A round wooden shield rimmed with iron.',             stats: '+4 DEF',         value: 80  },
  'large shield':         { name: 'Large Shield',         type: 'Armor',   desc: 'A heavy kite shield. Slows you, but turns a blade.',  stats: '+9 DEF, -1 DEX', value: 180 },
  'helmet':               { name: 'Iron Helm',            type: 'Armor',   desc: 'Plain but reliable head protection.',                 stats: '+2 DEF',         value: 50  },
  'ruby potion':          { name: 'Potion of Healing',    type: 'Potion',  desc: 'Restores a moderate amount of HP.',                   stats: '+25 HP',         value: 40  },
  'emerald potion':       { name: 'Potion of Mana',       type: 'Potion',  desc: 'Replenishes the arcane reserves.',                    stats: '+20 MP',         value: 45  },
  'yellow potion':        { name: 'Potion of Vigor',      type: 'Potion',  desc: 'Grants a surge of strength for one battle.',          stats: '+3 STR (1m)',    value: 90  },
  'orange potion':        { name: 'Potion of Fire Resist',type: 'Potion',  desc: 'Wards the body against flame.',                       stats: '+25% Fire R',    value: 70  },
  'dark green potion':    { name: 'Potion of Antidote',   type: 'Potion',  desc: 'Cleanses poison from the blood.',                     stats: 'Cure Poison',    value: 35  },
  'white scroll':         { name: 'Scroll of Light',      type: 'Scroll',  desc: 'Conjures a sphere of pure light.',                    stats: 'Cast: Light',    value: 25  },
  'gray scroll':          { name: 'Scroll of Smoke',      type: 'Scroll',  desc: 'A veil of grey smoke obscures vision.',               stats: 'Cast: Smoke',    value: 30  },
  'dusty cyan scroll':    { name: 'Scroll of Recall',     type: 'Scroll',  desc: 'Returns you to the last shrine you visited.',         stats: 'Cast: Recall',   value: 200 },
  'long scroll':          { name: 'Map of the Caves',     type: 'Scroll',  desc: 'A weathered parchment marked with the Old Roads.',    stats: 'Reveals Map',    value: 150 },
  'pile of copper coins': { name: 'Copper Coins',         type: 'Misc',    desc: 'A small handful of tarnished coppers.',               stats: 'Currency',       value: 1   },
  'crystal ball':         { name: 'Crystal Ball',         type: 'Misc',    desc: 'Shows shapes in the swirling mists. Sometimes true.', stats: 'Foresight',      value: 800 },
  'bag':                  { name: 'Leather Bag',          type: 'Misc',    desc: 'Doubles your carrying capacity.',                     stats: '+10 slots',      value: 100 },
  'closed chest':         { name: 'Locked Chest',         type: 'Misc',    desc: 'You sense treasure within… if only you had the key.', stats: 'Locked',         value: 0   },
};

const INVENTORY = [
  { id: 'broadsword',           count: 1,  category: 'weapons' },
  { id: 'short sword',          count: 1,  category: 'weapons' },
  { id: 'small shield',         count: 1,  category: 'armor' },
  { id: 'large shield',         count: 1,  category: 'armor' },
  { id: 'helmet',               count: 1,  category: 'armor' },
  { id: 'ruby potion',          count: 3,  category: 'potions' },
  { id: 'emerald potion',       count: 2,  category: 'potions' },
  { id: 'yellow potion',        count: 1,  category: 'potions' },
  { id: 'orange potion',        count: 2,  category: 'potions' },
  { id: 'dark green potion',    count: 1,  category: 'potions' },
  { id: 'white scroll',         count: 4,  category: 'scrolls' },
  { id: 'gray scroll',          count: 1,  category: 'scrolls' },
  { id: 'dusty cyan scroll',    count: 1,  category: 'scrolls' },
  { id: 'long scroll',          count: 2,  category: 'scrolls' },
  { id: 'crystal ball',         count: 1,  category: 'misc' },
  { id: 'bag',                  count: 1,  category: 'misc' },
  { id: 'closed chest',         count: 1,  category: 'misc' },
];

const CATEGORIES = [
  { id: 'all',     label: 'All',     icon: null },
  { id: 'weapons', label: 'Weapons', icon: 'broadsword' },
  { id: 'armor',   label: 'Armor',   icon: 'small shield' },
  { id: 'potions', label: 'Potions', icon: 'ruby potion' },
  { id: 'scrolls', label: 'Scrolls', icon: 'white scroll' },
  { id: 'misc',    label: 'Misc',    icon: 'crystal ball' },
];

const RESIST_COLORS = {
  fire:      { color: 'red',    icon: 'big flame' },
  cold:      { color: 'blue',   icon: 'cyan potion' },
  lightning: { color: 'yellow', icon: 'yellow potion' },
  poison:    { color: 'green',  icon: 'dark green potion' },
};

const MENU_OPTIONS = [
  { id: 'dialogue',  label: 'Speak to the Sage',   icon: 'talk box' },
  { id: 'character', label: 'View Party Roster',   icon: 'love box' },
  { id: 'inventory', label: 'Open Inventory',      icon: 'alert box' },
];

// =====================================================================
// Dialogue modal
// =====================================================================

function DialogueModal({ atlas, onClose, frameFamily = 'gray white' }) {
  const [path, setPath] = useState({ branch: 'main', index: 0 });
  const [choiceIdx, setChoiceIdx] = useState(0);

  const script = path.branch === 'main' ? DIALOGUE_SCRIPT : DIALOGUE_BRANCHES[path.branch];
  const line = script[path.index];
  const { shown, done, skip } = useTypewriter(line?.text || '', 22);

  const isLastInBranch = path.index >= script.length - 1;
  const showChoices = done && line?.choices && line.choices.length > 0;

  const advance = () => {
    if (!done) { skip(); return; }
    if (showChoices) return;
    if (!isLastInBranch) {
      setPath(p => ({ ...p, index: p.index + 1 }));
    } else {
      onClose();
    }
  };

  const pickChoice = (i) => {
    const choice = line.choices[i];
    setPath({ branch: choice.next, index: 0 });
    setChoiceIdx(0);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (showChoices) {
        if (e.key === 'ArrowDown') { setChoiceIdx(i => Math.min(i + 1, line.choices.length - 1)); e.preventDefault(); }
        if (e.key === 'ArrowUp')   { setChoiceIdx(i => Math.max(i - 1, 0)); e.preventDefault(); }
        if (e.key === 'Enter' || e.key === ' ') { pickChoice(choiceIdx); e.preventDefault(); }
      } else {
        if (e.key === 'Enter' || e.key === ' ') { advance(); e.preventDefault(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="menu-dialogue-wrap">
      {/* Name plate above the box */}
      <div className="menu-nameplate">
        <Frame atlas={atlas} w={5} h={2} family="red black" scale={2}>
          <div className="menu-nameplate-text">{line.speaker}</div>
        </Frame>
      </div>

      <Frame atlas={atlas} w={16} h={6} family={frameFamily}>
        <button className="menu-modal-close" onClick={onClose} title="Close (Esc)">
          <Sprite atlas={atlas} name="cancel box" scale={1.5} />
        </button>
        <div className="menu-modal-content menu-modal-content-dialogue" onClick={advance}>
          <div className="menu-dialogue">
            <div className="menu-dialogue-body">
              <div className="menu-dialogue-text pixel-small">
                {shown}
                {!done && <span className="menu-typewriter-caret">|</span>}
              </div>

              {showChoices && (
                <div className="menu-dialogue-choices">
                  {line.choices.map((c, i) => (
                    <button
                      key={c.label}
                      className={`menu-choice${i === choiceIdx ? ' is-selected' : ''}`}
                      onClick={(e) => { e.stopPropagation(); pickChoice(i); }}
                      onMouseEnter={() => setChoiceIdx(i)}
                    >
                      <div className="menu-choice-cursor">
                        {i === choiceIdx && <Sprite atlas={atlas} name="pointer e" scale={1.5} />}
                      </div>
                      <Sprite atlas={atlas} name={c.icon} scale={1.5} />
                      <span className="pixel-small">{c.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {done && !showChoices && (
                <div className="menu-dialogue-continue">
                  <Sprite atlas={atlas} name="pointer s" scale={1.5} />
                </div>
              )}
            </div>
          </div>
        </div>
      </Frame>
    </div>
  );
}

// =====================================================================
// Character / Party modal
// =====================================================================

function StatBar({ atlas, label, value, max = 20, color = 'gray' }) {
  return (
    <div className="menu-statbar-row">
      <span className="menu-statbar-label">{label}</span>
      <Gauge atlas={atlas} color={color} value={value / max} segments={5} scale={1.5} />
      <span className="pixel-small menu-statbar-value">{value}</span>
    </div>
  );
}

function CharacterModal({ atlas, onClose, frameFamily = 'gray white' }) {
  const [selected, setSelected] = useState(0);
  const ch = CHARACTERS[selected];

  return (
    <Frame atlas={atlas} w={18} h={9} family={frameFamily}>
      <div className="menu-modal-title">Party Roster</div>
      <button className="menu-modal-close" onClick={onClose}>
        <Sprite atlas={atlas} name="cancel box" scale={1.5} />
      </button>
      <div className="menu-modal-content">
        <div className="menu-character-tabs">
          {CHARACTERS.map((c, i) => (
            <button
              key={c.name}
              type="button"
              className={`menu-character-tab${i === selected ? ' is-selected' : ''}`}
              onClick={() => setSelected(i)}
              title={`${c.name} — ${c.klass}`}
            >
              <Sprite atlas={atlas} name="brown gray square" scale={2} />
              <div className="menu-character-tab-icon">
                <Sprite atlas={atlas} name={c.portrait} scale={2} />
              </div>
              <div className="menu-character-tab-level pixel-small">Lv {c.level}</div>
            </button>
          ))}
        </div>

        <div className="menu-character">
          <div className="menu-character-portrait-col">
            <div className="menu-character-portrait-frame">
              <Frame atlas={atlas} w={4} h={4} family="white black" scale={2}>
                <div className="menu-character-portrait-inner">
                  <Sprite atlas={atlas} name={ch.portrait} scale={4} />
                </div>
              </Frame>
            </div>
            <div className="menu-character-name">{ch.name}</div>
            <div className="menu-character-class pixel-small">{ch.klass}</div>
            <div className="menu-character-level pixel-small">
              Lv {ch.level} &nbsp;·&nbsp; XP {ch.xp}/{ch.xpMax}
            </div>
            <Gauge atlas={atlas} color="yellow" value={ch.xp / ch.xpMax} segments={5} scale={1.5} />
          </div>

          <div className="menu-character-stats">
            <div className="menu-stat-row">
              <span className="menu-stat-label">HP</span>
              <Gauge atlas={atlas} color="red" value={ch.hp / ch.hpMax} segments={6} scale={2} />
              <span className="pixel-small menu-stat-value">{ch.hp}/{ch.hpMax}</span>
            </div>
            <div className="menu-stat-row">
              <span className="menu-stat-label">MP</span>
              <Gauge atlas={atlas} color="blue" value={ch.mp / ch.mpMax} segments={6} scale={2} />
              <span className="pixel-small menu-stat-value">{ch.mp}/{ch.mpMax}</span>
            </div>

            <div className="menu-section-label pixel-small">Attributes</div>
            <div className="menu-character-attrs">
              <StatBar atlas={atlas} label="STR" value={ch.str} color="red" />
              <StatBar atlas={atlas} label="DEX" value={ch.dex} color="green" />
              <StatBar atlas={atlas} label="INT" value={ch.intel} color="blue" />
            </div>

            <div className="menu-section-label pixel-small">Resistances</div>
            <div className="menu-resists">
              {Object.entries(ch.resists).map(([type, val]) => {
                const { icon } = RESIST_COLORS[type];
                return (
                  <div key={type} className="menu-resist">
                    <Sprite atlas={atlas} name={icon} scale={1.5} />
                    <span className="pixel-small">{Math.round(val * 100)}%</span>
                  </div>
                );
              })}
            </div>

            <div className="menu-section-label pixel-small">Abilities</div>
            <div className="menu-abilities">
              {ch.abilities.map(a => (
                <div key={a.name} className="menu-ability" title={a.name}>
                  <Sprite atlas={atlas} name="brown gray square" scale={2.5} />
                  <div className="menu-ability-icon">
                    <Sprite atlas={atlas} name={a.icon} scale={2} />
                  </div>
                  <span className="menu-ability-label pixel-small">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// =====================================================================
// Inventory modal
// =====================================================================

function InventoryModal({ atlas, onClose, frameFamily = 'gray white' }) {
  const [category, setCategory] = useState('all');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const filtered = useMemo(() => (
    category === 'all' ? INVENTORY : INVENTORY.filter(it => it.category === category)
  ), [category]);

  const selected = filtered[selectedIdx] || filtered[0];
  const selectedData = selected ? ITEM_DATA[selected.id] : null;

  useEffect(() => { setSelectedIdx(0); }, [category]);

  const gold = 1247;

  return (
    <Frame atlas={atlas} w={18} h={9} family={frameFamily}>
      <div className="menu-modal-title">Inventory</div>
      <button className="menu-modal-close" onClick={onClose}>
        <Sprite atlas={atlas} name="cancel box" scale={1.5} />
      </button>
      <div className="menu-modal-content">
        <div className="menu-inv-header">
          <div className="menu-inv-tabs">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                className={`menu-inv-tab${c.id === category ? ' is-selected' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.icon && <Sprite atlas={atlas} name={c.icon} scale={1.5} />}
                <span className="pixel-small">{c.label}</span>
              </button>
            ))}
          </div>
          <div className="menu-inv-gold">
            <Sprite atlas={atlas} name="gold coin" scale={2} />
            <span className="pixel-small">{gold} g</span>
          </div>
        </div>

        <div className="menu-inv-body">
          <div className="menu-inventory-grid">
            {filtered.map((it, i) => (
              <button
                key={it.id}
                className={`menu-inventory-slot${i === selectedIdx ? ' is-selected' : ''}`}
                onClick={() => setSelectedIdx(i)}
                title={ITEM_DATA[it.id]?.name || it.id}
              >
                <Sprite atlas={atlas} name="brown gray square" scale={2} />
                <div className="menu-inventory-slot-item">
                  <Sprite atlas={atlas} name={it.id} scale={2} />
                </div>
                {it.count > 1 && <span className="menu-inventory-count">{it.count}</span>}
              </button>
            ))}
            {Array.from({ length: Math.max(0, 32 - filtered.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="menu-inventory-slot is-empty">
                <Sprite atlas={atlas} name="brown gray square" scale={2} />
              </div>
            ))}
          </div>

          <div className="menu-inv-detail">
            {selectedData ? (
              <>
                <div className="menu-inv-detail-head">
                  <Frame atlas={atlas} w={3} h={3} family="white black" scale={2}>
                    <div className="menu-inv-detail-icon">
                      <Sprite atlas={atlas} name={selected.id} scale={2} />
                    </div>
                  </Frame>
                  <div className="menu-inv-detail-head-text">
                    <div className="menu-inv-detail-name">{selectedData.name}</div>
                    <div className="menu-inv-detail-type pixel-small">{selectedData.type}</div>
                  </div>
                </div>
                <div className="menu-inv-detail-desc pixel-small">{selectedData.desc}</div>
                <div className="menu-inv-detail-stats pixel-small">
                  <span>{selectedData.stats}</span>
                  <span>·</span>
                  <span>{selectedData.value} g</span>
                </div>
                <div className="menu-inv-actions">
                  <button className="menu-action-btn">
                    <Sprite atlas={atlas} name="confirm box" scale={2} />
                    <span>Use</span>
                  </button>
                  <button className="menu-action-btn">
                    <Sprite atlas={atlas} name="yes box" scale={2} />
                    <span>Equip</span>
                  </button>
                  <button className="menu-action-btn">
                    <Sprite atlas={atlas} name="cancel box" scale={2} />
                    <span>Drop</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="menu-inv-empty pixel-small">No items in this category.</div>
            )}
          </div>
        </div>
      </div>
    </Frame>
  );
}

// =====================================================================
// Helpers for HUD
// =====================================================================

const HP_STEP = 1 / 6;

function heartSprite(color, value) {
  if (value >= 0.7) return `${color} heart full`;
  if (value >= 0.4) return `${color} heart half`;
  if (value >= 0.2) return `${color} heart low`;
  if (value > 0)    return `${color} heart sliver`;
  return `${color} heart sliver`;
}

function cycleDown(v) {
  const next = +(v - HP_STEP).toFixed(4);
  return next <= 0.001 ? 1 : next;
}

// Curated 9-slice frame families from the atlas that read well as menu chrome.
// Each is "<border> <interior>" — passed as the `family` prop to <Frame>.
export const FRAME_FAMILIES = [
  'gray white',
  'white black',
  'black yellow',
  'yellow black',
  'red black',
  'red green',
  'green red',
  'green black',
  'green blue',
  'blue black',
  'brown black',
  'brown gray',
  'brown dark',
  'dark brown',
  'dark black',
  'gray black',
];

// =====================================================================
// Main component
// =====================================================================

export default function MenuExample({ frameFamily = 'gray white' }) {
  const [atlas, setAtlas] = useState(null);
  const [error, setError] = useState(null);
  const [openModal, setOpenModal] = useState(null);
  const [hp, setHp] = useState(1);
  const [mp, setMp] = useState(1);
  const [menuIdx, setMenuIdx] = useState(0);

  useEffect(() => {
    fetch(resolveAssetPath('/DawnlikeAtlas.json'))
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.statusText)))
      .then(setAtlas)
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpenModal(null); return; }
      if (openModal) return;
      if (e.key === 'ArrowDown') { setMenuIdx(i => (i + 1) % MENU_OPTIONS.length); e.preventDefault(); }
      if (e.key === 'ArrowUp')   { setMenuIdx(i => (i - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length); e.preventDefault(); }
      if (e.key === 'Enter' || e.key === ' ') { setOpenModal(MENU_OPTIONS[menuIdx].id); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openModal, menuIdx]);

  if (error) return <div style={{ padding: 24, color: 'crimson' }}>Failed to load atlas: {error}</div>;
  if (!atlas) return <div style={{ padding: 24 }}>Loading atlas…</div>;

  return (
    <div className="menu-stage">
      {/* Atmospheric decorations */}
      <div className="menu-deco menu-deco-tr">
        <Sprite atlas={atlas} name="magic dragon skull" scale={3} />
      </div>
      <div className="menu-deco menu-deco-tl-far">
        <Sprite atlas={atlas} name="old skull" scale={2} />
      </div>
      <div className="menu-deco menu-deco-bl">
        <Sprite atlas={atlas} name="candle pair" scale={3} />
        <div className="menu-deco-flame"><Sprite atlas={atlas} name="little flame" scale={2} /></div>
      </div>
      <div className="menu-deco menu-deco-br">
        <Sprite atlas={atlas} name="candle pair" scale={3} />
        <div className="menu-deco-flame menu-deco-flame-br"><Sprite atlas={atlas} name="little flame" scale={2} /></div>
      </div>
      <div className="menu-deco menu-deco-bottom-center">
        <Sprite atlas={atlas} name="old bones" scale={3} />
      </div>

      {/* HUD */}
      <div className="menu-hud">
        <button
          type="button"
          className="menu-hud-row menu-hud-button"
          onClick={() => setHp(cycleDown)}
          title="Click to drain HP"
        >
          <Sprite atlas={atlas} name={heartSprite('red', hp)} scale={2} />
          <Gauge atlas={atlas} color="red" value={hp} segments={6} scale={2} />
          <span className="menu-hud-label">{Math.round(hp * 100)}</span>
        </button>
        <button
          type="button"
          className="menu-hud-row menu-hud-button"
          onClick={() => setMp(cycleDown)}
          title="Click to drain MP"
        >
          <Sprite atlas={atlas} name={heartSprite('blue', mp)} scale={2} />
          <Gauge atlas={atlas} color="blue" value={mp} segments={6} scale={2} />
          <span className="menu-hud-label">{Math.round(mp * 100)}</span>
        </button>
      </div>

      {/* Title with skull motifs */}
      <div className="menu-title-block">
        <div className="menu-title-row">
          <Sprite atlas={atlas} name="old skull" scale={3} style={{ transform: 'scaleX(-1)' }} />
          <h1 className="menu-title">DAWNLIKE</h1>
          <Sprite atlas={atlas} name="old skull" scale={3} />
        </div>
        <p className="menu-subtitle pixel-small">Tales from the Lost Kingdom</p>
      </div>

      {/* Vertical menu list with pointer cursor */}
      <div className="menu-options">
        {MENU_OPTIONS.map((opt, i) => (
          <button
            key={opt.id}
            className={`menu-option${i === menuIdx ? ' is-selected' : ''}`}
            onClick={() => setOpenModal(opt.id)}
            onMouseEnter={() => setMenuIdx(i)}
          >
            <div className="menu-option-cursor">
              {i === menuIdx && <Sprite atlas={atlas} name="pointer e" scale={2} />}
            </div>
            <Sprite atlas={atlas} name={opt.icon} scale={3} />
            <span className="menu-option-label">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="menu-hint pixel-small">↑ ↓ to navigate · Enter to select · Esc to close</div>

      {/* Modal overlay */}
      {openModal && (
        <div className="menu-modal-backdrop" onClick={() => setOpenModal(null)}>
          <div className="menu-modal" onClick={(e) => e.stopPropagation()}>
            {openModal === 'dialogue'  && <DialogueModal  atlas={atlas} frameFamily={frameFamily} onClose={() => setOpenModal(null)} />}
            {openModal === 'character' && <CharacterModal atlas={atlas} frameFamily={frameFamily} onClose={() => setOpenModal(null)} />}
            {openModal === 'inventory' && <InventoryModal atlas={atlas} frameFamily={frameFamily} onClose={() => setOpenModal(null)} />}
          </div>
        </div>
      )}
    </div>
  );
}
