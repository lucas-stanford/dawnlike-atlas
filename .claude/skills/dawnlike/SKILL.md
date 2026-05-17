---
name: dawnlike
description: Work with the Dawnlike 16x16 pixel art asset pack for roguelike and RPG game development. Use this skill when referencing sprites, animations, or frame data from the Dawnlike tileset collection.
---

# Dawnlike Asset Pack

16x16 pixel art tileset at `source/`.

## Category Skills

Use these skills for sprite lookups:
- **dawnlike-characters** - Players, monsters, NPCs, animals (16 sheets)
- **dawnlike-objects** - Terrain, doors, walls, effects (18 sheets)
- **dawnlike-items** - Weapons, armor, potions, tools (25 sheets)

## Data Format

Each entry: `[files, columns, rows, frames]`
- `files`: PNG filename(s) without .png, semicolon-separated if multiple
- `columns`, `rows`: Grid dimensions  
- `frames`: Comma-separated `index:name` pairs

## Coordinate Calculation

```javascript
x = (frameIndex % columns) * 16
y = Math.floor(frameIndex / columns) * 16
```

## Commissions

The Commissions folder contains custom character classes (Engineer, Mage, Paladin, Rogue, Warrior) with clothing variants. Each has 8x3 grid (24 frames) of animation variants.
