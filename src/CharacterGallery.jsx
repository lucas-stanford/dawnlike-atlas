import React from 'react';
import './CharacterGallery.css';

export function CharacterGallery({ 
  characterName, 
  basePrompt, 
  portraitUrl, 
  portraitModifier = "close-up character portrait for a retro RPG dialogue box, symmetrical face, clear features, transparent background, pixel art, 16-bit style, pure white background.",
  walkUrl, 
  walkModifier = "walking animation sprite sheet, 4 distinct animation frames horizontally, evenly spaced, clean layout with no grid lines, standard RPG walk cycle, consistent character proportions, clear pixel art, 16-bit retro RPG style, pure white background.",
  walkGridFormat = "1x4",
  actionUrl,
  actionModifier = "attacking animation sprite sheet, 4 distinct animation frames horizontally, evenly spaced, clean layout with no grid lines, weapon swinging in a clear arc, consistent character proportions, clear pixel art, 16-bit retro RPG style, pure white background.",
  actionGridFormat = "1x4"
}) {

  return (
    <div className="character-gallery">
      <h2>{characterName}</h2>
      <div className="prompt-section">
        <strong>Base Prompt:</strong>
        <p>"{basePrompt}"</p>
      </div>

      <div className="assets-grid">
        <div className="asset-card">
          <h3>Portrait</h3>
          <div className="img-container portrait-container">
            <img src={portraitUrl} alt={`${characterName} portrait`} />
          </div>
          <div className="prompt-modifier">
            <strong>Modifier:</strong>
            <p>"{portraitModifier}"</p>
          </div>
        </div>

        <div className="asset-card">
          <h3>Walk Sprite</h3>
          <div className="img-container sprite-container">
            <div className="full-sheet">
              <span className="preview-label">Sprite Sheet</span>
              <img src={walkUrl} alt={`${characterName} walk sprite`} className="full-sprite-img" />
            </div>
            <div className="animation-preview">
              <span className="preview-label">Animation ({walkGridFormat})</span>
              {walkGridFormat === '3x4' ? (
                <div className="animation-grid-2x2">
                  {['down', 'left', 'right', 'up'].map(dir => (
                    <div key={dir} className={`animated-sprite-window format-3x4 dir-${dir}`}>
                      <div className="animated-sprite-inner">
                        <img src={walkUrl} alt={`${characterName} walk ${dir}`} className="animated-sprite-img" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`animated-sprite-window format-${walkGridFormat}`}>
                  <div className="animated-sprite-inner">
                    <img src={walkUrl} alt={`${characterName} walk animation`} className="animated-sprite-img" />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="prompt-modifier">
            <strong>Modifier:</strong>
            <p>"{walkModifier}"</p>
          </div>
        </div>

        <div className="asset-card">
          <h3>Action Sprite</h3>
          <div className="img-container sprite-container">
            <div className="full-sheet">
              <span className="preview-label">Sprite Sheet</span>
              <img src={actionUrl} alt={`${characterName} action sprite`} className="full-sprite-img" />
            </div>
            <div className="animation-preview">
              <span className="preview-label">Animation ({actionGridFormat})</span>
              {actionGridFormat === '3x4' ? (
                <div className="animation-grid-2x2">
                  {['down', 'left', 'right', 'up'].map(dir => (
                    <div key={dir} className={`animated-sprite-window format-3x4 dir-${dir}`}>
                      <div className="animated-sprite-inner">
                        <img src={actionUrl} alt={`${characterName} action ${dir}`} className="animated-sprite-img" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`animated-sprite-window format-${actionGridFormat}`}>
                  <div className="animated-sprite-inner">
                    <img src={actionUrl} alt={`${characterName} action animation`} className="animated-sprite-img" />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="prompt-modifier">
            <strong>Modifier:</strong>
            <p>"{actionModifier}"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
