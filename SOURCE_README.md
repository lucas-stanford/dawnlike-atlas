# DawnLike Asset Pack

16x16 roguelike tileset by DragonDePlatino.

## License

**CC-BY 4.0** - Free to use with attribution: `Assets by DragonDePlatino (CC-BY 4.0)`

## Using with Phaser

Each sprite sheet has a matching `.frames.json` file containing frame names and metadata.

### Loading a sprite sheet

```javascript
// Load the sprite sheet and its frame data
this.load.spritesheet('player', 'Characters/Player0.png', { frameWidth: 16, frameHeight: 16 });

// Create a sprite using a frame number
const sprite = this.add.sprite(100, 100, 'player', 0);
```

### Finding sprite names

Open any `.frames.json` file to see available frames:

```json
{
  "frames": {
    "0": "ordinary human",
    "1": "fighter",
    "24": "man",
    "25": "knight"
  }
}
```

### Animation (paired files)

Character sprite sheets come in pairs (0 and 1) for 2-frame idle animation:

```javascript
this.load.spritesheet('player0', 'Characters/Player0.png', { frameWidth: 16, frameHeight: 16 });
this.load.spritesheet('player1', 'Characters/Player1.png', { frameWidth: 16, frameHeight: 16 });

this.anims.create({
  key: 'idle',
  frames: [
    { key: 'player0', frame: 0 },
    { key: 'player1', frame: 0 }
  ],
  frameRate: 2,
  repeat: -1
});
```

## File Reference

### Characters/

Player and creature sprite sheets with 2-frame animation pairs.

| File | Description |
|------|-------------|
| Player0.png | Playable character races (human, elf, dwarf, etc.) |
| Humanoid0.png | Human NPCs and enemies |
| Aquatic0.png | Fish, jellyfish, crabs, sea creatures |
| Avian0.png | Birds, bats, flying creatures |
| Cat0.png | Felines (cats, lions, tigers) |
| Demon0.png | Demons and devils |
| Dog0.png | Canines (dogs, wolves, foxes) |
| Elemental0.png | Fire, water, earth, air elementals |
| Misc0.png | Miscellaneous creatures |
| Pest0.png | Insects and small pests |
| Plant0.png | Plant creatures and treants |
| Quadraped0.png | Four-legged animals |
| Reptile0.png | Lizards, snakes, dragons |
| Rodent0.png | Rats, mice, rabbits |
| Slime0.png | Slimes and oozes |
| Undead0.png | Skeletons, zombies, ghosts |

### Items/

Equipment and consumable items.

| File | Description |
|------|-------------|
| Ammo.png | Arrows, bolts, throwing items |
| Amulet.png | Necklaces and amulets |
| Armor.png | Body armor and suits |
| Book.png | Books and tomes |
| Boot.png | Footwear |
| Chest0.png, Chest1.png | Containers and chests |
| Flesh.png | Meat and body parts |
| Food.png | Consumable food items |
| Glove.png | Gloves and gauntlets |
| Hat.png | Headwear |
| Key.png | Keys and lockpicks |
| Light.png | Torches, lanterns, light sources |
| LongWep.png | Two-handed weapons (swords, spears) |
| MedWep.png | One-handed weapons (axes, maces) |
| Money.png | Coins and gems |
| Music.png | Musical instruments |
| Potion.png | Potions and flasks |
| Ring.png | Rings |
| Rock.png | Rocks and minerals |
| Scroll.png | Scrolls and papers |
| Shield.png | Shields |
| ShortWep.png | Daggers and short swords |
| Tool.png | Tools and utility items |
| Wand.png | Wands and staves |

### Objects/

Environmental tiles and decorations.

| File | Description |
|------|-------------|
| Decor0.png, Decor1.png | Decorative objects |
| Door0.png, Door1.png | Doors (animated) |
| Effect0.png, Effect1.png | Visual effects |
| Fence.png | Fences and barriers |
| Floor.png | Floor tiles |
| Ground0.png, Ground1.png | Terrain |
| Hill0.png, Hill1.png | Elevation tiles |
| Map0.png, Map1.png | Map icons |
| Ore0.png, Ore1.png | Ore deposits |
| Pit0.png, Pit1.png | Pits and holes |
| Tile.png | Generic tiles |
| Trap0.png, Trap1.png | Traps |
| Tree0.png, Tree1.png | Trees and foliage |
| Wall.png | Wall tiles |

### GUI/

Interface elements.

| File | Description |
|------|-------------|
| GUI0.png | UI elements (normal state) |
| GUI1.png | UI elements (highlighted state) |
| SDS_6x6.ttf | Pixel font (6x6) |
| SDS_8x8.ttf | Pixel font (8x8) |

### Commissions/

32x32 character classes with clothing overlays.

| File | Description |
|------|-------------|
| Warrior.png | Warrior class |
| Rogue.png | Rogue class |
| Mage.png | Mage class |
| Paladin.png | Paladin class |
| Engineer.png | Engineer class |
| [Class] Clothes.png | Clothing overlay for each class |
| Icons.png | Class icons (16x16) |
| Template.png | Base template |

### Examples/

Sample Tiled maps demonstrating the tileset.

| File | Description |
|------|-------------|
| Dungeon.tmx | Dungeon example |
| Town.tmx | Town example |
| Mine.tmx | Mine example |
| Underworld.tmx | Underworld example |
