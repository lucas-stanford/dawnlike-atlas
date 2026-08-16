/**
 * AutotileLabExample — an interactive playground for every autotile
 * resolver in `src/utils/autotile.js`.
 *
 * The other zone examples *use* the resolvers; this one *explains*
 * them. Three panels, all driven by the same resolver selection:
 *
 *   1. Neighbor pad — toggle the surrounding tiles and watch the
 *      centre sprite change. The exact function call is printed
 *      underneath, ready to paste.
 *   2. Variant sheet — every neighbor pattern the family supports,
 *      side by side, so you can see the whole tile set at once and
 *      spot which variants fall back.
 *   3. Paint canvas — draw a shape and the whole grid autotiles live.
 *      This is the fastest way to build intuition for why a resolver
 *      picks the piece it picks.
 *
 * Adding a resolver here means adding one entry to RESOLVERS below;
 * the family dropdown, the variant sheet, and the paint canvas all
 * derive from that entry.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { resolveAssetPath } from './utils/paths';
import { autotileFamilies } from './utils/atlasApi';
import { dawnlikeAnimVars, DAWNLIKE_ATLAS_0_URL } from './utils/spriteAnim';
import './utils/spriteAnim.css';
import {
  resolveDawnLikeBuildingWallName,
  resolveDawnLikeShoreName,
  resolveDawnLikeRiverName,
  resolveDawnLikeFloorName,
  resolveDawnLikePoolName,
  resolveDawnLikeForestName,
  resolveDawnLikeMountainName,
} from './utils/autotile';
import './AutotileLab.css';

/**
 * Resolver registry.
 *
 * `suffixes` + `minVariants` are handed to `autotileFamilies` to
 * discover which base names the atlas actually ships for this resolver,
 * so the dropdowns can never drift from the pack.
 *
 * `resolve(base, neighbors, byName)` normalises every resolver's
 * different return shape into `{ name }`.
 *
 * `eightWay` decides whether the diagonal cells of the neighbor pad are
 * live (only the forest resolver reads them).
 *
 * `sameMeans` is the sentence that explains what a lit neighbor means
 * for this family — it differs in an important way between families:
 * for walls a lit neighbor is another wall, but for floors the sprite
 * is chosen by the neighbors that are MISSING.
 */
