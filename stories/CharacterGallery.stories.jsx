import React from 'react';
import { CharacterGallery } from '../src/CharacterGallery';

export default {
  title: 'Dawnlike/AI Generation/Character Gallery',
  component: CharacterGallery,
};

export const Sage16Bit = {
  name: "Sage (16-Bit Style)",
  args: {
    characterName: 'Old Sage (16-Bit)',
    basePrompt: '"A wise old sage with a long white beard, wearing flowing blue robes and holding a wooden staff with a glowing blue crystal"',
    portraitUrl: 'char1_portrait.png',
    walkUrl: 'char1_walk.png',
    walkGridFormat: '1x4',
    actionUrl: 'char1_action.png',
    actionGridFormat: '1x4',
  },
};

export const SageJRPG = {
  name: "Sage (JRPG Style)",
  args: {
    characterName: 'Old Sage (JRPG 3x4)',
    basePrompt: '"A wise old sage with a long white beard, wearing flowing blue robes and holding a wooden staff with a glowing blue crystal"',
    portraitUrl: 'char1_portrait.png',
    walkModifier: 'walking animation sprite sheet, arranged in a strict 3x4 grid, 4 rows for directions (down, left, right, up) and 3 columns for animation frames, perfectly uniform spacing, traditional JRPG top-down perspective, clear pixel art, pure white background.',
    walkUrl: 'char1_jrpg_walk.png',
    walkGridFormat: '3x4',
    actionModifier: 'attacking animation sprite sheet, strict 3x4 grid layout, 4 rows for directions and 3 columns for animation frames, weapon swinging in a clear arc, traditional JRPG perspective, pure white background.',
    actionUrl: 'char1_jrpg_action.png',
    actionGridFormat: '3x4',
  },
};

export const Knight = {
  args: {
    characterName: 'Valiant Knight',
    basePrompt: '"A valiant knight in shining silver armor, holding a broadsword and wearing a crimson cape"',
    portraitUrl: 'char2_portrait.png',
    walkUrl: 'char2_walk.png',
    actionUrl: 'char2_action.png',
  },
};

export const Rogue = {
  args: {
    characterName: 'Mysterious Rogue',
    basePrompt: '"A mysterious rogue with a dark hood, wearing dark leather armor and dual wielding daggers"',
    portraitUrl: 'char3_portrait.png',
    walkUrl: 'char3_walk.png',
    actionUrl: 'char3_action.png',
  },
};
