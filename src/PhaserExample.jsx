import React, { useEffect, useRef } from 'react';
import { createGame } from './phaser/index.js';
import { reset as resetSave } from './phaser/save.js';

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
 *
 * The optional `manifests` prop lets callers override the generator
 * knobs that build each scene. Changing it re-mounts the Phaser game
 * (so the new tile mix is visible immediately) and wipes the save so
 * the player isn't stranded on a tile that no longer exists.
 *
 * @param {Object} [props]
 * @param {{ world?: object, town?: object, dungeon?: object }} [props.manifests]
 * @param {number} [props.width=800]
 * @param {number} [props.height=696]
 */
export default function PhaserExample({ manifests, width = 800, height = 696 }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  // Serialize manifests so React only re-runs the effect on real value
  // changes, not on every new object identity from the parent.
  const manifestKey = JSON.stringify(manifests || {});

  useEffect(() => {
    if (!containerRef.current) return;
    if (gameRef.current) {
      // Tear down the previous Phaser instance before rebuilding with
      // new manifests. Wipe the save first: tile-mix changes can make
      // the saved player position unwalkable (or land on a marker),
      // and the simplest correct behaviour is to restart in the new
      // world.
      gameRef.current.destroy(true);
      gameRef.current = null;
      resetSave();
    }
    gameRef.current = createGame(containerRef.current, {
      width, height,
      manifests: manifests || {},
    });
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifestKey, width, height]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, margin: '0 auto', background: '#0a0a0a' }}
    />
  );
}
