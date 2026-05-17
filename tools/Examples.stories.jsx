import React from 'react';
import { resolveAssetPath } from '../utils/paths';

export default {
  title: 'DawnLike/Examples',
  parameters: {
    layout: 'fullscreen',
  },
};

// Dungeon Example
export const DungeonMap = {
  render: () => (
    <div>
      <div style={{ padding: '20px' }}>
        <h1>Dungeon Map Example</h1>
        <p>
          <strong>File:</strong> <code>Examples/Dungeon.tmx</code> (Tiled map format)
        </p>
        <p>
          A complete 32×32 tile dungeon level created with Tiled, showcasing:
        </p>
        <ul>
          <li>Floor tiles (Objects/Floor.png frames)</li>
          <li>Wall patterns (Objects/Wall.png auto-tiling)</li>
          <li>Door placement (Objects/Door0.png)</li>
          <li>Pillars and decor (Objects/Decor0.png)</li>
          <li>Treasure chests (Objects/Chest0.png)</li>
          <li>Enemy placement hints</li>
        </ul>
      </div>

      <div style={{ padding: '20px', background: '#f0f0f0' }}>
        <h3>Loading the Map in Phaser</h3>
        <pre style={{ background: '#fff', padding: '10px', overflow: 'auto' }}>
{`// Load Tiled map
this.load.tilemapTiledJSON('dungeonMap', 'Examples/Dungeon.tmx');

// Load required tilesets
this.load.spritesheet('floor', 'Objects/Floor.png', {frameWidth: 16, frameHeight: 16});
this.load.spritesheet('walls', 'Objects/Wall.png', {frameWidth: 16, frameHeight: 16});
this.load.spritesheet('doors', 'Objects/Door0.png', {frameWidth: 16, frameHeight: 16});
this.load.spritesheet('decor', 'Objects/Decor0.png', {frameWidth: 16, frameHeight: 16});
this.load.spritesheet('chest', 'Objects/Chest0.png', {frameWidth: 16, frameHeight: 16});

// In create():
const map = this.make.tilemap({ key: 'dungeonMap' });
const floorLayer = map.createLayer(0, tileset, 0, 0);
const wallLayer = map.createLayer(1, tileset, 0, 0);

// Collision layers
wallLayer.setCollisionByExclusion([-1]);
this.physics.add.collider(player, wallLayer);`}
        </pre>
      </div>

      <div style={{ padding: '20px' }}>
        <h3>Visual Preview</h3>
        <img
          src={resolveAssetPath('/Examples/Dungeon.gif')}
          alt="Dungeon map preview"
          style={{ maxWidth: '100%', imageRendering: 'pixelated', border: '2px solid #333' }}
        />
      </div>
    </div>
  ),
};

// Town Map
export const TownMap = {
  render: () => (
    <div>
      <div style={{ padding: '20px' }}>
        <h1>Town/Village Map Example</h1>
        <p>
          <strong>File:</strong> <code>Examples/Town.tmx</code> (Tiled map format)
        </p>
        <p>
          An overworld town layout with buildings, roads, and NPCs, featuring:
        </p>
        <ul>
          <li>Grass and dirt floor tiles (Objects/Map0.png or Floor.png variants)</li>
          <li>Building structures (Objects/Roof0.png, Objects/Wall.png)</li>
          <li>Roads and pathways</li>
          <li>Town furniture and decor (Objects/Decor0.png)</li>
          <li>NPC placement areas (Objects/Humanoid0.png positions)</li>
          <li>Shops and gathering places</li>
        </ul>
      </div>

      <div style={{ padding: '20px', background: '#f0f0f0' }}>
        <h3>Key Differences from Dungeon Maps</h3>
        <ul>
          <li><strong>Larger area:</strong> Towns are typically 40×40+ tiles</li>
          <li><strong>Different tileset:</strong> Uses Map0.png for outdoor tiles instead of dungeon floors</li>
          <li><strong>NPC interactions:</strong> Mark positions for townspeople, merchants, quest-givers</li>
          <li><strong>Buildings:</strong> Use composite tiles and layering for roofs/walls</li>
          <li><strong>Lighting:</strong> Outdoor ambient lighting instead of torch-lit interiors</li>
        </ul>
      </div>

      <div style={{ padding: '20px' }}>
        <h3>Visual Preview</h3>
        <img
          src={resolveAssetPath('/Examples/Town.gif')}
          alt="Town map preview"
          style={{ maxWidth: '100%', imageRendering: 'pixelated', border: '2px solid #333' }}
        />
      </div>
    </div>
  ),
};

