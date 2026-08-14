/**
 * ComponentsExample — live gallery of the components the npm package
 * exports.
 *
 * The zone examples show what you can *build*; this one shows what you
 * get *for free* when you `npm install dawnlike-atlas`. Every panel
 * below renders the real exported component with the props printed
 * beside it, so it doubles as the visual test for the package surface.
 *
 * The one thing worth internalising: there are two families of sprite
 * component and they address sprites differently.
 *
 *   <AtlasSprite name="wizard" />   — by NAME, via DawnlikeAtlas.json
 *   <Sprite frame={447} cols={64} /> — by INDEX, on any uniform grid
 *
 * Use the first for the mega-atlas; use the second for any other
 * spritesheet you happen to have, including DawnLike's separate 16×16
 * GUI sheet.
 */

import React, { useState } from 'react';
import {
  useAtlas,
  AtlasSprite,
  AtlasTileMap,
  Sprite,
  AnimatedSprite,
} from '../react/index.js';
import { spriteCell, hasSprite, searchSprites } from './utils/atlasApi';
import { resolveAssetPath } from './utils/paths';
import './Components.css';

const ATLAS_URL = resolveAssetPath('/DawnlikeAtlas.json');
const BASE_PATH = resolveAssetPath('/');

/** A hand-built room, as a row-major grid of names (or layer stacks). */
const ROOM = [
  ['dark brick wall right down', 'dark brick wall left right', 'dark brick wall left right', 'dark brick wall left right', 'dark brick wall left down'],
  ['dark brick wall up down', ['dusk brick floor c', 'wizard'], 'dusk brick floor c', ['dusk brick floor c', 'red cap mushroom'], 'dark brick wall up down'],
  ['dark brick wall up down', 'dusk brick floor c', ['dusk brick floor c', 'skull'], 'dusk brick floor c', 'dark brick wall up down'],
  ['dark brick wall right up', 'dark brick wall left right', 'dark brick wall left right', 'dark brick wall left right', 'dark brick wall left up'],
];

/** Health rendered from the atlas's own GUI sprites, 2 HP per heart. */
function HeartRow({ atlas, current, max }) {
  const hearts = [];
  for (let i = 0; i < Math.ceil(max / 2); i++) {
    const remaining = current - i * 2;
    const name =
      remaining >= 2 ? 'red heart full'
      : remaining === 1 ? 'red heart half'
      : 'red heart sliver';
    hearts.push(
      <AtlasSprite
        key={i}
        atlas={atlas}
        name={name}
        scale={2}
        basePath={BASE_PATH}
        style={{ opacity: remaining > 0 ? 1 : 0.25 }}
      />,
    );
  }
  return <div className="cg-row">{hearts}</div>;
}

/** A chrome-framed gauge, assembled from the left / center / right pieces. */
function Gauge({ atlas, fill, colour = 'red', width = 8 }) {
  const filled = Math.round(fill * width);
  const level = (i) => (i < filled ? `gauge ${colour} full` : 'gauge chrome center');
  return (
    <div className="cg-row cg-gauge">
      <AtlasSprite atlas={atlas} name="gauge chrome left" scale={2} basePath={BASE_PATH} />
      {Array.from({ length: width }).map((_, i) => (
        <AtlasSprite key={i} atlas={atlas} name={level(i)} scale={2} basePath={BASE_PATH} />
      ))}
      <AtlasSprite atlas={atlas} name="gauge chrome right" scale={2} basePath={BASE_PATH} />
    </div>
  );
}

