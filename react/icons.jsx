/**
 * DawnLike-specific React components for GUI sprites.
 *
 * Usage:
 *   import { DawnLikeIcon, HealthBar, ManaBar } from './asset-packs/dawnlike/react';
 */

import React from 'react';
import { SpriteIcon, StatBar } from './react-sprites';
import { GUI_FRAMES } from './frames';

// Default paths - adjust based on your project structure
const DEFAULT_GUI_SRC = '/atlas/GUIAtlas0.png';
const DEFAULT_GUI_GLOW_SRC = '/atlas/GUIAtlas1.png';

/**
 * DawnLike GUI icon with semantic naming.
 *
 * @example
 * <DawnLikeIcon name="heartFull" />
 * <DawnLikeIcon name="sword" />
 * <DawnLikeIcon name="manaEmpty" glowOnHover />
 */
export function DawnLikeIcon({
  name,
  src = DEFAULT_GUI_SRC,
  glowSrc,
  glowOnHover = false,
  scale = 2,
  ...props
}) {
  return (
    <SpriteIcon
      name={name}
      frames={GUI_FRAMES}
      src={src}
      glowSrc={glowOnHover ? (glowSrc || DEFAULT_GUI_GLOW_SRC) : glowSrc}
      cols={16}
      size={16}
      scale={scale}
      {...props}
    />
  );
}

/**
 * Heart icon with fill level (0-4).
 */
export function HeartIcon({ fill = 4, ...props }) {
  const frameNames = ['heartEmpty', 'heartQuarter', 'heartHalf', 'heartThreeQuarter', 'heartFull'];
  const name = frameNames[Math.max(0, Math.min(4, Math.round(fill)))];
  return <DawnLikeIcon name={name} {...props} />;
}

/**
 * Mana orb icon with fill level (0-4).
 */
export function ManaIcon({ fill = 4, ...props }) {
  const frameNames = ['manaEmpty', 'manaQuarter', 'manaHalf', 'manaThreeQuarter', 'manaFull'];
  const name = frameNames[Math.max(0, Math.min(4, Math.round(fill)))];
  return <DawnLikeIcon name={name} {...props} />;
}

/**
 * Health bar using heart icons.
 *
 * @example
 * <HealthBar current={75} max={100} />
 * <HealthBar current={3} max={5} heartsCount={5} />
 */
export function HealthBar({
  current,
  max,
  heartsCount = 5,
  src = DEFAULT_GUI_SRC,
  glowSrc = DEFAULT_GUI_GLOW_SRC,
  scale = 2,
  className = '',
  style = {},
}) {
  return (
    <StatBar
      current={current}
      max={max}
      count={heartsCount}
      fillFrameNames={['heartEmpty', 'heartQuarter', 'heartHalf', 'heartThreeQuarter', 'heartFull']}
      frames={GUI_FRAMES}
      src={src}
      glowSrc={glowSrc}
      cols={16}
      size={16}
      scale={scale}
      className={className}
      style={style}
    />
  );
}

/**
 * Mana bar using mana orb icons.
 *
 * @example
 * <ManaBar current={30} max={50} />
 */
export function ManaBar({
  current,
  max,
  orbCount = 5,
  src = DEFAULT_GUI_SRC,
  glowSrc = DEFAULT_GUI_GLOW_SRC,
  scale = 2,
  className = '',
  style = {},
}) {
  return (
    <StatBar
      current={current}
      max={max}
      count={orbCount}
      fillFrameNames={['manaEmpty', 'manaQuarter', 'manaHalf', 'manaThreeQuarter', 'manaFull']}
      frames={GUI_FRAMES}
      src={src}
      glowSrc={glowSrc}
      cols={16}
      size={16}
      scale={scale}
      className={className}
      style={style}
    />
  );
}

export default DawnLikeIcon;
