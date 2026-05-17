/**
 * Frame constants for DawnLike GUI spritesheet (GUI0.png / GUI1.png)
 * GUI0 = normal state, GUI1 = glowing/highlighted state
 *
 * Spritesheet: 16 columns x 19 rows = 304 frames, 16x16 pixels each
 * Image size: 256 x 304 pixels
 * Frame calculation: frame = row * 16 + column
 */

// Health indicators (Row 0, frames 0-15)
export const HEART_FULL: 0;
export const HEART_THREE_QUARTER: 1;
export const HEART_HALF: 2;
export const HEART_QUARTER: 3;
export const HEART_EMPTY: 4;
export const HEART_ALT: 5;
export const ICON_CHECK: 6;
export const ICON_X: 7;

// Mana indicators (Row 1, frames 16-31)
export const MANA_FULL: 16;
export const MANA_THREE_QUARTER: 17;
export const MANA_HALF: 18;
export const MANA_QUARTER: 19;
export const MANA_EMPTY: 20;
export const MANA_ALT: 21;
export const ICON_LOCK: 22;
export const ICON_UNLOCK: 23;

// Combat icons (Row 2, frames 32-47)
export const ICON_SWORDS: 32;
export const ICON_SHIELD: 33;
export const ICON_MAGIC: 34;
export const ICON_POTION: 35;
export const ICON_BOW: 36;
export const ICON_ARMOR: 37;
export const ICON_SCROLL: 38;
export const ICON_GEM: 39;

// Action icons (Row 3, frames 48-63)
export const ICON_SWORD: 48;
export const ICON_ROUND_SHIELD: 49;
export const ICON_SPELL: 50;
export const ICON_BAG: 51;
export const ICON_BOOT: 52;
export const ICON_EYE: 53;
export const ICON_EAR: 54;
export const ICON_HAND: 55;

// Dialog 9-slice pieces (Rows 4-6, frames 64-111)
export const DIALOG_TL: 64;
export const DIALOG_T: 65;
export const DIALOG_TR: 66;
export const PROGRESS_LEFT: 67;
export const PROGRESS_EMPTY: 68;
export const PROGRESS_RIGHT: 69;
export const BUTTON_FRAME: 70;
export const BUTTON_FRAME_ALT: 71;

export const DIALOG_L: 80;
export const DIALOG_C: 81;
export const DIALOG_R: 82;
export const PROGRESS_TRACK: 83;
export const SEPARATOR_H: 84;
export const SEPARATOR_V: 85;
export const PANEL_DARK_SMALL: 86;
export const PANEL_LIGHT_SMALL: 87;

export const DIALOG_BL: 96;
export const DIALOG_B: 97;
export const DIALOG_BR: 98;
export const TAB_ACTIVE: 99;
export const TAB_INACTIVE: 100;
export const DIVIDER: 101;
export const CORNER_DECOR: 102;
export const EDGE_DECOR: 103;

// Selection indicators (Row 7, frames 112-127)
export const ARROW_RIGHT: 112;
export const CURSOR_HAND: 113;
export const CROSSHAIR: 114;
export const BRACKET_LEFT: 115;
export const BRACKET_RIGHT: 116;
export const SELECT_CORNER: 117;
export const SELECT_CIRCLE: 118;
export const SELECT_STAR: 119;

// Panel frame shape
export interface PanelFrames {
  small: number;
  large: number;
  border: number;
  alt: number;
}

// Colored panels (Rows 8-11, frames 128-191)
export const PANEL_RED: PanelFrames;
export const PANEL_PINK: PanelFrames;
export const PANEL_BLUE: PanelFrames;
export const PANEL_CYAN: PanelFrames;
export const PANEL_GREEN: PanelFrames;
export const PANEL_YELLOW: PanelFrames;
export const PANEL_DARK: PanelFrames;
export const PANEL_GRAY: PanelFrames;

// Grouped exports for convenience
export const HEARTS: readonly [0, 1, 2, 3, 4];
export const MANA: readonly [16, 17, 18, 19, 20];

// Dialog 9-slice structure
export interface Dialog9Slice {
  topLeft: 64;
  top: 65;
  topRight: 66;
  left: 80;
  center: 81;
  right: 82;
  bottomLeft: 96;
  bottom: 97;
  bottomRight: 98;
}

export const DIALOG_9SLICE: Dialog9Slice;

// Semantic lookup by name
export interface GUIFrames {
  // Health
  heartFull: 0;
  heartThreeQuarter: 1;
  heartHalf: 2;
  heartQuarter: 3;
  heartEmpty: 4;

  // Mana
  manaFull: 16;
  manaThreeQuarter: 17;
  manaHalf: 18;
  manaQuarter: 19;
  manaEmpty: 20;

  // Status
  check: 6;
  x: 7;
  lock: 22;
  unlock: 23;

  // Combat
  swords: 32;
  shield: 33;
  magic: 34;
  potion: 35;
  bow: 36;
  armor: 37;
  scroll: 38;
  gem: 39;

  // Actions
  sword: 48;
  roundShield: 49;
  spell: 50;
  bag: 51;
  boot: 52;
  eye: 53;
  ear: 54;
  hand: 55;

  // UI
  arrowRight: 112;
  cursor: 113;
  crosshair: 114;
  bracketLeft: 115;
  bracketRight: 116;
}

export const GUI_FRAMES: GUIFrames;

export default GUI_FRAMES;
