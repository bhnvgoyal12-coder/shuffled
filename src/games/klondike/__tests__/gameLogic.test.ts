import { describe, it, expect } from 'vitest';
import type { Card, GameState, Suit, Rank } from '../../../types';
import {
  dealGame,
  isValidMove,
  checkWin,
  canAutoComplete,
  getAutoCompleteMove,
  getValidDropTargets,
  calculateScore,
  findAutoMoveToFoundation,
  findSafeAutoMoves,
} from '../gameLogic';
import { SUIT_COLORS } from '../../../constants';

// ── Test Helpers ──────────────────────────────────────────────

function makeCard(rank: Rank, suit: Suit, faceUp = true): Card {
  return {
    id: `${suit}-${rank}`,
    suit,
    rank,
    color: SUIT_COLORS[suit],
    faceUp,
  };
}

function emptyState(overrides: Partial<GameState> = {}): GameState {
  return {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    moves: 0,
    score: 0,
    history: [],
    hasWon: false,
    selectedCard: null,
    wasteFanCount: 0,
    ...overrides,
  };
}

// ── dealGame() ────────────────────────────────────────────────

describe('dealGame', () => {
  it('creates 52 total cards', () => {
    const state = dealGame();
    const total =
      state.stock.length +
      state.waste.length +
      state.foundations.reduce((s, f) => s + f.length, 0) +
      state.tableau.reduce((s, t) => s + t.length, 0);
    expect(total).toBe(52);
  });

  it('deals 7 tableau piles with sizes 1-7', () => {
    const state = dealGame();
    expect(state.tableau).toHaveLength(7);
    for (let i = 0; i < 7; i++) {
      expect(state.tableau[i]).toHaveLength(i + 1);
    }
  });

  it('only the last card in each tableau pile is face up', () => {
    const state = dealGame();
    for (const pile of state.tableau) {
      for (let i = 0; i < pile.length; i++) {
        if (i === pile.length - 1) {
          expect(pile[i].faceUp).toBe(true);
        } else {
          expect(pile[i].faceUp).toBe(false);
        }
      }
    }
  });

  it('stock has 24 cards, all face down', () => {
    const state = dealGame();
    expect(state.stock).toHaveLength(24);
    for (const card of state.stock) {
      expect(card.faceUp).toBe(false);
    }
  });

  it('foundations and waste start empty', () => {
    const state = dealGame();
    expect(state.waste).toHaveLength(0);
    for (const f of state.foundations) {
      expect(f).toHaveLength(0);
    }
  });
});

// ── isValidMove() ─────────────────────────────────────────────

