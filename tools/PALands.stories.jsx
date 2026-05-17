import React from 'react';
import { SpriteSheet } from '../components/SpriteSheet';

export default {
  title: 'PALands (Post-Apocalyptic)',
  parameters: {
    layout: 'fullscreen',
  },
};

export const MainTerrain = {
  name: 'Main Terrain (16x16)',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/palands/16x16/_PNG/main_lev.png"
        title="Main Terrain Tileset"
        description="Primary terrain: dirt, grass, snow, asphalt roads, rubble. Designed for auto-tiling in Tiled."
        columns={80}
        tileSize={16}
        defaultScale={2}
      />
      <div style={{ padding: '20px', background: '#efebe9' }}>
        <h3>🏜️ Terrain Types</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          <div>
            <h4>Ground</h4>
            <ul>
              <li>Brown dirt (various textures)</li>
              <li>Green grass</li>
              <li>Snow/ice</li>
              <li>Transition edges</li>
            </ul>
          </div>
          <div>
            <h4>Roads</h4>
            <ul>
              <li>Cracked asphalt</li>
              <li>Damaged concrete</li>
              <li>Road edges</li>
              <li>Faded markings</li>
            </ul>
          </div>
          <div>
            <h4>Debris</h4>
            <ul>
              <li>Rubble piles</li>
              <li>Broken concrete</li>
              <li>Scattered rocks</li>
              <li>Destruction overlays</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const TerrainHills = {
  name: 'Hills & Elevation',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/palands/16x16/_PNG/mainlev_hills.png"
        title="Hills & Elevation Tiles"
        description="Height variation tiles for adding depth and elevation changes to terrain."
        columns={16}
        tileSize={16}
        defaultScale={3}
      />
    </div>
  ),
};

export const Buildings = {
  name: 'Buildings',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/palands/16x16/_PNG/buildings.png"
        title="Building Structures"
        description="Post-apocalyptic building walls, windows, doors, and structural elements."
        columns={16}
        tileSize={16}
        defaultScale={3}
      />
      <div style={{ padding: '20px', background: '#fce4ec' }}>
        <h4>🏚️ Building Elements</h4>
        <ul>
          <li>Damaged walls and facades</li>
          <li>Broken windows</li>
          <li>Rusted doors</li>
          <li>Collapsed sections</li>
        </ul>
      </div>
    </div>
  ),
};

export const BuildingRoofs = {
  name: 'Building Roofs',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/palands/16x16/_PNG/buildings_roofs.png"
        title="Roof Tiles"
        description="Various roof styles and materials for top-down building views."
        columns={16}
        tileSize={16}
        defaultScale={3}
      />
    </div>
  ),
};

export const BuildingFloors = {
  name: 'Building Floors',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/palands/16x16/_PNG/buildings_floors.png"
        title="Interior Floors"
        description="Indoor flooring: tiles, wood, concrete, carpet patterns."
        columns={16}
        tileSize={16}
        defaultScale={3}
      />
    </div>
  ),
};

export const BuildingBasement = {
  name: 'Basement & Underground',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/palands/16x16/_PNG/buildings_basement.png"
        title="Basement Tiles"
        description="Underground and basement areas: concrete, pipes, foundations."
        columns={16}
        tileSize={16}
        defaultScale={3}
      />
    </div>
  ),
};

export const Furniture = {
  name: 'Furniture',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/palands/16x16/_PNG/buildings_furnitures.png"
        title="Interior Furniture"
        description="Indoor objects: tables, chairs, beds, shelves, appliances."
        columns={16}
        tileSize={16}
        defaultScale={3}
      />
    </div>
  ),
};

export const TerrainProps1 = {
  name: 'Terrain Props (Set 1)',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/palands/16x16/_PNG/terrain_props_1.png"
        title="Terrain Props - Set 1"
        description="Environmental objects: trees, bushes, rocks, debris."
        columns={16}
        tileSize={16}
        defaultScale={3}
      />
    </div>
  ),
};

export const TerrainProps2 = {
  name: 'Terrain Props (Set 2)',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/palands/16x16/_PNG/terrain_props_2.png"
        title="Terrain Props - Set 2"
        description="Additional environmental objects and decorations."
        columns={16}
        tileSize={16}
        defaultScale={3}
      />
    </div>
  ),
};

export const DecorativeProps = {
  name: 'Decorative Props',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/palands/16x16/_PNG/dec_props.png"
        title="Decorative Props"
        description="Small decorative objects: signs, debris, scattered items."
        columns={16}
        tileSize={16}
        defaultScale={3}
      />
    </div>
  ),
};

