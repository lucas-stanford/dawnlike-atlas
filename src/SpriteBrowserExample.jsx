/**
 * SpriteBrowserExample — searchable, filterable catalogue of all 4,157
 * named sprites.
 *
 * The Mega Atlas story shows the packed sheet as a grid; this one is
 * the *working* view you keep open in a second tab while building a
 * game: type "rat", filter to `creature`, click a result, copy the name
 * straight into your code.
 *
 * It is also the reference usage of `src/utils/atlasApi.js` — every
 * piece of data on screen comes from `searchSprites`, `tagIndex`,
 * `spriteStyle`, `spriteCell` and `animationFrames` rather than from
 * bespoke lookups, so reading this file tells you the whole API.
 */

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { resolveAssetPath } from './utils/paths';
import {
  searchSprites,
  tagIndex,
  spriteCell,
  animationFrames,
} from './utils/atlasApi';
import { dawnlikeAnimVars, DAWNLIKE_ATLAS_0_URL, DAWNLIKE_ATLAS_1_URL } from './utils/spriteAnim';
import './utils/spriteAnim.css';
import './SpriteBrowser.css';

/** How many results to paint at once. The atlas is big; the DOM is not. */
const PAGE_SIZE = 240;

export default function SpriteBrowserExample({
  query: queryProp = '',
  tag: tagProp = '',
  animatedOnly: animatedOnlyProp = false,
  scale: scaleProp = 2,
} = {}) {
  const [atlas, setAtlas] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(queryProp);
  const [activeTags, setActiveTags] = useState(tagProp ? [tagProp] : []);
  const [animatedOnly, setAnimatedOnly] = useState(animatedOnlyProp);
  const [selected, setSelected] = useState(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [copied, setCopied] = useState(null);

  useEffect(() => { setQuery(queryProp); }, [queryProp]);
  useEffect(() => { setActiveTags(tagProp ? [tagProp] : []); }, [tagProp]);
  useEffect(() => { setAnimatedOnly(animatedOnlyProp); }, [animatedOnlyProp]);

  useEffect(() => {
    let cancelled = false;
    fetch(resolveAssetPath('/DawnlikeAtlas.json'))
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setAtlas(json); })
      .catch((e) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, []);

  // Typing stays responsive: the input updates immediately, the 4,157-row
  // filter runs against the deferred value.
  const deferredQuery = useDeferredValue(query);

  const tags = useMemo(() => (atlas ? tagIndex(atlas).slice(0, 40) : []), [atlas]);

  const results = useMemo(() => {
    if (!atlas) return [];
    return searchSprites(atlas, {
      query: deferredQuery,
      tags: activeTags,
      ...(animatedOnly ? { animated: true } : {}),
    });
  }, [atlas, deferredQuery, activeTags, animatedOnly]);

  // Reset the page window whenever the result set changes, so a new
  // search doesn't inherit a huge scroll from the previous one.
  useEffect(() => { setVisible(PAGE_SIZE); }, [deferredQuery, activeTags, animatedOnly]);

  const toggleTag = (tag) =>
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const copyName = (name) => {
    navigator.clipboard?.writeText(name).then(() => {
      setCopied(name);
      setTimeout(() => setCopied(null), 1200);
    }).catch(() => {});
  };

  if (error) {
    return <div className="browser-root"><div className="browser-empty">Failed to load the atlas: {String(error.message ?? error)}</div></div>;
  }
  if (!atlas) {
    return <div className="browser-root"><div className="browser-empty">Loading atlas…</div></div>;
  }

  const tile = atlas.meta.tile.w;
  const shown = results.slice(0, visible);
  const detail = selected && atlas.byName[selected] ? selected : null;

  /** Background style for one sprite at a given scale + sheet. */
  const spriteBg = (name, boxScale, sheet = DAWNLIKE_ATLAS_0_URL) => {
    const sprite = atlas.byName[name];
    return {
      width: tile * boxScale,
      height: tile * boxScale,
      backgroundImage: `url(${sheet})`,
      backgroundPosition: `-${sprite.x * boxScale}px -${sprite.y * boxScale}px`,
      backgroundSize: `${atlas.meta.size.w * boxScale}px ${atlas.meta.size.h * boxScale}px`,
      imageRendering: 'pixelated',
    };
  };

  return (
    <div className="browser-root" style={dawnlikeAnimVars}>
      <header className="browser-header">
        <div>
          <h1>Sprite Browser</h1>
          <p>
            {atlas.meta.spriteCount.toLocaleString()} named sprites ·{' '}
            {atlas.meta.animatedCount.toLocaleString()} animated ·{' '}
            {atlas.meta.columns}×{atlas.meta.rows} grid of {tile}px tiles
          </p>
        </div>
        <div className="browser-search">
          <input
            type="search"
            value={query}
            placeholder="Search names and tags — try “rat”, “brick wall”, “glowing sword”"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search sprites"
          />
          <label className="browser-check">
            <input
              type="checkbox"
              checked={animatedOnly}
              onChange={(e) => setAnimatedOnly(e.target.checked)}
            />
            Animated only
          </label>
        </div>
      </header>

      <div className="browser-tags" role="group" aria-label="Filter by tag">
        {tags.map(({ tag, count }) => (
          <button
            type="button"
            key={tag}
            className={`browser-tag ${activeTags.includes(tag) ? 'on' : ''}`}
            onClick={() => toggleTag(tag)}
          >
            {tag} <span>{count}</span>
          </button>
        ))}
        {activeTags.length > 0 && (
          <button type="button" className="browser-tag browser-tag-clear" onClick={() => setActiveTags([])}>
            clear {activeTags.length} filter{activeTags.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="browser-body">
        <section className="browser-results">
          <div className="browser-count">
            {results.length.toLocaleString()} match{results.length === 1 ? '' : 'es'}
            {results.length > shown.length && ` · showing ${shown.length.toLocaleString()}`}
          </div>

          {shown.length === 0 ? (
            <div className="browser-empty">
              Nothing matched. Every word has to appear in the name or tags — try
              dropping a word, or clearing the tag filters.
            </div>
          ) : (
            <div className="browser-grid">
              {shown.map(({ name, sprite }) => (
                <button
                  type="button"
                  key={name}
                  className={`browser-cell ${detail === name ? 'selected' : ''}`}
                  onClick={() => setSelected(name)}
                  onDoubleClick={() => copyName(name)}
                  title={`${name}${sprite.isAnimated ? ' (animated)' : ''}`}
                >
                  <span
                    className={sprite.isAnimated ? 'dawnlike-tile-anim' : undefined}
                    style={{
                      ...spriteBg(name, scaleProp),
                      ...(sprite.isAnimated ? { backgroundImage: undefined } : null),
                    }}
                  />
                  <em>{name}</em>
                </button>
              ))}
            </div>
          )}

          {results.length > shown.length && (
            <button
              type="button"
              className="browser-more"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
            >
              Show {Math.min(PAGE_SIZE, results.length - shown.length)} more
            </button>
          )}
        </section>

        <aside className="browser-detail">
          {!detail ? (
            <p className="browser-empty">Select a sprite to see its atlas record.</p>
          ) : (
            <SpriteDetail
              atlas={atlas}
              name={detail}
              spriteBg={spriteBg}
              onCopy={copyName}
              copied={copied === detail}
              onTag={toggleTag}
              activeTags={activeTags}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

/**
 * Detail pane — everything the atlas knows about one sprite, plus
 * ready-to-paste snippets for the three common consumers.
 */
function SpriteDetail({ atlas, name, spriteBg, onCopy, copied, onTag, activeTags }) {
  const sprite = atlas.byName[name];
  const cell = spriteCell(atlas, name);
  const frames = animationFrames(atlas, name);

  const snippets = {
    React: `<AtlasSprite atlas={atlas} name="${name}" scale={2}${sprite.isAnimated ? ' animated' : ''} />`,
    CSS: [
      `background-image: url("DawnlikeAtlas0.png");`,
      `background-position: -${sprite.x}px -${sprite.y}px;`,
      `width: ${sprite.w}px; height: ${sprite.h}px;`,
      `image-rendering: pixelated;`,
    ].join('\n'),
    Phaser: `this.add.sprite(x, y, 'dawnlike', '${name}');`,
  };

  return (
    <div className="browser-detail-inner">
      {/* Animated sprites get both frames side by side — seeing the pair
          is the quickest way to judge whether the 2-frame flicker reads
          the way you want at the scale you're rendering. */}
      <div className="browser-preview">
        <figure>
          <span style={spriteBg(name, 6)} />
          <figcaption>{frames.length > 1 ? 'frame 0' : 'sheet 0'}</figcaption>
        </figure>
        {frames.length > 1 && (
          <figure>
            <span style={{ ...spriteBg(name, 6), backgroundImage: `url(${DAWNLIKE_ATLAS_1_URL})` }} />
            <figcaption>frame 1</figcaption>
          </figure>
        )}
      </div>

      <h2>{name}</h2>
      <button type="button" className="browser-copy" onClick={() => onCopy(name)}>
        {copied ? 'Copied' : 'Copy name'}
      </button>

      <dl className="browser-facts">
        <dt>Position</dt><dd>{sprite.x}, {sprite.y}</dd>
        <dt>Size</dt><dd>{sprite.w}×{sprite.h}</dd>
        <dt>Cell</dt><dd>col {cell.col}, row {cell.row} (index {cell.index})</dd>
        <dt>Frames</dt>
        <dd>{sprite.isAnimated ? '2 — flips to DawnlikeAtlas1.png' : '1 — static'}</dd>
      </dl>

      {sprite.tags?.length > 0 && (
        <>
          <h3>Tags</h3>
          <div className="browser-detail-tags">
            {sprite.tags.map((tag) => (
              <button
                type="button"
                key={tag}
                className={`browser-tag ${activeTags.includes(tag) ? 'on' : ''}`}
                onClick={() => onTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </>
      )}

      <h3>Use it</h3>
      {Object.entries(snippets).map(([label, code]) => (
        <div className="browser-snippet" key={label}>
          <span className="browser-snippet-label">{label}</span>
          <pre onClick={() => onCopy(code)} title="Click to copy">{code}</pre>
        </div>
      ))}
    </div>
  );
}
