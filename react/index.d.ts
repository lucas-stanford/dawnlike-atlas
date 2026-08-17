/**
 * dawnlike-atlas — package entry point.
 * TypeScript definitions
 */

// Sprite + UI components (generic and atlas-aware)
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
  type SpriteProps,
  type HoverSpriteProps,
  type AnimatedSpriteProps,
  type PulsingSpriteProps,
  type SpriteIconProps,
  type StatBarProps,
  type AtlasSpriteProps,
  type AtlasTileMapProps,
  type NineSlicePanelProps,
  type PixelButtonProps,
  type IconButtonProps,
} from './react-sprites/index';

// Frame constants and types
export * from './frames';
export { default as GUI_FRAMES } from './frames';

// DawnLike icon components
export {
  DawnLikeIcon,
  HeartIcon,
  ManaIcon,
  HealthBar,
  ManaBar,
  type DawnLikeIconProps,
  type HeartIconProps,
  type ManaIconProps,
  type HealthBarProps,
  type ManaBarProps,
} from './icons';

// Framework-agnostic atlas helpers
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
  type DawnlikeAtlas,
  type AtlasSpriteRecord,
  type AtlasMeta,
  type SearchOptions,
  type SpriteStyleOptions,
} from '../src/utils/atlasApi';
