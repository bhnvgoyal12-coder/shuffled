import type { MahjongTile, TileSuit, TileWind, TileDragon, LayoutPosition } from './types';

// ── Tile Display Info ─────────────────────────────────────────

const SUIT_SYMBOLS: Record<TileSuit, string> = {
  bamboo: '竹',
  circles: '●',
  characters: '万',
};

const SUIT_COLORS: Record<TileSuit, string> = {
  bamboo: '#2e7d32',
  circles: '#1565c0',
  characters: '#c62828',
};

const WIND_SYMBOLS: Record<TileWind, string> = {
  east: '東', south: '南', west: '西', north: '北',
};

const DRAGON_SYMBOLS: Record<TileDragon, string> = {
  red: '中', green: '發', white: '□',
};

const DRAGON_COLORS: Record<TileDragon, string> = {
  red: '#c62828', green: '#2e7d32', white: '#555',
};

const SEASON_SYMBOLS = ['春', '夏', '秋', '冬'];
const SEASON_LABELS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const FLOWER_SYMBOLS = ['梅', '蘭', '菊', '竹'];
const FLOWER_LABELS = ['Plum', 'Orchid', 'Chrysanth.', 'Bamboo'];

// ── Tile Set Creation ─────────────────────────────────────────

export function createTileSet(): MahjongTile[] {
  const tiles: MahjongTile[] = [];
  let id = 0;

  // Suited tiles: bamboo, circles, characters × ranks 1-9 × 4 copies
  const suits: TileSuit[] = ['bamboo', 'circles', 'characters'];
  for (const suit of suits) {
    for (let rank = 1; rank <= 9; rank++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({
          id: `t${id++}`,
          category: 'suited',
          suit,
          rank,
          matchKey: `${suit}-${rank}`,
          symbol: `${rank}`,
          label: `${suit.charAt(0).toUpperCase() + suit.slice(1)} ${rank}`,
          color: SUIT_COLORS[suit],
        });
      }
    }
  }

  // Wind tiles: 4 winds × 4 copies
  const winds: TileWind[] = ['east', 'south', 'west', 'north'];
  for (const wind of winds) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `t${id++}`,
        category: 'wind',
        wind,
        matchKey: `wind-${wind}`,
        symbol: WIND_SYMBOLS[wind],
        label: `${wind.charAt(0).toUpperCase() + wind.slice(1)} Wind`,
        color: '#333',
      });
    }
  }

  // Dragon tiles: 3 dragons × 4 copies
  const dragons: TileDragon[] = ['red', 'green', 'white'];
  for (const dragon of dragons) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `t${id++}`,
        category: 'dragon',
        dragon,
        matchKey: `dragon-${dragon}`,
        symbol: DRAGON_SYMBOLS[dragon],
        label: `${dragon.charAt(0).toUpperCase() + dragon.slice(1)} Dragon`,
        color: DRAGON_COLORS[dragon],
      });
    }
  }

  // Season tiles: 4 unique tiles, all match each other
  for (let i = 0; i < 4; i++) {
    tiles.push({
      id: `t${id++}`,
      category: 'season',
      bonusIndex: i,
      matchKey: 'season',
      symbol: SEASON_SYMBOLS[i],
      label: SEASON_LABELS[i],
      color: '#6a1b9a',
    });
  }

  // Flower tiles: 4 unique tiles, all match each other
  for (let i = 0; i < 4; i++) {
    tiles.push({
      id: `t${id++}`,
      category: 'flower',
      bonusIndex: i,
      matchKey: 'flower',
      symbol: FLOWER_SYMBOLS[i],
      label: FLOWER_LABELS[i],
      color: '#e65100',
    });
  }

  return tiles; // 144 total
}

// ── Suit symbol getter for tile rendering ─────────────────────
export function getSuitSymbol(tile: MahjongTile): string {
  if (tile.suit) return SUIT_SYMBOLS[tile.suit];
  return '';
}

// ── Classic Turtle Layout (144 positions) ─────────────────────
// Grid uses half-tile units: a tile occupies 2 columns × 2 rows, so a tile at
// col C touches the tiles at col C-2 (left) and C+2 (right). Odd rows / columns
// are the half-tile offsets used by the three side tiles and the cap.

function tileRow(row: number, firstCol: number, lastCol: number, layer: number): LayoutPosition[] {
  const positions: LayoutPosition[] = [];
  for (let col = firstCol; col <= lastCol; col += 2) positions.push({ row, col, layer });
  return positions;
}

function tileBlock(firstRow: number, lastRow: number, firstCol: number, lastCol: number, layer: number): LayoutPosition[] {
  const positions: LayoutPosition[] = [];
  for (let row = firstRow; row <= lastRow; row += 2) positions.push(...tileRow(row, firstCol, lastCol, layer));
  return positions;
}

export const TURTLE_LAYOUT: LayoutPosition[] = [
  // ═══ Layer 0 — 87 tiles: eight rows plus the three side tiles ═══
  ...tileRow(0, 2, 24, 0),   // 12
  ...tileRow(2, 6, 20, 0),   // 8
  ...tileRow(4, 4, 22, 0),   // 10
  ...tileRow(6, 2, 24, 0),   // 12
  ...tileRow(8, 2, 24, 0),   // 12
  ...tileRow(10, 4, 22, 0),  // 10
  ...tileRow(12, 6, 20, 0),  // 8
  ...tileRow(14, 2, 24, 0),  // 12
  { row: 7, col: 0, layer: 0 },   // left side, between the two middle rows
  { row: 7, col: 26, layer: 0 },  // right side…
  { row: 7, col: 28, layer: 0 },  // …and the tile beyond it

  // ═══ Layer 1 — 36 tiles (6×6) ═══
  ...tileBlock(2, 12, 8, 18, 1),
  // ═══ Layer 2 — 16 tiles (4×4) ═══
  ...tileBlock(4, 10, 10, 16, 2),
  // ═══ Layer 3 — 4 tiles (2×2) ═══
  ...tileBlock(6, 8, 12, 14, 3),
  // ═══ Layer 4 — the cap, resting on all four tiles below ═══
  { row: 7, col: 13, layer: 4 },
];
// Total: 87 + 36 + 16 + 4 + 1 = 144

/** Size of the layout in half-tile units (columns × rows). */
export const BOARD_COLS = 30;
export const BOARD_ROWS = 16;
