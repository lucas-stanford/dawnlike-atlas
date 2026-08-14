/**
 * Type definitions for the DawnLike autotile resolvers.
 *
 * Every resolver takes a family base name, a neighbor description, and
 * `atlas.byName` (used to check which variants actually exist so the
 * resolver can fall back instead of returning a missing sprite).
 */

import type { AtlasSpriteRecord } from './atlasApi';

/** Cardinal-neighbor truth table. `true` = same-family tile in that direction. */
export interface CardinalNeighbors {
  n?: boolean;
  s?: boolean;
  e?: boolean;
  w?: boolean;
}

/** Cardinal + diagonal neighbors, used by the 8-way forest resolver. */
export interface EightWayNeighbors extends CardinalNeighbors {
  nw?: boolean;
  ne?: boolean;
  sw?: boolean;
  se?: boolean;
}

/** Lookup of sprite name → placement, i.e. `atlas.byName`. */
export type ByName = Record<string, AtlasSpriteRecord>;

export interface AutotileManifest {
  /** Neighbor-pattern key (`''`, `'n'`, `'nsew'`, …) → atlas name suffix. */
  map: Record<string, string>;
  /** Pattern key → ordered list of substitute keys when a variant is missing. */
  fallbacks: Record<string, string[]>;
}

/**
 * `openPath` — river / road / castle-wall family (Objects/Map sheet),
 * suffix order `up down left right`.
 * `wall` — DawnLike WALL family (Objects/Wall sheet), suffix order
 * `left right up down`, with `center` as the isolated fallback.
 */
export const AUTOTILE_MANIFESTS: {
  openPath: AutotileManifest;
  wall: AutotileManifest;
};

export interface AutotileResult {
  /** Resolved sprite name. */
  name: string;
  /** The suffix that produced it. */
  suffix: string;
  /** Set when a fallback variant was substituted. */
  fallback?: boolean;
  /** Set when even the fallback chain missed — the name may not exist. */
  missing?: boolean;
}

export function resolveAutotile(
  manifestId: 'openPath' | 'wall',
  baseName: string,
  neighbors: CardinalNeighbors,
  byName?: ByName,
): AutotileResult;

/** Road / river / castle-wall resolver (`openPath` manifest). */
export function resolveDawnLikeWallName(
  baseName: string,
  neighbors: CardinalNeighbors,
  byName?: ByName,
): string;

/** Building-wall resolver for the Objects/Wall family (`wall` manifest). */
export function resolveDawnLikeBuildingWallName(
  baseName: string,
  neighbors: CardinalNeighbors,
  byName?: ByName,
): string;

/**
 * Dungeon-blob wall resolver. Returns `null` for buried interior wall
 * tiles (no open tile in the 8-neighborhood) so callers can skip them.
 */
export function resolveDawnLikeDungeonWallName(
  baseName: string,
  x: number,
  y: number,
  isWall: (x: number, y: number) => boolean,
  byName?: ByName,
): string | null;

/** 8-way canopy resolver for the 16-tile tree set. */
export function resolveDawnLikeForestName(
  baseName: string,
  neighbors: EightWayNeighbors,
  byName?: ByName,
): { name: string; reason: string };

/** Floor resolver — variants are named by their MISSING neighbors. */
export function resolveDawnLikeFloorName(
  baseName: string,
  neighbors: CardinalNeighbors,
  byName?: ByName,
): { name: string; reason: string };

/** Pool / water resolver, may request a vertical flip via `flipY`. */
export function resolveDawnLikePoolName(
  baseName: string,
  neighbors: CardinalNeighbors,
  byName?: ByName,
): { name: string; flipY?: boolean };

/** River resolver (`openPath` manifest), returned as an object. */
export function resolveDawnLikeRiverName(
  baseName: string,
  neighbors: CardinalNeighbors,
  byName?: ByName,
): { name: string };

/** Mountain "blob" resolver over the 10-sprite peak set. */
export function resolveDawnLikeMountainName(
  baseName: string,
  neighbors: CardinalNeighbors,
  byName?: ByName,
): string;