describe('isValidMove', () => {
  it('rejects moving to the same pile', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], []],
    });
    expect(isValidMove(state, 'tableau-0', 'tableau-0', 0)).toBe(false);
  });

  it('rejects out-of-bounds cardIndex', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], []],
    });
    expect(isValidMove(state, 'tableau-0', 'tableau-1', 5)).toBe(false);
    expect(isValidMove(state, 'tableau-0', 'tableau-1', -1)).toBe(false);
  });

  it('rejects face-down card', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades', false)], [], [], [], [], [], []],
    });
    expect(isValidMove(state, 'tableau-0', 'tableau-1', 0)).toBe(false);
  });

  // Foundation moves
  it('allows Ace to its designated foundation', () => {
    const state = emptyState({
      tableau: [[makeCard('A', 'hearts')], [], [], [], [], [], []],
    });
    // foundation-0 is hearts
    expect(isValidMove(state, 'tableau-0', 'foundation-0', 0)).toBe(true);
  });

  it('rejects Ace to wrong foundation slot', () => {
    const state = emptyState({
      tableau: [[makeCard('A', 'hearts')], [], [], [], [], [], []],
    });
    // foundation-1 is diamonds, not hearts
    expect(isValidMove(state, 'tableau-0', 'foundation-1', 0)).toBe(false);
  });

  it('allows sequential same-suit to foundation', () => {
    const state = emptyState({
      tableau: [[makeCard('2', 'hearts')], [], [], [], [], [], []],
      foundations: [[makeCard('A', 'hearts')], [], [], []],
    });
    expect(isValidMove(state, 'tableau-0', 'foundation-0', 0)).toBe(true);
  });

  it('rejects wrong suit to foundation', () => {
    const state = emptyState({
      tableau: [[makeCard('2', 'diamonds')], [], [], [], [], [], []],
      foundations: [[makeCard('A', 'hearts')], [], [], []],
    });
    expect(isValidMove(state, 'tableau-0', 'foundation-0', 0)).toBe(false);
  });

  it('rejects non-sequential rank to foundation', () => {
    const state = emptyState({
      tableau: [[makeCard('3', 'hearts')], [], [], [], [], [], []],
      foundations: [[makeCard('A', 'hearts')], [], [], []],
    });
    expect(isValidMove(state, 'tableau-0', 'foundation-0', 0)).toBe(false);
  });

  it('rejects multiple cards to foundation', () => {
    const state = emptyState({
      tableau: [[makeCard('A', 'hearts'), makeCard('2', 'hearts')], [], [], [], [], [], []],
    });
    // Trying to move both cards (index 0) to foundation
    expect(isValidMove(state, 'tableau-0', 'foundation-0', 0)).toBe(false);
  });

  // Tableau moves
  it('allows King to empty tableau', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], []],
    });
    expect(isValidMove(state, 'tableau-0', 'tableau-1', 0)).toBe(true);
  });

  it('allows alternating color descending rank to tableau', () => {
    const state = emptyState({
      tableau: [
        [makeCard('6', 'spades')],  // black 6
        [makeCard('7', 'hearts')],  // red 7
        [], [], [], [], [],
      ],
    });
    expect(isValidMove(state, 'tableau-0', 'tableau-1', 0)).toBe(true);
  });

  it('rejects same color to tableau', () => {
    const state = emptyState({
      tableau: [
        [makeCard('6', 'hearts')],  // red 6
        [makeCard('7', 'diamonds')],  // red 7
        [], [], [], [], [],
      ],
    });
    expect(isValidMove(state, 'tableau-0', 'tableau-1', 0)).toBe(false);
  });

  it('rejects wrong rank to tableau', () => {
    const state = emptyState({
      tableau: [
        [makeCard('5', 'spades')],  // black 5
        [makeCard('7', 'hearts')],  // red 7 (needs 6, not 5)
        [], [], [], [], [],
      ],
    });
    expect(isValidMove(state, 'tableau-0', 'tableau-1', 0)).toBe(false);
  });

  it('rejects non-top card from waste', () => {
    const state = emptyState({
      waste: [makeCard('A', 'hearts'), makeCard('3', 'spades')],
    });
    expect(isValidMove(state, 'waste', 'foundation-0', 0)).toBe(false);
  });

  it('rejects non-top card from foundation', () => {
    const state = emptyState({
      foundations: [[makeCard('A', 'hearts'), makeCard('2', 'hearts')], [], [], []],
      tableau: [[], [makeCard('3', 'spades')], [], [], [], [], []],
    });
    expect(isValidMove(state, 'foundation-0', 'tableau-1', 0)).toBe(false);
  });
});

// ── checkWin() ────────────────────────────────────────────────

describe('checkWin', () => {
  it('returns true when all foundations have 13 cards', () => {
    const fullFoundation = Array.from({ length: 13 }, () => makeCard('A', 'hearts'));
    const state = emptyState({
      foundations: [fullFoundation, [...fullFoundation], [...fullFoundation], [...fullFoundation]],
    });
    expect(checkWin(state)).toBe(true);
  });

  it('returns false when any foundation is incomplete', () => {
    const fullFoundation = Array.from({ length: 13 }, () => makeCard('A', 'hearts'));
    const state = emptyState({
      foundations: [fullFoundation, [...fullFoundation], [...fullFoundation], [makeCard('A', 'hearts')]],
    });
    expect(checkWin(state)).toBe(false);
  });
});

