/**
 * WorldScene.js — the overworld. Player walks around grass / forest /
 * mountain biomes; stepping on the homestead-marker tile enters town;
 * stepping on the fort-marker tile enters the dungeon.
 */

import MapScene from './MapScene.js';
import { generateWorld } from '../generators/world.js';
import { renderWorldTile } from '../autotileRender.js';
import { seedFor } from '../save.js';

const WORLD_STYLES = {
  grass:    'day grass floor',
  dirt:     'day dirt floor',
  road:     'dirt trail',
  river:    'clear river',
  tree:     'light oak',
  mountain: 'brown peak',
};

export default class WorldScene extends MapScene {
  constructor() { super('World'); }

  generate(save) {
    return generateWorld(seedFor('World', save.seed));
  }

  renderTileLayers(tiles, x, y, byName) {
    return renderWorldTile(tiles, x, y, WORLD_STYLES, byName);
  }

  defaultSpawn(map) {
    // Spawn next to the town entrance so the player can see the marker on
    // arrival. Falls back to the road's W edge midpoint if that's blocked.
    const t = map.markers.townEntrance;
    if (t && map.walkable(t.x, t.y + 1)) return { x: t.x, y: t.y + 1 };
    if (t && map.walkable(t.x - 1, t.y)) return { x: t.x - 1, y: t.y };
    for (let y = Math.floor(map.height / 2); y < map.height; y++) {
      if (map.walkable(0, y)) return { x: 0, y };
    }
    return { x: 1, y: 1 };
  }

  handleMarker(marker, map) {
    if (marker === 'town') {
      // Enter town. We don't know where the worldExit ends up yet from
      // here, but TownScene will spawn the player on it on arrival.
      this.transitionTo('Town', null);
    } else if (marker === 'dungeon') {
      this.transitionTo('Dungeon1', null);
    }
  }

  areaLabel() { return 'Overworld'; }
}
