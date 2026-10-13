import type { Card, Suit, Color, Rank } from '../../types';

export type { Card, Suit, Color, Rank };

export type FreeCellPileId =
  | `freecell-${0 | 1 | 2 | 3}`
  | `foundation-${0 | 1 | 2 | 3}`
  | `tableau-${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`;

export interface SelectedCard {
  pileId: FreeCellPileId;
  cardIndex: number;
}

export interface FreeCellGameState {
  /** Identifies this deal (ties the clock and stats to it) */
  gameId: string;
  freeCells: (Card | null)[];
  foundations: Card[][];
  tableau: Card[][];
  moves: number;
  score: number;
  history: FreeCellHistoryEntry[];
  hasWon: boolean;
  selectedCard: SelectedCard | null;
}

export interface FreeCellHistoryEntry {
  freeCells: (Card | null)[];
  foundations: Card[][];
  tableau: Card[][];
  moves: number;
  score: number;
}

export type FreeCellGameAction =
  | { type: 'NEW_GAME' }
  | { type: 'MOVE_CARDS'; from: FreeCellPileId; to: FreeCellPileId; cardIndex: number }
  | { type: 'UNDO' }
  | { type: 'SELECT_CARD'; pileId: FreeCellPileId; cardIndex: number }
  | { type: 'CLEAR_SELECTION' };
