/**
 * atlasApi — framework-agnostic helpers for reading DawnlikeAtlas.json.
 *
 * Everything in this module is a pure function of the parsed atlas JSON
 * (plus, for `loadAtlas`, a `fetch`). There is no React, no Phaser, and
 * no DOM dependency outside of the two convenience helpers that build a
 * CSS style bag / draw to a canvas — so the same code works in a Node
 * test, a Vite app, a Web Worker, or a `<script type="module">` tag.
 *
 * The atlas JSON shape this operates on:
 *
 *   {
 *     meta:   { size:{w,h}, tile:{w,h}, columns, rows, spriteCount, ... },
 *     frames: { '<name>': { frame:{x,y,w,h} } },   // Phaser texture atlas
 *     byName: { '<name>': { x, y, w, h, tags[], isAnimated? } },
 *     legacyFrames: { '<index>': '<name>' }        // grid index → name
 *   }
 *
 * Sheet 0 (`DawnlikeAtlas0.png`) holds every sprite's primary frame.
 * Sheet 1 (`DawnlikeAtlas1.png`) holds the alternate frame for the
 * ~1,258 sprites flagged `isAnimated` — the two together make DawnLike's
 * signature 2-frame idle/walk flicker. Both sheets share one coordinate
 * space, so a sprite's `{x, y}` addresses it in either file.
 */

/** Default filenames of the two atlas sheets, in frame order. */
export const ATLAS_SHEETS = ['DawnlikeAtlas0.png', 'DawnlikeAtlas1.png'];

/** Default filename of the atlas metadata. */
export const ATLAS_JSON = 'DawnlikeAtlas.json';

const loadCache = new Map();

/**
 * Fetch and cache the atlas metadata.
 *
 * Repeated calls with the same URL share a single in-flight promise, so
 * it is safe to call this from every component that needs the atlas
 * without coordinating a provider.
 *
 * @param {string} [url='DawnlikeAtlas.json'] - URL of the atlas JSON.
 * @param {object} [opts]
 * @param {typeof fetch} [opts.fetchImpl] - Injectable fetch (tests/SSR).
 * @returns {Promise<object>} the parsed atlas
 */
export function loadAtlas(url = ATLAS_JSON, { fetchImpl } = {}) {
  if (loadCache.has(url)) return loadCache.get(url);
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) {
    return Promise.reject(new Error('loadAtlas: no fetch available — pass opts.fetchImpl'));
  }
  const promise = Promise.resolve(doFetch(url))
    .then((res) => {
      if (!res.ok) throw new Error(`loadAtlas: HTTP ${res.status} for ${url}`);
      return res.json();
    })
    .catch((err) => {
      // Don't cache failures — a transient network error shouldn't
      // poison every later call for the lifetime of the page.
      loadCache.delete(url);
      throw err;
    });
  loadCache.set(url, promise);
  return promise;
}

/** Drop cached `loadAtlas` promises. Mostly useful in tests. */
export function clearAtlasCache() {
  loadCache.clear();
}

/**
 * Look up one sprite record by name.
 *
 * @param {object} atlas
 * @param {string} name
 * @returns {{x:number,y:number,w:number,h:number,tags?:string[],isAnimated?:boolean}|null}
 */
export function getSprite(atlas, name) {
  return atlas?.byName?.[name] ?? null;
}

/** True when the atlas contains a sprite with this exact name. */
export function hasSprite(atlas, name) {
  return Boolean(atlas?.byName?.[name]);
}

/** True when the sprite has a second frame on `DawnlikeAtlas1.png`. */
export function isAnimated(atlas, name) {
  return Boolean(atlas?.byName?.[name]?.isAnimated);
}

/** Every sprite name in the atlas, in packing order. */
export function spriteNames(atlas) {
  return Object.keys(atlas?.byName ?? {});
}

/** Tags attached to one sprite (empty array when the sprite is unknown). */
export function spriteTags(atlas, name) {
  return atlas?.byName?.[name]?.tags ?? [];
}

