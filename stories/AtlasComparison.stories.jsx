import React, { useEffect, useState } from 'react';
import { resolveAssetPath } from '../src/utils/paths';

/**
 * AtlasComparison — verifies that the 2x atlas mirror preserves the
 * original pixelated DawnLike look while giving us 2x source pixels.
 *
 * Three columns per row:
 *   1. Original 16x16 atlas at native size (16px display)
 *   2. Original 16x16 atlas CSS-scaled to 32px (image-rendering: pixelated)
 *   3. New 32x32 mirror at native size (32px display)
 *
 * Columns 2 and 3 should look IDENTICAL — that's the whole point of
 * the nearest-neighbour upscale: 1 source pixel becomes a clean 2x2
 * block, indistinguishable from CSS pixelated scaling. Column 1 is
 * the "true" original at the size it's drawn at.
 */

const CURATED = {
  Characters: ['knight', 'wizard', 'priest', 'ranger', 'dwarf knight', 'orc knight', 'gnome wizard'],
  Creatures:  ['wolf', 'werewolf', 'lava demon', 'water demon', 'hill orc', 'jellyfish', 'fighting fish', 'catfish'],
  Weapons:    ['longbow', 'crossbow', 'broadsword', 'shortbow', 'spear', 'orcish spear', 'silver spear'],
  Potions:    ['ruby potion', 'cyan potion', 'emerald potion', 'magenta potion', 'sky blue potion', 'orange potion'],
  Armor:      ['sphinx armor', 'wyvern armor', 'firedrake armor', 'darkwyrm armor'],
  World:      ['altar', 'fountain', 'statue', 'mounted statue', 'bloodied altar'],
  Signs:      ['inn sign', 'church sign', 'smithy sign', 'empty shop sign', 'spooky sign', 'pub sign', 'restaurant sign'],
};

function getFrame(atlas, name) {
  const f = atlas?.frames?.[name];
  if (!f) return null;
  return { x: f.frame.x, y: f.frame.y, w: f.frame.w, h: f.frame.h };
}

function Cell({ atlas, sheet, name, displayPx }) {
  const sprite = getFrame(atlas, name);
  if (!sprite) {
    return (
      <div style={{
        width: displayPx, height: displayPx,
        background: '#222', color: '#666',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, textAlign: 'center', padding: 2,
      }} title={name}>missing<br/>{name}</div>
    );
  }
  const scaleX = displayPx / sprite.w;
  const scaleY = displayPx / sprite.h;
  return (
    <div
      title={`${name} (atlas ${sprite.w}×${sprite.h}px → ${displayPx}px display)`}
      style={{
        width: displayPx,
        height: displayPx,
        backgroundImage: `url(${resolveAssetPath(sheet)})`,
        backgroundPosition: `-${sprite.x * scaleX}px -${sprite.y * scaleY}px`,
        backgroundSize: `${atlas.meta.size.w * scaleX}px ${atlas.meta.size.h * scaleY}px`,
        imageRendering: 'pixelated',
      }}
    />
  );
}

function useAtlas(jsonPath) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(resolveAssetPath(jsonPath))
      .then(r => r.json())
      .then(setData)
      .catch(e => console.error('atlas load failed', jsonPath, e));
  }, [jsonPath]);
  return data;
}

function Section({ title, names, atlas1x, atlas2x }) {
  const cols = [
    { label: 'Original 16×16 (native 16px)',                 atlas: atlas1x, sheet: '/DawnlikeAtlas0.png',     displayPx: 16 },
    { label: 'Original 16×16 → CSS scaled 32px (pixelated)', atlas: atlas1x, sheet: '/DawnlikeAtlas0.png',     displayPx: 32 },
    { label: 'New 32×32 @2x (native 32px)',                  atlas: atlas2x, sheet: '/DawnlikeAtlas0@2x.png', displayPx: 32 },
  ];
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: '#ddd', font: '600 13px/1.3 -apple-system, system-ui, sans-serif', margin: '0 0 8px' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {cols.map(col => (
          <div key={col.label}>
            <div style={{ font: '11px -apple-system, system-ui, sans-serif', color: '#999', marginBottom: 6 }}>{col.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, background: '#111', borderRadius: 4 }}>
              {names.map(n => <Cell key={n} atlas={col.atlas} sheet={col.sheet} name={n} displayPx={col.displayPx} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Page() {
  const atlas1x = useAtlas('/DawnlikeAtlas.json');
  const atlas2x = useAtlas('/DawnlikeAtlas@2x.json');
  const loaded = atlas1x && atlas2x;
  return (
    <div style={{ padding: 16, background: '#0a0a0a', minHeight: '100vh', color: '#ddd', fontFamily: '-apple-system, system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Atlas comparison: 16×16 → nearest-neighbour 2× (32×32)</h2>
      <p style={{ color: '#aaa', maxWidth: 800 }}>
        The new <code>@2x</code> atlas is a strict nearest-neighbour upscale: every source
        pixel becomes a clean 2×2 block, preserving the pixelated DawnLike
        look exactly. Column 1 is the original drawn at its native size.
        Columns 2 and 3 should look identical — column 2 is the original
        CSS-scaled to 32px with <code>image-rendering: pixelated</code>; column 3 is
        the new 32×32 mirror displayed at native 32px size. The benefit of
        the 2× mirror is that engines that don't handle pixelated CSS
        scaling cleanly (or want crisp output on HiDPI displays) can render
        at 1 atlas-pixel ≡ 1 screen-pixel and still get the doubled
        pixel-art look.
      </p>
      {!loaded && <p>Loading atlases…</p>}
      {loaded && Object.entries(CURATED).map(([title, names]) => (
        <Section key={title} title={title} names={names} atlas1x={atlas1x} atlas2x={atlas2x} />
      ))}
    </div>
  );
}

export default {
  title: 'DawnLike/Atlas Comparison',
  parameters: { layout: 'fullscreen' },
};

export const SideBySide = {
  name: '16×16 vs nearest-neighbour 2× (32×32)',
  render: () => <Page />,
};

