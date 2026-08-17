/**
 * Type definitions for the framework-agnostic atlas helpers.
 */

/** One packed sprite record from `atlas.byName`. */
export interface AtlasSpriteRecord {
  /** X offset of the sprite in the packed sheet, in pixels. */
  x: number;
  /** Y offset of the sprite in the packed sheet, in pixels. */
  y: number;
  /** Sprite width in pixels (32 for every DawnLike tile). */
  w: number;
  /** Sprite height in pixels (32 for every DawnLike tile). */
  h: number;
  /** AI-generated descriptive keywords, e.g. ['creature', 'aquatic']. */
  tags?: string[];
  /** True when a second frame exists at the same coords on sheet 1. */
  isAnimated?: boolean;
}

export interface AtlasMeta {
  version: string;
  name: string;
  sheets: string[];
  size: { w: number; h: number };
  tile: { w: number; h: number };
  columns: number;
  rows: number;
  spriteCount: number;
  animatedCount: number;
  scale: number;
  inputDirs?: string[];
}

/** The parsed contents of `DawnlikeAtlas.json`. */
export interface DawnlikeAtlas {
  meta: AtlasMeta;
  /** Phaser-compatible texture atlas frames. */
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
  /** Flat name → placement lookup used by every helper here. */
  byName: Record<string, AtlasSpriteRecord>;
  /** Packed-grid index → sprite name. */
  legacyFrames: Record<string, string>;
}

export interface SearchOptions {
  /** Space-separated words; every word must appear in the name or tags. */
  query?: string;
  /** Tags the sprite must carry. */
  tags?: string[];
  /** Require every tag (default) or any one of them. */
  tagMode?: 'all' | 'any';
  /** Restrict to animated (`true`) or static (`false`) sprites. */
  animated?: boolean;
  /** Sprite name must start with this string. */
  prefix?: string;
  /** Cap the number of results. */
  limit?: number;
}

export interface SpriteStyleOptions {
  /** Integer render scale; 32px cells × scale. Default 1. */
  scale?: number;
  /** Which sheet to sample: 0 = primary, 1 = alternate frame. Default 0. */
  frame?: 0 | 1;
  /** Prefix prepended to the sheet filename. Default ''. */
  basePath?: string;
  /** Explicit sheet URL; overrides `frame` and `basePath`. */
  sheetUrl?: string;
}

export const ATLAS_SHEETS: string[];
export const ATLAS_JSON: string;

export function loadAtlas(
  url?: string,
  opts?: { fetchImpl?: typeof fetch },
): Promise<DawnlikeAtlas>;
export function clearAtlasCache(): void;

export function getSprite(atlas: DawnlikeAtlas, name: string): AtlasSpriteRecord | null;
export function hasSprite(atlas: DawnlikeAtlas, name: string): boolean;
export function isAnimated(atlas: DawnlikeAtlas, name: string): boolean;
export function spriteNames(atlas: DawnlikeAtlas): string[];
export function spriteTags(atlas: DawnlikeAtlas, name: string): string[];
export function tagIndex(atlas: DawnlikeAtlas): Array<{ tag: string; count: number }>;

export function searchSprites(
  atlas: DawnlikeAtlas,
  opts?: SearchOptions,
): Array<{ name: string; sprite: AtlasSpriteRecord }>;
export function spritesByTag(atlas: DawnlikeAtlas, tag: string): string[];
export function autotileFamilies(
  atlas: DawnlikeAtlas,
  suffixes: string[],
  minVariants?: number,
): string[];

export function spriteCell(
  atlas: DawnlikeAtlas,
  name: string,
): { col: number; row: number; index: number } | null;
export function nameAtIndex(atlas: DawnlikeAtlas, index: number): string | null;

export function spriteStyle(
  atlas: DawnlikeAtlas,
  name: string,
  opts?: SpriteStyleOptions,
): Record<string, string> | null;

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  atlas: DawnlikeAtlas,
  name: string,
  dx: number,
  dy: number,
  scale?: number,
): boolean;

export function pickSprite(
  atlas: DawnlikeAtlas,
  candidates: string[],
  rng?: () => number,
): string | null;

export function animationFrames(
  atlas: DawnlikeAtlas,
  name: string,
  opts?: { basePath?: string },
): Array<{ sheet: string; x: number; y: number }>;
