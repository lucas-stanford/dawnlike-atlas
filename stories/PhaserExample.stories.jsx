import React from 'react';
import PhaserExample from '../src/PhaserExample';

/**
 * The Controls panel below the canvas exposes the most impactful knobs
 * from each generator's manifest. Changing any of them tears down the
 * current Phaser game, wipes the save, and rebuilds with the new
 * manifests — so what you see updates immediately.
 *
 * Open the docs page for a quick reference; hover any control's label
 * to see the JSDoc-derived description from the manifest itself.
 */
export default {
  title: 'Examples/Phaser Roguelike',
  component: PhaserExample,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Phaser-based overworld + town + 3-level dungeon. The Controls panel ' +
          'edits the underlying World/Town/Dungeon manifests live — every change ' +
          'rebuilds the game from a fresh save so you can see the result.',
      },
    },
  },
  argTypes: {
    // ===== World =====
    worldSeed: {
      name: 'world.seed',
      table: { category: 'World' },
      control: { type: 'number' },
      description: 'Random seed for the overworld noise + decor placement.',
    },
    worldElevationThreshold: {
      name: 'world.elevationThreshold',
      table: { category: 'World' },
      control: { type: 'range', min: 0, max: 0.8, step: 0.05 },
      description: 'Lower → more forest/mountain coverage.',
    },
    worldBiomeSplit: {
      name: 'world.biomeSplit',
      table: { category: 'World' },
      control: { type: 'range', min: -0.4, max: 0.4, step: 0.05 },
      description: 'Within elevated tiles, >split = mountain, <split = forest.',
    },
    worldDecorChance: {
      name: 'world.decorChance',
      table: { category: 'World' },
      control: { type: 'range', min: 0, max: 0.2, step: 0.01 },
      description: 'Per-tile chance of dropping a decor sprite (flowers/pebbles).',
    },
    worldDirtPatchThreshold: {
      name: 'world.dirtPatchThreshold',
      table: { category: 'World' },
      control: { type: 'range', min: 0.1, max: 0.8, step: 0.05 },
      description: 'Lower → more dirt patches in low-elevation areas.',
    },

    // ===== Town =====
    townPlazaSize: {
      name: 'town.plazaSize',
      table: { category: 'Town' },
      control: { type: 'range', min: 3, max: 12, step: 1 },
      description: 'Side length (in tiles) of the central paved plaza.',
    },
    townBuildingsMin: {
      name: 'town.buildingCount.min',
      table: { category: 'Town' },
      control: { type: 'range', min: 1, max: 10, step: 1 },
      description: 'Minimum number of buildings to attempt.',
    },
    townBuildingsMax: {
      name: 'town.buildingCount.max',
      table: { category: 'Town' },
      control: { type: 'range', min: 1, max: 12, step: 1 },
      description: 'Maximum number of buildings to attempt.',
    },
    townTreeDensity: {
      name: 'town.treeDensity',
      table: { category: 'Town' },
      control: { type: 'range', min: 0, max: 0.3, step: 0.01 },
      description: 'Per grass tile (away from streets), chance of a tree.',
    },
    townFountain: {
      name: 'town.fountain',
      table: { category: 'Town' },
      control: 'boolean',
      description: 'Place a fountain in the centre of the plaza.',
    },
    townSigns: {
      name: 'town.signs',
      table: { category: 'Town' },
      control: 'boolean',
      description: 'Drop a sign sprite in front of each building.',
    },
    townFurnitureEnabled: {
      name: 'town.furniture.enabled',
      table: { category: 'Town' },
      control: 'boolean',
      description: 'Stamp type-specific furniture (beds, tables, altars…) inside each building.',
    },
    townNpcChance: {
      name: 'town.npc.chance',
      table: { category: 'Town' },
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: 'Per-building probability of placing any NPCs.',
    },
    townNpcMin: {
      name: 'town.npc.perBuilding.min',
      table: { category: 'Town' },
      control: { type: 'range', min: 0, max: 5, step: 1 },
      description: 'Minimum NPCs placed per building (when NPCs roll on).',
    },
    townNpcMax: {
      name: 'town.npc.perBuilding.max',
      table: { category: 'Town' },
      control: { type: 'range', min: 1, max: 6, step: 1 },
      description: 'Maximum NPCs placed per building.',
    },
    townFlowerDensity: {
      name: 'town.flowers.density',
      table: { category: 'Town' },
      control: { type: 'range', min: 0, max: 0.3, step: 0.01 },
      description: 'Per grass tile, chance of placing a flower variant.',
    },
    townWeightHome: {
      name: 'town.buildingTypeWeights.home',
      table: { category: 'Town · Building mix' },
      control: { type: 'range', min: 0, max: 10, step: 1 },
    },
    townWeightInn: {
      name: 'town.buildingTypeWeights.inn',
      table: { category: 'Town · Building mix' },
      control: { type: 'range', min: 0, max: 10, step: 1 },
    },
    townWeightSmithy: {
      name: 'town.buildingTypeWeights.smithy',
      table: { category: 'Town · Building mix' },
      control: { type: 'range', min: 0, max: 10, step: 1 },
    },
    townWeightShop: {
      name: 'town.buildingTypeWeights.shop',
      table: { category: 'Town · Building mix' },
      control: { type: 'range', min: 0, max: 10, step: 1 },
    },
    townWeightChurch: {
      name: 'town.buildingTypeWeights.church',
      table: { category: 'Town · Building mix' },
      control: { type: 'range', min: 0, max: 10, step: 1 },
    },

    // ===== Dungeon =====
    dungeonBottomLevel: {
      name: 'dungeon.bottomLevel',
      table: { category: 'Dungeon' },
      control: { type: 'range', min: 1, max: 5, step: 1 },
      description: 'Deepest dungeon level — no stairs-down below this depth.',
    },
    dungeonDugPercentage: {
      name: 'dungeon.dugPercentage',
      table: { category: 'Dungeon' },
      control: { type: 'range', min: 0.1, max: 0.7, step: 0.05 },
      description: 'Fraction of dungeon cells the digger aims to carve out.',
    },
  },
  args: {
    // World
    worldSeed: 1,
    worldElevationThreshold: 0.35,
    worldBiomeSplit: 0,
    worldDecorChance: 0.04,
    worldDirtPatchThreshold: 0.4,
    // Town
    townPlazaSize: 6,
    townBuildingsMin: 4,
    townBuildingsMax: 6,
    townTreeDensity: 0.08,
    townFountain: true,
    townSigns: true,
    townFurnitureEnabled: true,
    townNpcChance: 0.8,
    townNpcMin: 1,
    townNpcMax: 2,
    townFlowerDensity: 0.05,
    townWeightHome: 3,
    townWeightInn: 1,
    townWeightSmithy: 1,
    townWeightShop: 1,
    townWeightChurch: 1,
    // Dungeon
    dungeonBottomLevel: 3,
    dungeonDugPercentage: 0.4,
  },
};

