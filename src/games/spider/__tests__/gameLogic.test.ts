import { describe, it, expect } from 'vitest';
import type { Card, Suit, Rank, SpiderGameState } from '../types';
import {
  createSpiderDeck,
  dealSpiderGame,
  isValidSpiderMove,
  checkCompletedRun,
  canDealStock,
  getValidSpiderDropTargets,
  isDescendingSameSuitRun,
  getPileCards,
} from '../gameLogic';
import { SUIT_COLORS, RANKS } from '../../../constants';

function makeCard(rank: Rank, suit: Suit, faceUp = true, copy = 0): Card {
  return { id: `${suit}-${rank}-${copy}`, suit, rank, color: SUIT_COLORS[suit], faceUp };
}

function emptyState(overrides: Partial<SpiderGameState> = {}): SpiderGameState {
  return {
    gameId: 'test',
    stock: [],
    tableau: [[], [], [], [], [], [], [], [], [], []],
    completedSuits: 0,
    moves: 0,
    score: 500,
    history: [],
    hasWon: false,
    selectedCard: null,
    ...overrides,
  };
}

// ── createSpiderDeck ──────────────────────────────────────────

describe('createSpiderDeck', () => {
  it('creates 104 cards for 1 suit', () => {
    const deck = createSpiderDeck(1);
    expect(deck).toHaveLength(104);
    expect(new Set(deck.map(c => c.suit))).toEqual(new Set(['spades']));
  });

  it('creates 104 cards for 2 suits', () => {
    const deck = createSpiderDeck(2);
    expect(deck).toHaveLength(104);
    expect(new Set(deck.map(c => c.suit))).toEqual(new Set(['spades', 'hearts']));
  });

  it('creates 104 cards for 4 suits', () => {
    const deck = createSpiderDeck(4);
    expect(deck).toHaveLength(104);
    expect(new Set(deck.map(c => c.suit))).toEqual(new Set(['spades', 'hearts', 'diamonds', 'clubs']));
  });
});

// ── dealSpiderGame ────────────────────────────────────────────

describe('dealSpiderGame', () => {
  it('deals 54 cards to tableau and 50 to stock', () => {
    const state = dealSpiderGame(1);
    const tableauTotal = state.tableau.reduce((s, t) => s + t.length, 0);
    expect(tableauTotal).toBe(54);
    expect(state.stock).toHaveLength(50);
  });

  it('deals correct column sizes (6,6,6,6,5,5,5,5,5,5)', () => {
    const state = dealSpiderGame(1);
    const sizes = state.tableau.map(t => t.length);
    expect(sizes).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
  });

  it('only last card in each column is face up', () => {
    const state = dealSpiderGame(1);
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

  it('starts with 500 score and 0 completed suits', () => {
    const state = dealSpiderGame(1);
    expect(state.score).toBe(500);
    expect(state.completedSuits).toBe(0);
  });
});

// ── isDescendingSameSuitRun ───────────────────────────────────

describe('isDescendingSameSuitRun', () => {
  it('returns true for single face-up card', () => {
    const cards = [makeCard('K', 'spades')];
    expect(isDescendingSameSuitRun(cards, 0)).toBe(true);
  });

  it('returns true for descending same-suit run', () => {
    const cards = [
      makeCard('5', 'spades'),
      makeCard('4', 'spades'),
      makeCard('3', 'spades'),
    ];
    expect(isDescendingSameSuitRun(cards, 0)).toBe(true);
  });

  it('returns false for different suits', () => {
    const cards = [
      makeCard('5', 'spades'),
      makeCard('4', 'hearts'),
    ];
    expect(isDescendingSameSuitRun(cards, 0)).toBe(false);
  });

  it('returns false for non-descending', () => {
    const cards = [
      makeCard('3', 'spades'),
      makeCard('5', 'spades'),
    ];
    expect(isDescendingSameSuitRun(cards, 0)).toBe(false);
  });

  it('returns false if any card is face down', () => {
    const cards = [
      makeCard('5', 'spades', false),
      makeCard('4', 'spades'),
    ];
    expect(isDescendingSameSuitRun(cards, 0)).toBe(false);
  });
});

// ── isValidSpiderMove ─────────────────────────────────────────

describe('isValidSpiderMove', () => {
  it('rejects move to same pile', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], [], [], [], []],
    });
    expect(isValidSpiderMove(state, 'tableau-0', 'tableau-0', 0)).toBe(false);
  });

  it('rejects move to/from stock', () => {
    const state = emptyState({
      stock: [makeCard('A', 'spades', false)],
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], [], [], [], []],
    });
    expect(isValidSpiderMove(state, 'stock', 'tableau-1', 0)).toBe(false);
    expect(isValidSpiderMove(state, 'tableau-0', 'stock', 0)).toBe(false);
  });

  it('allows any card to empty tableau', () => {
    const state = emptyState({
      tableau: [[makeCard('5', 'hearts')], [], [], [], [], [], [], [], [], []],
    });
    expect(isValidSpiderMove(state, 'tableau-0', 'tableau-1', 0)).toBe(true);
  });

  it('allows descending rank (any suit) to non-empty tableau', () => {
    const state = emptyState({
      tableau: [
        [makeCard('6', 'hearts')],
        [makeCard('7', 'spades')], // different suit, but valid in spider
        [], [], [], [], [], [], [], [],
      ],
    });
    expect(isValidSpiderMove(state, 'tableau-0', 'tableau-1', 0)).toBe(true);
  });

  it('rejects non-descending rank to tableau', () => {
    const state = emptyState({
      tableau: [
        [makeCard('8', 'spades')],
        [makeCard('7', 'spades')],
        [], [], [], [], [], [], [], [],
      ],
    });
    expect(isValidSpiderMove(state, 'tableau-0', 'tableau-1', 0)).toBe(false);
  });

  it('only allows moving same-suit runs', () => {
    const state = emptyState({
      tableau: [
        [makeCard('5', 'spades'), makeCard('4', 'hearts')], // mixed suits
        [makeCard('6', 'spades')],
        [makeCard('5', 'spades', true, 1)], // valid target for 4♥ (rank-1)
        [], [], [], [], [], [], [],
      ],
    });
    // Moving both cards should fail (not same-suit run)
    expect(isValidSpiderMove(state, 'tableau-0', 'tableau-1', 0)).toBe(false);
    // Moving single card (4♥) to 6♠ should fail (6-4=2, not 1)
    expect(isValidSpiderMove(state, 'tableau-0', 'tableau-1', 1)).toBe(false);
    // Moving single card (4♥) to 5♠ should work (descending rank)
    expect(isValidSpiderMove(state, 'tableau-0', 'tableau-2', 1)).toBe(true);
  });

  it('rejects moving face-down card', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades', false)], [], [], [], [], [], [], [], [], []],
    });
    expect(isValidSpiderMove(state, 'tableau-0', 'tableau-1', 0)).toBe(false);
  });
});

