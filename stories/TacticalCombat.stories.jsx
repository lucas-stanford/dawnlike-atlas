import React from 'react';
import TacticalCombatExample from '../src/TacticalCombatExample';

const MISSIONS = [
  'procedural-forest',
  'procedural-desert',
  'procedural-volcanic',
  'procedural-swamp',
  'procedural-ruined',
  'procedural-chaos',
  'the-bridge',
  'the-vault',
];

export default {
  title: 'Dawnlike/Zone Examples/Tactical Combat',
  component: TacticalCombatExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'XCOM-style tactical combat. Command a fixed four-class squad ' +
          '(Knight, Wizard, Rogue, Cleric) against procedurally-spawned ' +
          'enemies or one of two signature hand-designed missions. ' +
          'Each unit has 2 action points per turn. Move + Attack ends ' +
          'the turn; double-move dashes; Overwatch reacts to the next ' +
          'enemy in line-of-sight. Hover an enemy in LOS to see the ' +
          'hit chance before committing. ' +
          'Click a squad portrait in the right panel to select them.',
      },
    },
  },
  argTypes: {
    mission: {
      table: { category: 'Mission' },
      control: { type: 'select' },
      options: MISSIONS,
      description:
        'procedural-* = randomly generated terrain (Arena theme + monster ' +
        'pack); the-* = hand-designed signature scenarios with named ' +
        'objectives.',
    },
    difficulty: {
      table: { category: 'Mission' },
      control: { type: 'select' },
      options: ['easy', 'normal', 'hard'],
      description:
        'Scales enemy count (4 / 6 / 8) and enemy aim modifier (-10 / 0 / +10).',
    },
    seed: {
      table: { category: 'Generator' },
      control: { type: 'number' },
      description: 'Random seed for terrain. Same seed → identical map.',
    },
    squadSeed: {
      table: { category: 'Generator' },
      control: { type: 'number' },
      description: 'Independent seed for enemy spawn positions.',
    },
    width: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 20, max: 40, step: 1 },
      description: 'Map width (procedural missions only).',
    },
    height: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 16, max: 28, step: 1 },
      description: 'Map height (procedural missions only).',
    },
    fovRadius: {
      table: { category: 'FOV' },
      control: { type: 'range', min: 4, max: 14, step: 1 },
      description: 'Per-unit field-of-view radius in tiles.',
    },
    showHitPreview: {
      table: { category: 'UI' },
      control: 'boolean',
      description:
        'Show the hit% overlay when hovering an enemy in Attack mode. ' +
        'Disable for pure-puzzle play.',
    },
  },
  args: {
    mission: 'procedural-forest',
    difficulty: 'normal',
    seed: 1234,
    squadSeed: 5678,
    width: 32,
    height: 24,
    fovRadius: 8,
    showHitPreview: true,
  },
};

export const TacticalCombat = {
  name: 'Tactical Combat',
  render: (args) => (
    <TacticalCombatExample key={JSON.stringify(args)} {...args} />
  ),
};
