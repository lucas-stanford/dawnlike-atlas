import React from 'react';
import { SpriteSheet } from '../components/SpriteSheet';

export default {
  title: 'DawnLike/Objects',
  parameters: {
    layout: 'fullscreen',
  },
};

export const Floors = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Objects/Floor.png"
        title="Floor Tiles - 48 Different Types"
        description="Comprehensive floor tileset including stone, cobblestone, wooden planks, grass, sand, desert, snow, ice, lava, water, carpet, and dungeon floors with variations."
        columns={21}
        tileSize={16}
        defaultScale={2}
        animated={false}
      />
      <div style={{ padding: '20px', background: '#e8f5e9' }}>
        <h3>🏗️ Floor Types Included</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <h4>Stone & Dungeon</h4>
            <ul>
              <li>Smooth stone</li>
              <li>Cobblestone</li>
              <li>Cracked stone</li>
              <li>Dark dungeon</li>
            </ul>
          </div>
          <div>
            <h4>Natural</h4>
            <ul>
              <li>Grass (various)</li>
              <li>Sand & desert</li>
              <li>Snow & ice</li>
              <li>Dirt paths</li>
            </ul>
          </div>
          <div>
            <h4>Special</h4>
            <ul>
              <li>Wooden planks</li>
              <li>Carpets & rugs</li>
              <li>Lava textures</li>
              <li>Water surfaces</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const Walls = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Objects/Wall.png"
        title="Wall Tiles - 48 Different Types with Auto-Tiling"
        description="Massive wall tileset with auto-tiling support. Each wall type has 16 tiles (4×4 pattern) for seamless connections. Includes stone, brick, wood, crystal, metal, ice, organic, and more."
        columns={21}
        tileSize={16}
        defaultScale={2}
        animated={false}
      />
      <div style={{ padding: '20px', background: '#fff3e0' }}>
        <h3>4x4 Auto-Tiling Pattern (16 tiles per wall type)</h3>
        <p>Each wall type uses a 16-tile pattern (4x4 grid) for proper connections:</p>
        <div style={{ fontFamily: 'monospace', background: '#fff', padding: '15px', borderRadius: '4px', marginTop: '10px', lineHeight: '1.6' }}>
          <div>    Col 0     Col 1     Col 2     Col 3</div>
          <div>  +---------+---------+---------+---------+</div>
          <div>  | TL-OUT  | T-EDGE  | TR-OUT  | V-TOP   |  Outer corners & vertical cap</div>
          <div>  +---------+---------+---------+---------+</div>
          <div>  | L-EDGE  | CENTER  | R-EDGE  | V-MID   |  Edges & center fill</div>
          <div>  +---------+---------+---------+---------+</div>
          <div>  | BL-OUT  | B-EDGE  | BR-OUT  | V-BOT   |  Outer corners & vertical cap</div>
          <div>  +---------+---------+---------+---------+</div>
          <div>  | H-LEFT  | PILLAR  | H-RIGHT | SINGLE  |  Horizontal caps & isolated</div>
          <div>  +---------+---------+---------+---------+</div>
        </div>
        <div style={{ marginTop: '15px', fontSize: '0.9em' }}>
          <strong>Key:</strong> TL=Top-Left, TR=Top-Right, BL=Bottom-Left, BR=Bottom-Right,
          V=Vertical, H=Horizontal, OUT=Outer corner
        </div>
        <h4 style={{ marginTop: '20px' }}>Wall Types (19 varieties):</h4>
        <ul style={{ columns: 3 }}>
          <li>Gray Stone</li>
          <li>Red Brick</li>
          <li>Dark Stone</li>
          <li>Blue Stone</li>
          <li>Wooden</li>
          <li>Marble</li>
          <li>Sandstone</li>
          <li>Ice</li>
          <li>Metal</li>
          <li>Cave</li>
          <li>Dark Brick</li>
          <li>Green Stone</li>
          <li>Red Stone</li>
          <li>Purple Stone</li>
          <li>Limestone</li>
          <li>Rough Stone</li>
          <li>Crystal</li>
          <li>Volcanic Rock</li>
          <li>Decorated Stone</li>
        </ul>
      </div>
    </div>
  ),
};

