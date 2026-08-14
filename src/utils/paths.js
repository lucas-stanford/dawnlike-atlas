/**
 * Asset path resolution for the Storybook examples.
 *
 * The atlas PNGs and JSON are served from Storybook's `staticDirs`
 * (`../atlas`), so examples reference them with a leading slash —
 * `/DawnlikeAtlas0.png`. That works in dev, but the published Storybook
 * lives under a GitHub Pages project subpath, so the leading slash has
 * to be rewritten against the deployment base.
 */

/** GitHub Pages project path for the published Storybook. */
const PAGES_BASE = '/dawnlike-atlas/';

/**
 * Get the base URL the app is served from.
 *
 * Prefers Vite's `import.meta.env.BASE_URL` (correct in both dev and a
 * built Storybook), then falls back to the known Pages subpath, then to
 * the site root.
 *
 * @returns {string} base URL, always ending in '/'
 */
export function getBaseUrl() {
  if (import.meta?.env?.BASE_URL) {
    return import.meta.env.BASE_URL;
  }

  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return PAGES_BASE;
  }

  return '/';
}

/**
 * Resolve an absolute path against the base URL.
 *
 * Relative paths are returned untouched — a build whose `BASE_URL` is
 * './' already produces document-relative URLs that resolve correctly.
 *
 * @param {string} path - an absolute path like '/DawnlikeAtlas0.png'
 * @returns {string} the resolved path, e.g. '/dawnlike-atlas/DawnlikeAtlas0.png'
 */
export function resolveAssetPath(path) {
  if (!path || !path.startsWith('/')) {
    return path;
  }

  const base = getBaseUrl();
  // Strip the trailing slash from the base and keep the leading slash on
  // the path so the join never produces a double slash.
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return cleanBase + path;
}
