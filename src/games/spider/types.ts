import type { Card, Suit, Color, Rank, SpiderSuitCount } from '../../types';

export type { Card, Suit, Color, Rank, SpiderSuitCount };

export type SpiderPileId =
  | 'stock'
  | `tableau-${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;

export interface SelectedCard {
  pileId: SpiderPileId;
  cardIndex: number;
}

export interface SpiderGameState {
  /** Identifies this deal (ties the clock to it) */
  gameId: string;
  stock: Card[];
  tableau: Card[][];
  completedSuits: number;
  moves: number;
  score: number;
  history: SpiderHistoryEntry[];
  hasWon: boolean;
  selectedCard: SelectedCard | null;
}

export interface SpiderHistoryEntry {
  stock: Card[];
  tableau: Card[][];
  completedSuits: number;
  moves: number;
  score: number;
}

export type SpiderGameAction =
  | { type: 'NEW_GAME'; suitCount: SpiderSuitCount }
  | { type: 'DEAL_STOCK' }
  | { type: 'MOVE_CARDS'; from: SpiderPileId; to: SpiderPileId; cardIndex: number }
  | { type: 'UNDO' }
  | { type: 'SELECT_CARD'; pileId: SpiderPileId; cardIndex: number }
  | { type: 'CLEAR_SELECTION' };
