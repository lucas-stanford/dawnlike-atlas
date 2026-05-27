/**
 * tactical/move.js — Movement reachability + path preview.
 *
 * Two main exports:
 *   - reachableTiles(start, range, isBlocked)
 *       BFS flood-fill from start out to `range` cardinal steps,
 *       returning a Map keyed "x,y" with the cost to reach that
 *       tile. Used to tint the move-range overlay.
 *   - previewPath(start, dest, isBlocked)
 *       Cardinal-only shortest path via Dijkstra. Returns the
 *       full tile list including start (path[0]) and dest
 *       (path.at(-1)) — or null if dest is unreachable within
 *       any range.
 *
 * Both functions are framework-agnostic. `isBlocked(x, y)` is a
 * caller-supplied predicate ("is this tile impassable for this
 * unit?"). It MUST return true for any out-of-bounds coordinate,
 * tile that contains an obstacle, or tile occupied by a different
 * unit.
 */

import * as ROT from 'rot-js';

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * BFS flood-fill from (start.x, start.y) outward to `range` steps.
 * Returns `Map<"x,y", number>` where value is the step cost.
 *
 * The start tile is included with cost 0.
 *
 * @param {{x:number, y:number}} start
 * @param {number} range
 * @param {(x:number, y:number) => boolean} isBlocked
 */
export function reachableTiles(start, range, isBlocked) {
  const reached = new Map();
  const key = (x, y) => `${x},${y}`;
  reached.set(key(start.x, start.y), 0);
  let frontier = [{ x: start.x, y: start.y, cost: 0 }];
  while (frontier.length) {
    const next = [];
    for (const { x, y, cost } of frontier) {
      if (cost >= range) continue;
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx, ny = y + dy;
        const k = key(nx, ny);
        if (reached.has(k)) continue;
        if (isBlocked(nx, ny)) continue;
        reached.set(k, cost + 1);
        next.push({ x: nx, y: ny, cost: cost + 1 });
      }
    }
    frontier = next;
  }
  return reached;
}

/**
 * Cardinal-only shortest path from `start` to `dest` via rot.js
 * Dijkstra (topology=4). Caller-supplied `isBlocked` should treat the
 * START tile as passable (we start there) and the DEST tile as
 * passable (we want to end there); intermediate tiles are blocked
 * normally.
 *
 * Returns an array of `{x, y}` tiles in walking order including the
 * start tile and the dest tile, or `null` if no path exists.
 *
 * @param {{x:number, y:number}} start
 * @param {{x:number, y:number}} dest
 * @param {(x:number, y:number) => boolean} isBlocked
 */
export function previewPath(start, dest, isBlocked) {
  // rot.js Dijkstra's passable callback takes (x, y) and returns
  // true if walkable. We invert isBlocked, but always permit the
  // exact start and dest tiles (so the algorithm seeds correctly
  // even if those tiles otherwise look blocked, e.g. dest == an
  // enemy attack target — we don't actually want to occupy enemy
  // tiles, but the caller filters that beforehand).
  const passable = (x, y) => {
    if (x === start.x && y === start.y) return true;
    if (x === dest.x  && y === dest.y)  return true;
    return !isBlocked(x, y);
  };
  const dij = new ROT.Path.Dijkstra(dest.x, dest.y, passable, { topology: 4 });
  const path = [];
  dij.compute(start.x, start.y, (x, y) => path.push({ x, y }));
  if (!path.length) return null;
  // Sanity: did we actually reach the dest? Dijkstra returns the
  // closest-it-could-get path even when unreachable.
  const last = path[path.length - 1];
  if (last.x !== dest.x || last.y !== dest.y) return null;
  return path;
}

/**
 * Distance between two tiles in cardinal steps (Manhattan).
 */
export function tileDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Chebyshev distance (8-way, for "is this tile adjacent including
 * diagonals?" checks).
 */
export function chebyshevDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
