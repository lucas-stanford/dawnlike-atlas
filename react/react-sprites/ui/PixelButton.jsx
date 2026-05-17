import React, { useState } from 'react';

/**
 * Pixel art button with sprite-based states.
 * Supports normal, hover, pressed, and disabled states.
 *
 * @example
 * <PixelButton
 *   src="/assets/GUI/GUI0.png"
 *   frame={72}
 *   hoverFrame={73}
 *   onClick={() => console.log('clicked')}
 * >
 *   Click Me
 * </PixelButton>
 */
export function PixelButton({
  src,
  glowSrc,
  frame,
  hoverFrame,
  pressedFrame,
  disabledFrame,
  cols = 8,
  tileSize = 16,
  scale = 2,
  width,
  height,
  disabled = false,
  className = '',
  style = {},
  onClick,
  children,
  ...props
}) {
  const [state, setState] = useState('normal');

  const currentFrame = disabled
    ? (disabledFrame ?? frame)
    : state === 'pressed'
    ? (pressedFrame ?? hoverFrame ?? frame)
    : state === 'hover'
    ? (hoverFrame ?? frame)
    : frame;

  const currentSrc = state === 'hover' && glowSrc && !hoverFrame ? glowSrc : src;

  const x = (currentFrame % cols) * tileSize;
  const y = Math.floor(currentFrame / cols) * tileSize;

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: width || tileSize * scale,
    height: height || tileSize * scale,
    backgroundImage: `url(${currentSrc})`,
    backgroundPosition: `-${x * scale}px -${y * scale}px`,
    backgroundSize: `${cols * tileSize * scale}px auto`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    border: 'none',
    padding: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'opacity 0.1s',
    ...style,
  };

  return (
    <button
      className={`pixel-button ${className}`}
      style={buttonStyle}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => !disabled && setState('hover')}
      onMouseLeave={() => !disabled && setState('normal')}
      onMouseDown={() => !disabled && setState('pressed')}
      onMouseUp={() => !disabled && setState('hover')}
      {...props}
    >
      {children && (
        <span style={{
          position: 'relative',
          zIndex: 1,
          color: '#fff',
          textShadow: '1px 1px 0 #000',
          fontSize: `${Math.max(8, tileSize * scale * 0.5)}px`,
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}>
          {children}
        </span>
      )}
    </button>
  );
}

/**
 * Button with a React icon component (Lucide, React Icons, Phosphor, etc.)
 *
 * @example
 * import { Heart, Settings } from 'lucide-react';
 *
 * <IconButton icon={Heart} onClick={handleLike} title="Like" />
 * <IconButton icon={Settings} size={24} onClick={openSettings} />
 *
 * @example
 * // With react-icons
 * import { FaHeart } from 'react-icons/fa';
 * <IconButton icon={FaHeart} onClick={handleLike} />
 */
export function IconButton({
  icon: Icon,
  size = 20,
  color = 'currentColor',
  title,
  disabled = false,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  if (!Icon) {
    throw new Error('IconButton: icon prop is required');
  }

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    background: 'transparent',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    color: color,
    ...style,
  };

  return (
    <button
      className={`icon-button ${className}`}
      style={buttonStyle}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      {...props}
    >
      <Icon size={size} />
    </button>
  );
}

export default PixelButton;
