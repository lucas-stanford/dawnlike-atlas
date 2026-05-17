/**
 * Frame constants for DawnLike GUI spritesheet (GUI0.png / GUI1.png)
 * GUI0 = normal state, GUI1 = glowing/highlighted state
 *
 * Spritesheet: 16 columns x 19 rows = 304 frames, 16x16 pixels each
 * Image size: 256 x 304 pixels
 * Frame calculation: frame = row * 16 + column
 */

// Health indicators (Row 0, frames 0-15)
export const HEART_FULL = 0;
export const HEART_THREE_QUARTER = 1;
export const HEART_HALF = 2;
export const HEART_QUARTER = 3;
export const HEART_EMPTY = 4;
export const HEART_ALT = 5;
export const ICON_CHECK = 6;
export const ICON_X = 7;

// Mana indicators (Row 1, frames 16-31)
export const MANA_FULL = 16;
export const MANA_THREE_QUARTER = 17;
export const MANA_HALF = 18;
export const MANA_QUARTER = 19;
export const MANA_EMPTY = 20;
export const MANA_ALT = 21;
export const ICON_LOCK = 22;
export const ICON_UNLOCK = 23;

// Combat icons (Row 2, frames 32-47)
export const ICON_SWORDS = 32;
export const ICON_SHIELD = 33;
export const ICON_MAGIC = 34;
export const ICON_POTION = 35;
export const ICON_BOW = 36;
export const ICON_ARMOR = 37;
export const ICON_SCROLL = 38;
export const ICON_GEM = 39;

// Action icons (Row 3, frames 48-63)
export const ICON_SWORD = 48;
export const ICON_ROUND_SHIELD = 49;
export const ICON_SPELL = 50;
export const ICON_BAG = 51;
export const ICON_BOOT = 52;
export const ICON_EYE = 53;
export const ICON_EAR = 54;
export const ICON_HAND = 55;

// Dialog 9-slice pieces (Rows 4-6, frames 64-111)
export const DIALOG_TL = 64;
export const DIALOG_T = 65;
export const DIALOG_TR = 66;
export const PROGRESS_LEFT = 67;
export const PROGRESS_EMPTY = 68;
export const PROGRESS_RIGHT = 69;
export const BUTTON_FRAME = 70;
export const BUTTON_FRAME_ALT = 71;

export const DIALOG_L = 80;
export const DIALOG_C = 81;
export const DIALOG_R = 82;
export const PROGRESS_TRACK = 83;
export const SEPARATOR_H = 84;
export const SEPARATOR_V = 85;
export const PANEL_DARK_SMALL = 86;
export const PANEL_LIGHT_SMALL = 87;

export const DIALOG_BL = 96;
export const DIALOG_B = 97;
export const DIALOG_BR = 98;
export const TAB_ACTIVE = 99;
export const TAB_INACTIVE = 100;
export const DIVIDER = 101;
export const CORNER_DECOR = 102;
export const EDGE_DECOR = 103;

// Selection indicators (Row 7, frames 112-127)
export const ARROW_RIGHT = 112;
export const CURSOR_HAND = 113;
export const CROSSHAIR = 114;
export const BRACKET_LEFT = 115;
export const BRACKET_RIGHT = 116;
export const SELECT_CORNER = 117;
export const SELECT_CIRCLE = 118;
export const SELECT_STAR = 119;

// Colored panels (Rows 8-11, frames 128-191)
// Each color has: [small, large, border, alt]
export const PANEL_RED = { small: 128, large: 129, border: 130, alt: 131 };
export const PANEL_PINK = { small: 132, large: 133, border: 134, alt: 135 };
export const PANEL_BLUE = { small: 136, large: 137, border: 138, alt: 139 };
export const PANEL_CYAN = { small: 140, large: 141, border: 142, alt: 143 };
export const PANEL_GREEN = { small: 144, large: 145, border: 146, alt: 147 };
export const PANEL_YELLOW = { small: 148, large: 149, border: 150, alt: 151 };
export const PANEL_DARK = { small: 152, large: 153, border: 154, alt: 155 };
export const PANEL_GRAY = { small: 156, large: 157, border: 158, alt: 159 };

// Grouped exports for convenience
export const HEARTS = [HEART_FULL, HEART_THREE_QUARTER, HEART_HALF, HEART_QUARTER, HEART_EMPTY];
export const MANA = [MANA_FULL, MANA_THREE_QUARTER, MANA_HALF, MANA_QUARTER, MANA_EMPTY];

export const DIALOG_9SLICE = {
  topLeft: DIALOG_TL,
  top: DIALOG_T,
  topRight: DIALOG_TR,
  left: DIALOG_L,
  center: DIALOG_C,
  right: DIALOG_R,
  bottomLeft: DIALOG_BL,
  bottom: DIALOG_B,
  bottomRight: DIALOG_BR,
};

// Semantic lookup by name
export const GUI_FRAMES = {
  // Health
  heartFull: HEART_FULL,
  heartThreeQuarter: HEART_THREE_QUARTER,
  heartHalf: HEART_HALF,
  heartQuarter: HEART_QUARTER,
  heartEmpty: HEART_EMPTY,

  // Mana
  manaFull: MANA_FULL,
  manaThreeQuarter: MANA_THREE_QUARTER,
  manaHalf: MANA_HALF,
  manaQuarter: MANA_QUARTER,
  manaEmpty: MANA_EMPTY,

  // Status
  check: ICON_CHECK,
  x: ICON_X,
  lock: ICON_LOCK,
  unlock: ICON_UNLOCK,

  // Combat
  swords: ICON_SWORDS,
  shield: ICON_SHIELD,
  magic: ICON_MAGIC,
  potion: ICON_POTION,
  bow: ICON_BOW,
  armor: ICON_ARMOR,
  scroll: ICON_SCROLL,
  gem: ICON_GEM,

  // Actions
  sword: ICON_SWORD,
  roundShield: ICON_ROUND_SHIELD,
  spell: ICON_SPELL,
  bag: ICON_BAG,
  boot: ICON_BOOT,
  eye: ICON_EYE,
  ear: ICON_EAR,
  hand: ICON_HAND,

  // UI
  arrowRight: ARROW_RIGHT,
  cursor: CURSOR_HAND,
  crosshair: CROSSHAIR,
  bracketLeft: BRACKET_LEFT,
  bracketRight: BRACKET_RIGHT,
};

export default GUI_FRAMES;
