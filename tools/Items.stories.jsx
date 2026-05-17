import React from 'react';
import { SpriteSheet } from '../components/SpriteSheet';
import { AnimatedSprite } from '../components/AnimatedSprite';

export default {
  title: 'DawnLike/Items',
  parameters: {
    layout: 'fullscreen',
  },
};

export const Weapons_Short = {
  name: 'Weapons - Short',
  render: () => (
    <SpriteSheet
      imagePath="/Items/ShortWep.png"
      title="Short Weapons"
      description="Light weapons: daggers, short swords, knives. Perfect for rogue class and dual-wielding."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Weapons_Medium = {
  name: 'Weapons - Medium',
  render: () => (
    <SpriteSheet
      imagePath="/Items/MedWep.png"
      title="Medium Weapons"
      description="One-handed weapons: swords, maces, axes. Main weapon slot equipment."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Weapons_Long = {
  name: 'Weapons - Long',
  render: () => (
    <SpriteSheet
      imagePath="/Items/LongWep.png"
      title="Long Weapons"
      description="Two-handed weapons: spears, halberds, staffs, pole-arms, long swords with extended reach."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Armor = {
  render: () => (
    <SpriteSheet
      imagePath="/Items/Armor.png"
      title="Armor"
      description="Body armor: leather armor, chain mail, plate armor, robes. Includes light, medium, and heavy armor varieties."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Shields = {
  render: () => (
    <SpriteSheet
      imagePath="/Items/Shield.png"
      title="Shields"
      description="Defense equipment: bucklers, kite shields, tower shields in various designs."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Potions = {
  render: () => (
    <SpriteSheet
      imagePath="/Items/Potion.png"
      title="Potions"
      description="Consumable potions and elixirs in various colors and styles."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Food = {
  render: () => (
    <SpriteSheet
      imagePath="/Items/Food.png"
      title="Food Items"
      description="Consumables: fruits, vegetables, bread, cheese, meat, fish, prepared meals. Perfect for healing and cooking systems."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Books = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Items/Book.png"
        title="Books & Tomes"
        description="Spell books, skill books, and readable items. Different colors for categorization (red=fire magic, blue=water magic, etc.)."
        columns={8}
        tileSize={16}
        defaultScale={4}
        animated={false}
      />
      <div style={{ padding: '20px', background: '#fff3e0' }}>
        <h3>📚 Suggested Book Categories</h3>
        <ul>
          <li>🔥 Red books - Fire magic / Combat skills</li>
          <li>💧 Blue books - Water/Ice magic / Intelligence</li>
          <li>🌿 Green books - Nature magic / Alchemy</li>
          <li>⚡ Yellow books - Lightning magic / Speed</li>
          <li>🌑 Black books - Dark magic / Forbidden knowledge</li>
        </ul>
      </div>
    </div>
  ),
};

export const Scrolls = {
  render: () => (
    <SpriteSheet
      imagePath="/Items/Scroll.png"
      title="Scrolls"
      description="Spell scrolls, maps, letters, and documents. Both rolled and unfurled varieties."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Wands = {
  render: () => (
    <SpriteSheet
      imagePath="/Items/Wand.png"
      title="Wands & Rods"
      description="Magic wands and rods for spell-casting. Mage weapons and magical implements."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Jewelry_Rings = {
  name: 'Jewelry - Rings',
  render: () => (
    <SpriteSheet
      imagePath="/Items/Ring.png"
      title="Rings"
      description="Finger jewelry with various designs. Equipment slot for magical modifiers and enchantments."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Jewelry_Amulets = {
  name: 'Jewelry - Amulets',
  render: () => (
    <SpriteSheet
      imagePath="/Items/Amulet.png"
      title="Amulets & Pendants"
      description="Neck accessories, talismans, and necklaces. Magical accessories and quest items."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Equipment_Hats = {
  name: 'Equipment - Hats',
  render: () => (
    <SpriteSheet
      imagePath="/Items/Hat.png"
      title="Headgear"
      description="Helmets, hats, crowns, hoods, and caps. Head equipment slot for class identification."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Equipment_Boots = {
  name: 'Equipment - Boots',
  render: () => (
    <SpriteSheet
      imagePath="/Items/Boot.png"
      title="Footwear"
      description="Boots, shoes, and sandals. Equipment for speed modifiers and movement."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Equipment_Gloves = {
  name: 'Equipment - Gloves',
  render: () => (
    <SpriteSheet
      imagePath="/Items/Glove.png"
      title="Gloves & Gauntlets"
      description="Hand armor and gloves. Equipment slot for stat modifiers."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Money = {
  render: () => (
    <SpriteSheet
      imagePath="/Items/Money.png"
      title="Currency & Valuables"
      description="Gold coins, silver coins, copper coins, gems, and jewels. Economy system and loot drops."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Chests = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Items/Chest0.png"
        title="Treasure Chests (Closed)"
        description="Wooden chests, metal chests, ornate chests. This is frame 0 (closed state)."
        columns={8}
        tileSize={16}
        defaultScale={4}
        animated={true}
        animationPair="/Items/Chest1.png"
      />
      <div style={{ padding: '20px', background: '#e3f2fd', marginTop: '20px' }}>
        <h3>Chest Animation (Closed ↔ Open)</h3>
        <p>
          Chests use <strong>Chest0.png</strong> (closed) and <strong>Chest1.png</strong> (open).
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
          <AnimatedSprite
            frame0Path="/Items/Chest0.png"
            frame1Path="/Items/Chest1.png"
            title="Wooden Chest"
            selectedSprite={0}
            frameRate={1}
          />
          <AnimatedSprite
            frame0Path="/Items/Chest0.png"
            frame1Path="/Items/Chest1.png"
            title="Metal Chest"
            selectedSprite={8}
            frameRate={1}
          />
          <AnimatedSprite
            frame0Path="/Items/Chest0.png"
            frame1Path="/Items/Chest1.png"
            title="Ornate Chest"
            selectedSprite={16}
            frameRate={1}
          />
        </div>
      </div>
    </div>
  ),
};

export const Ammunition = {
  render: () => (
    <SpriteSheet
      imagePath="/Items/Ammo.png"
      title="Ammunition"
      description="Arrows, bolts, bullets, throwing weapons, and sling stones. Ranged weapon consumables."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Tools = {
  render: () => (
    <SpriteSheet
      imagePath="/Items/Tool.png"
      title="Tools & Implements"
      description="Hammers, pickaxes, shovels, saws, rope. For crafting, mining, and building mechanics."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Keys = {
  render: () => (
    <SpriteSheet
      imagePath="/Items/Key.png"
      title="Keys"
      description="Various key designs for locked doors and quest items."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Light_Sources = {
  name: 'Light Sources',
  render: () => (
    <SpriteSheet
      imagePath="/Items/Light.png"
      title="Light Sources"
      description="Torches, lanterns, and candles. Equipment for lighting and dungeon exploration."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Musical_Instruments = {
  name: 'Musical Instruments',
  render: () => (
    <SpriteSheet
      imagePath="/Items/Music.png"
      title="Musical Instruments"
      description="Lutes, flutes, horns, drums, and harps. For bard class and buff items."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Rocks_Minerals = {
  name: 'Rocks & Minerals',
  render: () => (
    <SpriteSheet
      imagePath="/Items/Rock.png"
      title="Rocks & Minerals"
      description="Rocks, crystals, and ore chunks. Crafting materials for mining systems."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

export const Flesh_Gore = {
  name: 'Flesh & Gore',
  render: () => (
    <SpriteSheet
      imagePath="/Items/Flesh.png"
      title="Body Parts & Gore"
      description="Bones, skulls, organs, meat, and gore. For horror themes, butcher shops, and necromancy."
      columns={8}
      tileSize={16}
      defaultScale={4}
      animated={false}
    />
  ),
};

// ── Combined Atlas ────────────────────────────────────────────────────────────

export const CombinedAtlas = {
  name: 'Combined Atlas',
  render: () => (
    <SpriteSheet
      imagePath="/atlas/ItemsAtlas0.png"
      title="All Items — Combined Atlas"
      description="All 25 item groups stacked into a single 128×1840px sheet. 684 named sprites across weapons, armor, consumables, tools, and treasure. Hover any tile to see its name."
      columns={8}
      tileSize={16}
      defaultScale={2}
      animated={false}
      instructionsPath="/atlas/ItemsAtlas.instructions.md"
    />
  ),
};
