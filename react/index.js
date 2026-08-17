// dawnlike-atlas — package entry point.
//
// Three groups of exports:
//   1. Sprite components — generic (frame-indexed) and atlas-aware (name-addressed)
//   2. GUI frame constants + DawnLike-specific icon/bar components
//   3. The framework-agnostic atlas helpers (also at 'dawnlike-atlas/atlas-api')

// 1. Sprite + UI components
export {
  Sprite,
  HoverSprite,
  AnimatedSprite,
  PulsingSprite,
  SpriteIcon,
  StatBar,
  AtlasSprite,
  AtlasTileMap,
  useAtlas,
  NineSlicePanel,
  PixelButton,
  IconButton,
} from './react-sprites/index.js';

// 2. GUI frame constants and DawnLike icons
export * from './frames';
export { default as GUI_FRAMES } from './frames';
export {
  DawnLikeIcon,
  HeartIcon,
  ManaIcon,
  HealthBar,
  ManaBar,
} from './icons';

// 3. Atlas helpers
export {
  ATLAS_JSON,
  ATLAS_SHEETS,
  loadAtlas,
  clearAtlasCache,
  getSprite,
  hasSprite,
  isAnimated,
  spriteNames,
  spriteTags,
  tagIndex,
  searchSprites,
  spritesByTag,
  autotileFamilies,
  spriteCell,
  nameAtIndex,
  spriteStyle,
  drawSprite,
  pickSprite,
  animationFrames,
} from '../src/utils/atlasApi.js';
