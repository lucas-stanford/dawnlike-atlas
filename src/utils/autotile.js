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
 * Maps 8-way tree neighbors to the definitive 16-way DawnLike tree set.
 */
export function resolveDawnLikeForestName(baseName, { n, s, e, w, nw, ne, sw, se }, byName = {}) {
  const emptyQuadrants = [];
  
  // A quadrant is EMPTY if it lacks a cardinal neighbor OR its specific diagonal neighbor.
  // This flawlessly maps the 8-way neighborhood into DawnLike's 16-sprite quadrant system.
  if (!n || !w || !nw) emptyQuadrants.push('nw');
  if (!n || !e || !ne) emptyQuadrants.push('ne');
  if (!s || !w || !sw) emptyQuadrants.push('sw');
  if (!s || !e || !se) emptyQuadrants.push('se');

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
 */
export function resolveDawnLikeRiverName(baseName, { n, s, e, w }, byName = {}) {
  if (e && w) return { name: `${baseName} left right` };
  if (n && s) return { name: `${baseName} up down` };
  if (s && e) return { name: `${baseName} down right` };
  if (s && w) return { name: `${baseName} down right`, flipX: true };
  if (n && e) return { name: `${baseName} up right` };
  if (n && w) return { name: `${baseName} up right`, flipX: true };
  
  if (e || w) return { name: `${baseName} left right` };
  if (n || s) return { name: `${baseName} up down` };
  return { name: `${baseName} up down` };
}
