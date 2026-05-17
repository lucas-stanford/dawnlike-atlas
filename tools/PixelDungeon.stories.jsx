import React from 'react';
import { SpriteSheet } from '../components/SpriteSheet';
import { resolveAssetPath } from '../utils/paths';

export default {
  title: 'Pixel Dungeon',
  parameters: {
    layout: 'fullscreen',
  },
};

export const DungeonTileset = {
  name: 'Main Tileset',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/pixel-dungeon/tilesets/Dungeon_Tileset.png"
        title="Dungeon Tileset"
        description="Complete dungeon tileset: walls, floors, doors, decorations, treasures, traps, and interactive objects."
        columns={16}
        tileSize={16}
        defaultScale={3}
      />
      <div style={{ padding: '20px', background: '#f3e5f5' }}>
        <h3>🏰 Tileset Contents</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          <div>
            <h4>Architecture</h4>
            <ul>
              <li>Stone brick walls</li>
              <li>Wall corners & edges</li>
              <li>Purple stone floors</li>
              <li>Doorways & arches</li>
              <li>Columns & pillars</li>
            </ul>
          </div>
          <div>
            <h4>Objects</h4>
            <ul>
              <li>Wooden barrels & crates</li>
              <li>Tables & shelves</li>
              <li>Torches & candles</li>
              <li>Treasure chests</li>
              <li>Potions & scrolls</li>
            </ul>
          </div>
          <div>
            <h4>Interactive</h4>
            <ul>
              <li>Pressure plates</li>
              <li>Levers & switches</li>
              <li>Ladders & stairs</li>
              <li>Spike traps</li>
              <li>Teleporters</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const AutoTileset = {
  name: 'Auto-Tile Version',
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/asset-packs/pixel-dungeon/tilesets/Dungeon_Tileset_at.png"
        title="Dungeon Tileset (Auto-Tile)"
        description="Auto-tiling ready version for seamless wall and floor placement in Tiled or similar editors."
        columns={16}
        tileSize={16}
        defaultScale={3}
      />
      <div style={{ padding: '20px', background: '#e3f2fd' }}>
        <h4>💡 Auto-Tiling Setup</h4>
        <p>This version is organized for auto-tile terrain sets in Tiled Map Editor.
        Use the terrain brush tool for automatic edge selection.</p>
      </div>
    </div>
  ),
};

export const Characters = {
  name: 'Character Sprites',
  render: () => (
    <div>
      <h2 style={{ padding: '20px' }}>Pixel Dungeon Characters</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', padding: '20px' }}>
        <div>
          <SpriteSheet
            imagePath="/asset-packs/pixel-dungeon/characters/Dungeon_Character.png"
            title="Hero Character"
            description="Main player character sprite with idle pose."
            columns={4}
            tileSize={16}
            defaultScale={4}
          />
        </div>
        <div>
          <SpriteSheet
            imagePath="/asset-packs/pixel-dungeon/characters/Dungeon_Character_2.png"
            title="Hero Character (Alt)"
            description="Alternative hero design or animation frame."
            columns={4}
            tileSize={16}
            defaultScale={4}
          />
        </div>
      </div>
      <div>
        <SpriteSheet
          imagePath="/asset-packs/pixel-dungeon/characters/Dungeon_Character_at.png"
          title="Character Animation Sheet"
          description="Full character animation spritesheet for movement and actions."
          columns={8}
          tileSize={16}
          defaultScale={3}
        />
      </div>
    </div>
  ),
};

export const InterfaceButtons = {
  name: 'UI Buttons',
  render: () => (
    <div style={{ padding: '40px' }}>
      <h2>Interface Buttons</h2>
      <p>Direction buttons with 4 states each: Normal, Hover, Pressed, Released</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '30px', marginTop: '30px' }}>
        <div>
          <h4>Left Button</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{ textAlign: 'center' }}>
                <img
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/interface/square_left_${n}.png`)}
                  alt={`Left ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '20px' }}
                />
                <div style={{ fontSize: '12px' }}>{['Normal', 'Hover', 'Pressed', 'Released'][n-1]}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4>Right Button</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{ textAlign: 'center' }}>
                <img
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/interface/square_right_${n}.png`)}
                  alt={`Right ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '20px' }}
                />
                <div style={{ fontSize: '12px' }}>{['Normal', 'Hover', 'Pressed', 'Released'][n-1]}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4>Up/Down Button</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{ textAlign: 'center' }}>
                <img
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/interface/square_up_down_${n}.png`)}
                  alt={`UpDown ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '20px' }}
                />
                <div style={{ fontSize: '12px' }}>{['Normal', 'Hover', 'Pressed', 'Released'][n-1]}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4>Arrow Indicator</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{ textAlign: 'center' }}>
                <img
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/interface/arrow_${n}.png`)}
                  alt={`Arrow ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '20px' }}
                />
                <div style={{ fontSize: '12px' }}>Frame {n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
};

