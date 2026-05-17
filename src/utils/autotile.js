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
 * Maps tree neighbors to the definitive 16-way DawnLike tree set.
 */
export function resolveDawnLikeForestName(baseName, { n, s, e, w }, byName = {}) {
  // Logic derived from Tree0.frames.json:
  // Standalone: nw ne sw se
  // Edges: nw ne (N), sw se (S), nw sw (W), ne se (E)
  // Corners (missing the inner quadrant): 
  //   TL (E+S): nw ne sw (missing SE)
  //   TR (W+S): nw ne se (missing SW)
  //   BL (E+N): nw sw se (missing NE)
  //   BR (W+N): ne sw se (missing NW)
  // Diagonals: nw se, ne sw
  // Isolated corners: nw, ne, sw, se
  // Center: dense

  const quadrants = [];
  if (!n || !w) quadrants.push('nw');
  if (!n || !e) quadrants.push('ne');
  if (!s || !w) quadrants.push('sw');
  if (!s || !e) quadrants.push('se');

  if (quadrants.length === 0) {
    return { name: `${baseName} dense`, reason: 'Interior' };
  }

  // Join in DawnLike's specific order: nw ne sw se
  const fullName = [baseName, ...['nw', 'ne', 'sw', 'se'].filter(q => quadrants.includes(q))].join(' ').trim();
  
  if (byName[fullName]) return { name: fullName, reason: `Canopy: ${quadrants.join(',')}` };
  
  return { name: `${baseName} dense`, reason: 'Fallback to dense' };
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
