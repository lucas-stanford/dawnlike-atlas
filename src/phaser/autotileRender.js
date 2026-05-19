/**
 * autotileRender.js — turns a `{ tiles, width, height }` map (from any of the
 * generators) into an ordered list of sprite layers per cell, by delegating
 * to the existing resolvers in src/utils/autotile.js.
 *
 * One render path, three map kinds. Returned shape:
 *
 *   [{ name: 'day grass floor c', z: 0 }, { name: 'light oak dense', z: 4 }, ...]
 *
 * The Phaser scenes turn each layer into an `add.image` or `add.sprite` at
 * the correct depth.
 */

import {
  resolveDawnLikeFloorName,
  resolveDawnLikeWallName,
  resolveDawnLikeRiverName,
  resolveDawnLikeForestName,
  resolveDawnLikeMountainName,
  resolveDawnLikeDungeonWallName,
} from '../utils/autotile.js';

const inBounds = (tiles, x, y) =>
  y >= 0 && x >= 0 && y < tiles.length && x < tiles[0].length;

const get = (tiles, x, y) => (inBounds(tiles, x, y) ? tiles[y][x] : null);

/**
 * Render layers for an OVERWORLD tile.
 *
 * Tile schema (world): { type:'grass'|'dirt', tree, mountain, road, river,
 *   bridge, decor, marker }.
 */
export function renderWorldTile(tiles, x, y, styles, byName) {
  const tile = get(tiles, x, y);
  if (!tile) return [];
  const layers = [];

  const terrain = tile.type === 'dirt' ? styles.dirt : styles.grass;
  layers.push({ name: `${terrain} c`, z: -1 });

  const sameType = (nx, ny) => {
    const n = get(tiles, nx, ny);
    if (!n) return false;
    return (n.type === 'dirt') === (tile.type === 'dirt');
  };
  layers.push({
    name: resolveDawnLikeFloorName(
      terrain,
      { n: sameType(x, y - 1), s: sameType(x, y + 1), e: sameType(x + 1, y), w: sameType(x - 1, y) },
      byName,
    ).name,
    z: 0,
  });

  if (tile.decor && byName[tile.decor]) {
    layers.push({ name: tile.decor, z: 0.5 });
  }

  if (tile.river) {
    const n = !!get(tiles, x, y - 1)?.river;
    const s = !!get(tiles, x, y + 1)?.river;
    const e = !!get(tiles, x + 1, y)?.river;
    const w = !!get(tiles, x - 1, y)?.river;
    layers.push({ name: resolveDawnLikeRiverName(styles.river, { n, s, e, w }, byName).name, z: 1 });
  }

  if (tile.bridge) {
    const rn = !!get(tiles, x, y - 1)?.road;
    const rs = !!get(tiles, x, y + 1)?.road;
    const re = !!get(tiles, x + 1, y)?.road;
    const rw = !!get(tiles, x - 1, y)?.road;
    let name = 'bridge e w';
    if (rn && rs) name = 'bridge n s';
    else if (re && rw) name = 'bridge e w';
    else if (rn || rs) name = 'bridge n s';
    if (!byName[name]) name = 'bridge n s';
    layers.push({ name, z: 1.5 });
  }

  if (tile.road && !tile.bridge) {
    const n = !!get(tiles, x, y - 1)?.road;
    const s = !!get(tiles, x, y + 1)?.road;
    const e = !!get(tiles, x + 1, y)?.road;
    const w = !!get(tiles, x - 1, y)?.road;
    layers.push({ name: resolveDawnLikeWallName(styles.road, { n, s, e, w }, byName), z: 2 });
  }

  if (tile.marker === 'town') {
    layers.push({ name: 'homestead', z: 3 });
  } else if (tile.marker === 'dungeon') {
    layers.push({ name: 'fort', z: 3 });
  }

  if (tile.mountain && !tile.road && !tile.river) {
    const n = !!get(tiles, x, y - 1)?.mountain;
    const s = !!get(tiles, x, y + 1)?.mountain;
    const e = !!get(tiles, x + 1, y)?.mountain;
    const w = !!get(tiles, x - 1, y)?.mountain;
    layers.push({ name: resolveDawnLikeMountainName(styles.mountain, { n, s, e, w }, byName), z: 4 });
  }

  if (tile.tree && !tile.road && !tile.river && !tile.bridge && !tile.marker) {
    const isTree = (nx, ny) => !!get(tiles, nx, ny)?.tree;
    layers.push({
      name: resolveDawnLikeForestName(styles.tree, {
        n:  isTree(x, y - 1), s:  isTree(x, y + 1), e:  isTree(x + 1, y), w:  isTree(x - 1, y),
        nw: isTree(x - 1, y - 1), ne: isTree(x + 1, y - 1),
        sw: isTree(x - 1, y + 1), se: isTree(x + 1, y + 1),
      }, byName).name,
      z: 4,
    });
  }

  return layers;
}

/**
 * Render layers for a TOWN tile.
 *
 * Tile schema (town): { type:'grass'|'street'|'floor'|'wall'|'door',
 *   wall, floor, door, street, streetKind:'main'|'side'|null, tree, decor,
 *   fountain, marker }. `streetKind === 'main'` paves with `styles.mainStreet`
 *   (brick) — the plaza and external road trunk. Anything else paves with
 *   `styles.street` (stone). The two surfaces autotile independently so
 *   brick and stone meet at a clean edge instead of merging.
 */