export const Items = {
  name: 'Item Sprites',
  render: () => (
    <div style={{ padding: '40px' }}>
      <h2>Dungeon Items</h2>

      <div style={{ marginTop: '30px' }}>
        <h3>Treasure Chests</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{ textAlign: 'center' }}>
              <img
                src={resolveAssetPath(`/asset-packs/pixel-dungeon/items/chest/chest_${n}.png`)}
                alt={`Chest ${n}`}
                style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
              />
              <div>Closed {n}</div>
            </div>
          ))}
          {[1, 2, 3, 4].map(n => (
            <div key={`open-${n}`} style={{ textAlign: 'center' }}>
              <img
                src={resolveAssetPath(`/asset-packs/pixel-dungeon/items/chest/chest_open_${n}.png`)}
                alt={`Chest Open ${n}`}
                style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
              />
              <div>Open {n}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Keys</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {['1_1', '1_2', '1_3', '1_4', '2_1', '2_2', '2_3', '2_4'].map(n => (
            <div key={n} style={{ textAlign: 'center' }}>
              <img
                src={resolveAssetPath(`/asset-packs/pixel-dungeon/items/keys/keys_${n}.png`)}
                alt={`Key ${n}`}
                style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
              />
              <div>Key {n}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Potions (Flasks)</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {['1_1', '1_2', '2_1', '2_2', '3_1', '3_2', '4_1', '4_2'].map(n => (
            <div key={n} style={{ textAlign: 'center' }}>
              <img
                src={resolveAssetPath(`/asset-packs/pixel-dungeon/items/flasks/flasks_${n}.png`)}
                alt={`Flask ${n}`}
                style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
              />
              <div>Flask {n}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Coins</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{ textAlign: 'center' }}>
              <img
                src={resolveAssetPath(`/asset-packs/pixel-dungeon/items/coin/coin_${n}.png`)}
                alt={`Coin ${n}`}
                style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
              />
              <div>Coin {n}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Torches</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{ textAlign: 'center' }}>
              <img
                src={resolveAssetPath(`/asset-packs/pixel-dungeon/items/torch/torch_${n}.png`)}
                alt={`Torch ${n}`}
                style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
              />
              <div>Torch {n}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

export const Animations = {
  name: 'Character Animations',
  render: () => (
    <div style={{ padding: '40px' }}>
      <h2>Monster & NPC Animations</h2>
      <p>Each character has v1 and v2 variants with 4 animation frames each.</p>

      <div style={{ marginTop: '30px' }}>
        <h3>Skeleton</h3>
        <div style={{ display: 'flex', gap: '30px' }}>
          <div>
            <h4>Variant 1</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4].map(n => (
                <img
                  key={n}
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/animations/monsters/skeleton1/v1/skeleton_v1_${n}.png`)}
                  alt={`Skeleton v1 ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
                />
              ))}
            </div>
          </div>
          <div>
            <h4>Variant 2</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4].map(n => (
                <img
                  key={n}
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/animations/monsters/skeleton1/v2/skeleton_v2_${n}.png`)}
                  alt={`Skeleton v2 ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Vampire</h3>
        <div style={{ display: 'flex', gap: '30px' }}>
          <div>
            <h4>Variant 1</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4].map(n => (
                <img
                  key={n}
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/animations/monsters/vampire/v1/vampire_v1_${n}.png`)}
                  alt={`Vampire v1 ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
                />
              ))}
            </div>
          </div>
          <div>
            <h4>Variant 2</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4].map(n => (
                <img
                  key={n}
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/animations/monsters/vampire/v2/vampire_v2_${n}.png`)}
                  alt={`Vampire v2 ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Skull</h3>
        <div style={{ display: 'flex', gap: '30px' }}>
          <div>
            <h4>Variant 1</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4].map(n => (
                <img
                  key={n}
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/animations/monsters/skull/v1/skull_v1_${n}.png`)}
                  alt={`Skull v1 ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
                />
              ))}
            </div>
          </div>
          <div>
            <h4>Variant 2</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4].map(n => (
                <img
                  key={n}
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/animations/monsters/skull/v2/skull_v2_${n}.png`)}
                  alt={`Skull v2 ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Priests</h3>
        <div style={{ display: 'flex', gap: '30px' }}>
          <div>
            <h4>Priest 1 - Variant 1</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4].map(n => (
                <img
                  key={n}
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/animations/priests/priest1/v1/priest1_v1_${n}.png`)}
                  alt={`Priest1 v1 ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
                />
              ))}
            </div>
          </div>
          <div>
            <h4>Priest 2 - Variant 1</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4].map(n => (
                <img
                  key={n}
                  src={resolveAssetPath(`/asset-packs/pixel-dungeon/animations/priests/priest2/v1/priest2_v1_${n}.png`)}
                  alt={`Priest2 v1 ${n}`}
                  style={{ imageRendering: 'pixelated', transform: 'scale(3)', margin: '10px' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
