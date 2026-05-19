/**
 * dawnlike-atlas/roguelike — top-level barrel that re-exports every
 * subpath for convenience. Prefer the sub-path imports
 * (`dawnlike-atlas/roguelike/generators` etc.) so bundlers can tree-shake
 * unused modules.
 */

export * as generators from './generators.js';
export * as autotile   from './autotile.js';
export * as phaser     from './phaser.js';
export * as save       from './save.js';
