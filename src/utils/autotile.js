/**
 * AUTOTILE_MANIFESTS
 *
 * Declarative description of DawnLike autotile families. Each manifest
 * maps a neighbor-pattern key ("nsew" string, e.g. "ns" for vertical
 * straight, "nse" for the T branching right) to the sprite-name suffix
 * actually present in the atlas for that pattern. A fallback chain
 * (`fallbacks`) is consulted when a base family is missing a particular
 * variant (e.g. a 1-way endcap that reuses the straight).
 *
 *  - `openPath` (river / road / castle-wall): the 11-variant set where
 *    vertical-bar T's (up down X) are E/W-inverted, but corners and
 *    horizontal-bar T's are literal. See resolveDawnLikeRiverName
 *    docstring for the full convention and pixel-level verification.
 *
 *  - `blob` (mountain): the 10-sprite "blob" set named by which edge
 *    the tile sits on (n/s/e/w/ne/nw/se/sw/c/alone), no T-junctions or
 *    thin straights — see resolveDawnLikeMountainName.
 */
export const AUTOTILE_MANIFESTS = {
  openPath: {
    // Pattern key → atlas suffix. Pattern key is alphabetised cardinals
    // sorted as "n","s","e","w" → "nsew". '' (empty) is the no-neighbor
    // isolated case.
    map: {
      '':     'up down',              // isolated: render as vertical straight
      'n':    'up down',              // endcap N → straight
      's':    'up down',              // endcap S → straight
      'e':    'left right',           // endcap E → straight
      'w':    'left right',           // endcap W → straight
      'ns':   'up down',
      'ew':   'left right',
      'nw':   'up left',              // corner: literal (N+W connect)
      'ne':   'up right',
      'sw':   'down left',
      'se':   'down right',
      'nse':  'up down left',         // vertical-T inverted (stub right)
      'nsw':  'up down right',        // vertical-T inverted (stub left)
      'new':  'up left right',        // horizontal-T literal (stub up)
      'sew':  'down left right',      // horizontal-T literal (stub down)
      'nsew': 'up down left right',
    },
    // If the resolved variant is missing from the atlas, walk these
    // pattern keys in order and return the first present variant.
    fallbacks: {
      'nsew': ['ew', 'ns'],
      'nse':  ['ns'],
      'nsw':  ['ns'],
      'new':  ['ew'],
      'sew':  ['ew'],
      'nw':   ['ns', 'ew'],
      'ne':   ['ns', 'ew'],
      'sw':   ['ns', 'ew'],
      'se':   ['ns', 'ew'],
      'n':    ['ns'], 's': ['ns'],
      'e':    ['ew'], 'w': ['ew'],
      '':     ['ns'],
    },
  },
};

/**
 * resolveAutotile
 *
 * Manifest-driven cardinal-neighbor autotile resolver. Pick a manifest
 * id ('openPath' for river/road/wall) and pass the base family name
 * plus the {n,s,e,w} neighbor truth table; returns the resolved sprite
 * name (consulting `byName` for existence) with graceful fallback.
 */
export function resolveAutotile(manifestId, baseName, { n, s, e, w }, byName = {}) {
  const m = AUTOTILE_MANIFESTS[manifestId];
  if (!m) throw new Error(`Unknown autotile manifest: ${manifestId}`);
  // Build pattern key in canonical order n,s,e,w.
  const key = (n ? 'n' : '') + (s ? 's' : '') + (e ? 'e' : '') + (w ? 'w' : '');
  const tryKey = (k) => {
    const suf = m.map[k];
    if (!suf) return null;
    const full = `${baseName} ${suf}`.trim();
    return byName[full] ? full : null;
  };
  const direct = tryKey(key);
  if (direct) return { name: direct, suffix: m.map[key] };
  for (const fb of (m.fallbacks[key] || [])) {
    const got = tryKey(fb);
    if (got) return { name: got, suffix: m.map[fb], fallback: true };
  }
  // Last-resort: return whatever the manifest says, even if atlas doesn't have it.
  const suf = m.map[key] || m.map[''] || '';
  return { name: `${baseName} ${suf}`.trim(), suffix: suf, missing: true };
}