export const Animations = {
  name: 'Animated Objects',
  render: () => (
    <div style={{ padding: '40px' }}>
      <h2>Animated Environmental Objects</h2>

      <div style={{ marginTop: '30px' }}>
        <h3>🔥 Bonfire</h3>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
          <SpriteSheet
            imagePath="/asset-packs/palands/16x16/anim/_PNG/bonfire.png"
            title="Bonfire Animation"
            description="Animated campfire/bonfire sprite sheet."
            columns={4}
            tileSize={16}
            defaultScale={4}
          />
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>🗑️ Burning Trash Can</h3>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
          <SpriteSheet
            imagePath="/asset-packs/palands/16x16/anim/_PNG/trash_can_fire.png"
            title="Burning Trash Can"
            description="Animated burning barrel/trash can."
            columns={4}
            tileSize={16}
            defaultScale={4}
          />
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>🌳 Animated Trees</h3>
        <div style={{ display: 'flex', gap: '30px' }}>
          <div>
            <h4>Tree 1</h4>
            <img
              src="/asset-packs/palands/16x16/anim/_PNG/tree1.png"
              alt="Tree 1"
              style={{ imageRendering: 'pixelated', transform: 'scale(3)', transformOrigin: 'top left' }}
            />
          </div>
          <div>
            <h4>Tree 2</h4>
            <img
              src="/asset-packs/palands/16x16/anim/_PNG/tree2.png"
              alt="Tree 2"
              style={{ imageRendering: 'pixelated', transform: 'scale(3)', transformOrigin: 'top left' }}
            />
          </div>
          <div>
            <h4>Tree 3</h4>
            <img
              src="/asset-packs/palands/16x16/anim/_PNG/tree3.png"
              alt="Tree 3"
              style={{ imageRendering: 'pixelated', transform: 'scale(3)', transformOrigin: 'top left' }}
            />
          </div>
        </div>
      </div>
    </div>
  ),
};

export const HighRes32x32 = {
  name: '32x32 Version',
  render: () => (
    <div style={{ padding: '40px' }}>
      <h2>32×32 High Resolution Variants</h2>
      <p>PALands includes 32×32 versions of all tilesets for higher detail games.</p>

      <div style={{ marginTop: '30px' }}>
        <h3>Main Terrain (32×32)</h3>
        <SpriteSheet
          imagePath="/asset-packs/palands/32x32/_PNG/32x32_main_lev.png"
          title="Main Terrain - 32×32"
          description="High resolution terrain tileset."
          columns={40}
          tileSize={32}
          defaultScale={1}
        />
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Buildings (32×32)</h3>
        <SpriteSheet
          imagePath="/asset-packs/palands/32x32/_PNG/32x32_buildings.png"
          title="Buildings - 32×32"
          description="High resolution building structures."
          columns={8}
          tileSize={32}
          defaultScale={2}
        />
      </div>
    </div>
  ),
};

export const MapBuildingGuide = {
  name: 'Map Building Guide',
  render: () => (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h2>PALands Map Building Guide</h2>

      <div style={{ marginTop: '30px' }}>
        <h3>Recommended Layer Structure</h3>
        <pre style={{ background: '#263238', color: '#aed581', padding: '20px', borderRadius: '8px' }}>
{`Layer 0: Base Terrain (dirt, grass, snow)
Layer 1: Roads/Paths (asphalt, concrete)
Layer 2: Terrain Details (small rocks, grass patches)
Layer 3: Building Floors (interior floors)
Layer 4: Building Walls (walls, windows, doors)
Layer 5: Building Roofs (roof tiles)
Layer 6: Props (furniture, debris)
Layer 7: Decorations (small objects)
Layer 8: Collision (invisible)`}
        </pre>
      </div>

      <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px' }}>
          <h4>🗺️ Tiled Auto-Tiling</h4>
          <ol>
            <li>Create terrain sets for dirt, grass, snow</li>
            <li>Assign corner/edge bits to tiles</li>
            <li>Use terrain brush for seamless blending</li>
            <li>Layer roads on top of base terrain</li>
          </ol>
        </div>
        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px' }}>
          <h4>🏗️ Building Construction</h4>
          <ol>
            <li>Place floor tiles first</li>
            <li>Add walls around perimeter</li>
            <li>Place roof tiles on separate layer</li>
            <li>Add furniture and props</li>
            <li>Scatter debris for destruction</li>
          </ol>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Phaser Integration</h3>
        <pre style={{ background: '#263238', color: '#aed581', padding: '20px', borderRadius: '8px' }}>
{`// Load Tiled JSON map
this.load.tilemapTiledJSON('wasteland', 'maps/wasteland.json');
this.load.image('main_terrain', 'palands/16x16/_PNG/main_lev.png');
this.load.image('buildings', 'palands/16x16/_PNG/buildings.png');
this.load.image('props', 'palands/16x16/_PNG/terrain_props_1.png');

// Create map
const map = this.make.tilemap({ key: 'wasteland' });
const terrainTiles = map.addTilesetImage('main_lev', 'main_terrain');
const buildingTiles = map.addTilesetImage('buildings', 'buildings');

// Create layers
const ground = map.createLayer('Ground', terrainTiles);
const buildings = map.createLayer('Buildings', buildingTiles);

// Set collision
buildings.setCollisionByProperty({ collides: true });`}
        </pre>
      </div>
    </div>
  ),
};