export default function ComponentsExample({
  sprite: spriteProp = 'wizard',
  scale: scaleProp = 3,
  animated: animatedProp = true,
} = {}) {
  const { atlas, loading, error } = useAtlas(ATLAS_URL);
  const [hp, setHp] = useState(7);

  if (error) return <div className="cg-root"><p>Failed to load the atlas: {String(error.message)}</p></div>;
  if (loading) return <div className="cg-root"><p>Loading atlas…</p></div>;

  const name = hasSprite(atlas, spriteProp) ? spriteProp : 'wizard';

  // The generic <Sprite> addresses frames by index on a uniform grid.
  // The mega-atlas IS a uniform grid, so `spriteCell` converts a name
  // into the index that component wants — handy when you're porting
  // frame-indexed code onto the atlas.
  const cell = spriteCell(atlas, name);

  // A handful of animated sprites for the frame-cycling demo.
  const walkers = searchSprites(atlas, { tags: ['creature'], animated: true, limit: 8 })
    .map((r) => spriteCell(atlas, r.name).index);

  return (
    <div className="cg-root">
      <header className="cg-header">
        <h1>Package components</h1>
        <p>
          Everything on this page is a component exported from{' '}
          <code>dawnlike-atlas</code>, rendered with the props shown beside it.
        </p>
      </header>

      <section className="cg-panel">
        <h2>&lt;AtlasSprite&gt; — by name</h2>
        <p className="cg-hint">
          The atlas-aware sprite. Pass the parsed atlas and a key from{' '}
          <code>atlas.byName</code>; it handles the packing maths, the scale, and
          the two-frame flip. <code>animated</code> is a no-op on sprites the
          atlas doesn't flag, so it is safe to set globally.
        </p>
        <div className="cg-demo">
          <div className="cg-row cg-row-baseline">
            {[1, 2, 3, 4, 6].map((s) => (
              <figure key={s}>
                <AtlasSprite
                  atlas={atlas}
                  name={name}
                  scale={s}
                  animated={animatedProp}
                  basePath={BASE_PATH}
                />
                <figcaption>scale={s}</figcaption>
              </figure>
            ))}
          </div>
          <pre>{`<AtlasSprite atlas={atlas} name="${name}" scale={${scaleProp}}${animatedProp ? ' animated' : ''} />`}</pre>
        </div>
      </section>

      <section className="cg-panel">
        <h2>&lt;AtlasTileMap&gt; — a grid of names</h2>
        <p className="cg-hint">
          Each cell is a name, an array of names drawn bottom-to-top as layers,
          or <code>null</code>. Useful for hand-authored rooms, tutorial maps
          and tests — anywhere a full generator would be overkill.
        </p>
        <div className="cg-demo">
          <AtlasTileMap
            atlas={atlas}
            tiles={ROOM}
            scale={2}
            animated={animatedProp}
            basePath={BASE_PATH}
          />
          <pre>{`<AtlasTileMap atlas={atlas} scale={2} tiles={[
  ['dark brick wall right down', …],
  ['dark brick wall up down', ['dusk brick floor c', 'wizard'], …],
]} />`}</pre>
        </div>
      </section>

      <section className="cg-panel">
        <h2>&lt;Sprite&gt; and &lt;AnimatedSprite&gt; — by frame index</h2>
        <p className="cg-hint">
          The generic components, for any uniform-grid spritesheet. The mega
          atlas is one such grid (64 columns of 32px), so{' '}
          <code>spriteCell(atlas, name).index</code> bridges the two addressing
          styles.
        </p>
        <div className="cg-demo">
          <div className="cg-row cg-row-baseline">
            <figure>
              <Sprite
                src={`${BASE_PATH}DawnlikeAtlas0.png`}
                frame={cell.index}
                cols={atlas.meta.columns}
                size={atlas.meta.tile.w}
                scale={scaleProp}
              />
              <figcaption>&lt;Sprite&gt;</figcaption>
            </figure>
            <figure>
              <AnimatedSprite
                src={`${BASE_PATH}DawnlikeAtlas0.png`}
                frames={walkers}
                fps={3}
                cols={atlas.meta.columns}
                size={atlas.meta.tile.w}
                scale={scaleProp}
              />
              <figcaption>&lt;AnimatedSprite&gt;</figcaption>
            </figure>
          </div>
          <pre>{`const { index } = spriteCell(atlas, '${name}');   // → ${cell.index}

<Sprite src="DawnlikeAtlas0.png" frame={index}
        cols={${atlas.meta.columns}} size={${atlas.meta.tile.w}} scale={${scaleProp}} />`}</pre>
        </div>
      </section>

      <section className="cg-panel">
        <h2>A HUD, from atlas sprites</h2>
        <p className="cg-hint">
          The mega atlas contains DawnLike's GUI sprites too — hearts, chrome
          gauge pieces, icons — so a HUD needs no extra sheet. This one is 30
          lines of <code>&lt;AtlasSprite&gt;</code> (see{' '}
          <code>src/ComponentsExample.jsx</code>).
        </p>
        <div className="cg-demo cg-hud">
          <HeartRow atlas={atlas} current={hp} max={10} />
          <Gauge atlas={atlas} fill={hp / 10} colour="red" />
          <Gauge atlas={atlas} fill={0.6} colour="blue" />
          <div className="cg-row">
            <button type="button" onClick={() => setHp((v) => Math.max(0, v - 1))}>Damage</button>
            <button type="button" onClick={() => setHp((v) => Math.min(10, v + 1))}>Heal</button>
            <span className="cg-count">{hp} / 10 HP</span>
          </div>
        </div>
      </section>

      <section className="cg-panel">
        <h2>Also exported</h2>
        <p className="cg-hint">
          <code>HoverSprite</code>, <code>PulsingSprite</code>,{' '}
          <code>SpriteIcon</code>, <code>StatBar</code>,{' '}
          <code>NineSlicePanel</code>, <code>PixelButton</code>,{' '}
          <code>IconButton</code>, and the DawnLike GUI helpers{' '}
          <code>HealthBar</code>, <code>ManaBar</code>,{' '}
          <code>DawnLikeIcon</code>. Those last ones render DawnLike's{' '}
          <strong>separate 16×16 GUI spritesheet</strong>, which is not bundled
          here — pass your own <code>src</code> / <code>glowSrc</code>. For a HUD
          built only from what ships in this repo, use the atlas GUI sprites as
          shown above.
        </p>
      </section>
    </div>
  );
}