export const Effects = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Objects/Effect0.png"
        title="Effects & Magic (Frame 0)"
        description="Visual effects for spells, combat, and environmental hazards. Includes magic circles, explosions, elemental effects, status indicators, and splatter."
        columns={8}
        tileSize={16}
        defaultScale={3}
        animated={true}
        animationPair="/Objects/Effect1.png"
      />
      <div style={{ padding: '20px', background: '#e1f5fe' }}>
        <h3>✨ Effect Categories</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <h4>Magic & Spells</h4>
            <ul>
              <li>Magic circles (various sizes)</li>
              <li>Spell casting effects</li>
              <li>Energy orbs</li>
              <li>Beam indicators</li>
            </ul>
          </div>
          <div>
            <h4>Combat</h4>
            <ul>
              <li>Explosions & impacts</li>
              <li>Slash effects</li>
              <li>Arrow indicators</li>
              <li>Hit sparks</li>
            </ul>
          </div>
          <div>
            <h4>Elemental</h4>
            <ul>
              <li>Fire effects</li>
              <li>Ice/frost</li>
              <li>Lightning bolts</li>
              <li>Water splashes</li>
            </ul>
          </div>
          <div>
            <h4>Status & Misc</h4>
            <ul>
              <li>Poison clouds</li>
              <li>Healing auras</li>
              <li>Blood splatter</li>
              <li>Slime splatter</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const Doors = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Objects/Door0.png"
        title="Doors (Closed - Frame 0)"
        description="Doors and entryways: wooden doors, metal doors, ornate doors, archways. Frame 0 = closed, Frame 1 = open."
        columns={8}
        tileSize={16}
        defaultScale={4}
        animated={true}
        animationPair="/Objects/Door1.png"
      />
      <div style={{ padding: '20px', background: '#f3e5f5' }}>
        <h3>🚪 Door Animation</h3>
        <p>
          Doors use a 2-frame system:<br/>
          • <strong>Door0.png</strong> - Closed state<br/>
          • <strong>Door1.png</strong> - Open state<br/>
          Switch between textures when player interacts with the door.
        </p>
      </div>
    </div>
  ),
};

export const Decorations = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Objects/Decor0.png"
        title="Decorations & Furniture (Frame 0)"
        description="Dungeon and building decorations: furniture, torches, candles, barrels, crates, banners, signs, carpets, windows, jars, and pots."
        columns={8}
        tileSize={16}
        defaultScale={3}
        animated={true}
        animationPair="/Objects/Decor1.png"
      />
      <div style={{ padding: '20px', background: '#fff9c4' }}>
        <h3>🏺 Decoration Categories</h3>
        <ul style={{ columns: 2 }}>
          <li>Tables & chairs</li>
          <li>Beds & shelves</li>
          <li>Barrels & crates</li>
          <li>Torches (animated!)</li>
          <li>Candles & braziers</li>
          <li>Banners & flags</li>
          <li>Signs & plaques</li>
          <li>Carpets & rugs</li>
          <li>Windows & curtains</li>
          <li>Jars & pots</li>
          <li>Bookshelves</li>
          <li>Weapon racks</li>
        </ul>
      </div>
    </div>
  ),
};

export const Trees = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Objects/Tree0.png"
        title="Trees & Vegetation (Frame 0)"
        description="Various tree types: deciduous, coniferous, palm, dead trees with seasonal variations (autumn, winter). Includes fruit trees and all 6 tile configurations for auto-tiling."
        columns={8}
        tileSize={16}
        defaultScale={3}
        animated={true}
        animationPair="/Objects/Tree1.png"
      />
      <div style={{ padding: '20px', background: '#e8f5e9' }}>
        <h3>🌳 Tree Features</h3>
        <ul>
          <li><strong>Multiple Types:</strong> Deciduous, coniferous, palm, dead/barren</li>
          <li><strong>Seasons:</strong> Normal green, autumn colors, winter/snow-covered</li>
          <li><strong>Special:</strong> Fruit-bearing trees, magical trees</li>
          <li><strong>Auto-tiling:</strong> All 6 tile configurations included for forest creation</li>
          <li><strong>Animation:</strong> Gentle swaying leaves (Frame 0 ↔ Frame 1)</li>
        </ul>
      </div>
    </div>
  ),
};

export const Traps = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Objects/Trap0.png"
        title="Traps (Inactive - Frame 0)"
        description="Dungeon traps and hazards: spike traps, arrow traps, floor spears, pressure plates, bear traps. Frame 0 = inactive, Frame 1 = activated."
        columns={8}
        tileSize={16}
        defaultScale={4}
        animated={true}
        animationPair="/Objects/Trap1.png"
      />
      <div style={{ padding: '20px', background: '#ffebee' }}>
        <h3>⚠️ Trap Mechanics</h3>
        <p>
          All traps use a 2-frame system for triggering:<br/>
          • <strong>Frame 0</strong> - Hidden/Inactive/Safe state<br/>
          • <strong>Frame 1</strong> - Triggered/Active/Dangerous state
        </p>
        <h4>Trap Types:</h4>
        <ul>
          <li>Spike traps (retractable)</li>
          <li>Floor spears</li>
          <li>Arrow/dart traps</li>
          <li>Pressure plates</li>
          <li>Bear traps</li>
          <li>Hidden pit covers</li>
        </ul>
      </div>
    </div>
  ),
};

export const Pits = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Objects/Pit0.png"
        title="Pits & Hazards (Frame 0)"
        description="Holes, pits, chasms, and environmental hazards. Includes animated lava pits and water. Some pits match wall types for cohesive theming."
        columns={8}
        tileSize={16}
        defaultScale={3}
        animated={true}
        animationPair="/Objects/Pit1.png"
      />
      <div style={{ padding: '20px', background: '#e0f2f1' }}>
        <h3>🕳️ Pit Types</h3>
        <ul>
          <li><strong>Standard Pits:</strong> Chasms, holes, void spaces</li>
          <li><strong>Lava Pits:</strong> Animated flowing lava (deadly!)</li>
          <li><strong>Water Pits:</strong> Animated rippling water</li>
          <li><strong>Spike Pits:</strong> Pits with spikes at bottom</li>
          <li><strong>Themed Pits:</strong> Match various wall styles for consistency</li>
        </ul>
      </div>
    </div>
  ),
};