// ── canAutoComplete() ─────────────────────────────────────────

describe('canAutoComplete', () => {
  it('returns false when stock is not empty', () => {
    const state = emptyState({
      stock: [makeCard('A', 'hearts', false)],
    });
    expect(canAutoComplete(state)).toBe(false);
  });

  it('returns false when any tableau card is face down', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades', false)], [], [], [], [], [], []],
    });
    expect(canAutoComplete(state)).toBe(false);
  });

  it('returns true when stock empty and all tableau cards face up', () => {
    const state = emptyState({
      waste: [makeCard('A', 'hearts')],
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], []],
    });
    expect(canAutoComplete(state)).toBe(true);
  });
});

// ── getAutoCompleteMove() ─────────────────────────────────────

describe('getAutoCompleteMove', () => {
  it('finds waste-to-foundation move', () => {
    const state = emptyState({
      waste: [makeCard('A', 'hearts')],
    });
    const move = getAutoCompleteMove(state);
    expect(move).not.toBeNull();
    expect(move!.from).toBe('waste');
    expect(move!.to).toMatch(/^foundation-/);
  });

  it('finds tableau-to-foundation move and picks lowest rank', () => {
    const state = emptyState({
      foundations: [
        [makeCard('A', 'hearts')],  // hearts has A
        [makeCard('A', 'diamonds'), makeCard('2', 'diamonds')],  // diamonds has A,2
        [],
        [],
      ],
      tableau: [
        [makeCard('3', 'diamonds')],  // 3♦ can go to foundation-1
        [makeCard('2', 'hearts')],    // 2♥ can go to foundation-0
        [], [], [], [], [],
      ],
    });
    const move = getAutoCompleteMove(state);
    expect(move).not.toBeNull();
    // Should pick 2♥ (rank value 2) over 3♦ (rank value 3)
    expect(move!.from).toBe('tableau-1');
  });

  it('returns null when no move is available', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], []],
    });
    expect(getAutoCompleteMove(state)).toBeNull();
  });
});

// ── getValidDropTargets() ─────────────────────────────────────

describe('getValidDropTargets', () => {
  it('returns correct targets for an Ace', () => {
    const state = emptyState({
      waste: [makeCard('A', 'hearts')],
      tableau: [[], [makeCard('2', 'spades')], [], [], [], [], []],
    });
    const targets = getValidDropTargets(state, 'waste', 0);
    // Ace of hearts goes to foundation-0 (its designated slot) and tableau-1 (under black 2)
    expect(targets).toContain('foundation-0');
    expect(targets).toHaveLength(2);
    // Should NOT be allowed to go to other empty foundations
    expect(targets).not.toContain('foundation-1');
    expect(targets).not.toContain('foundation-2');
    expect(targets).not.toContain('foundation-3');
  });

  it('returns empty array when no valid moves exist', () => {
    // A 5 of hearts alone — can't go to any empty foundation (not an Ace)
    // Can't go to any empty tableau (not a King)
    const state = emptyState({
      tableau: [[makeCard('5', 'hearts')], [], [], [], [], [], []],
    });
    const targets = getValidDropTargets(state, 'tableau-0', 0);
    // Only valid targets would be tableau piles with a black 6
    expect(targets).toHaveLength(0);
  });
});

// ── calculateScore() ──────────────────────────────────────────

describe('calculateScore', () => {
  it('waste to tableau = 5', () => {
    expect(calculateScore('waste', 'tableau-0')).toBe(5);
  });

  it('waste to foundation = 10', () => {
    expect(calculateScore('waste', 'foundation-0')).toBe(10);
  });

  it('tableau to foundation = 10', () => {
    expect(calculateScore('tableau-2', 'foundation-1')).toBe(10);
  });

  it('foundation to tableau = -15', () => {
    expect(calculateScore('foundation-0', 'tableau-3')).toBe(-15);
  });

  it('tableau to tableau = 0', () => {
    expect(calculateScore('tableau-0', 'tableau-1')).toBe(0);
  });
});

