import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './SpriteSheet.css';
import { resolveAssetPath } from '../utils/paths';

// Check if a frame is in the emptyFrames collection (handles both array and number formats)
const isEmptyFrame = (emptyFrames, frameNumber) => {
  if (emptyFrames === undefined || emptyFrames === null) return false;
  if (Array.isArray(emptyFrames)) return emptyFrames.includes(frameNumber);
  if (typeof emptyFrames === 'number') return frameNumber >= emptyFrames;
  return false;
};

// Get frame description from parsed JSON data
const getFrameDescription = (frameData, frameNumber) => {
  if (!frameData) return { isEmpty: true, description: 'Empty frame' };

  // Check if this is an empty frame
  if (isEmptyFrame(frameData.emptyFrames, frameNumber)) {
    return { isEmpty: true, description: 'Empty frame' };
  }

  // New simple format: frames is a flat object { "0": "name", "1": "name", ... }
  if (frameData.frames && typeof frameData.frames[String(frameNumber)] === 'string') {
    const name = frameData.frames[String(frameNumber)];
    return {
      name,
      description: name,
    };
  }

  // Legacy format: Search through races/categories for the frame
  // Note: frameData.rows can be a number (row count), so only use it if it's an array
  const categories = frameData.races || frameData.categories || (Array.isArray(frameData.rows) ? frameData.rows : []);
  for (const category of categories) {
    const frames = category.frames || {};
    const frameInfo = frames[String(frameNumber)];
    if (frameInfo) {
      return {
        ...frameInfo,
        category: category.race || category.category || category.name,
        row: category.rows?.[0]
      };
    }
  }

  // Frame exists in spritesheet but has no metadata - show as empty
  return { isEmpty: true, description: 'Empty frame' };
};

