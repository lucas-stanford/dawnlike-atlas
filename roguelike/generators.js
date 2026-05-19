/**
 * dawnlike-atlas/roguelike/generators — manifest-driven map generators.
 *
 * Pure functions; no Phaser dependency. Each generator accepts an optional
 * manifest object (see DEFAULT_*_MANIFEST for the shape) and returns
 *
 *   { width, height, tiles, markers, walkable(x,y), manifest }
 *
 * Tile schemas vary per generator:
 *   - world:   { type:'grass'|'dirt', tree, mountain, road, river, bridge, decor, marker }
 *   - town:    { type:'grass'|'street'|'floor'|'wall'|'door', street, wall, floor, door, doorSide, tree, decor, fountain, marker }
 *   - dungeon: { wall, floor, marker }
 *
 * Pair these with `dawnlike-atlas/roguelike/autotile` to turn the tiles into
 * ordered atlas-sprite layer lists for rendering.
 *
 * Repo source:
 *   https://github.com/lucas-stanford/dawnlike-atlas/tree/master/src/phaser/generators
 */

export {
  generateWorld,
  normalizeWorldManifest,
  DEFAULT_WORLD_MANIFEST,
  DEFAULT_WORLD_DECORS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from '../src/phaser/generators/world.js';

export {
  generateTown,
  normalizeTownManifest,
  DEFAULT_TOWN_MANIFEST,
  TOWN_WIDTH,
  TOWN_HEIGHT,
} from '../src/phaser/generators/town.js';

export {
  generateDungeon,
  normalizeDungeonManifest,
  DEFAULT_DUNGEON_MANIFEST,
  DUNGEON_WIDTH,
  DUNGEON_HEIGHT,
} from '../src/phaser/generators/dungeon.js';