// ── findAutoMoveToFoundation() ────────────────────────────────

describe('findAutoMoveToFoundation', () => {
  it('finds foundation for top card that can move', () => {
    const state = emptyState({
      tableau: [[makeCard('A', 'hearts')], [], [], [], [], [], []],
    });
    const target = findAutoMoveToFoundation(state, 'tableau-0', 0);
    expect(target).not.toBeNull();
    expect(target!).toMatch(/^foundation-/);
  });

  it('returns null for non-top card', () => {
    const state = emptyState({
      tableau: [[makeCard('A', 'hearts'), makeCard('2', 'hearts')], [], [], [], [], [], []],
    });
    // Card at index 0 is not the top card (index 1 is)
    const target = findAutoMoveToFoundation(state, 'tableau-0', 0);
    expect(target).toBeNull();
  });

  it('returns null when no foundation accepts the card', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], []],
    });
    const target = findAutoMoveToFoundation(state, 'tableau-0', 0);
    expect(target).toBeNull();
  });
});

// ── findSafeAutoMoves() ──────────────────────────────────────

describe('findSafeAutoMoves', () => {
  it('always considers Aces safe to auto-move', () => {
    const state = emptyState({
      tableau: [[makeCard('A', 'hearts')], [], [], [], [], [], []],
    });
    const moves = findSafeAutoMoves(state);
    expect(moves).toHaveLength(1);
    expect(moves[0].from).toBe('tableau-0');
    expect(moves[0].to).toBe('foundation-0');
  });

  it('always considers 2s safe to auto-move', () => {
    const state = emptyState({
      foundations: [[makeCard('A', 'hearts')], [], [], []],
      tableau: [[makeCard('2', 'hearts')], [], [], [], [], [], []],
    });
    const moves = findSafeAutoMoves(state);
    expect(moves).toHaveLength(1);
    expect(moves[0].from).toBe('tableau-0');
  });

  it('considers a card safe when opposite-color rank-1 cards are on foundations', () => {
    // Moving red 3 is safe when both black 2s (clubs + spades) are on foundations
    const state = emptyState({
      foundations: [
        [makeCard('A', 'hearts'), makeCard('2', 'hearts')],  // hearts has A,2
        [makeCard('A', 'diamonds')],  // diamonds has A
        [makeCard('A', 'clubs'), makeCard('2', 'clubs')],  // clubs has A,2
        [makeCard('A', 'spades'), makeCard('2', 'spades')],  // spades has A,2
      ],
      tableau: [[makeCard('3', 'hearts')], [], [], [], [], [], []],
    });
    const moves = findSafeAutoMoves(state);
    expect(moves).toHaveLength(1);
    expect(moves[0].from).toBe('tableau-0');
  });

  it('considers a card NOT safe when opposite-color rank-1 cards are missing', () => {
    // Moving red 3 is NOT safe if black 2 of clubs is missing from foundation
    const state = emptyState({
      foundations: [
        [makeCard('A', 'hearts'), makeCard('2', 'hearts')],  // hearts has A,2
        [],  // diamonds empty
        [makeCard('A', 'clubs')],  // clubs has only A (2 missing!)
        [makeCard('A', 'spades'), makeCard('2', 'spades')],  // spades has A,2
      ],
      tableau: [[makeCard('3', 'hearts')], [], [], [], [], [], []],
    });
    const moves = findSafeAutoMoves(state);
    expect(moves).toHaveLength(0);
  });

  it('returns empty when no moves available', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], []],
    });
    const moves = findSafeAutoMoves(state);
    expect(moves).toHaveLength(0);
  });

  it('finds safe moves from waste pile', () => {
    const state = emptyState({
      waste: [makeCard('A', 'diamonds')],
    });
    const moves = findSafeAutoMoves(state);
    expect(moves).toHaveLength(1);
    expect(moves[0].from).toBe('waste');
    expect(moves[0].to).toBe('foundation-1');
  });
});
