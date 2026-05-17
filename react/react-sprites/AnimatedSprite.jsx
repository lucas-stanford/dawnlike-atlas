import React, { useState, useEffect, useCallback } from 'react';
import { Sprite } from './Sprite';

/**
 * Animated sprite that cycles through frames.
 *
 * @param {string} src - Path to the spritesheet image
 * @param {number[]} frames - Array of frame indices to animate through
 * @param {number} fps - Frames per second (default: 8)
 * @param {boolean} loop - Whether to loop the animation (default: true)
 * @param {boolean} playing - Whether animation is playing (default: true)
 * @param {boolean} pingPong - Play forward then backward (default: false)
 * @param {function} onComplete - Callback when non-looping animation completes
 * @param {number} cols - Number of columns in the spritesheet (default: 8)
 * @param {number} size - Size of each frame in pixels (default: 16)
 * @param {number} scale - Display scale multiplier (default: 2)
 */
export function AnimatedSprite({
  src,
  frames,
  fps = 8,
  loop = true,
  playing = true,
  pingPong = false,
  onComplete,
  cols = 8,
  size = 16,
  scale = 2,
  className = '',
  style = {},
  ...props
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (!playing || !frames || frames.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        let next = prev + direction;

        if (pingPong) {
          if (next >= frames.length) {
            setDirection(-1);
            return frames.length - 2;
          } else if (next < 0) {
            setDirection(1);
            return 1;
          }
        } else {
          if (next >= frames.length) {
            if (loop) {
              return 0;
            } else {
              onComplete?.();
              return prev;
            }
          }
        }

        return next;
      });
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [frames, fps, loop, playing, pingPong, direction, onComplete]);

  // Reset when frames change
  useEffect(() => {
    setCurrentIndex(0);
    setDirection(1);
  }, [frames]);

  if (!frames || frames.length === 0) return null;

  return (
    <Sprite
      src={src}
      frame={frames[currentIndex]}
      cols={cols}
      size={size}
      scale={scale}
      className={className}
      style={style}
      {...props}
    />
  );
}

/**
 * Sprite that pulses between two spritesheets (e.g., GUI0 and GUI1 for glow effect)
 */
export function PulsingSprite({
  src,
  glowSrc,
  frame,
  pulseDuration = 800,
  playing = true,
  cols = 8,
  size = 16,
  scale = 2,
  className = '',
  style = {},
  ...props
}) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!playing || !glowSrc) return;

    let startTime = Date.now();
    let animationFrame;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % pulseDuration) / pulseDuration;
      // Sine wave for smooth pulse: 0 -> 1 -> 0
      const value = Math.sin(progress * Math.PI);
      setOpacity(value);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [pulseDuration, playing, glowSrc]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Sprite
        src={src}
        frame={frame}
        cols={cols}
        size={size}
        scale={scale}
        className={className}
        style={style}
        {...props}
      />
      {glowSrc && (
        <Sprite
          src={glowSrc}
          frame={frame}
          cols={cols}
          size={size}
          scale={scale}
          className={className}
          style={{
            ...style,
            position: 'absolute',
            top: 0,
            left: 0,
            opacity,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

export default AnimatedSprite;
