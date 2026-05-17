import React, { useMemo } from 'react';

/**
 * 9-Slice Panel component for pixel art UIs.
 * Renders a resizable panel using 9-slice scaling from a spritesheet.
 *
 * @example
 * <NineSlicePanel
 *   src="/assets/GUI/GUI0.png"
 *   frames={{ tl: 32, t: 33, tr: 34, l: 40, c: 41, r: 42, bl: 48, b: 49, br: 50 }}
 *   width={200}
 *   height={150}
 * >
 *   <p>Panel content here</p>
 * </NineSlicePanel>
 */
export function NineSlicePanel({
  src,
  frames,
  cols = 8,
  tileSize = 16,
  width,
  height,
  minWidth,
  minHeight,
  scale = 1,
  padding,
  className = '',
  style = {},
  children,
  ...props
}) {
  const scaledTile = tileSize * scale;

  // Calculate inner dimensions
  const innerWidth = width ? Math.max(0, width - scaledTile * 2) : undefined;
  const innerHeight = height ? Math.max(0, height - scaledTile * 2) : undefined;

  // Generate tile positions from frame numbers
  const getTileStyle = (frame) => {
    const x = (frame % cols) * tileSize;
    const y = Math.floor(frame / cols) * tileSize;
    return {
      backgroundImage: `url(${src})`,
      backgroundPosition: `-${x * scale}px -${y * scale}px`,
      backgroundSize: `${cols * tileSize * scale}px auto`,
      backgroundRepeat: 'no-repeat',
      imageRendering: 'pixelated',
    };
  };

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: `${scaledTile}px ${innerWidth !== undefined ? `${innerWidth}px` : '1fr'} ${scaledTile}px`,
    gridTemplateRows: `${scaledTile}px ${innerHeight !== undefined ? `${innerHeight}px` : '1fr'} ${scaledTile}px`,
    width: width || 'auto',
    height: height || 'auto',
    minWidth: minWidth || scaledTile * 3,
    minHeight: minHeight || scaledTile * 3,
    ...style,
  };

  // Tiling style for edges and center
  const getTilingStyle = (frame, direction) => {
    const base = getTileStyle(frame);
    if (direction === 'horizontal') {
      return { ...base, backgroundRepeat: 'repeat-x' };
    } else if (direction === 'vertical') {
      return { ...base, backgroundRepeat: 'repeat-y' };
    } else if (direction === 'both') {
      return { ...base, backgroundRepeat: 'repeat' };
    }
    return base;
  };

  return (
    <div className={`nine-slice-panel ${className}`} style={containerStyle} {...props}>
      {/* Top row */}
      <div style={{ ...getTileStyle(frames.tl), width: scaledTile, height: scaledTile }} />
      <div style={{ ...getTilingStyle(frames.t, 'horizontal'), height: scaledTile }} />
      <div style={{ ...getTileStyle(frames.tr), width: scaledTile, height: scaledTile }} />

      {/* Middle row */}
      <div style={{ ...getTilingStyle(frames.l, 'vertical'), width: scaledTile }} />
      <div
        style={{
          ...getTilingStyle(frames.c, 'both'),
          padding: padding !== undefined ? padding : scaledTile / 2,
          overflow: 'auto',
        }}
      >
        {children}
      </div>
      <div style={{ ...getTilingStyle(frames.r, 'vertical'), width: scaledTile }} />

      {/* Bottom row */}
      <div style={{ ...getTileStyle(frames.bl), width: scaledTile, height: scaledTile }} />
      <div style={{ ...getTilingStyle(frames.b, 'horizontal'), height: scaledTile }} />
      <div style={{ ...getTileStyle(frames.br), width: scaledTile, height: scaledTile }} />
    </div>
  );
}

export default NineSlicePanel;
