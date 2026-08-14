import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  loadAtlas,
  getSprite,
  spriteStyle,
  ATLAS_JSON,
} from '../../src/utils/atlasApi.js';

/**
 * useAtlas — load DawnlikeAtlas.json once and share it across components.
 *
 * Backed by the module-level cache in `atlasApi.loadAtlas`, so mounting
 * fifty `<AtlasSprite>`s issues exactly one network request.
 *
 * @param {string} [url] - URL of the atlas JSON (default 'DawnlikeAtlas.json')
 * @returns {{atlas: object|null, loading: boolean, error: Error|null}}
 *
 * @example
 * const { atlas, loading } = useAtlas('/atlas/DawnlikeAtlas.json');
 * if (loading) return <Spinner />;
 * return <AtlasSprite atlas={atlas} name="wizard" scale={3} />;
 */
export function useAtlas(url = ATLAS_JSON) {
  const [state, setState] = useState({ atlas: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => (prev.loading ? prev : { ...prev, loading: true }));
    loadAtlas(url)
      .then((atlas) => {
        if (!cancelled) setState({ atlas, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ atlas: null, loading: false, error });
      });
    return () => { cancelled = true; };
  }, [url]);

  return state;
}

/**
 * AtlasSprite — render one DawnLike sprite **by semantic name**.
 *
 * This is the name-addressed counterpart to `<Sprite>` (which addresses
 * frames by numeric index). Pass the loaded atlas and a name from
 * `atlas.byName` and the component does the packing math for you.
 *
 * Sprites flagged `isAnimated` in the atlas have a second frame on
 * `DawnlikeAtlas1.png`; set `animated` to flip between the two sheets at
 * `fps`, which is DawnLike's signature 2-frame idle. Static sprites
 * ignore the flag, so it is safe to set globally.
 *
 * @param {object}  atlas       - parsed DawnlikeAtlas.json (see `useAtlas`)
 * @param {string}  name        - key into `atlas.byName`, e.g. 'wizard'
 * @param {number}  [scale=1]   - integer render scale; 32px cells × scale
 * @param {boolean} [animated]  - flip to sheet 1 for animated sprites
 * @param {number}  [fps=4]     - flip rate when animating
 * @param {string}  [basePath]  - prefix for the sheet PNG URLs
 * @param {string}  [title]     - tooltip / accessible label
 * @param {function}[onClick]
 *
 * @example
 * <AtlasSprite atlas={atlas} name="fighting fish" scale={2} animated />
 */
export function AtlasSprite({
  atlas,
  name,
  scale = 1,
  animated = false,
  fps = 4,
  basePath = '',
  className = '',
  style = {},
  title,
  onClick,
  ...props
}) {
  const sprite = getSprite(atlas, name);
  const shouldAnimate = animated && Boolean(sprite?.isAnimated) && fps > 0;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) {
      setFrame(0);
      return undefined;
    }
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 1000 / fps);
    return () => clearInterval(id);
  }, [shouldAnimate, fps]);

  const css = useMemo(
    () => spriteStyle(atlas, name, { scale, frame, basePath }),
    [atlas, name, scale, frame, basePath],
  );

  // Unknown name → render nothing rather than an empty box, so a typo
  // is visible as a hole instead of a mystery blank tile.
  if (!css) return null;

  return (
    <div
      className={`dawnlike-atlas-sprite ${className}`.trim()}
      title={title ?? name}
      role={onClick ? 'button' : 'img'}
      aria-label={title ?? name}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : undefined}
      style={{
        display: 'inline-block',
        cursor: onClick ? 'pointer' : undefined,
        ...css,
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * AtlasTileMap — render a rectangular grid of named sprites.
 *
 * A thin convenience over `<AtlasSprite>` for the extremely common case
 * of "I have a 2D array of sprite names and want to see the map". Each
 * cell may be a single name, an array of names (drawn bottom-to-top as
 * layers), or null/undefined for an empty cell.
 *
 * @param {object}   atlas
 * @param {Array<Array<string|string[]|null>>} tiles - row-major grid
 * @param {number}   [scale=1]
 * @param {boolean}  [animated]
 * @param {string}   [basePath]
 * @param {function} [onTileClick] - called with ({x, y, names})
 *
 * @example
 * <AtlasTileMap atlas={atlas} scale={2} tiles={[
 *   ['dark brick wall left right', 'dark brick wall left right'],
 *   ['dusk brick floor c',        ['dusk brick floor c', 'wizard']],
 * ]} />
 */
export function AtlasTileMap({
  atlas,
  tiles = [],
  scale = 1,
  animated = false,
  basePath = '',
  className = '',
  style = {},
  onTileClick,
  ...props
}) {
  const tileW = (atlas?.meta?.tile?.w ?? 32) * scale;
  const tileH = (atlas?.meta?.tile?.h ?? 32) * scale;
  const cols = tiles.reduce((max, row) => Math.max(max, row?.length ?? 0), 0);

  return (
    <div
      className={`dawnlike-atlas-tilemap ${className}`.trim()}
      style={{
        position: 'relative',
        width: cols * tileW,
        height: tiles.length * tileH,
        imageRendering: 'pixelated',
        ...style,
      }}
      {...props}
    >
      {tiles.map((row, y) =>
        (row ?? []).map((cell, x) => {
          if (!cell) return null;
          const names = Array.isArray(cell) ? cell : [cell];
          return (
            <div
              key={`${x},${y}`}
              onClick={onTileClick ? () => onTileClick({ x, y, names }) : undefined}
              style={{
                position: 'absolute',
                left: x * tileW,
                top: y * tileH,
                width: tileW,
                height: tileH,
              }}
            >
              {names.map((n, i) => (
                <AtlasSprite
                  key={`${n}-${i}`}
                  atlas={atlas}
                  name={n}
                  scale={scale}
                  animated={animated}
                  basePath={basePath}
                  style={{ position: 'absolute', inset: 0, zIndex: i }}
                />
              ))}
            </div>
          );
        }),
      )}
    </div>
  );
}

export default AtlasSprite;
