import React from 'react';
import { SpriteSheet } from '../components/SpriteSheet';

export default {
  title: 'DawnLike/Characters',
  parameters: {
    layout: 'fullscreen',
  },
};

// Player Characters
export const Player = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Player0.png"
      title="Player Characters (Frame 0)"
      description="6 playable races × multiple classes. Includes human, elf, dwarf, orc, lizardman and more with warrior, mage, rogue, archer classes."
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Player1.png"
    />
  ),
};

// Humanoid NPCs
export const Humanoid = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Humanoid0.png"
      title="Humanoid Characters (Frame 0)"
      description="The largest character set! Warriors, mages, archers, civilians, guards, merchants, bandits across multiple races and professions."
      columns={8}
      tileSize={16}
      defaultScale={3}
    />
  ),
};

// Demons
export const Demon = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Demon0.png"
      title="Demon Characters (Frame 0)"
      description="Infernal creatures: imps, demons, devils, hellhounds, winged demons. Perfect for enemy encounters and infernal zones."
      columns={8}
      tileSize={16}
      defaultScale={3}
    />
  ),
};

// Undead
export const Undead = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Undead0.png"
      title="Undead Characters (Frame 0)"
      description="Undead creatures: skeletons, zombies, ghosts, wraiths, liches, vampires. Perfect for graveyards and necromancy themes."
      columns={8}
      tileSize={16}
      defaultScale={3}
    />
  ),
};

// Reptiles
export const Reptile = {
  render: () => (
    <div>
      <SpriteSheet
        imagePath="/Characters/Reptile0.png"
        title="Reptile Characters (Frame 0)"
        description="Reptilian creatures: snakes, lizards, dragons, crocodiles, basilisks. ⭐ Contains the special Platino sprite!"
        columns={8}
        tileSize={16}
        defaultScale={3}
        animated={true}
        animationPair="/Characters/Reptile1.png"
      />
      <div style={{ padding: '20px', background: '#fff3e0', border: '2px solid #ff9800' }}>
        <h3>⚠️ Special Note: Platino Sprite</h3>
        <p>This sprite sheet contains the Platino sprite that MUST be included (hidden) in your game per the license requirements!</p>
      </div>
    </div>
  ),
};

// Elementals
export const Elemental = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Elemental0.png"
      title="Elemental Characters (Frame 0)"
      description="Magical elemental beings: fire, water, earth, air elementals and energy beings. Great for magic-based enemies."
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Elemental1.png"
    />
  ),
};

// Aquatic
export const Aquatic = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Aquatic0.png"
      title="Aquatic Characters (Frame 0)"
      description="Water-dwelling creatures: fish, jellyfish, octopus, crabs, seahorses, sea serpents, water elementals."
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Aquatic1.png"
    />
  ),
};

// Avian
export const Avian = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Avian0.png"
      title="Avian Characters (Frame 0)"
      description="Birds and flying creatures: eagles, crows, bats, owls, parrots, phoenixes, harpies."
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Avian1.png"
    />
  ),
};

// Quadrapeds
export const Quadraped = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Quadraped0.png"
      title="Quadraped Characters (Frame 0)"
      description="Four-legged animals: horses, deer, bears, boars, cattle, sheep, elephants. Perfect for mounts and wildlife."
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Quadraped1.png"
    />
  ),
};

// Slimes
export const Slime = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Slime0.png"
      title="Slime Characters (Frame 0)"
      description="Gelatinous creatures: slimes, oozes, and jellies in various colors. Classic RPG enemies!"
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Slime1.png"
    />
  ),
};

// Cats
export const Cat = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Cat0.png"
      title="Cat Characters (Frame 0)"
      description="Feline creatures: house cats, lions, tigers, panthers, saber-toothed cats."
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Cat1.png"
    />
  ),
};

// Dogs
export const Dog = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Dog0.png"
      title="Dog Characters (Frame 0)"
      description="Canine creatures: dogs, wolves, foxes, jackals, hell hounds."
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Dog1.png"
    />
  ),
};

// Rodents
export const Rodent = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Rodent0.png"
      title="Rodent Characters (Frame 0)"
      description="Small mammals: rats, mice, squirrels, rabbits, beavers."
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Rodent1.png"
    />
  ),
};

// Pests
export const Pest = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Pest0.png"
      title="Pest Characters (Frame 0)"
      description="Insects and vermin: ants, bees, flies, mosquitoes, beetles, spiders, scorpions, centipedes."
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Pest1.png"
    />
  ),
};

// Plants
export const Plant = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Plant0.png"
      title="Plant Characters (Frame 0)"
      description="Plant-based creatures: animated plants, treants, fungi, mushroom creatures, vines."
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Plant1.png"
    />
  ),
};

// Misc
export const Misc = {
  render: () => (
    <SpriteSheet
      imagePath="/Characters/Misc0.png"
      title="Miscellaneous Characters (Frame 0)"
      description="Unique creatures: golems, constructs, animated objects, mimics, and special encounters."
      columns={8}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/Characters/Misc1.png"
    />
  ),
};

// ── Combined Atlas ────────────────────────────────────────────────────────────

export const CombinedAtlas = {
  name: 'Combined Atlas',
  render: () => (
    <SpriteSheet
      imagePath="/atlas/CharactersAtlas0.png"
      title="All Characters — Combined Atlas"
      description="All 16 character groups stacked into a single 128×2664px sheet. Hover any tile to see its name from the atlas lookup. Toggle animation to switch between idle and alt frames."
      columns={8}
      tileSize={16}
      defaultScale={2}
      animated={true}
      animationPair="/atlas/CharactersAtlas1.png"
      instructionsPath="/atlas/CharactersAtlas.instructions.md"
    />
  ),
};