// Mine Example
export const MineMap = {
  render: () => (
    <div>
      <div style={{ padding: '20px' }}>
        <h1>Mine/Cave Map Example</h1>
        <p>
          <strong>File:</strong> <code>Examples/Mine.tmx</code> (Tiled map format)
        </p>
        <p>
          Underground mining tunnels and cave systems, featuring:
        </p>
        <ul>
          <li>Stone/rock floor tiles (Objects/Ore0.png, Objects/Hill0.png)</li>
          <li>Cave walls and formations</li>
          <li>Ore deposits (Objects/Ore0.png frames)</li>
          <li>Mining equipment and decor</li>
          <li>Multiple depth levels (2D pseudo-3D)</li>
          <li>Cave creatures and enemies</li>
        </ul>
      </div>

      <div style={{ padding: '20px', background: '#f0f0f0' }}>
        <h3>Underground Design Tips</h3>
        <ul>
          <li>Use darker color palette for cave authenticity</li>
          <li>Layer overlapping walls for depth perception</li>
          <li>Add torches/light sources (Objects/Fire0.png or GUI elements)</li>
          <li>Include ore veins for mining gameplay</li>
          <li>Create multi-level layouts with stairs (Objects/Door0.png or special markers)</li>
        </ul>
      </div>

      <div style={{ padding: '20px' }}>
        <h3>Visual Preview</h3>
        <img
          src={resolveAssetPath('/Examples/Mine.gif')}
          alt="Mine map preview"
          style={{ maxWidth: '100%', imageRendering: 'pixelated', border: '2px solid #333' }}
        />
      </div>
    </div>
  ),
};

// Underworld Example
export const UnderworldMap = {
  render: () => (
    <div>
      <div style={{ padding: '20px' }}>
        <h1>Underworld/Dungeon Boss Area Map Example</h1>
        <p>
          <strong>File:</strong> <code>Examples/Underworld.tmx</code> (Tiled map format)
        </p>
        <p>
          A dark, ominous deep dungeon or underworld level with:
        </p>
        <ul>
          <li>Gothic/dark aesthetic flooring</li>
          <li>Demonic architecture and designs</li>
          <li>Lava or hazard tiles (Objects/Fire0.png, Lava tiles)</li>
          <li>Boss arena design</li>
          <li>Cursed or magical elements</li>
          <li>Undead and demonic enemies (Characters/Undead0.png, Characters/Demon0.png)</li>
        </ul>
      </div>

      <div style={{ padding: '20px', background: '#f0f0f0' }}>
        <h3>Dark Dungeon Design Elements</h3>
        <ul>
          <li>Use red/orange tones for lava hazards</li>
          <li>Add purple/dark effects for magical corruption</li>
          <li>Include boss arena with circular or ritual geometry</li>
          <li>Add dangerous environmental hazards</li>
          <li>Layer multiple shadow/darkness effects</li>
        </ul>
      </div>

      <div style={{ padding: '20px' }}>
        <h3>Visual Preview</h3>
        <img
          src={resolveAssetPath('/Examples/Underworld.gif')}
          alt="Underworld map preview"
          style={{ maxWidth: '100%', imageRendering: 'pixelated', border: '2px solid #333' }}
        />
      </div>
    </div>
  ),
};