export const SpriteSheet = ({
  imagePath,
  metadataPath, // Optional explicit path to JSON
  title,
  description,
  columns = 8,
  tileSize = 16,
  showGrid: initialShowGrid = true,
  showZoom = true,
  defaultScale = 3,
  animated = false,
  animationPair = null,
}) => {
  const [scale, setScale] = useState(defaultScale);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [hoveredFrame, setHoveredFrame] = useState(null);
  const [isAnimating, setIsAnimating] = useState(animated);
  const [showGrid, setShowGrid] = useState(initialShowGrid);
  const [showTooltips, setShowTooltips] = useState(true);
  const [activeTab, setActiveTab] = useState('sprites');
  const [frameDataJson, setFrameDataJson] = useState(null);
  const [filterTag, setFilterTag] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [loadedImage, setLoadedImage] = useState(null);
  const [loadedImageAlt, setLoadedImageAlt] = useState(null);

  // Frame data from separate JSON file
  const frameData = frameDataJson;

  // Resolve the image path to include the base URL for GitHub Pages
  const resolvedImagePath = resolveAssetPath(imagePath);
  const resolvedAnimationPair = animationPair ? resolveAssetPath(animationPair) : null;

  // Derive JSON frame data path from image path
  const frameDataPath = metadataPath || imagePath.replace('.png', '.frames.json');
  const resolvedFrameDataPath = resolveAssetPath(frameDataPath);

  // Calculate rows from image size
  const rows = imageSize.height ? Math.floor(imageSize.height / tileSize) : 0;
  const totalFrames = rows * columns;

  // Load separate frame data JSON file (preferred source for tooltips)
  useEffect(() => {
    fetch(resolvedFrameDataPath)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        setFrameDataJson(data);
      }).catch(() => {
          // JSON file not found - will fall back to parsing from instructions markdown
          setFrameDataJson(null);
        });
      }, [resolvedFrameDataPath]);

      // Animation effect

  useEffect(() => {
    if (!isAnimating || !animationPair) return;
    const interval = setInterval(() => {
      setCurrentFrame(prev => prev === 0 ? 1 : 0);
    }, 500);
    return () => clearInterval(interval);
  }, [isAnimating, animationPair]);

  // Load the image for canvas drawing
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLoadedImage(img);
    };
    img.src = resolvedImagePath;

    if (resolvedAnimationPair) {
      const imgAlt = new Image();
      imgAlt.crossOrigin = 'anonymous';
      imgAlt.onload = () => {
        setLoadedImageAlt(imgAlt);
      };
      imgAlt.src = resolvedAnimationPair;
    }
  }, [resolvedImagePath, resolvedAnimationPair]);

  // Get image dimensions on load
  const handleImageLoad = (e) => {
    setImageSize({ width: e.target.naturalWidth, height: e.target.naturalHeight });
  };

  // Get description for currently hovered frame
  const hoveredFrameInfo = useMemo(() => {
    if (hoveredFrame === null) return null;
    const info = getFrameDescription(frameData, hoveredFrame);
    // Add mega-atlas metadata if available
    if (frameData?.byName) {
      const name = frameData.legacyFrames?.[String(hoveredFrame)];
      if (name && frameData.byName[name]) {
        return { ...info, ...frameData.byName[name] };
      }
    }
    return info;
  }, [frameData, hoveredFrame]);

  // Get description for currently selected frame
  const selectedFrameInfo = useMemo(() => {
    if (selectedFrame === null) return null;
    const info = getFrameDescription(frameData, selectedFrame);
    // Add mega-atlas metadata if available
    if (frameData?.byName) {
      const name = frameData.legacyFrames?.[String(selectedFrame)];
      if (name && frameData.byName[name]) {
        return { ...info, ...frameData.byName[name] };
      }
    }
    return info;
  }, [frameData, selectedFrame]);

  const { allTags, allSources, filteredSprites } = useMemo(() => {
    if (!frameDataJson?.byName) return { allTags: [], allSources: [], filteredSprites: [] };
    
    const tags = new Set();
    const sources = new Set();
    const sprites = [];

    Object.entries(frameDataJson.byName).forEach(([name, data]) => {
      if (data.tags) data.tags.forEach(t => tags.add(t));
      if (data.sourceFile) sources.add(data.sourceFile);
      
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (data.tags && data.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesTag = filterTag === 'All' || (data.tags && data.tags.includes(filterTag));
      const matchesSource = filterSource === 'All' || data.sourceFile === filterSource;

      if (matchesSearch && matchesTag && matchesSource) {
        sprites.push({ name, ...data });
      }
    });

    return {
      allTags: ['All', ...Array.from(tags).sort()],
      allSources: ['All', ...Array.from(sources).sort()],
      filteredSprites: sprites
    };
  }, [frameDataJson, searchQuery, filterTag, filterSource]);

  const activeInfo = selectedFrameInfo || hoveredFrameInfo;
  const activeFrame = selectedFrame !== null ? selectedFrame : hoveredFrame;

  // Draw the preview canvas when selection, hover, or animation frame changes
  useEffect(() => {
    if (!previewCanvasRef.current || !loadedImage || activeFrame === null) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const previewScale = 8;

    canvas.width = tileSize * previewScale;
    canvas.height = tileSize * previewScale;

    // Enable pixelated rendering
    ctx.imageSmoothingEnabled = false;

    // Fill with a background pattern
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate source position from active frame
    const srcCol = activeFrame % columns;
    const srcRow = Math.floor(activeFrame / columns);
    const srcX = srcCol * tileSize;
    const srcY = srcRow * tileSize;

    // Determine which image to use for animation
    let sourceImg = loadedImage;
    if (isAnimating && currentFrame === 1 && loadedImageAlt) {
      // Only use alt image if the sprite is actually animated in the atlas
      if (activeInfo?.isAnimated !== false) {
        sourceImg = loadedImageAlt;
      }
    }

    ctx.drawImage(
      sourceImg,
      srcX, srcY, tileSize, tileSize,
      0, 0, canvas.width, canvas.height
    );

    // Subtle border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }, [activeFrame, loadedImage, loadedImageAlt, tileSize, columns, currentFrame, isAnimating, activeInfo]);

  // Handle mouse move on the sprite viewer
  const handleMouseMove = useCallback((e) => {
    if (!imageSize.width) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Track tooltip position relative to container
    setTooltipPos({ x: e.clientX, y: e.clientY });

    const col = Math.floor(x / (tileSize * scale));
    const row = Math.floor(y / (tileSize * scale));

    if (col >= 0 && col < columns && row >= 0 && row < rows) {
      const frame = row * columns + col;
      if (frame < totalFrames) {
        setHoveredFrame(frame);
      } else {
        setHoveredFrame(null);
      }
    } else {
      setHoveredFrame(null);
    }
  }, [imageSize.width, tileSize, scale, columns, rows, totalFrames]);

  const handleMouseLeave = useCallback(() => {
    setHoveredFrame(null);
  }, []);

  const handleClick = useCallback((e) => {
    if (!imageSize.width) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / (tileSize * scale));
    const row = Math.floor(y / (tileSize * scale));

    if (col >= 0 && col < columns && row >= 0 && row < rows) {
      const frame = row * columns + col;
      if (frame < totalFrames) {
        setSelectedFrame(frame === selectedFrame ? null : frame);
      }
    }
  }, [imageSize.width, tileSize, scale, columns, rows, totalFrames, selectedFrame]);

  const currentImagePath = (isAnimating && currentFrame === 1 && resolvedAnimationPair)
    ? resolvedAnimationPair
    : resolvedImagePath;

  // Calculate highlight position for hovered/selected frame
  const getHighlightStyle = (frame) => {
    if (frame === null) return null;
    const col = frame % columns;
    const row = Math.floor(frame / columns);
    return {
      position: 'absolute',
      left: col * tileSize * scale,
      top: row * tileSize * scale,
      width: tileSize * scale,
      height: tileSize * scale,
      pointerEvents: 'none',
    };
  };

  return (
    <div className="spritesheet-container">
      <div className="spritesheet-header">
        <h2>{title}</h2>
        {description && <p className="description">{description}</p>}
      </div>

      {/* Tab Navigation */}
      <div className="spritesheet-tabs">
        <button
          className={`tab-button ${activeTab === 'sprites' ? 'active' : ''}`}
          onClick={() => setActiveTab('sprites')}
        >
          Sprites
        </button>
        <button
          className={`tab-button ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          Library
        </button>
        <button
          className={`tab-button ${activeTab === 'json' ? 'active' : ''}`}
          onClick={() => setActiveTab('json')}
        >
          JSON Data
        </button>
      </div>

      {activeTab === 'sprites' && (
        <>
          <div className="spritesheet-controls">
            {showZoom && (
              <div className="control-group">
                <label>Zoom: {scale}x</label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                />
              </div>
            )}

            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                Show Grid
              </label>
            </div>

            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={showTooltips}
                  onChange={(e) => setShowTooltips(e.target.checked)}
                />
                Show Tooltips
              </label>
            </div>

            {animated && animationPair && (
              <div className="control-group">
                <button
                  className={isAnimating ? 'animate-btn active' : 'animate-btn'}
                  onClick={() => setIsAnimating(!isAnimating)}
                >
                  {isAnimating ? '⏹ Stop Animation' : '▶ Play Animation'}
                </button>
              </div>
            )}
          </div>

          <div className="spritesheet-main-area">
            <div className="spritesheet-viewer">
              <div
                className="sprite-image"
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: imageSize.width ? `${imageSize.width * scale}px` : 'auto',
                  height: imageSize.height ? `${imageSize.height * scale}px` : 'auto',
                  cursor: 'pointer',
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
              >
                <img
                  ref={imageRef}
                  src={currentImagePath}
                  alt={title}
                  onLoad={handleImageLoad}
                  style={{
                    imageRendering: 'pixelated',
                    width: imageSize.width ? `${imageSize.width * scale}px` : 'auto',
                    height: imageSize.height ? `${imageSize.height * scale}px` : 'auto',
                    display: 'block',
                  }}
                />
                {showGrid && imageSize.width > 0 && (
                  <div
                    className="grid-overlay"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundSize: `${tileSize * scale}px ${tileSize * scale}px`,
                      backgroundImage: `
                        linear-gradient(to right, rgba(255,255,0,0.3) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,0,0.3) 1px, transparent 1px)
                      `,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Hover highlight */}
                {hoveredFrame !== null && hoveredFrame !== selectedFrame && (
                  <div
                    className="tile-highlight hover"
                    style={getHighlightStyle(hoveredFrame)}
                  />
                )}
                {/* Selection highlight */}
                {selectedFrame !== null && (
                  <div
                    className="tile-highlight selected"
                    style={getHighlightStyle(selectedFrame)}
                  />
                )}
              </div>
            </div>

            {/* Preview Panel (Inspector) */}
            {activeFrame !== null && (
              <div className="preview-panel">
                <h3>{selectedFrame !== null ? 'Selected Tile' : 'Live Inspector'}</h3>
                
                <div className="preview-canvas-container">
                  <canvas
                    ref={previewCanvasRef}
                    className="preview-canvas"
                    style={{ width: '128px', height: '128px' }}
                  />
                </div>

                <div className="preview-info">
                  <div className="preview-stat preview-name">
                    <span className="label">Name:</span>
                    <span className="value">{activeInfo?.name || `Frame ${activeFrame}`}</span>
                  </div>

                  {activeInfo?.tags && (
                    <div className="attribute-tags inline-tags">
                      {activeInfo.tags.map(tag => (
                        <span key={tag} className="attr-tag">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="tag-container">
                    {activeInfo?.category && <span className="tag category-tag">{activeInfo.category}</span>}
                    {activeInfo?.group && <span className="tag group-tag">{activeInfo.group}</span>}
                    {activeInfo?.sourceFile && <span className="tag source-tag">{activeInfo.sourceFile}</span>}
                  </div>

                  <div className="preview-stats-grid">
                    <div className="preview-stat">
                      <span className="label">Frame:</span>
                      <span className="value">{activeFrame}</span>
                    </div>
                    <div className="preview-stat">
                      <span className="label">Grid:</span>
                      <span className="value">{activeFrame % columns}, {Math.floor(activeFrame / columns)}</span>
                    </div>
                  </div>
                </div>

                {activeInfo?.description && (
                  <div className="preview-description">
                    <span className="label">Description:</span>
                    <p>{activeInfo.description}</p>
                  </div>
                )}
                
                <p className="preview-hint">
                  {selectedFrame !== null ? 'Click tile again to deselect' : 'Click to lock selection'}
                </p>
              </div>
            )}
          </div>

          {hoveredFrame !== null && selectedFrame === null && (
            <div className="frame-info hover-info">
              <p>
                <strong>Hovering:</strong> Frame {hoveredFrame} (Col: {hoveredFrame % columns}, Row: {Math.floor(hoveredFrame / columns)})
                {hoveredFrameInfo && !hoveredFrameInfo.isEmpty && (
                  <span className="hover-description">
                    {' - '}
                    {hoveredFrameInfo.category && <span className="category">{hoveredFrameInfo.category}</span>}
                    {hoveredFrameInfo.class && <span className="class"> {hoveredFrameInfo.class}</span>}
                    {hoveredFrameInfo.description && <span className="desc"> ({hoveredFrameInfo.description})</span>}
                  </span>
                )}
                {hoveredFrameInfo?.isEmpty && <span className="empty-frame"> (Empty)</span>}
              </p>
            </div>
          )}

          {/* Floating tooltip on hover */}
          {showTooltips && hoveredFrame !== null && hoveredFrameInfo && !hoveredFrameInfo.isEmpty && (
            <div
              className="sprite-tooltip"
              style={{
                position: 'fixed',
                left: tooltipPos.x + 15,
                top: tooltipPos.y + 15,
                zIndex: 1000,
              }}
            >
              <div className="tooltip-frame">Frame {hoveredFrame}</div>
              {hoveredFrameInfo.name && <div className="tooltip-name">{hoveredFrameInfo.name}</div>}
              {hoveredFrameInfo.category && <div className="tooltip-category">{hoveredFrameInfo.category}</div>}
              {hoveredFrameInfo.class && <div className="tooltip-class">{hoveredFrameInfo.class}</div>}
              {hoveredFrameInfo.race && <div className="tooltip-race">{hoveredFrameInfo.race}</div>}
              {hoveredFrameInfo.type && <div className="tooltip-type">{hoveredFrameInfo.type}</div>}
              {!hoveredFrameInfo.name && hoveredFrameInfo.description && <div className="tooltip-desc">{hoveredFrameInfo.description}</div>}
            </div>
          )}

        </>
      )}

      {activeTab === 'json' && (
        <div className="json-panel">
          {frameDataJson ? (
            <>
              <div className="json-header">
                <div className="json-path">{frameDataPath}</div>
                <button
                  className="json-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(frameDataJson, null, 2));
                  }}
                >
                  Copy JSON
                </button>
              </div>
              <pre className="json-content">{JSON.stringify(frameDataJson, null, 2)}</pre>
            </>
          ) : (
            <div className="json-loading">
              <p>No JSON data available for this sprite sheet.</p>
              <p className="json-path-hint">Expected path: {frameDataPath}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'library' && (
        <div className="library-panel">
          <div className="library-controls">
            <div className="field-group">
              <label>Search:</label>
              <input 
                type="text" 
                placeholder="Search names or tags..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="library-search"
              />
            </div>
            <div className="library-filters">
              <div className="field-group">
                <label>Tag:</label>
                <select value={filterTag} onChange={e => setFilterTag(e.target.value)}>
                  {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field-group">
                <label>Source:</label>
                <select value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                  {allSources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="library-stats">
              Showing <strong>{filteredSprites.length}</strong> sprites
            </div>
          </div>

          <div className="library-grid">
            {filteredSprites.slice(0, 500).map(sprite => (
              <div 
                key={sprite.name} 
                className={`library-item ${selectedFrame === sprite.globalFrame ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedFrame(sprite.globalFrame);
                  setActiveTab('sprites');
                }}
                onMouseEnter={() => setHoveredFrame(sprite.globalFrame)}
              >
                <div 
                  className="library-sprite-preview"
                  style={{
                    backgroundImage: `url(${resolvedImagePath})`,
                    backgroundPosition: `-${sprite.x * 2}px -${sprite.y * 2}px`,
                    backgroundSize: `${imageSize.width * 2}px ${imageSize.height * 2}px`,
                  }}
                />
                <span className="library-item-name">{sprite.name}</span>
              </div>
            ))}
            {filteredSprites.length > 500 && (
              <div className="library-more-hint">...and {filteredSprites.length - 500} more (refine search)</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
