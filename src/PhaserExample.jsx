import React, { useEffect, useRef } from 'react';
import { createGame } from './phaser/index.js';

/**
 * PhaserExample — thin React wrapper that mounts the Phaser roguelike
 * into a host <div>. All game logic lives under src/phaser/.
 *
 * The roguelike has an overworld, a town, and a 3-level dungeon, all
 * linked by working bidirectional exits. State (seed + per-scene player
 * position + HP/MP) is persisted to localStorage under
 * 'dawnlike:roguelike:v1', so reloading the page resumes exactly where
 * you left off.
 *
 * Click the "New Game" button in the HUD (top-left) to wipe the save
 * and start a fresh world.
 */
export default function PhaserExample() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  // Canvas dimensions:
  //   - 96px reserved at the top for the HUD strip (see UIScene.HUD_HEIGHT)
  //   - 600px below for the actual map viewport
  //   - total height 696, width 800
  const W = 800, H = 696;

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    gameRef.current = createGame(containerRef.current, { width: W, height: H });
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: W, height: H, margin: '0 auto', background: '#0a0a0a' }}
    />
  );
}
