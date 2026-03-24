export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Color = 'red' | 'black';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  color: Color;
  faceUp: boolean;
}

export type PileId =
  | 'stock'
  | 'waste'
  | `foundation-${0 | 1 | 2 | 3}`
  | `tableau-${0 | 1 | 2 | 3 | 4 | 5 | 6}`;

export interface SelectedCard {
  pileId: PileId;
  cardIndex: number;
}

export interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  moves: number;
  score: number;
  history: HistoryEntry[];
  hasWon: boolean;
  selectedCard: SelectedCard | null;
}

export interface HistoryEntry {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  moves: number;
  score: number;
}

export type GameAction =
  | { type: 'NEW_GAME' }
  | { type: 'DRAW_STOCK'; count?: number }
  | { type: 'MOVE_CARDS'; from: PileId; to: PileId; cardIndex: number }
  | { type: 'UNDO' }
  | { type: 'SELECT_CARD'; pileId: PileId; cardIndex: number }
  | { type: 'CLEAR_SELECTION' };

// Game type identifier
export type GameType = 'klondike' | 'spider' | 'freecell' | 'mahjong' | 'wordsearch';

// Settings types
export type DrawMode = 1 | 3;
export type CardBackTheme = 'blue' | 'red' | 'green' | 'purple' | 'gold';
export type SpiderSuitCount = 1 | 2 | 4;
export type HomeLayout = 'list' | 'grid';

export interface Settings {
  drawMode: DrawMode;
  cardBackTheme: CardBackTheme;
  soundEnabled: boolean;
  autoMoveToFoundation: boolean;
  spiderSuitCount: SpiderSuitCount;
  homeLayout: HomeLayout;
  timerEnabled: boolean;
}