export const Ores = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Objects/Ore0.png"
        title="Ore & Minerals (Frame 0)"
        description="12 different animated mineral deposits: copper, iron, gold, gems, crystals. Features glimmering/pulsing animation."
        columns={8}
        tileSize={16}
        defaultScale={4}
        animated={true}
        animationPair="/Objects/Ore1.png"
      />
      <div style={{ padding: '20px', background: '#fff3e0' }}>
        <h3>⛏️ Mining Resources</h3>
        <p>Animated ore deposits for resource gathering and mining mechanics.</p>
        <h4>Mineral Types:</h4>
        <ul style={{ columns: 2 }}>
          <li>Copper ore</li>
          <li>Iron ore</li>
          <li>Silver ore</li>
          <li>Gold ore</li>
          <li>Gemstones (various colors)</li>
          <li>Crystals (magical)</li>
          <li>Coal/dark minerals</li>
          <li>Rare minerals</li>
        </ul>
      </div>
    </div>
  ),
};

export const Map_Objects = {
  name: 'Map Objects',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Objects/Map0.png"
        title="Overworld Map Objects (Frame 0)"
        description="Objects for world maps and strategic views: castles, villages, buildings, bridges, roads, city symbols. Features animated flags and smoke."
        columns={8}
        tileSize={16}
        defaultScale={4}
        animated={true}
        animationPair="/Objects/Map1.png"
      />
      <div style={{ padding: '20px', background: '#e8eaf6' }}>
        <h3>🗺️ World Map Elements</h3>
        <ul>
          <li><strong>Structures:</strong> Castles, fortifications, villages, towns</li>
          <li><strong>Transportation:</strong> Bridges, roads, paths</li>
          <li><strong>Symbols:</strong> City markers, location icons</li>
          <li><strong>Animated:</strong> Flags waving, chimney smoke</li>
        </ul>
      </div>
    </div>
  ),
};

export const Ground = {
  render: () => (
    <SpriteSheet
      imagePath="/Objects/Ground0.png"
      title="Ground Terrain (Frame 0)"
      description="Farmland, tilled earth, and dirt paths. Perfect for agricultural areas and gardens."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={true}
      animationPair="/Objects/Ground1.png"
    />
  ),
};

export const Hills = {
  render: () => (
    <SpriteSheet
      imagePath="/Objects/Hill0.png"
      title="Hills & Elevation (Frame 0)"
      description="Terrain elevation features: hills, dunes, mounds. Indicates height in overworld maps."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={true}
      animationPair="/Objects/Hill1.png"
    />
  ),
};

export const Fences = {
  render: () => (
    <SpriteSheet
      imagePath="/Objects/Fence.png"
      title="Fences & Low Walls"
      description="Wooden fences and low stone walls. Perfect for property boundaries and farm areas."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Tiles = {
  render: () => (
    <SpriteSheet
      imagePath="/Objects/Tile.png"
      title="Miscellaneous Tiles"
      description="Additional tiling options: hexes, special floor patterns, and unique tile markers."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

// ── Combined Atlases ──────────────────────────────────────────────────────────

export const CombinedAtlas = {
  name: 'Combined Atlas (8-col Sprites)',
  render: () => (
    <SpriteSheet
      imagePath="/atlas/ObjectsAtlas0.png"
      title="Objects — Combined Atlas (8-col sprite groups)"
      description="Decor, Doors, Effects, Fence, Ground, Pit, Tile, and Traps stacked into a single 128×1920px sheet. 659 named sprites. Toggle animation for idle/alt frames."
      columns={8}
      tileSize={16}
      defaultScale={2}
      animated={true}
      animationPair="/atlas/ObjectsAtlas1.png"
      instructionsPath="/atlas/ObjectsAtlas.instructions.md"
    />
  ),
};

export const CombinedAtlasTerrain = {
  name: 'Combined Atlas (Terrain)',
  render: () => (
    <SpriteSheet
      imagePath="/atlas/ObjectsTerrainAtlas0.png"
      title="Objects — Combined Terrain Atlas (all groups)"
      description="All 15 object groups including Floor (21-col), Wall (20-col), Hill (16-col), Map/Tree (12-col), and Ore (9-col) combined into a 336×4576px sheet. 2221 named sprites. Narrower groups are left-aligned with transparent padding."
      columns={21}
      tileSize={16}
      defaultScale={2}
      animated={true}
      animationPair="/atlas/ObjectsTerrainAtlas1.png"
      instructionsPath="/atlas/ObjectsTerrainAtlas.instructions.md"
    />
  ),
};