const RESOLVERS = {
  wall: {
    label: 'Building wall',
    fn: 'resolveDawnLikeBuildingWallName',
    preferred: 'bright brick wall',
    suffixes: ['center', 'flat', 'left right', 'up down', 'left up', 'right up', 'left down', 'right down'],
    minVariants: 6,
    // `flat` only exists on the Objects/Wall sheet, so it separates
    // building walls from pool families that share the corner suffixes.
    mustHave: ['flat', 'center'],
    eightWay: false,
    resolve: (base, nb, byName) => ({ name: resolveDawnLikeBuildingWallName(base, nb, byName) }),
    sameMeans: 'another wall tile of the same family',
    note: 'Objects/Wall sheet. Suffix tokens run left → right → up → down, so a NE corner is "right up", not "up right".',
  },
  openPath: {
    label: 'River / road',
    fn: 'resolveDawnLikeRiverName',
    preferred: 'clear river',
    suffixes: ['up down', 'left right', 'up left', 'up right', 'down left', 'down right', 'up down left right'],
    minVariants: 5,
    // `up down left right` (in that token order) is unique to the
    // Objects/Map sheet; walls spell the same shape `left right up down`.
    mustHave: ['up down left right'],
    eightWay: false,
    resolve: (base, nb, byName) => resolveDawnLikeRiverName(base, nb, byName),
    sameMeans: 'the path continues in that direction',
    note: 'Objects/Map sheet. Suffix tokens run up → down → left → right, and vertical T-junctions are E/W-inverted: neighbors N+S+E resolve to "… up down left".',
  },
  floor: {
    label: 'Floor',
    fn: 'resolveDawnLikeFloorName',
    preferred: 'dusk brick floor',
    suffixes: ['c', 'nswe', 'ns', 'we', 'nw', 'ne', 'sw', 'se'],
    minVariants: 6,
    mustHave: ['c', 'nswe'],
    eightWay: false,
    resolve: (base, nb, byName) => resolveDawnLikeFloorName(base, nb, byName),
    sameMeans: 'more of the same floor',
    note: 'Floors are named by the neighbors they are MISSING — a tile with floor on every side is "c", and a tile with nothing to the north is "n".',
  },
  pool: {
    label: 'Pool / water',
    fn: 'resolveDawnLikePoolName',
    preferred: 'stone clear pool',
    suffixes: ['center', 'divider', 'left right', 'left up', 'right up', 'left down', 'right down'],
    minVariants: 6,
    mustHave: ['divider', 'center'],
    eightWay: false,
    resolve: (base, nb, byName) => resolveDawnLikePoolName(base, nb, byName),
    sameMeans: 'more water',
    note: 'DawnLike ships no bottom-edge piece, so the resolver returns the top edge with flipY set — apply `transform: scaleY(-1)` when you see it.',
  },
  forest: {
    label: 'Forest canopy',
    fn: 'resolveDawnLikeForestName',
    preferred: 'light oak',
    suffixes: ['dense', 'nw ne sw se', 'nw ne', 'sw se'],
    minVariants: 3,
    mustHave: ['dense'],
    eightWay: true,
    resolve: (base, nb, byName) => resolveDawnLikeForestName(base, nb, byName),
    sameMeans: 'another tree',
    note: 'The only 8-way resolver. A corner curves away unless its diagonal AND both adjacent cardinals are all trees, so the diagonals matter.',
  },
  shore: {
    label: 'Shore (land ↔ water)',
    fn: 'resolveDawnLikeShoreName',
    preferred: 'sand shore',
    suffixes: ['c', 'nswe', 'dnw', 'dne', 'dsw', 'dse'],
    minVariants: 5,
    mustHave: ['dnw', 'nswe'],
    eightWay: true,
    resolve: (base, nb, byName) => resolveDawnLikeShoreName(base, nb, byName),
    sameMeans: 'more land — an unlit cell is open water',
    // These tiles are transparent where their water goes, so the lab
    // paints water behind them; on the default dark panel the sea would
    // read as a hole, which is exactly the wrong intuition.
    backdrop: '#6dc3cb',
    note: 'Not original DawnLike art: the pack ships no coastline, so these are generated by scripts/generate-shore.mjs. A shore tile holds the whole land→water transition and is transparent where the water goes, so it composites over any water tile. It is the only family with inner-corner pieces for a water diagonal.',
  },
  mountain: {
    label: 'Mountain blob',
    fn: 'resolveDawnLikeMountainName',
    preferred: 'blue peak',
    suffixes: ['alone', 'c', 'nw', 'ne', 'sw', 'se'],
    minVariants: 6,
    mustHave: ['alone', 'c'],
    eightWay: false,
    resolve: (base, nb, byName) => ({ name: resolveDawnLikeMountainName(base, nb, byName) }),
    sameMeans: 'more mountain',
    note: 'A true blob set — no T-junctions or thin straights. The suffix names the EDGE the tile sits on: "n" means "northern edge", i.e. neighbors S+E+W.',
  },
};

const RESOLVER_IDS = Object.keys(RESOLVERS);

/** All 16 cardinal neighbor patterns, ordered by neighbor count. */
const ALL_PATTERNS = Array.from({ length: 16 }, (_, bits) => ({
  n: Boolean(bits & 1),
  s: Boolean(bits & 2),
  e: Boolean(bits & 4),
  w: Boolean(bits & 8),
})).sort((a, b) => {
  const count = (p) => Number(p.n) + Number(p.s) + Number(p.e) + Number(p.w);
  return count(a) - count(b);
});

const patternKey = (nb) =>
  ['n', 's', 'e', 'w'].filter((d) => nb[d]).join('') || '·';

const PAINT_W = 12;
const PAINT_H = 9;

