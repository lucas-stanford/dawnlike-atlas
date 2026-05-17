/**
 * Get the base URL for the application.
 * In production (GitHub Pages), this is '/GameGenFiles/'
 * In development, this is '/'
 */
export function getBaseUrl() {
  // Try to get from Vite's import.meta.env first
  if (import.meta?.env?.BASE_URL) {
    return import.meta.env.BASE_URL;
  }
  
  // Fallback: check if we're on GitHub Pages
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return '/GameGenFiles/';
  }
  
  // Default to root
  return '/';
}

/**
 * Resolve an absolute path relative to the base URL.
 * @param {string} path - An absolute path like '/Characters/Player0.png'
 * @returns {string} - The resolved path like '/GameGenFiles/Characters/Player0.png'
 */
export function resolveAssetPath(path) {
  if (!path || !path.startsWith('/')) {
    return path;
  }
  
  const base = getBaseUrl();
  // Remove trailing slash from base and leading slash from path to avoid double slashes
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return cleanBase + path;
}