/**
 * Every distinct tag in the atlas with its sprite count, most common first.
 *
 * @returns {Array<{tag: string, count: number}>}
 */
export function tagIndex(atlas) {
  const counts = new Map();
  for (const sprite of Object.values(atlas?.byName ?? {})) {
    for (const tag of sprite.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Search sprites by name substring and/or tags.
 *
 * Matching is case-insensitive. A multi-word `query` matches when every
 * word appears somewhere in the name or tags, in any order — so
 * `"brick wall"` finds `"bright brick wall left right"`.
 *
 * @param {object} atlas
 * @param {object} [opts]
 * @param {string}   [opts.query]     - space-separated words to match
 * @param {string[]} [opts.tags]      - tags the sprite must carry
 * @param {'all'|'any'} [opts.tagMode='all'] - require every tag, or any one
 * @param {boolean}  [opts.animated]  - restrict to animated / static sprites
 * @param {string}   [opts.prefix]    - name must start with this string
 * @param {number}   [opts.limit]     - cap the number of results
 * @returns {Array<{name: string, sprite: object}>}
 */
export function searchSprites(atlas, opts = {}) {
  const { query = '', tags = [], tagMode = 'all', animated, prefix, limit } = opts;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const wanted = tags.map((t) => t.toLowerCase());
  const out = [];

  for (const [name, sprite] of Object.entries(atlas?.byName ?? {})) {
    if (prefix && !name.startsWith(prefix)) continue;
    if (animated !== undefined && Boolean(sprite.isAnimated) !== animated) continue;

    const spriteTagList = (sprite.tags ?? []).map((t) => t.toLowerCase());
    if (wanted.length) {
      const test = (t) => spriteTagList.includes(t);
      if (tagMode === 'any' ? !wanted.some(test) : !wanted.every(test)) continue;
    }

    if (words.length) {
      const haystack = `${name} ${spriteTagList.join(' ')}`.toLowerCase();
      if (!words.every((wd) => haystack.includes(wd))) continue;
    }

    out.push({ name, sprite });
    if (limit && out.length >= limit) break;
  }
  return out;
}

/**
 * Names of every sprite carrying a tag.
 *
 * @param {object} atlas
 * @param {string} tag
 * @returns {string[]}
 */
export function spritesByTag(atlas, tag) {
  return searchSprites(atlas, { tags: [tag] }).map((r) => r.name);
}

/**
 * Autotile family base names present in the atlas.
 *
 * DawnLike names autotile variants as `"<family> <suffix>"` — e.g.
 * `"bright brick wall left right down"`. Given the suffix set for a
 * family (see AUTOTILE_MANIFESTS in ./autotile.js) this returns every
 * base name for which at least `minVariants` variants exist, which is
 * how the examples build their style dropdowns instead of hard-coding
 * a list that can drift from the atlas.
 *
 * @param {object} atlas
 * @param {string[]} suffixes    - suffixes that identify the family
 * @param {number} [minVariants=4]
 * @returns {string[]} sorted base names
 */
export function autotileFamilies(atlas, suffixes, minVariants = 4) {
  const counts = new Map();
  for (const name of Object.keys(atlas?.byName ?? {})) {
    for (const suffix of suffixes) {
      const tail = ` ${suffix}`;
      if (name.endsWith(tail)) {
        const base = name.slice(0, -tail.length);
        if (base) counts.set(base, (counts.get(base) ?? 0) + 1);
        break;
      }
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minVariants)
    .map(([base]) => base)
    .sort();
}

/**
 * Grid position of a sprite in the packed sheet.
 *
 * @returns {{col:number,row:number,index:number}|null}
 */
export function spriteCell(atlas, name) {
  const sprite = getSprite(atlas, name);
  if (!sprite || !atlas?.meta) return null;
  const col = Math.round(sprite.x / atlas.meta.tile.w);
  const row = Math.round(sprite.y / atlas.meta.tile.h);
  return { col, row, index: row * atlas.meta.columns + col };
}

/** Reverse of `spriteCell`: the sprite name at a packed-grid index. */
export function nameAtIndex(atlas, index) {
  return atlas?.legacyFrames?.[String(index)] ?? null;
}

/**
 * Build a CSS style object that renders one sprite as a background image.
 *
 * The returned bag is intentionally plain CSS-in-JS so it works with
 * React `style={...}`, `Object.assign(el.style, ...)`, or any framework
 * that accepts a style object.
 *
 * @param {object} atlas
 * @param {string} name
 * @param {object} [opts]
 * @param {number} [opts.scale=1]  - render scale (2 → 64px cells)
 * @param {0|1}    [opts.frame=0]  - which sheet to sample
 * @param {string} [opts.basePath=''] - prefix for the sheet URL
 * @param {string} [opts.sheetUrl]    - explicit sheet URL (overrides frame/basePath)
 * @returns {object|null} CSS properties, or null when the sprite is unknown
 */
export function spriteStyle(atlas, name, opts = {}) {
  const { scale = 1, frame = 0, basePath = '', sheetUrl } = opts;
  const sprite = getSprite(atlas, name);
  if (!sprite || !atlas?.meta) return null;
  const url = sheetUrl ?? `${basePath}${ATLAS_SHEETS[frame] ?? ATLAS_SHEETS[0]}`;
  return {
    width: `${sprite.w * scale}px`,
    height: `${sprite.h * scale}px`,
    backgroundImage: `url("${url}")`,
    backgroundPosition: `-${sprite.x * scale}px -${sprite.y * scale}px`,
    backgroundSize: `${atlas.meta.size.w * scale}px ${atlas.meta.size.h * scale}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  };
}

/**
 * Draw one sprite onto a 2D canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} sheet - the loaded atlas sheet image
 * @param {object} atlas
 * @param {string} name
 * @param {number} dx - destination x, in canvas pixels
 * @param {number} dy - destination y, in canvas pixels
 * @param {number} [scale=1]
 * @returns {boolean} false when the sprite is unknown (nothing drawn)
 */
export function drawSprite(ctx, sheet, atlas, name, dx, dy, scale = 1) {
  const sprite = getSprite(atlas, name);
  if (!sprite) return false;
  // Pixel art must never be smoothed — a single bilinear pass turns
  // DawnLike's hard 2×2 blocks into mush.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sheet,
    sprite.x, sprite.y, sprite.w, sprite.h,
    dx, dy, sprite.w * scale, sprite.h * scale,
  );
  return true;
}

/**
 * Pick a sprite at random from a candidate list, keeping only names the
 * atlas actually has. Returns null when nothing matches, so callers can
 * degrade instead of rendering a blank tile.
 *
 * @param {object} atlas
 * @param {string[]} candidates
 * @param {() => number} [rng=Math.random] - inject a seeded RNG for
 *   deterministic generation (e.g. `ROT.RNG.getUniform`).
 * @returns {string|null}
 */
export function pickSprite(atlas, candidates, rng = Math.random) {
  const usable = candidates.filter((name) => hasSprite(atlas, name));
  if (!usable.length) return null;
  return usable[Math.min(usable.length - 1, Math.floor(rng() * usable.length))];
}

/**
 * The two-frame animation pair for a sprite, ready to hand to a tween /
 * `setInterval` / Phaser anim. Static sprites return a single frame so
 * callers can treat both cases uniformly.
 *
 * @returns {Array<{sheet: string, x: number, y: number}>}
 */
export function animationFrames(atlas, name, { basePath = '' } = {}) {
  const sprite = getSprite(atlas, name);
  if (!sprite) return [];
  const frames = [{ sheet: `${basePath}${ATLAS_SHEETS[0]}`, x: sprite.x, y: sprite.y }];
  if (sprite.isAnimated) {
    frames.push({ sheet: `${basePath}${ATLAS_SHEETS[1]}`, x: sprite.x, y: sprite.y });
  }
  return frames;
}