// Logo/Composition
export const LogoComposition = {
  render: () => (
    <div>
      <div style={{ padding: '20px' }}>
        <h1>DawnLike Logo Composition</h1>
        <p>
          <strong>File:</strong> <code>Examples/Logo.png</code> (Single image, not a tileset)
        </p>
        <p>
          A professional showcase composition demonstrating DawnLike sprites in action:
        </p>
        <ul>
          <li>Character sprites positioned professionally</li>
          <li>Item and equipment display</li>
          <li>Environmental context</li>
          <li>Color palette consistency</li>
          <li>Artistic layout and composition</li>
        </ul>
      </div>

      <div style={{ padding: '20px', background: '#f0f0f0' }}>
        <h3>Using as Game Asset</h3>
        <pre style={{ background: '#fff', padding: '10px', overflow: 'auto' }}>
{`// Load as single image (NOT spritesheet)
this.load.image('dawnlikeLogo', 'Examples/Logo.png');

// Use for title screen
const logo = this.add.image(centerX, 200, 'dawnlikeLogo');
logo.setScale(0.8);

// Or as menu background
const bg = this.add.image(centerX, centerY, 'dawnlikeLogo');
bg.setDepth(-1);
bg.setAlpha(0.3); // Semi-transparent background`}
        </pre>
      </div>

      <div style={{ padding: '20px' }}>
        <h3>Visual Preview</h3>
        <img
          src={resolveAssetPath('/Examples/Logo.png')}
          alt="DawnLike logo composition"
          style={{ maxWidth: '100%', imageRendering: 'pixelated', border: '2px solid #333' }}
        />
      </div>
    </div>
  ),
};

// Blank Template
export const BlankTemplate = {
  render: () => (
    <div>
      <div style={{ padding: '20px' }}>
        <h1>Blank Tiled Map Template</h1>
        <p>
          <strong>File:</strong> <code>Examples/Blank.tmx</code> (Tiled map format)
        </p>
        <p>
          An empty Tiled map template for creating your own custom levels:
        </p>
        <ul>
          <li>Preconfigured tileset references</li>
          <li>Empty layers ready for tile placement</li>
          <li>Proper grid configuration (16×16 tiles)</li>
          <li>Collision layer setup</li>
          <li>Object layer for entities and NPCs</li>
        </ul>
      </div>

      <div style={{ padding: '20px', background: '#f0f0f0' }}>
        <h3>Creating Custom Maps with Tiled</h3>
        <ol>
          <li>Install Tiled map editor (free at mapeditor.org)</li>
          <li>Open Examples/Blank.tmx as template</li>
          <li>Add DawnLike tilesets:
            <ul>
              <li>Objects/Floor.png - Ground/floor tiles</li>
              <li>Objects/Wall.png - Wall tiles with auto-tiling</li>
              <li>Objects/Door0.png - Doors and transitions</li>
              <li>Objects/Decor0.png - Furniture and decoration</li>
            </ul>
          </li>
          <li>Paint tiles on your layers</li>
          <li>Add object layer for NPCs, enemies, items</li>
          <li>Save as .tmx file</li>
          <li>Load in Phaser with tilemapTiledJSON</li>
        </ol>
      </div>

      <div style={{ padding: '20px' }}>
        <h3>Getting Started with Tiled</h3>
        <p>
          See <code>AI_TILED_MAP_GUIDE.md</code> in the project root for detailed instructions on:
        </p>
        <ul>
          <li>Setting up Tiled with DawnLike</li>
          <li>Using auto-tiling for walls</li>
          <li>Creating collision layers</li>
          <li>Placing objects and entities</li>
          <li>Exporting for Phaser</li>
        </ul>
      </div>
    </div>
  ),
};

// Ideas/Inspiration
export const Ideas = {
  render: () => (
    <div>
      <div style={{ padding: '20px' }}>
        <h1>Ideas & Inspiration Gallery</h1>
        <p>
          <strong>File:</strong> <code>Examples/Ideas.gif</code>
        </p>
        <p>
          A collection of design ideas and inspiration showcasing different ways to use DawnLike assets
        </p>
      </div>

      <div style={{ padding: '20px' }}>
        <h3>Visual Inspiration</h3>
        <img
          src={resolveAssetPath('/Examples/Ideas.gif')}
          alt="Ideas and inspiration"
          style={{ maxWidth: '100%', imageRendering: 'pixelated', border: '2px solid #333' }}
        />
      </div>
    </div>
  ),
};