/**
 * resolveDawnLikeWallName
 * 
 * Maps cardinal neighbors to a specific DawnLike sprite name.
 * This is the original road/wall resolver; it now delegates to
 * resolveAutotile() with the shared `openPath` manifest so that road
 * tile naming follows the same (verified) convention as rivers and
 * castle walls. The pool/fence families with different naming still
 * use their own resolvers.
 */
export function resolveDawnLikeWallName(baseName, neighbors, byName = {}) {
  const { name } = resolveAutotile('openPath', baseName, neighbors, byName);
  return name;
}

/**
 * resolveDawnLikeForestName
 *
 * Maps 8-way tree neighbors to the DawnLike 16-tile tree set. Each suffix
 * (`nw`, `ne`, `sw`, `se`) names a corner where the canopy curves away —
 * i.e. a direction that is NOT cleanly filled. `dense` is used when the
 * tile is completely surrounded (all 8 neighbors present).
 *
 * Rule (standard 8-way "blob" autotile): a corner is filled iff its
 * diagonal AND both adjacent cardinals all have trees. If any of those
 * three is missing, the corner curves away.
 */
export function resolveDawnLikeForestName(baseName, { n, s, e, w, nw, ne, sw, se }, byName = {}) {
  const emptyQuadrants = [];

  if (!nw || !n || !w) emptyQuadrants.push('nw');
  if (!ne || !n || !e) emptyQuadrants.push('ne');
  if (!sw || !s || !w) emptyQuadrants.push('sw');
  if (!se || !s || !e) emptyQuadrants.push('se');

  // All corners filled → completely surrounded (this implies all 8 are present).
  if (emptyQuadrants.length === 0) {
    const dense = `${baseName} dense`;
    if (byName[dense]) return { name: dense, reason: 'Forest interior' };
  }

  // Join in DawnLike's specific order: nw ne sw se
  const fullOrder = ['nw', 'ne', 'sw', 'se'];
  const nameParts = [baseName, ...fullOrder.filter(q => emptyQuadrants.includes(q))];
  const fullName = nameParts.join(' ').trim();

  if (byName[fullName]) return { name: fullName, reason: `Canopy: ${emptyQuadrants.join(',')}` };

  return {
    name: byName[`${baseName} dense`] ? `${baseName} dense` : Object.keys(byName).find(k => k.startsWith(baseName)),
    reason: 'Forest: fallback'
  };
}

/**
 * resolveDawnLikeFloorName
 * 
 * Maps floor neighbors to a specific DawnLike floor sprite.
 * Floor transitions are defined by their MISSING neighbors.
 */
export function resolveDawnLikeFloorName(baseName, { n, s, e, w }, byName = {}) {
  const missing = [];
  if (!n) missing.push('n');
  if (!s) missing.push('s');
  if (!w) missing.push('w');
  if (!e) missing.push('e');

  let suffix = missing.join('');
  if (suffix === '') suffix = 'c';

  const fullName = `${baseName} ${suffix}`.trim();
  if (byName[fullName]) return { name: fullName, reason: `Floor transition: ${suffix}` };

  // Fallback
  if (byName[`${baseName} c`]) return { name: `${baseName} c`, reason: 'Floor fallback' };
  if (byName[`${baseName} center`]) return { name: `${baseName} center`, reason: 'Floor fallback' };
  return { name: baseName, reason: 'Floor fallback' };
}
/**
 * resolveDawnLikePoolName
 * 
 * Maps pool neighbors (e.g. "stone clear pool") to specific variants.
 * Uses flipY for missing variants.
 */