function buildManifests(args) {
  return {
    world: {
      seed: args.worldSeed,
      elevationThreshold: args.worldElevationThreshold,
      biomeSplit: args.worldBiomeSplit,
      decorChance: args.worldDecorChance,
      dirtPatchThreshold: args.worldDirtPatchThreshold,
    },
    town: {
      plazaSize: args.townPlazaSize,
      buildingCount: { min: args.townBuildingsMin, max: Math.max(args.townBuildingsMin, args.townBuildingsMax) },
      treeDensity: args.townTreeDensity,
      fountain: args.townFountain,
      signs: args.townSigns,
      furniture: { enabled: args.townFurnitureEnabled },
      npc: {
        chance: args.townNpcChance,
        perBuilding: { min: args.townNpcMin, max: Math.max(args.townNpcMin, args.townNpcMax) },
      },
      flowers: { density: args.townFlowerDensity },
      buildingTypeWeights: {
        home:   args.townWeightHome,
        inn:    args.townWeightInn,
        smithy: args.townWeightSmithy,
        shop:   args.townWeightShop,
        church: args.townWeightChurch,
      },
    },
    dungeon: {
      bottomLevel: args.dungeonBottomLevel,
      dugPercentage: args.dungeonDugPercentage,
    },
  };
}

export const Default = {
  render: (args) => <PhaserExample manifests={buildManifests(args)} />,
};
