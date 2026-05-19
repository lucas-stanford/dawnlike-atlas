import React, { useEffect, useMemo, useState } from 'react';
import { resolveAssetPath } from '../src/utils/paths';

/**
 * AtlasComparison — side-by-side preview of the original 16x16 DawnLike
 * sprites vs the new 2x xBRZ-upscaled mirror at the same physical
 * display size. Helps decide whether the 2x version should become the
 * default everywhere.
 *
 * Each row shows the same set of curated sprites. Both columns render
 * at the same on-screen px size (default 64px) — the left column is the
 * 16px source nearest-neighbour scaled up by CSS; the right column is
 * the 32px xBRZ source displayed at a smaller CSS scale. Differences
 * are the algorithm's, not the resolution's.
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

function Section({ title, names, atlas1x, atlas2x, displayPx }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: '#ddd', font: '600 13px/1.3 -apple-system, system-ui, sans-serif', margin: '0 0 8px' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { label: 'Original 16×16 (nearest-neighbour)', atlas: atlas1x, sheet: '/DawnlikeAtlas0.png' },
          { label: '2× xBRZ-upscaled 32×32',             atlas: atlas2x, sheet: '/DawnlikeAtlas0@2x.png' },
        ].map(col => (
          <div key={col.label}>
            <div style={{ font: '11px -apple-system, system-ui, sans-serif', color: '#999', marginBottom: 6 }}>{col.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, background: '#111', borderRadius: 4 }}>
              {names.map(n => <Cell key={n} atlas={col.atlas} sheet={col.sheet} name={n} displayPx={displayPx} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Page({ displayPx }) {
  const atlas1x = useAtlas('/DawnlikeAtlas.json');
  const atlas2x = useAtlas('/DawnlikeAtlas@2x.json');
  const loaded = atlas1x && atlas2x;
  return (
    <div style={{ padding: 16, background: '#0a0a0a', minHeight: '100vh', color: '#ddd', fontFamily: '-apple-system, system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Atlas comparison: 16×16 vs xBRZ 2× (32×32)</h2>
      <p style={{ color: '#aaa', maxWidth: 800 }}>
        Same sprites side-by-side at the same display size. Left column: the
        original 1024×1040 atlas, nearest-neighbour scaled by CSS. Right column:
        the new 2048×2080 xBRZ-upscaled mirror (atlas/DawnlikeAtlas0@2x.png + atlas/DawnlikeAtlas@2x.json),
        scaled to the same display size — so any visual difference is the
        xBRZ algorithm rounding pixel-art curves and anti-aliasing edges, not
        the resolution itself. Once approved, the 1× atlas will be retired and
        the 2× version becomes the default everywhere.
      </p>
      {!loaded && <p>Loading atlases…</p>}
      {loaded && Object.entries(CURATED).map(([title, names]) => (
        <Section key={title} title={title} names={names} atlas1x={atlas1x} atlas2x={atlas2x} displayPx={displayPx} />
      ))}
    </div>
  );
}

export default {
  title: 'DawnLike/Atlas Comparison',
  parameters: { layout: 'fullscreen' },
  argTypes: {
    displayPx: { control: { type: 'range', min: 32, max: 192, step: 16 }, description: 'Display size per sprite (px)' },
  },
  args: { displayPx: 96 },
};

export const SideBySide = {
  name: '16×16 vs xBRZ 2× (32×32)',
  render: ({ displayPx }) => <Page displayPx={displayPx} />,
};