export function resolveDawnLikePoolName(baseName, { n, s, e, w }, byName = {}) {
  const get = (suffix, opts = {}) => {
    const name = `${baseName} ${suffix}`.trim();
    if (byName[name]) return { name, ...opts };
    return { name: byName[`${baseName} center`] ? `${baseName} center` : baseName, ...opts };
  };

  // 4-way
  if (n && s && e && w) return get('center');

  // 3-way
  if (!n && s && e && w) return get('left right up', { flipY: true }); // Missing "down" 3-way
  if (n && !s && e && w) return get('left right up');
  if (n && s && !e && w) return get('divider'); // Missing side 3-way
  if (n && s && e && !w) return get('divider'); // Missing side 3-way

  // 2-way Straights
  if (n && s && !e && !w) return get('divider');
  if (!n && !s && e && w) return get('left right');

  // 2-way Corners
  if (s && e) return get('right down');
  if (s && w) return get('left down');
  if (n && e) return get('right up');
  if (n && w) return get('left up');

  // 1-way
  if (n) return get('up');
  if (s) return get('up', { flipY: true }); // Missing down endcap
  if (e) return get('right');
  if (w) return get('left');

  // 0-way
  return get('center'); // Best fallback for isolated pool
}
/**
 * resolveDawnLikeRiverName
 *
 * Thin wrapper around resolveAutotile('openPath', ...) that returns
 * { name } so existing callers (which destructure `name` and ignore
 * `flipX`) keep working. Full naming convention documented on the
 * `openPath` manifest entry above. Verified by pixel inspection of
 * DawnlikeAtlas0.png for all 11 variants.
 */
export function resolveDawnLikeRiverName(baseName, neighbors, byName = {}) {
  const { name } = resolveAutotile('openPath', baseName, neighbors, byName);
  return { name };
}

/**
 * resolveDawnLikeMountainName
 *
 * Maps 4-way mountain neighbors to the 10-sprite DawnLike "peak" / "snowcap" /
 * "volcano" / "mound" blob set: alone, c, n, s, e, w, ne, nw, se, sw.
 *
 * Convention (matches dawnlike upstream): the suffix names the CARDINAL EDGE
 * that the tile sits on — `n` means "this tile is the northern edge of the
 * blob" (has neighbors S+E+W, but nothing to the north). `c` is fully
 * surrounded interior. Corners `ne/nw/se/sw` are outer corners where two
 * cardinals are empty and the opposite two are filled (e.g. `ne` has
 * neighbors S+W only).
 *
 * This is a true "blob" set with no T-junctions or thin straights; for
 * non-blob shapes (a 1-wide column, etc.) we degrade gracefully to the
 * closest available variant.
 */
export function resolveDawnLikeMountainName(baseName, { n, s, e, w }, byName = {}) {
  const get = (suffix) => {
    const name = `${baseName} ${suffix}`.trim();
    return byName[name] ? name : null;
  };

  const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0);

  // 4 neighbors → interior
  if (count === 4) return get('c') || baseName;

  // 3 neighbors → it's the missing-direction edge
  if (count === 3) {
    if (!n) return get('n') || get('c') || baseName;
    if (!s) return get('s') || get('c') || baseName;
    if (!e) return get('e') || get('c') || baseName;
    if (!w) return get('w') || get('c') || baseName;
  }

  // 2 neighbors
  if (count === 2) {
    // Opposing pairs (thin column/row) — fall back to one of the cap directions
    if (n && s) return get('n') || get('c') || baseName;
    if (e && w) return get('e') || get('c') || baseName;
    // Corners: outer corner is named by the two MISSING cardinals
    if (s && e) return get('nw') || get('alone') || baseName;
    if (s && w) return get('ne') || get('alone') || baseName;
    if (n && e) return get('sw') || get('alone') || baseName;
    if (n && w) return get('se') || get('alone') || baseName;
  }

  // 1 neighbor → cap (treat as a corner pair so it has rounded edges)
  if (count === 1) {
    if (n) return get('se') || get('sw') || get('alone') || baseName;
    if (s) return get('ne') || get('nw') || get('alone') || baseName;
    if (e) return get('sw') || get('nw') || get('alone') || baseName;
    if (w) return get('se') || get('ne') || get('alone') || baseName;
  }

  // 0 neighbors → isolated peak
  return get('alone') || get('c') || baseName;
}
