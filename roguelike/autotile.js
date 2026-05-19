/**
 * dawnlike-atlas/roguelike/autotile — sprite-name resolvers that turn a
 * generator's tile grid into an ordered list of atlas sprites per cell.
 *
 * Each render function returns
 *   [{ name: '<atlas sprite key>', z: <depth ordering> }, ...]
 *
 * Pair with `dawnlike-atlas/atlas` (the JSON) or your own loaded atlas
 * object that exposes `byName[<spriteKey>]`.
 *
 * Repo source:
 *   https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/autotileRender.js
 */

export {
  renderWorldTile,
  renderTownTile,
  renderDungeonTile,
} from '../src/phaser/autotileRender.js';

export {
  resolveDawnLikeFloorName,
  resolveDawnLikeWallName,
  resolveDawnLikeRiverName,
  resolveDawnLikeForestName,
  resolveDawnLikeMountainName,
  resolveDawnLikeDungeonWallName,
  resolveDawnLikeBuildingWallName,
} from '../src/utils/autotile.js';
