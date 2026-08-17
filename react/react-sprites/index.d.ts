/**
 * Type definitions for the reusable sprite components.
 */

import React from 'react';
import type { DawnlikeAtlas } from '../../src/utils/atlasApi';

export interface SpriteProps {
  /** Path to the spritesheet image. */
  src: string;
  /** Frame index (0-based, left-to-right, top-to-bottom). */
  frame?: number;
  /** Number of columns in the spritesheet. Default 8. */
  cols?: number;
  /** Size of each frame in pixels. Default 16. */
  size?: number;
  /** Display scale multiplier. Default 2. */
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler;
  [key: string]: any;
}

export function Sprite(props: SpriteProps): React.JSX.Element;

export interface HoverSpriteProps extends SpriteProps {
  /** Frame shown while hovered. */
  hoverFrame?: number;
  /** Spritesheet shown while hovered (e.g. the glow sheet). */
  hoverSrc?: string;
}

export function HoverSprite(props: HoverSpriteProps): React.JSX.Element;

export interface AnimatedSpriteProps extends Omit<SpriteProps, 'frame'> {
  /** Frame indices to cycle through. */
  frames: number[];
  /** Frames per second. Default 8. */
  fps?: number;
  /** Loop the animation. Default true. */
  loop?: boolean;
  /** Whether the animation is running. Default true. */
  playing?: boolean;
  /** Play forward then backward. Default false. */
  pingPong?: boolean;
  /** Fired when a non-looping animation finishes. */
  onComplete?: () => void;
}

export function AnimatedSprite(props: AnimatedSpriteProps): React.JSX.Element | null;

export interface PulsingSpriteProps extends SpriteProps {
  /** Glow spritesheet cross-faded over the base sheet. */
  glowSrc?: string;
  /** Milliseconds for a full pulse cycle. Default 800. */
  pulseDuration?: number;
  playing?: boolean;
}

export function PulsingSprite(props: PulsingSpriteProps): React.JSX.Element;

export interface SpriteIconProps extends Omit<SpriteProps, 'frame'> {
  /** Semantic frame name looked up in `frames`. */
  name: string;
  /** Name → frame index map. */
  frames: Record<string, number>;
  [key: string]: any;
}

export function SpriteIcon(props: SpriteIconProps): React.JSX.Element;

export interface StatBarProps {
  current: number;
  max: number;
  /** Number of icons in the bar. */
  count?: number;
  /** Frame names from empty → full. */
  fillFrameNames: string[];
  frames: Record<string, number>;
  src: string;
  [key: string]: any;
}

export function StatBar(props: StatBarProps): React.JSX.Element;

export interface AtlasSpriteProps {
  /** Parsed `DawnlikeAtlas.json` (see `useAtlas`). */
  atlas: DawnlikeAtlas | null;
  /** Key into `atlas.byName`, e.g. 'wizard'. */
  name: string;
  /** Integer render scale; 32px cells × scale. Default 1. */
  scale?: number;
  /** Flip to sheet 1 for sprites flagged `isAnimated`. Default false. */
  animated?: boolean;
  /** Flip rate while animating. Default 4. */
  fps?: number;
  /** Prefix for the sheet PNG URLs. Default ''. */
  basePath?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Tooltip / accessible label. Defaults to the sprite name. */
  title?: string;
  onClick?: React.MouseEventHandler;
  [key: string]: any;
}

export function AtlasSprite(props: AtlasSpriteProps): React.JSX.Element | null;

export interface AtlasTileMapProps {
  atlas: DawnlikeAtlas | null;
  /** Row-major grid; each cell is a name, a layer stack, or null. */
  tiles: Array<Array<string | string[] | null | undefined>>;
  scale?: number;
  animated?: boolean;
  basePath?: string;
  className?: string;
  style?: React.CSSProperties;
  onTileClick?: (info: { x: number; y: number; names: string[] }) => void;
  [key: string]: any;
}

export function AtlasTileMap(props: AtlasTileMapProps): React.JSX.Element;

/** Load `DawnlikeAtlas.json` once and share it across components. */
export function useAtlas(url?: string): {
  atlas: DawnlikeAtlas | null;
  loading: boolean;
  error: Error | null;
};

export interface NineSlicePanelProps {
  src: string;
  /** Frame indices for the nine slices. */
  frames: { tl: number; t: number; tr: number; l: number; c: number; r: number; bl: number; b: number; br: number };
  width?: number;
  height?: number;
  scale?: number;
  cols?: number;
  size?: number;
  children?: React.ReactNode;
  [key: string]: any;
}

export function NineSlicePanel(props: NineSlicePanelProps): React.JSX.Element;

export interface PixelButtonProps extends SpriteProps {
  hoverFrame?: number;
  pressedFrame?: number;
  children?: React.ReactNode;
}

export function PixelButton(props: PixelButtonProps): React.JSX.Element;

export interface IconButtonProps {
  /** Any React icon component (lucide-react, react-icons, …). */
  icon: React.ComponentType<any>;
  size?: number;
  color?: string;
  title?: string;
  onClick?: React.MouseEventHandler;
  [key: string]: any;
}

export function IconButton(props: IconButtonProps): React.JSX.Element;
