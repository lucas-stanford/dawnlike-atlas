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

  // Priority order for DawnLike naming permutations
  const getFullName = (suffix) => {
    const standard = ['up', 'down', 'left', 'right'].filter(d => suffix.includes(d)).join(' ');
    const fullName = `${baseName} ${standard}`.trim();
    if (byName[fullName]) return fullName;
    
    const alt = ['left', 'right', 'up', 'down'].filter(d => suffix.includes(d)).join(' ');
    const fullAlt = `${baseName} alt`.trim();
    if (byName[fullAlt]) return fullAlt;

    return null;
  };

  if (dirs.length === 0) {
    return byName[`${baseName} flat`] || byName[`${baseName} center`] || baseName;
  }

  // 4-way
  if (n && s && e && w) return getFullName('up down left right') || `${baseName} left right up down`;

  // 3-way
  if (!n && s && e && w) return getFullName('down left right') || `${baseName} left right down`;
  if (n && !s && e && w) return getFullName('up left right') || `${baseName} left right up`;
  if (n && s && !e && w) return getFullName('up down left') || `${baseName} left up down`;
  if (n && s && e && !w) return getFullName('up down right') || `${baseName} right up down`;

  // 2-way Straights
  if (n && s && !e && !w) return getFullName('up down') || `${baseName} up down`;
  if (!n && !s && e && w) return getFullName('left right') || `${baseName} left right`;

  // 2-way Corners
  if (s && e) return getFullName('down right') || `${baseName} right down`;
  if (s && w) return getFullName('down left') || `${baseName} left down`;
  if (n && e) return getFullName('up right') || `${baseName} right up`;
  if (n && w) return getFullName('up left') || `${baseName} left up`;

  // 1-way (End caps - DawnLike usually reuses straights)
  if (n || s) return getFullName('up down') || `${baseName} up down`;
  if (e || w) return getFullName('left right') || `${baseName} left right`;

  return byName[`${baseName} flat`] || byName[`${baseName} center`] || baseName;
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
