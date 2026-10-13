// Tile categories
export type TileSuit = 'bamboo' | 'circles' | 'characters';
export type TileWind = 'north' | 'south' | 'east' | 'west';
export type TileDragon = 'red' | 'green' | 'white';
export type TileCategory = 'suited' | 'wind' | 'dragon' | 'season' | 'flower';

export interface MahjongTile {
  id: string;
  category: TileCategory;
  suit?: TileSuit;
  rank?: number;           // 1-9 for suited tiles
  wind?: TileWind;
  dragon?: TileDragon;
  bonusIndex?: number;     // 0-3 for season/flower
  matchKey: string;        // Tiles with same matchKey can be paired
  symbol: string;          // Display character
  label: string;           // Human-readable name
  color: string;           // Display color
}

export interface LayoutPosition {
  row: number;
  col: number;
  layer: number;
}

export interface PlacedTile {
  tile: MahjongTile;
  position: LayoutPosition;
}

export interface SelectedTile {
  tileId: string;
}

export interface MahjongHistoryEntry {
  tiles: PlacedTile[];
  removedPairs: [string, string][];
  moves: number;
  score: number;
}

export interface MahjongGameState {
  /** Identifies this deal (ties the clock and stats to it) */
  gameId: string;
  tiles: PlacedTile[];
  removedPairs: [string, string][];
  selectedTile: SelectedTile | null;
  moves: number;
  score: number;
  history: MahjongHistoryEntry[];
  hasWon: boolean;
  hasLost: boolean;
}

export type MahjongGameAction =
  | { type: 'NEW_GAME' }
  | { type: 'SELECT_TILE'; tileId: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SHUFFLE' }
  | { type: 'UNDO' };
