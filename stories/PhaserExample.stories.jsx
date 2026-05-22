import React, { useMemo, useState, useCallback } from 'react';
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
  title: 'Dawnlike/Examples/Phaser Roguelike',
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
      description:
        'Override the overworld seed for deterministic generation. ' +
        'Leave at **0** to use a random seed (a new one is rolled per New Game).',
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
    townBuildingSpacing: {
      name: 'town.buildingSpacing',
      table: { category: 'Town' },
      control: { type: 'range', min: 2, max: 6, step: 1 },
      description: 'Minimum number of grass tiles between buildings (and between buildings and the plaza). Higher values spread the town out.',
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
    townRace: {
      name: 'town.race',
      table: { category: 'Town · Race' },
      control: { type: 'select' },
      options: ['human', 'elf', 'dwarf', 'gnome', 'halfling'],
      description: 'Dominant race for the town. Drives the NPC sprite mix per building type.',
    },
    townFriendlyRaceChance: {
      name: 'town.friendlyRaceChance',
      table: { category: 'Town · Race' },
      control: { type: 'range', min: 0, max: 0.6, step: 0.02 },
      description: 'Per-NPC probability that the sprite is swapped for one from a friendly race (mixes the population). 0 keeps the town mono-racial.',
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
    worldSeed: 0,
    worldElevationThreshold: 0.35,
    worldBiomeSplit: 0,
    worldDecorChance: 0.04,
    worldDirtPatchThreshold: 0.4,
    // Town
    townPlazaSize: 6,
    townBuildingsMin: 4,
    townBuildingsMax: 6,
    townBuildingSpacing: 2,
    townTreeDensity: 0.08,
    townFountain: true,
    townSigns: true,
    townFurnitureEnabled: true,
    townNpcChance: 0.8,
    townNpcMin: 1,
    townNpcMax: 2,
    townFlowerDensity: 0.05,
    townRace: 'human',
    townFriendlyRaceChance: 0.12,
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
  const worldManifest = {
    elevationThreshold: args.worldElevationThreshold,
    biomeSplit: args.worldBiomeSplit,
    decorChance: args.worldDecorChance,
    dirtPatchThreshold: args.worldDirtPatchThreshold,
  };
  // Only pin the seed when the user supplied a positive value; otherwise
  // let save.js's randomly-bootstrapped root seed drive generation so
  // "New Game" produces a genuinely different overworld each time.
  if (args.worldSeed && args.worldSeed > 0) worldManifest.seed = args.worldSeed;
  return {
    world: worldManifest,
    town: {
      plazaSize: args.townPlazaSize,
      buildingCount: { min: args.townBuildingsMin, max: Math.max(args.townBuildingsMin, args.townBuildingsMax) },
      buildingSpacing: args.townBuildingSpacing,
      treeDensity: args.townTreeDensity,
      fountain: args.townFountain,
      signs: args.townSigns,
      furniture: { enabled: args.townFurnitureEnabled },
      npc: {
        chance: args.townNpcChance,
        perBuilding: { min: args.townNpcMin, max: Math.max(args.townNpcMin, args.townNpcMax) },
      },
      flowers: { density: args.townFlowerDensity },
      race: args.townRace,
      friendlyRaceChance: args.townFriendlyRaceChance,
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

// Single-story hoisting: export name == last segment of title makes
// the sidebar leaf disappear so the title doubles as the entry point.
function ManifestPanel({ manifests }) {
  const [open, setOpen] = useState(false);
  const json = useMemo(() => JSON.stringify(manifests, null, 2), [manifests]);
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = json;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    };
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        ok = true;
      } else {
        ok = fallback();
      }
    } catch {
      ok = fallback();
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [json]);
  return (
    <div style={{
      marginTop: 12,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 13,
      border: '1px solid #d6dde6',
      borderRadius: 6,
      background: '#fafbfc',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderBottom: open ? '1px solid #d6dde6' : 'none',
      }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            padding: '4px 10px',
            border: '1px solid #b8c1cd',
            borderRadius: 4,
            background: '#fff',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {open ? 'Hide' : 'View'} manifest
        </button>
        <span style={{ color: '#666', fontSize: 12 }}>
          Live JSON for the {`{ world, town, dungeon }`} manifests passed to the game.
        </span>
        <button
          type="button"
          onClick={onCopy}
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            border: '1px solid #888',
            borderRadius: 4,
            background: copied ? '#1f7a32' : '#222',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            minWidth: 110,
            transition: 'background 0.15s ease',
          }}
        >
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
      {open && (
        <pre style={{
          margin: 0,
          padding: 10,
          maxHeight: 360,
          overflow: 'auto',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          lineHeight: 1.45,
          background: '#fff',
          borderBottomLeftRadius: 6,
          borderBottomRightRadius: 6,
        }}>{json}</pre>
      )}
    </div>
  );
}

export const PhaserRoguelike = {
  render: (args) => {
    const manifests = buildManifests(args);
    return (
      <div>
        <PhaserExample manifests={manifests} />
        <ManifestPanel manifests={manifests} />
      </div>
    );
  },
};
