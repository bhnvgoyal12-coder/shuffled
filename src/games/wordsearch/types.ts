export type Direction = 'right' | 'down' | 'downRight' | 'downLeft';

export interface GridPosition {
  row: number;
  col: number;
}

export interface PlacedWord {
  word: string;
  start: GridPosition;
  direction: Direction;
  positions: GridPosition[];
}

export interface Grid {
  cells: string[][];
  rows: number;
  cols: number;
  words: PlacedWord[];
}

export interface LevelConfig {
  level: number;
  gridRows: number;
  gridCols: number;
  wordCount: number;
  minWordLength: number;
  maxWordLength: number;
  directions: Direction[];
}

export interface DragSelection {
  start: GridPosition;
  current: GridPosition;
  positions: GridPosition[];
}

export interface WordSearchGameState {
  /** Identifies this level's puzzle (ties the clock and stats to it) */
  gameId: string;
  grid: Grid;
  currentLevel: number;
  foundWords: string[];
  score: number;
  moves: number;
  hasWon: boolean;
  history: { foundWords: string[]; score: number; moves: number }[];
}

export type WordSearchAction =
  | { type: 'NEW_GAME' }
  | { type: 'SELECT_WORD'; positions: GridPosition[] }
  | { type: 'NEXT_LEVEL' }
  | { type: 'UNDO' };
