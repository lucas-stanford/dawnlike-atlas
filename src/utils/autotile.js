/**
 * resolveDawnLikeWallName
 * 
 * Maps cardinal neighbors to a specific DawnLike sprite name.
 * Handles the 16 standard autotile positions with robust fallbacks.
 */
export function resolveDawnLikeWallName(baseName, { n, s, e, w }, byName = {}) {
  const dirs = [];
  if (n) dirs.push('up');
  if (s) dirs.push('down');
  if (w) dirs.push('left');
  if (e) dirs.push('right');

  if (dirs.length === 0) {
    return byName[`${baseName} flat`] || byName[`${baseName} center`] || baseName;
  }

  let suffix = "flat";
  // 4-way
  if (n && s && e && w) suffix = "left right up down";
  else if (!n && s && e && w) suffix = "left right down";
  else if (n && !s && e && w) suffix = "left right up";
  else if (n && s && !e && w) suffix = "left up down";
  else if (n && s && e && !w) suffix = "right up down";
  else if (n && s && !e && !w) suffix = "up down";
  else if (!n && !s && e && w) suffix = "left right";
  else if (s && e && !n && !w) suffix = "right down";
  else if (s && w && !n && !e) suffix = "left down";
  else if (n && e && !s && !w) suffix = "right up";
  else if (n && w && !s && !e) suffix = "left up";
  else if (n && !s && !e && !w) suffix = "up down"; // reuse vertical straight for caps
  else if (s && !n && !e && !w) suffix = "up down"; 
  else if (w && !n && !s && !e) suffix = "left right"; // reuse horizontal straight for caps
  else if (e && !n && !s && !w) suffix = "left right";

  // Try permutations in priority order
  const getFullName = (suff) => {
    const dArray = suff.split(' ');
    if (dArray.length === 0) return null;
    
    const standard = ['up', 'down', 'left', 'right'].filter(d => dArray.includes(d)).join(' ');
    const fullName = `${baseName} ${standard}`.trim();
    if (byName[fullName]) return fullName;
    
    const alt = ['left', 'right', 'up', 'down'].filter(d => dArray.includes(d)).join(' ');
    const fullAlt = `${baseName} ${alt}`.trim();
    if (byName[fullAlt]) return fullAlt;
    
    // Reverse
    const rev = [...dArray].reverse().join(' ');
    const fullRev = `${baseName} ${rev}`.trim();
    if (byName[fullRev]) return fullRev;

    return null;
  };

  const found = getFullName(suffix);
  if (found) return found;

  // Fallbacks if the specific directional sprite doesn't exist (e.g. pools missing 4-way)
  const fallbackOrder = [`${baseName} center`, `${baseName} flat`, `${baseName} c`, baseName];
  for (const fb of fallbackOrder) {
    if (byName[fb]) return fb;
  }

  // Final desperate fallback: find anything that starts with baseName
  const anything = Object.keys(byName).find(k => k.startsWith(baseName));
  if (anything) return anything;

  // If all fails, just return baseName and hope it exists or gets caught
  return baseName;
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
 * Maps cardinal river neighbors to the full 11-variant DawnLike river set:
 *  - straights: `left right`, `up down`
 *  - corners:   `up left`, `up right`, `down left`, `down right`
 *  - T-junctions: `up down left`, `up down right`, `up left right`,
 *                 `down left right`
 *  - 4-way:     `up down left right`
 *
 * IMPORTANT — DawnLike naming convention:
 *   For corners and T-junctions, the sprite suffix names the *opposite* of
 *   the connected neighbors (it describes where the bend or cross-piece
 *   sits, not where the water flows to). Specifically:
 *
 *   Corners — the bend sits in the named quadrant; river connects the
 *   two cardinals OPPOSITE that quadrant:
 *     `up left`    → bend NW, river connects S + E
 *     `up right`   → bend NE, river connects S + W
 *     `down left`  → bend SW, river connects N + E
 *     `down right` → bend SE, river connects N + W
 *
 *   T-junctions — the three legs of the T are NOT the names in the
 *   suffix. The suffix's three directions are the three "outer corners"
 *   the cross-piece points toward. In practice: the one cardinal NOT in
 *   the suffix is the direction the cross-piece extends:
 *     `up down left`   → branches right  → river N + S + E
 *     `up down right`  → branches left   → river N + S + W
 *     `up left right`  → branches down   → river S + E + W
 *     `down left right`→ branches up     → river N + E + W
 *
 *   Straights (`up down`, `left right`) and 4-way (`up down left right`)
 *   follow the intuitive convention — name lists the cardinals with
 *   river neighbors.
 */
export function resolveDawnLikeRiverName(baseName, { n, s, e, w }, byName = {}) {
  const get = (suffix) => {
    const name = `${baseName} ${suffix}`.trim();
    if (byName[name]) return { name };
    return null;
  };

  const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0);

  // 4-way
  if (count === 4) return get('up down left right') || get('left right') || { name: `${baseName} left right` };

  // 3-way T-junctions — see header docstring for the inverted naming rule.
  if (n && s && e && !w) return get('up down left')    || get('up down')    || { name: `${baseName} up down` };
  if (n && s && w && !e) return get('up down right')   || get('up down')    || { name: `${baseName} up down` };
  if (s && e && w && !n) return get('up left right')   || get('left right') || { name: `${baseName} left right` };
  if (n && e && w && !s) return get('down left right') || get('left right') || { name: `${baseName} left right` };

  // 2-way straights
  if (e && w) return get('left right') || { name: `${baseName} left right` };
  if (n && s) return get('up down') || { name: `${baseName} up down` };

  // 2-way corners — see header docstring; suffix names the bend's quadrant.
  if (s && e) return get('up left')    || { name: `${baseName} up left` };
  if (s && w) return get('up right')   || { name: `${baseName} up right` };
  if (n && e) return get('down left')  || { name: `${baseName} down left` };
  if (n && w) return get('down right') || { name: `${baseName} down right` };

  // 1-way endcaps — reuse straights
  if (e || w) return get('left right') || { name: `${baseName} left right` };
  if (n || s) return get('up down') || { name: `${baseName} up down` };

  // 0-way isolated
  return get('up down') || { name: `${baseName} up down` };
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
