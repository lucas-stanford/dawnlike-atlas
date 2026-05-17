import React from 'react';
import { Sprite, HoverSprite } from './Sprite';

/**
 * Generic icon component that looks up frame numbers from a provided frames map.
 * Use this as a base for asset-pack-specific icon components.
 *
 * @param {string} name - Semantic icon name (e.g., 'heartFull', 'sword')
 * @param {object} frames - Frame lookup object mapping names to frame numbers
 * @param {string} src - Path to spritesheet
 * @param {string} glowSrc - Path to glow variant spritesheet (for hover effect)
 * @param {number} cols - Columns in spritesheet (default: 8)
 * @param {number} size - Frame size in pixels (default: 16)
 * @param {number} scale - Display scale multiplier (default: 2)
 */
export function SpriteIcon({
  name,
  frames,
  src,
  glowSrc,
  cols = 8,
  size = 16,
  scale = 2,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  const frame = frames?.[name];

  if (frame === undefined) {
    console.warn(`SpriteIcon: Unknown icon name "${name}"`);
    return null;
  }

  if (glowSrc) {
    return (
      <HoverSprite
        src={src}
        hoverSrc={glowSrc}
        frame={frame}
        hoverFrame={frame}
        cols={cols}
        size={size}
        scale={scale}
        className={className}
        style={style}
        onClick={onClick}
        {...props}
      />
    );
  }

  return (
    <Sprite
      src={src}
      frame={frame}
      cols={cols}
      size={size}
      scale={scale}
      className={className}
      style={style}
      onClick={onClick}
      {...props}
    />
  );
}

/**
 * Generic stat bar component using fill icons.
 *
 * @param {number} current - Current value
 * @param {number} max - Maximum value
 * @param {number} count - Number of icons to display
 * @param {string[]} fillFrameNames - Array of 5 frame names from empty to full
 * @param {object} frames - Frame lookup object
 * @param {string} src - Path to spritesheet
 */
export function StatBar({
  current,
  max,
  count = 5,
  fillFrameNames,
  frames,
  src,
  glowSrc,
  cols = 8,
  size = 16,
  scale = 2,
  className = '',
  style = {},
}) {
  const valuePerIcon = max / count;

  return (
    <div className={`stat-bar ${className}`} style={{ display: 'flex', gap: 2, ...style }}>
      {Array.from({ length: count }, (_, i) => {
        const iconValue = current - i * valuePerIcon;
        const fillIndex = Math.max(0, Math.min(4, Math.round((iconValue / valuePerIcon) * 4)));
        const frameName = fillFrameNames[fillIndex];

        return (
          <SpriteIcon
            key={i}
            name={frameName}
            frames={frames}
            src={src}
            glowSrc={glowSrc}
            cols={cols}
            size={size}
            scale={scale}
          />
        );
      })}
    </div>
  );
}

export default SpriteIcon;
