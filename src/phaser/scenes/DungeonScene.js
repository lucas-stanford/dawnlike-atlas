/**
 * DungeonScene.js — one ROT.Map.Digger dungeon level. The same class is
 * instantiated three times via Phaser's scene config (keys 'Dungeon1',
 * 'Dungeon2', 'Dungeon3'). The level number is parsed from the key.
 *
 * Markers:
 *   - stairsUp on level 1 returns to the overworld at the dungeon entrance.
 *   - stairsUp on level N>1 returns to level N-1.
 *   - stairsDown advances to level N+1 (level 3 has no stairsDown).
 *
 * Player always spawns on the stairs they came in on, so they can step
 * back the other way at will.
 */

import MapScene from './MapScene.js';
import { generateDungeon } from '../generators/dungeon.js';
import { generateWorld } from '../generators/world.js';
import { renderDungeonTile } from '../autotileRender.js';
import { seedFor } from '../save.js';

const DUNGEON_STYLES = {
  floor: 'day brick floor',
  wall:  'bright mine wall',
};

export default class DungeonScene extends MapScene {
  constructor(key) {
    super(key);
    this.level = parseInt(key.replace('Dungeon', ''), 10) || 1;
  }

  /** Build the manifest for this dungeon level, merging registry overrides. */
  buildManifestFor(sceneKey, level, save) {
    const manifests = this.registry.get('manifests') || {};
    return {
      seed: seedFor(sceneKey, save.seed),
      level,
      ...(manifests.dungeon || {}),
    };
  }

  generate(save) {
    return generateDungeon(this.buildManifestFor(this.SCENE_KEY, this.level, save));
  }

  renderTileLayers(tiles, x, y, byName) {
    return renderDungeonTile(tiles, x, y, DUNGEON_STYLES, byName);
  }

  /** Returns the first walkable tile adjacent to `m` (4-direction). */
  adjacentTo(m, map) {
    if (!m) return { x: 1, y: 1 };
    const candidates = [
      { x: m.x + 1, y: m.y },
      { x: m.x - 1, y: m.y },
      { x: m.x,     y: m.y + 1 },
      { x: m.x,     y: m.y - 1 },
    ];
    for (const c of candidates) {
      if (map.walkable(c.x, c.y) && !map.tiles[c.y]?.[c.x]?.marker) return c;
    }
    return m;
  }

  defaultSpawn(map) {
    // Spawn ADJACENT to the stairs-up so the player can see where they
    // came from and step onto the stairs to leave (rather than spawning
    // ON the stairs, which requires a step-off + step-on to re-trigger).
    return this.adjacentTo(map.markers.stairsUp, map);
  }

  handleMarker(marker, map) {
    if (marker === 'stairsUp') {
      if (this.level === 1) {
        // Exit dungeon → back to overworld at the dungeon-entrance tile.
        const save = this.registry.get('save');
        const manifests = this.registry.get('manifests') || {};
        const world = generateWorld({
          seed: seedFor('World', save.seed),
          ...(manifests.world || {}),
        });
        const d = world.markers.dungeonEntrance;
        const spawn = this.adjacentTo(d, world);
        this.transitionTo('World', spawn);
      } else {
        // Up to previous dungeon level — arrive adjacent to its
        // stairsDown so we can step back down at will.
        const prevKey = `Dungeon${this.level - 1}`;
        const save = this.registry.get('save');
        const prev = generateDungeon(this.buildManifestFor(prevKey, this.level - 1, save));
        const spawn = this.adjacentTo(prev.markers.stairsDown || prev.markers.stairsUp, prev);
        this.transitionTo(prevKey, spawn);
      }
    } else if (marker === 'stairsDown') {
      const nextKey = `Dungeon${this.level + 1}`;
      const save = this.registry.get('save');
      const next = generateDungeon(this.buildManifestFor(nextKey, this.level + 1, save));
      const spawn = this.adjacentTo(next.markers.stairsUp, next);
      this.transitionTo(nextKey, spawn);
    }
  }

  areaLabel() { return `Dungeon — Level ${this.level}`; }
}
