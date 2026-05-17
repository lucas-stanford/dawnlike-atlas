/**
 * DawnLike-specific React components and frame constants
 * TypeScript definitions
 */

// Re-export all frame constants and types
export * from './frames';
export { default as GUI_FRAMES } from './frames';

// Re-export all icon components and types
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