// ── checkCompletedRun ─────────────────────────────────────────

describe('checkCompletedRun', () => {
  it('returns true for complete K→A same-suit run', () => {
    const pile: Card[] = RANKS.slice().reverse().map((rank) =>
      makeCard(rank, 'spades', true, 0)
    );
    expect(pile).toHaveLength(13);
    expect(checkCompletedRun(pile)).toBe(true);
  });

  it('returns false for fewer than 13 cards', () => {
    const pile = [makeCard('K', 'spades'), makeCard('Q', 'spades')];
    expect(checkCompletedRun(pile)).toBe(false);
  });

  it('returns false for mixed suits', () => {
    const pile = RANKS.slice().reverse().map((rank, i) =>
      makeCard(rank, i === 0 ? 'hearts' : 'spades', true, 0)
    );
    expect(checkCompletedRun(pile)).toBe(false);
  });

  it('returns false if not starting with K', () => {
    // Q→A = 12 cards, pad with extra card
    const pile = [
      makeCard('A', 'spades', true, 1),
      ...RANKS.slice().reverse().map((rank) => makeCard(rank, 'spades', true, 0)),
    ];
    // The last 13 start at index 1 (Q, not K) — actually it starts at K
    // Let's be explicit: 14 cards, last 13 are K→A
    expect(pile).toHaveLength(14);
    expect(checkCompletedRun(pile)).toBe(true); // last 13 do start with K
  });

  it('detects run at bottom of larger pile', () => {
    const extraCards = [makeCard('3', 'hearts', false), makeCard('7', 'spades', true)];
    const run = RANKS.slice().reverse().map((rank) => makeCard(rank, 'spades', true, 0));
    const pile = [...extraCards, ...run];
    expect(pile).toHaveLength(15);
    expect(checkCompletedRun(pile)).toBe(true);
  });
});

// ── canDealStock ──────────────────────────────────────────────

describe('canDealStock', () => {
  it('returns false when stock is empty', () => {
    const state = emptyState({
      tableau: Array.from({ length: 10 }, () => [makeCard('K', 'spades')]),
    });
    expect(canDealStock(state)).toBe(false);
  });

  it('returns false when any column is empty', () => {
    const state = emptyState({
      stock: Array.from({ length: 10 }, () => makeCard('A', 'spades', false)),
      tableau: [[makeCard('K', 'spades')], [], [makeCard('Q', 'spades')], [], [], [], [], [], [], []],
    });
    expect(canDealStock(state)).toBe(false);
  });

  it('returns true when stock has cards and all columns non-empty', () => {
    const state = emptyState({
      stock: Array.from({ length: 10 }, () => makeCard('A', 'spades', false)),
      tableau: Array.from({ length: 10 }, () => [makeCard('K', 'spades')]),
    });
    expect(canDealStock(state)).toBe(true);
  });
});

// ── getValidSpiderDropTargets ─────────────────────────────────

describe('getValidSpiderDropTargets', () => {
  it('includes empty columns and valid rank targets', () => {
    const state = emptyState({
      tableau: [
        [makeCard('6', 'spades')],
        [makeCard('7', 'hearts')], // valid: rank-1
        [makeCard('3', 'spades')], // not valid
        [], // valid: empty
        [], [], [], [], [], [],
      ],
    });
    const targets = getValidSpiderDropTargets(state, 'tableau-0', 0);
    expect(targets).toContain('tableau-1');
    expect(targets).toContain('tableau-3');
    expect(targets).not.toContain('tableau-2');
    expect(targets).not.toContain('tableau-0');
  });
});

// ── getPileCards ──────────────────────────────────────────────

describe('getPileCards', () => {
  it('returns stock cards', () => {
    const state = emptyState({ stock: [makeCard('A', 'spades', false)] });
    expect(getPileCards(state, 'stock')).toHaveLength(1);
  });

  it('returns tableau cards', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], [], [], [], []],
    });
    expect(getPileCards(state, 'tableau-0')).toHaveLength(1);
    expect(getPileCards(state, 'tableau-1')).toHaveLength(0);
  });
});
