import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function PhaserExample() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 800,
      height: 600,
      pixelArt: true,
      backgroundColor: '#1a1a1a',
      scene: {
        preload: function () {
          // Load the atlas from the static 'atlas' directory
          this.load.atlas('dawnlike', 'DawnlikeAtlas0.png', 'DawnlikeAtlas.json');
        },
        create: function () {
          const { width, height } = this.scale;
          
          this.add.text(width / 2, 20, 'DawnLike Mega Atlas Example (Phaser 4)', {
            fontSize: '24px',
            fill: '#fff'
          }).setOrigin(0.5);

          // Get all frame names from the atlas
          const frames = this.textures.get('dawnlike').getFrameNames();
          
          // Display 100 random sprites
          for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(50, width - 50);
            const y = Phaser.Math.Between(100, height - 50);
            const frame = Phaser.Utils.Array.GetRandom(frames);
            
            const sprite = this.add.sprite(x, y, 'dawnlike', frame);
            sprite.setScale(2);
            
            // Add some simple animation/interaction
            this.tweens.add({
              targets: sprite,
              y: y - 10,
              duration: Phaser.Math.Between(1000, 2000),
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
              delay: Phaser.Math.Between(0, 1000)
            });
          }
        }
      }
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
