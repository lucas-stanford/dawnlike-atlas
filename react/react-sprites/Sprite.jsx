import React from 'react';

/**
 * Base sprite component for displaying a single frame from a spritesheet.
 *
 * @param {string} src - Path to the spritesheet image
 * @param {number} frame - Frame index (0-based, left-to-right, top-to-bottom)
 * @param {number} cols - Number of columns in the spritesheet (default: 8)
 * @param {number} size - Size of each frame in pixels (default: 16)
 * @param {number} scale - Display scale multiplier (default: 2)
 * @param {string} className - Additional CSS class names
 * @param {object} style - Additional inline styles
 * @param {function} onClick - Click handler
 */
export function Sprite({
  src,
  frame = 0,
  cols = 8,
  size = 16,
  scale = 2,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  const x = (frame % cols) * size;
  const y = Math.floor(frame / cols) * size;

  return (
    <div
      className={`sprite ${className}`}
      onClick={onClick}
      style={{
        width: size * scale,
        height: size * scale,
        backgroundImage: `url(${src})`,
        backgroundPosition: `-${x * scale}px -${y * scale}px`,
        backgroundSize: `${cols * size * scale}px auto`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        display: 'inline-block',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Sprite with hover state support (switches between two frames)
 */
export function HoverSprite({
  src,
  frame,
  hoverFrame,
  hoverSrc,
  cols = 8,
  size = 16,
  scale = 2,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Sprite
      src={isHovered && hoverSrc ? hoverSrc : src}
      frame={isHovered && hoverFrame !== undefined ? hoverFrame : frame}
      cols={cols}
      size={size}
      scale={scale}
      className={className}
      style={style}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    />
  );
}

export default Sprite;
