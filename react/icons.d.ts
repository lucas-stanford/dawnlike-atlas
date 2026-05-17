/**
 * DawnLike-specific React components for GUI sprites.
 *
 * Usage:
 *   import { DawnLikeIcon, HealthBar, ManaBar } from './asset-packs/dawnlike/react';
 */

import React from 'react';
import { GUIFrames } from './frames';

/**
 * Props for DawnLikeIcon component.
 */
export interface DawnLikeIconProps {
  /** Semantic name of the icon from GUI_FRAMES */
  name: keyof GUIFrames;
  /** Source path for the GUI spritesheet (default: '/assets/dawnlike/GUI/GUI0.png') */
  src?: string;
  /** Source path for the glowing variant spritesheet */
  glowSrc?: string;
  /** Enable glow effect on hover (default: false) */
  glowOnHover?: boolean;
  /** Scale factor for the icon (default: 2) */
  scale?: number;
  /** Additional CSS class name */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Additional props passed to the underlying component */
  [key: string]: any;
}

/**
 * DawnLike GUI icon with semantic naming.
 *
 * @example
 * <DawnLikeIcon name="heartFull" />
 * <DawnLikeIcon name="sword" />
 * <DawnLikeIcon name="manaEmpty" glowOnHover />
 */
export const DawnLikeIcon: React.FC<DawnLikeIconProps>;

/**
 * Props for HeartIcon component.
 */
export interface HeartIconProps extends Omit<DawnLikeIconProps, 'name'> {
  /** Fill level of the heart (0-4: empty to full, default: 4) */
  fill?: number;
}

/**
 * Heart icon with fill level (0-4).
 */
export const HeartIcon: React.FC<HeartIconProps>;

/**
 * Props for ManaIcon component.
 */
export interface ManaIconProps extends Omit<DawnLikeIconProps, 'name'> {
  /** Fill level of the mana orb (0-4: empty to full, default: 4) */
  fill?: number;
}

/**
 * Mana orb icon with fill level (0-4).
 */
export const ManaIcon: React.FC<ManaIconProps>;

/**
 * Props for HealthBar component.
 */
export interface HealthBarProps {
  /** Current health value */
  current: number;
  /** Maximum health value */
  max: number;
  /** Number of hearts to display (default: 5) */
  heartsCount?: number;
  /** Source path for the GUI spritesheet (default: '/assets/dawnlike/GUI/GUI0.png') */
  src?: string;
  /** Source path for the glowing variant spritesheet */
  glowSrc?: string;
  /** Scale factor for the hearts (default: 2) */
  scale?: number;
  /** Additional CSS class name */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

/**
 * Health bar using heart icons.
 *
 * @example
 * <HealthBar current={75} max={100} />
 * <HealthBar current={3} max={5} heartsCount={5} />
 */
export const HealthBar: React.FC<HealthBarProps>;

/**
 * Props for ManaBar component.
 */
export interface ManaBarProps {
  /** Current mana value */
  current: number;
  /** Maximum mana value */
  max: number;
  /** Number of mana orbs to display (default: 5) */
  orbCount?: number;
  /** Source path for the GUI spritesheet (default: '/assets/dawnlike/GUI/GUI0.png') */
  src?: string;
  /** Source path for the glowing variant spritesheet */
  glowSrc?: string;
  /** Scale factor for the orbs (default: 2) */
  scale?: number;
  /** Additional CSS class name */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

/**
 * Mana bar using mana orb icons.
 *
 * @example
 * <ManaBar current={30} max={50} />
 */
export const ManaBar: React.FC<ManaBarProps>;

export default DawnLikeIcon;