export function renderTownTile(tiles, x, y, styles, byName) {
  const tile = get(tiles, x, y);
  if (!tile) return [];
  const layers = [];

  layers.push({ name: `${styles.grass} c`, z: -1 });

  if (tile.type === 'grass') {
    const same = (nx, ny) => get(tiles, nx, ny)?.type === 'grass';
    layers.push({
      name: resolveDawnLikeFloorName(styles.grass, {
        n: same(x, y - 1), s: same(x, y + 1), e: same(x + 1, y), w: same(x - 1, y),
      }, byName).name,
      z: 0,
    });
  }

  if (tile.street) {
    const kind = tile.streetKind || 'side';
    const isSameKind = (nx, ny) => {
      const n = get(tiles, nx, ny);
      return !!(n?.street && (n.streetKind || 'side') === kind);
    };
    const style = kind === 'main' ? (styles.mainStreet || styles.street) : styles.street;
    layers.push({
      name: resolveDawnLikeFloorName(style, {
        n: isSameKind(x, y - 1), s: isSameKind(x, y + 1),
        e: isSameKind(x + 1, y), w: isSameKind(x - 1, y),
      }, byName).name,
      z: 0.5,
    });
  }

  if (tile.floor || tile.door) {
    const inBuilding = (nx, ny) => {
      const t = get(tiles, nx, ny);
      return !!(t && (t.floor || t.door));
    };
    layers.push({
      name: resolveDawnLikeFloorName(styles.floor, {
        n: inBuilding(x, y - 1), s: inBuilding(x, y + 1),
        e: inBuilding(x + 1, y), w: inBuilding(x - 1, y),
      }, byName).name,
      z: 1,
    });
  }

  if (tile.decor && byName[tile.decor]) {
    layers.push({ name: tile.decor, z: 0.7 });
  }

  if (tile.wall) {
    // Doors count as walls for autotiling — otherwise the wall sprites
    // either side of a doorway think they're at an open end and render
    // an end-cap, breaking the visual continuity around every door.
    const isWall = (nx, ny) => {
      if (!inBounds(tiles, nx, ny)) return true;
      const t = get(tiles, nx, ny);
      return !!(t?.wall || t?.door);
    };
    const name = resolveDawnLikeDungeonWallName(styles.wall, x, y, isWall, byName);
    if (name) layers.push({ name, z: 2 });
  }

  if (tile.door) {
    const name = tile.door === 'side' ? 'open wooden door side' : 'open wooden door front';
    if (byName[name]) layers.push({ name, z: 2.5 });
  }

  if (tile.fountain && byName['fountain']) {
    layers.push({ name: 'fountain', z: 3 });
  }

  if (tile.flower && byName[tile.flower]) {
    layers.push({ name: tile.flower, z: 0.6 });
  }

  if (tile.furniture && byName[tile.furniture]) {
    layers.push({ name: tile.furniture, z: 1.5 });
  }

  if (tile.sign && byName[tile.sign]) {
    layers.push({ name: tile.sign, z: 2.6 });
  }

  if (tile.npc && byName[tile.npc]) {
    layers.push({ name: tile.npc, z: 3.5 });
  }

  if (tile.marker === 'worldExit' && byName['small stairs up']) {
    layers.push({ name: 'small stairs up', z: 3 });
  }

  if (tile.tree && !tile.street && !tile.wall && !tile.floor && !tile.door) {
    const isTree = (nx, ny) => !!get(tiles, nx, ny)?.tree;
    layers.push({
      name: resolveDawnLikeForestName(styles.tree, {
        n: isTree(x, y - 1), s: isTree(x, y + 1), e: isTree(x + 1, y), w: isTree(x - 1, y),
        nw: isTree(x - 1, y - 1), ne: isTree(x + 1, y - 1),
        sw: isTree(x - 1, y + 1), se: isTree(x + 1, y + 1),
      }, byName).name,
      z: 4,
    });
  }

  return layers;
}

/**
 * Render layers for a DUNGEON tile.
 *
 * Tile schema (dungeon): { wall: bool, floor: bool, marker: 'stairsUp'|
 *   'stairsDown' }. The dungeon-wall autotile treats OOB as wall so the
 *   border closes cleanly.
 */
export function renderDungeonTile(tiles, x, y, styles, byName) {
  const tile = get(tiles, x, y);
  if (!tile) return [];
  const layers = [];

  if (tile.floor) {
    const isFloor = (nx, ny) => !!get(tiles, nx, ny)?.floor;
    layers.push({
      name: resolveDawnLikeFloorName(styles.floor, {
        n: isFloor(x, y - 1), s: isFloor(x, y + 1),
        e: isFloor(x + 1, y), w: isFloor(x - 1, y),
      }, byName).name,
      z: 0,
    });
  }

  if (tile.wall) {
    // Doors count as walls. The current dungeon generator doesn't emit
    // door tiles, but future expansions (vault doors, locked rooms) will,
    // and treating them as walls here avoids broken end-caps when they
    // do — matches the town renderer's behaviour.
    const isWall = (nx, ny) => {
      if (!inBounds(tiles, nx, ny)) return true;
      const t = get(tiles, nx, ny);
      return !!(t?.wall || t?.door);
    };
    const name = resolveDawnLikeDungeonWallName(styles.wall, x, y, isWall, byName);
    if (name) layers.push({ name, z: 2 });
  }

  if (tile.marker === 'stairsUp' && byName['small stairs up']) {
    layers.push({ name: 'small stairs up', z: 3 });
  } else if (tile.marker === 'stairsDown' && byName['small stairs down']) {
    layers.push({ name: 'small stairs down', z: 3 });
  }

  return layers;
}