export default function AutotileLabExample({
  resolver: resolverProp = 'wall',
  family: familyProp,
  scale: scaleProp = 3,
} = {}) {
  const [atlas, setAtlas] = useState(null);
  const [error, setError] = useState(null);
  const [resolverId, setResolverId] = useState(resolverProp);
  const [family, setFamily] = useState(familyProp ?? null);
  const [neighbors, setNeighbors] = useState({ n: true, s: true, e: false, w: true });
  const [painted, setPainted] = useState(() => new Set());
  const [painting, setPainting] = useState(null); // 'add' | 'erase' | null
  const [copied, setCopied] = useState(false);

  useEffect(() => { setResolverId(resolverProp); }, [resolverProp]);
  useEffect(() => { if (familyProp) setFamily(familyProp); }, [familyProp]);

  useEffect(() => {
    let cancelled = false;
    fetch(resolveAssetPath('/DawnlikeAtlas.json'))
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setAtlas(json); })
      .catch((e) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, []);

  const spec = RESOLVERS[resolverId] ?? RESOLVERS.wall;

  // Families are discovered from the atlas rather than hard-coded, so a
  // repack that adds a new brick colour shows up here for free.
  const families = useMemo(() => {
    if (!atlas) return [];
    // `autotileFamilies` scores a base name by how many of the listed
    // suffixes it has, which is enough on its own for most families —
    // but several families share corner suffixes (walls and pools both
    // have "left up"), so each resolver also names a few suffixes a
    // family MUST have to belong to it.
    return autotileFamilies(atlas, spec.suffixes, spec.minVariants).filter((base) =>
      (spec.mustHave ?? []).every((suffix) => atlas.byName[`${base} ${suffix}`]),
    );
  }, [atlas, spec]);

  // Keep the selected family valid whenever the resolver changes.
  useEffect(() => {
    if (!families.length) return;
    setFamily((current) => {
      if (current && families.includes(current)) return current;
      if (spec.preferred && families.includes(spec.preferred)) return spec.preferred;
      return families[0];
    });
  }, [families, spec]);

  // Seed the paint canvas with a shape that shows off corners and
  // T-junctions rather than an empty grid.
  useEffect(() => {
    const seeded = new Set();
    const add = (x, y) => seeded.add(`${x},${y}`);
    for (let x = 2; x <= 9; x++) add(x, 2);          // long horizontal run
    for (let y = 2; y <= 6; y++) add(5, y);          // vertical branch (T + corner)
    for (let x = 5; x <= 8; x++) add(x, 6);          // elbow back out
    for (let y = 4; y <= 6; y++) add(8, y);          // closes a loop
    setPainted(seeded);
  }, [resolverId]);

  const byName = atlas?.byName ?? {};

  const resolveFor = useCallback(
    (nb) => {
      if (!family) return null;
      const result = spec.resolve(family, nb, byName);
      return { ...result, exists: Boolean(byName[result.name]) };
    },
    [spec, family, byName],
  );

  const current = resolveFor(neighbors);

  const callSnippet = useMemo(() => {
    if (!family) return '';
    const dirs = spec.eightWay
      ? ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se']
      : ['n', 's', 'e', 'w'];
    const flags = dirs.map((d) => `${d}: ${Boolean(neighbors[d])}`).join(', ');
    return `${spec.fn}(\n  '${family}',\n  { ${flags} },\n  atlas.byName,\n)`;
  }, [spec, family, neighbors]);

  const copySnippet = () => {
    navigator.clipboard?.writeText(callSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }).catch(() => {});
  };

  const toggleNeighbor = (dir) => setNeighbors((prev) => ({ ...prev, [dir]: !prev[dir] }));

  // ---- paint canvas -------------------------------------------------

  const isPainted = useCallback((x, y) => painted.has(`${x},${y}`), [painted]);

  const paintAt = (x, y, mode) => {
    setPainted((prev) => {
      const next = new Set(prev);
      if (mode === 'erase') next.delete(`${x},${y}`);
      else next.add(`${x},${y}`);
      return next;
    });
  };

  const paintTile = (x, y) => {
    if (!isPainted(x, y)) return null;
    const nb = {
      n: isPainted(x, y - 1),
      s: isPainted(x, y + 1),
      e: isPainted(x + 1, y),
      w: isPainted(x - 1, y),
      nw: isPainted(x - 1, y - 1),
      ne: isPainted(x + 1, y - 1),
      sw: isPainted(x - 1, y + 1),
      se: isPainted(x + 1, y + 1),
    };
    return resolveFor(nb);
  };

  // -------------------------------------------------------------------

  if (error) {
    return <div className="lab-root"><div className="lab-panel">Failed to load the atlas: {String(error.message ?? error)}</div></div>;
  }
  if (!atlas || !family) {
    return <div className="lab-root"><div className="lab-panel">Loading atlas…</div></div>;
  }

  const tile = atlas.meta.tile.w;

  /** Render one sprite name as a scaled div. */
  const spriteBox = (name, boxScale, extraClass = '') => {
    const sprite = byName[name];
    const backdrop = spec.backdrop ? { backgroundColor: spec.backdrop } : null;
    if (!sprite) {
      return <div className={`lab-sprite lab-sprite-missing ${extraClass}`} style={{ width: tile * boxScale, height: tile * boxScale, ...backdrop }} />;
    }
    const animated = Boolean(sprite.isAnimated);
    return (
      <div
        className={`lab-sprite ${animated ? 'dawnlike-tile-anim' : ''} ${extraClass}`}
        style={{
          width: tile * boxScale,
          height: tile * boxScale,
          ...backdrop,
          ...(animated ? null : { backgroundImage: `url(${DAWNLIKE_ATLAS_0_URL})` }),
          backgroundPosition: `-${sprite.x * boxScale}px -${sprite.y * boxScale}px`,
          backgroundSize: `${atlas.meta.size.w * boxScale}px ${atlas.meta.size.h * boxScale}px`,
        }}
      />
    );
  };

  const padCells = [
    ['nw', 'n', 'ne'],
    ['w', 'center', 'e'],
    ['sw', 's', 'se'],
  ];

  return (
    <div className="lab-root" style={dawnlikeAnimVars}>
      <header className="lab-header">
        <div className="lab-title">
          <h1>Autotile Lab</h1>
          <p>{spec.note}</p>
        </div>
        <div className="lab-controls">
          <label>
            <span>Resolver</span>
            <select value={resolverId} onChange={(e) => setResolverId(e.target.value)}>
              {RESOLVER_IDS.map((id) => (
                <option key={id} value={id}>{RESOLVERS[id].label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Family ({families.length})</span>
            <select value={family} onChange={(e) => setFamily(e.target.value)}>
              {families.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        </div>
      </header>

      <div className="lab-grid">
        {/* ---------------------------------------------------------- */}
        <section className="lab-panel">
          <h2>1 · Neighbor pad</h2>
          <p className="lab-hint">
            Click a surrounding cell to toggle it. A lit cell means{' '}
            <strong>{spec.sameMeans}</strong>.
            {!spec.eightWay && ' This resolver reads only the four cardinals, so the diagonals are inert.'}
          </p>

          <div className="lab-pad">
            {padCells.map((row, ry) => (
              <div className="lab-pad-row" key={ry}>
                {row.map((dir) => {
                  if (dir === 'center') {
                    return (
                      <div className="lab-pad-cell lab-pad-center" key={dir}>
                        {spriteBox(current.name, scaleProp)}
                      </div>
                    );
                  }
                  const live = spec.eightWay || dir.length === 1;
                  const on = Boolean(neighbors[dir]);
                  return (
                    <button
                      key={dir}
                      type="button"
                      className={`lab-pad-cell lab-pad-toggle ${on ? 'on' : ''} ${live ? '' : 'inert'}`}
                      style={{ width: tile * scaleProp, height: tile * scaleProp }}
                      onClick={() => live && toggleNeighbor(dir)}
                      disabled={!live}
                      aria-pressed={on}
                      aria-label={`${dir} neighbor`}
                      title={live ? `Toggle ${dir}` : `${dir} is ignored by ${spec.fn}`}
                    >
                      <span>{dir}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <dl className="lab-result">
            <dt>Resolved</dt>
            <dd>
              <code>{current.name}</code>
              {!current.exists && <span className="lab-badge lab-badge-warn">not in atlas</span>}
              {current.flipY && <span className="lab-badge">flipY</span>}
            </dd>
            {current.reason && (<><dt>Reason</dt><dd>{current.reason}</dd></>)}
          </dl>

          <div className="lab-snippet">
            <button type="button" className="lab-copy" onClick={copySnippet}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <pre>{callSnippet}</pre>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        <section className="lab-panel">
          <h2>2 · Variant sheet</h2>
          <p className="lab-hint">
            Every cardinal pattern this family answers, ordered by neighbor
            count. Click one to load it into the pad. A dashed outline means
            the resolver fell back because that exact variant is not in the pack.
          </p>
          <div className="lab-variants">
            {ALL_PATTERNS.map((nb) => {
              // For 8-way resolvers the sheet must supply diagonals too,
              // or every cell reads as if the diagonals were empty. The
              // natural blob assumption is that a diagonal matches when
              // both of its adjacent cardinals do.
              const full = spec.eightWay
                ? {
                    ...nb,
                    nw: nb.n && nb.w, ne: nb.n && nb.e,
                    sw: nb.s && nb.w, se: nb.s && nb.e,
                  }
                : nb;
              const res = resolveFor(full);
              const isCurrent = ['n', 's', 'e', 'w'].every((d) => Boolean(neighbors[d]) === nb[d]);
              return (
                <button
                  type="button"
                  key={patternKey(nb)}
                  className={`lab-variant ${isCurrent ? 'current' : ''} ${res.exists ? '' : 'missing'}`}
                  onClick={() => setNeighbors((prev) => ({ ...prev, ...full }))}
                  title={res.name}
                >
                  {spriteBox(res.name, 2)}
                  <code>{patternKey(nb)}</code>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        <section className="lab-panel lab-panel-wide">
          <h2>3 · Paint canvas</h2>
          <p className="lab-hint">
            Drag to draw, or drag starting on a filled tile to erase. Every
            tile re-resolves against its live neighbors — exactly what a map
            generator does after it decides which cells are solid.
          </p>
          <div
            className="lab-canvas"
            style={{ width: PAINT_W * tile * 2, height: PAINT_H * tile * 2 }}
            onMouseLeave={() => setPainting(null)}
            onMouseUp={() => setPainting(null)}
          >
            {Array.from({ length: PAINT_H }).map((_, y) =>
              Array.from({ length: PAINT_W }).map((__, x) => {
                const res = paintTile(x, y);
                return (
                  <div
                    key={`${x},${y}`}
                    className={`lab-canvas-cell ${res ? 'filled' : ''}`}
                    style={{ left: x * tile * 2, top: y * tile * 2, width: tile * 2, height: tile * 2 }}
                    onMouseDown={() => {
                      const mode = isPainted(x, y) ? 'erase' : 'add';
                      setPainting(mode);
                      paintAt(x, y, mode);
                    }}
                    onMouseEnter={() => { if (painting) paintAt(x, y, painting); }}
                    title={res ? res.name : `${x},${y} — empty`}
                  >
                    {res && spriteBox(res.name, 2)}
                  </div>
                );
              }),
            )}
          </div>
          <div className="lab-canvas-actions">
            <button type="button" onClick={() => setPainted(new Set())}>Clear</button>
            <button
              type="button"
              onClick={() => {
                const all = new Set();
                for (let y = 0; y < PAINT_H; y++) {
                  for (let x = 0; x < PAINT_W; x++) all.add(`${x},${y}`);
                }
                setPainted(all);
              }}
            >
              Fill
            </button>
            <span className="lab-count">{painted.size} tiles</span>
          </div>
        </section>
      </div>
    </div>
  );
}
