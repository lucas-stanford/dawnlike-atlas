/**
 * Every building in the pack, on grass, at the zoom you choose.
 *
 * The point of showing them over a tiled floor rather than over a swatch
 * is that a building is judged by how it sits ON something. The dashed box
 * under each one is its FOOTPRINT — the tiles it blocks — and seeing the
 * roof hang past that box on three sides is the whole argument for keeping
 * these out of the mega-atlas: a building rasterised into the tile grid
 * cannot overhang, and a roof that stops dead at its own walls reads flat.
 */
import React, { useState } from 'react';
import { BUILDINGS, BUILDING_NAMES, TILE_PX, buildingRect } from './utils/buildings';
import { resolveAssetPath } from './utils/paths';
import { DAWNLIKE_ATLAS_0_URL } from './utils/spriteAnim';
import './Buildings.css';

/**
 * `day grass floor c` — the middle tile of the daylit grass family, which
 * is the one that tiles against itself without an edge.
 *
 * Hardcoded rather than looked up, because this example has no business
 * fetching the whole atlas manifest to draw a lawn. The buildings test
 * would not catch it moving, but nothing here is load-bearing: at worst
 * the gallery gets a different floor.
 */
const GRASS = { x: 736, y: 1280 };
const ATLAS = { w: 2048, h: 2272, cell: 32 };

const SCALES = [1, 2, 3, 4];

export default function BuildingsExample({ scale: scaleProp = 3, showFootprint = true }) {
  const [scale, setScale] = useState(scaleProp);
  const [footprints, setFootprints] = useState(showFootprint);
  const tile = TILE_PX * scale;

  return (
    <div className="buildings-page">
      <div className="buildings-bar">
        <span className="buildings-title">Buildings</span>
        <span className="buildings-note">
          Not in the mega-atlas — one PNG each, on its own palette.
        </span>
        <label className="buildings-control">
          Zoom
          <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
            {SCALES.map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
        <label className="buildings-control">
          <input
            type="checkbox"
            checked={footprints}
            onChange={(e) => setFootprints(e.target.checked)}
          />
          Footprint
        </label>
      </div>

      <div className="buildings-row">
        {BUILDING_NAMES.map((name) => {
          const art = BUILDINGS[name];
          // Stand every building on a common baseline, on a plot wide
          // enough for the widest roof so nothing overlaps its neighbour.
          const cols = Math.ceil(art.w / TILE_PX) + 2;
          const rows = Math.ceil(art.h / TILE_PX) + 2;
          const rect = buildingRect(name, {
            x0: (cols - art.cols) / 2,
            y1: rows - 2,
          });

          return (
            <figure key={name} className="buildings-plot">
              <div
                className="buildings-ground"
                style={{ width: cols * tile, height: rows * tile }}
              >
                {/*
                  One <div> per cell rather than a repeating background.
                  CSS repeats the whole IMAGE, and the image here is the
                  2048×2272 mega-atlas — so `repeat` tiles the entire sheet
                  and you get a lawn made of goblins.
                */}
                {Array.from({ length: rows * cols }, (_, i) => (
                  <div
                    key={i}
                    className="buildings-cell"
                    style={{
                      left: (i % cols) * tile,
                      top: Math.floor(i / cols) * tile,
                      width: tile,
                      height: tile,
                      backgroundImage: `url(${DAWNLIKE_ATLAS_0_URL})`,
                      backgroundPosition:
                        `-${GRASS.x * scale / 2}px -${GRASS.y * scale / 2}px`,
                      backgroundSize:
                        `${ATLAS.w * scale / 2}px ${ATLAS.h * scale / 2}px`,
                    }}
                  />
                ))}

                {footprints && (
                  <div
                    className="buildings-footprint"
                    style={{
                      left: ((cols - art.cols) / 2) * tile,
                      top: (rows - 2 - 1) * tile,
                      width: art.cols * tile,
                      height: 2 * tile,
                    }}
                  />
                )}
                <img
                  className="buildings-art"
                  src={resolveAssetPath(art.url)}
                  alt={name}
                  style={{
                    left: rect.x * tile,
                    top: rect.y * tile,
                    width: rect.w * tile,
                    height: rect.h * tile,
                  }}
                />
              </div>
              <figcaption>
                <strong>{name}</strong>
                <span>{art.w}×{art.h} px · blocks {art.cols} tile{art.cols === 1 ? '' : 's'}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
