import React from 'react';
import { SpriteSheet } from '../components/SpriteSheet';

export default {
  title: 'Nature Pack',
  parameters: {
    layout: 'fullscreen',
  },
};

export const AllNatureItems = {
  name: 'Complete Collection (100 Items)',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/nature/global.png"
        title="100 Nature Things"
        description="Complete nature asset collection: 10 trees (16×32), plus leaves, nuts, bushes, flowers, mushrooms, rocks, crystals, bugs, and butterflies (16×16 each)."
        columns={10}
        tileSize={16}
        defaultScale={3}
      />
      <div style={{ padding: '20px', background: '#e8f5e9' }}>
        <h3>🌿 Category Layout</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          <div>
            <strong>Rows 0-1:</strong> Trees (16×32 pixels)
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Apple, Orange, Birch, Pine, Plum</li>
              <li>Pear, Dragon, Cherry Blossom, Cursed, Dead Oak</li>
            </ul>
          </div>
          <div>
            <strong>Row 2:</strong> Leaves
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Matching leaves for each tree type</li>
              <li>Plus autumn variants (orange, red, yellow)</li>
            </ul>
          </div>
          <div>
            <strong>Row 3:</strong> Nuts
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Hazelnut, Walnut, Almond, Cashew, Macadamia</li>
              <li>Peanut, Pecan, Brazil Nut, Pistachio, Pine Nut</li>
            </ul>
          </div>
          <div>
            <strong>Row 4:</strong> Bushes
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Raspberry, Winter Creeper, Hydrangea</li>
              <li>Persian Shield, Juniper, Dwarf Spruce, etc.</li>
            </ul>
          </div>
          <div>
            <strong>Row 5:</strong> Flowers
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Hedgenettle, Dandelion, Knapweed, Poppy</li>
              <li>Chamomile, Foxglove, Mallow, Tansy, etc.</li>
            </ul>
          </div>
          <div>
            <strong>Row 6:</strong> Mushrooms
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Button, Crimini, Shiitake, King Oyster</li>
              <li>Enoki, Beech, Chanterelle, Morel, Death Cap</li>
            </ul>
          </div>
          <div>
            <strong>Row 7:</strong> Rocks & Minerals
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Chalk, Mudstone, Gold, Silver, Copper</li>
              <li>Diabase, Soapstone, Obsidian, Pumice, Scoria</li>
            </ul>
          </div>
          <div>
            <strong>Row 8:</strong> Crystals
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Rose Quartz, Jasper, Citrine, Turquoise</li>
              <li>Tiger Eye, Amethyst, Moonstone, Sapphire, etc.</li>
            </ul>
          </div>
          <div>
            <strong>Row 9:</strong> Bugs
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Ladybug, Bee, Spider, Pill Bug, Grasshopper</li>
              <li>Luna Moth, Death Head Moth, Dragonfly, etc.</li>
            </ul>
          </div>
          <div>
            <strong>Row 10:</strong> Butterflies
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Monarch, Peacock, Zebra Swallowtail</li>
              <li>Red Admiral, Morpho, Julia, and more</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const WithShadows = {
  name: 'With Pre-rendered Shadows',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/nature/global_shadow.png"
        title="Nature Items with Shadows"
        description="Same 100 items with pre-rendered drop shadows for quick integration."
        columns={10}
        tileSize={16}
        defaultScale={3}
      />
      <div style={{ padding: '20px', background: '#f5f5f5' }}>
        <h4>💡 Shadow Usage</h4>
        <p>Use these sprites when you want instant drop shadows without additional rendering.
        The shadow version has slightly larger dimensions to accommodate the shadows.</p>
      </div>
    </div>
  ),
};

export const GlowEffect = {
  name: 'Glow Overlay Effect',
  render: () => (
    <div style={{ padding: '40px' }}>
      <h2>Glow Effect Sprite</h2>
      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
        <div>
          <h4>Glow Overlay (16×16)</h4>
          <img
            src="/asset-packs/nature/glow.png"
            alt="Glow effect"
            style={{
              imageRendering: 'pixelated',
              transform: 'scale(8)',
              transformOrigin: 'top left',
              marginBottom: '100px'
            }}
          />
        </div>
        <div style={{ maxWidth: '400px' }}>
          <h4>Usage</h4>
          <p>Layer this glow sprite over any nature item with additive blending to create magical/collectible effects:</p>
          <pre style={{ background: '#263238', color: '#aed581', padding: '15px', borderRadius: '4px' }}>
{`// Phaser example
const glow = this.add.sprite(x, y, 'glow');
glow.setBlendMode(Phaser.BlendModes.ADD);
glow.setAlpha(0.7);

// Pulse animation
this.tweens.add({
  targets: glow,
  alpha: { from: 0.3, to: 0.8 },
  duration: 500,
  yoyo: true,
  repeat: -1
});`}
          </pre>
        </div>
      </div>
    </div>
  ),
};

export const CategoryBreakdown = {
  name: 'Category Reference',
  render: () => (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h2>Nature Pack - Frame Reference</h2>
      <p>Use these coordinates to extract specific items:</p>

      <div style={{ marginTop: '20px' }}>
        <h3>Frame Calculation</h3>
        <pre style={{ background: '#263238', color: '#aed581', padding: '15px', borderRadius: '4px' }}>
{`// For standard items (16×16):
const frame = (row * 10) + column;

// Category row offsets (trees use rows 0-1):
const CATEGORIES = {
  TREES: 0,      // Special: 16×32, use columns 0-9
  LEAVES: 2,     // Row 2
  NUTS: 3,       // Row 3
  BUSHES: 4,     // Row 4
  FLOWERS: 5,    // Row 5
  MUSHROOMS: 6,  // Row 6
  ROCKS: 7,      // Row 7
  CRYSTALS: 8,   // Row 8
  BUGS: 9,       // Row 9
  BUTTERFLIES: 10 // Row 10
};

// Example: Get Amethyst crystal (row 8, column 5)
const amethystFrame = (8 * 10) + 5; // = 85`}
        </pre>
      </div>

      <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px' }}>
          <h4>🎮 Game Ideas</h4>
          <ul>
            <li><strong>Resource Gathering:</strong> Collect nuts, mushrooms, crystals</li>
            <li><strong>Crafting System:</strong> Combine items (flowers + crystals = potions)</li>
            <li><strong>Collection Quest:</strong> Find all 100 items</li>
            <li><strong>Environment Decoration:</strong> Trees, bushes, flowers</li>
          </ul>
        </div>
        <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px' }}>
          <h4>🦋 Animation Ideas</h4>
          <ul>
            <li><strong>Butterflies:</strong> Random flight paths</li>
            <li><strong>Bugs:</strong> Crawling on ground layer</li>
            <li><strong>Leaves:</strong> Falling particle effects</li>
            <li><strong>Crystals:</strong> Sparkle with glow overlay</li>
          </ul>
        </div>
      </div>
    </div>
  ),
};
