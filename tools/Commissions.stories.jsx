import React from 'react';
import { SpriteSheet } from '../components/SpriteSheet';
import { AnimatedSprite } from '../components/AnimatedSprite';

export default {
  title: 'DawnLike/Commissions',
  parameters: {
    layout: 'fullscreen',
  },
};

// Warrior Class
export const Warrior = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Commissions/Warrior.png"
        title="Warrior Class (Custom Commission)"
        description="16 warrior color variants at 32×32 pixels. Scale down to 0.5 in Phaser to match standard 16×16 size. Perfect for character customization systems."
        columns={4}
        tileSize={32}
        defaultScale={2}
      />
      <div style={{ padding: '20px', background: '#f5f5f5' }}>
        <h3>Warrior + Outfit Combo</h3>
        <p>Combine base Warrior.png with Warrior Clothes.png for clothing variants:</p>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ padding: '10px', border: '1px solid #ccc' }}>
            <h4>Base Warrior (Frame 0)</h4>
            <canvas id="wariorBase" width="64" height="64" style={{ border: '1px solid #999', imageRendering: 'pixelated' }} />
          </div>
          <div style={{ padding: '10px', border: '1px solid #ccc' }}>
            <h4>With Outfit (Frame 0)</h4>
            <canvas id="warriorOutfit" width="64" height="64" style={{ border: '1px solid #999', imageRendering: 'pixelated' }} />
          </div>
        </div>
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          Load both Warrior.png and Warrior Clothes.png, position at same coordinates with Clothes at depth +1
        </p>
      </div>
    </div>
  ),
};

// Rogue Class
export const Rogue = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Commissions/Rogue.png"
        title="Rogue Class (Custom Commission)"
        description="16 rogue/thief color variants at 32×32 pixels. Light armor, stealth-focused designs. Pair with Rogue Clothes.png for outfit variations."
        columns={4}
        tileSize={32}
        defaultScale={2}
      />
      <div style={{ padding: '20px', background: '#f5f5f5' }}>
        <h3>Stealth & Equipment Options</h3>
        <p>Rogues support dynamic outfit switching for character customization:</p>
        <pre style={{ background: '#fff', padding: '10px', overflow: 'auto' }}>
{`// Load rogue with outfit overlay
this.load.spritesheet('rogue', 'Commissions/Rogue.png', {frameWidth: 32, frameHeight: 32});
this.load.spritesheet('rogueOutfit', 'Commissions/Rogue Clothes.png', {frameWidth: 32, frameHeight: 32});

const character = this.add.sprite(x, y, 'rogue', variantFrame);
const outfit = this.add.sprite(x, y, 'rogueOutfit', clothesFrame);
outfit.setDepth(character.depth + 1);

// Scale down to match standard 16x16
character.setScale(0.5);
outfit.setScale(0.5);`}
        </pre>
      </div>
    </div>
  ),
};

// Mage Class
export const Mage = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Commissions/Mage.png"
        title="Mage Class (Custom Commission)"
        description="16 mage/spellcaster color variants at 32×32 pixels. Robed designs with magic themes. Pair with Mage Clothes.png for outfit variations."
        columns={4}
        tileSize={32}
        defaultScale={2}
      />
      <div style={{ padding: '20px', background: '#f5f5f5' }}>
        <h3>Magic-themed Equipment</h3>
        <p>Mages include robed designs perfect for spell-focused characters. Combine with Mage Clothes.png for additional customization.</p>
      </div>
    </div>
  ),
};

// Paladin Class
export const Paladin = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Commissions/Paladin.png"
        title="Paladin Class (Custom Commission)"
        description="16 paladin/holy knight color variants at 32×32 pixels. Divine/holy themed armor. Pair with Paladin Clothes.png for outfit variations."
        columns={4}
        tileSize={32}
        defaultScale={2}
      />
      <div style={{ padding: '20px', background: '#f5f5f5' }}>
        <h3>Holy Warrior Equipment</h3>
        <p>Paladins feature ornate holy armor and divine symbols. Combine with Paladin Clothes.png for holy order variants.</p>
      </div>
    </div>
  ),
};

// Engineer Class
export const Engineer = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Commissions/Engineer.png"
        title="Engineer Class (Custom Commission)"
        description="16 engineer/technician color variants at 32×32 pixels. Mechanical/gadget-themed designs. Pair with Engineer Clothes.png for equipment variations."
        columns={4}
        tileSize={32}
        defaultScale={2}
      />
      <div style={{ padding: '20px', background: '#f5f5f5' }}>
        <h3>Mechanical & Technical Gear</h3>
        <p>Engineers are the only commissioned class with a purely mechanical/tech focus. Perfect for sci-fi or steampunk games. Combine with Engineer Clothes.png for gadget variations.</p>
      </div>
    </div>
  ),
};

// Class Icons
export const Icons = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Commissions/Icons.png"
        title="Commissioned Class Icons"
        description="9 class/skill icons at 16×16 pixels (1.5× standard GUI size). Perfect for UI buttons, skill bars, and character class selectors."
        columns={3}
        tileSize={16}
        defaultScale={3}
      />
      <div style={{ padding: '20px', background: '#f5f5f5' }}>
        <h3>Use Cases</h3>
        <ul>
          <li>Character class selector buttons</li>
          <li>Ability/skill UI icons</li>
          <li>Party member status display</li>
          <li>Inventory class filtering</li>
          <li>UI tooltips and help text</li>
        </ul>
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          Scale up with setScale(2) or setScale(3) for better visibility in UI elements
        </p>
      </div>
    </div>
  ),
};

// Custom Character Template
export const Template = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Commissions/Template.png"
        title="Custom Character Template (Blank)"
        description="Empty 4×4 grid at 32×32 pixels. Use as a template for creating your own custom character classes. Maintain 16-sprite layout like other commissioned characters."
        columns={4}
        tileSize={32}
        defaultScale={2}
      />
      <div style={{ padding: '20px', background: '#f5f5f5' }}>
        <h3>How to Use This Template</h3>
        <ol>
          <li>Open Template.png in your pixel art editor (Aseprite, Piskel, PyxelEdit)</li>
          <li>Design 16 character variants (4×4 grid, 32×32 each)</li>
          <li>Save with descriptive name: e.g., "Bard.png", "Samurai.png"</li>
          <li>Create a .instructions.md file (see INSTRUCTION_TEMPLATE.md)</li>
          <li>Optional: Create [Class]Clothes.png for outfit variants</li>
          <li>Load in Phaser:</li>
        </ol>
        <pre style={{ background: '#fff', padding: '10px', overflow: 'auto', marginTop: '10px' }}>
{`this.load.spritesheet('customClass', 'Commissions/YourClass.png', {
  frameWidth: 32,
  frameHeight: 32
});

const sprite = this.add.sprite(x, y, 'customClass', frameIndex);
sprite.setScale(0.5); // Match 16×16 standard size`}
        </pre>
        <h4 style={{ marginTop: '15px' }}>Design Tips</h4>
        <ul>
          <li>Keep sprites centered in 32×32 cells with 1-2px padding</li>
          <li>Use DawnLike's official color palette for visual consistency</li>
          <li>Ensure silhouette is recognizable across all 16 variants</li>
          <li>Save as PNG with transparency</li>
        </ul>
      </div>
    </div>
  ),
};
