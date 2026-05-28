import React from 'react';
import ArenaCombatExample from '../src/ArenaCombatExample';

// Six theme presets (mirror the terrain Arena story). Each preset
// fixes the terrain palette + the monster pack appropriate to the
// setting. Sprite names verified against the atlas.
const THEMES = {
  'forest ambush': {
    groundStyle:   'day grass floor',
    obstacleKind:  'tree',
    obstacleStyle: 'light oak',
    hazardSprite:  null,
    hazardDensity: 0,
    ringNoiseScale: 4,
    ringThickness:  3,
    trailStyle:     'day stone floor',
    monsterPack:    ['goblin', 'kobold', 'imp'],
  },
  'desert canyon': {
    groundStyle:   'day dirt floor',
    obstacleKind:  'mountain',
    obstacleStyle: 'brown peak',
    hazardSprite:  null,
    hazardDensity: 0,
    ringNoiseScale: 5,
    ringThickness:  3,
    trailStyle:     'day stone floor',
    monsterPack:    ['kobold', 'kobold barbarian', 'imp'],
  },
  'volcanic pit': {
    groundStyle:   'dusk dirt floor',
    obstacleKind:  'mountain',
    obstacleStyle: 'red volcano',
    hazardSprite:  'lava puddle',
    hazardDensity: 0.05,
    ringNoiseScale: 5,
    ringThickness:  3,
    trailStyle:     'dusk stone floor',
    monsterPack:    ['fire elemental', 'lava demon', 'fire skeleton'],
  },
  'swamp clearing': {
    groundStyle:   'night dirt floor',
    obstacleKind:  'tree',
    obstacleStyle: 'dark mangrove',
    hazardSprite:  'green puddle',
    hazardDensity: 0.06,
    ringNoiseScale: 5,
    ringThickness:  3,
    trailStyle:     'night stone floor',
    monsterPack:    ['human zombie', 'hell hound', 'kobold zombie'],
  },
  'ruined courtyard': {
    groundStyle:   'dusk tile floor',
    obstacleKind:  'wall',
    obstacleStyle: 'bright brick wall',
    hazardSprite:  null,
    hazardDensity: 0,
    ringNoiseScale: 3,
    ringThickness:  2,
    trailStyle:     'dusk brick floor',
    monsterPack:    ['human zombie', 'skeleton', 'ghost'],
  },
  'chaos circle': {
    groundStyle:   'night dirt floor',
    obstacleKind:  'tree',
    obstacleStyle: 'burning oak',
    hazardSprite:  'lava puddle',
    hazardDensity: 0.06,
    ringNoiseScale: 4,
    ringThickness:  3,
    trailStyle:     'night stone floor',
    monsterPack:    ['lava demon', 'fire skeleton', 'imp'],
  },
};
const THEME_NAMES = Object.keys(THEMES);

export default {
  title: 'Dawnlike/Examples/Arena Combat',
  component: ArenaCombatExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Playable turn-based roguelike combat demo built on the Arena terrain. ' +
          'Click the canvas to focus it, then **WASD** / arrow keys to move, ' +
          '**F** for the class action, and **.** / space to wait a turn. ' +
          'Bump into a monster to attack it. The map is shrouded by a fog-of-war ' +
          'driven by ROT.FOV.PreciseShadowcasting — only tiles within ' +
          '`fovRadius` are visible, and previously-seen tiles render dimmed. ' +
          'Monsters use ROT.Path.AStar to chase you when they spot you.',
      },
    },
  },
  argTypes: {
    theme: {
      table: { category: 'Preset' },
      control: { type: 'select' },
      options: THEME_NAMES,
      description: 'Theme preset. Sets the terrain palette + per-theme monster pack.',
    },
    playerClass: {
      table: { category: 'Player' },
      control: { type: 'select' },
      options: ['knight', 'wizard', 'rogue'],
      description:
        'Player archetype. **knight** = high HP/atk/def, shield-bash bumps push enemies back. ' +
        '**wizard** = low HP, F casts a 3×3 fire-burst centred on the nearest visible target ' +
        '(4-turn cooldown). **rogue** = mid HP, F throws a single dart at the nearest visible ' +
        'target (2-turn cooldown).',
    },
    monsterCount: {
      table: { category: 'Spawns' },
      control: { type: 'range', min: 1, max: 12, step: 1 },
      description: 'Number of monsters to spawn (drawn uniformly from the theme pack).',
    },
    fovRadius: {
      table: { category: 'FOV' },
      control: { type: 'range', min: 3, max: 14, step: 1 },
      description: 'Field-of-view radius (tiles). Smaller = ambush-prone.',
    },
    seed: {
      table: { category: 'Generator' },
      control: { type: 'number' },
      description: 'Random seed. Reseed in-canvas with the Restart button.',
    },
    width: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 14, max: 36, step: 1 },
      description: 'Arena width in tiles.',
    },
    height: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 12, max: 26, step: 1 },
      description: 'Arena height in tiles.',
    },
  },
  args: {
    theme: 'forest ambush',
    playerClass: 'knight',
    monsterCount: 5,
    fovRadius: 7,
    seed: Math.floor(Math.random() * 1_000_000),
    width: 24,
    height: 18,
  },
};

// Single-story hoisting: export name == last segment of title.
export const ArenaCombat = {
  name: 'Arena Combat',
  render: ({ theme, ...rest }) => {
    const preset = THEMES[theme] || {};
    return (
      <ArenaCombatExample
        key={JSON.stringify({ theme, ...rest })}
        {...preset}
        {...rest}
      />
    );
  },
};
