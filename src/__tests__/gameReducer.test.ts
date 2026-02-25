import { describe, it, expect } from 'vitest';
import type { Card, GameState, Suit, Rank } from '../types';
import { gameReducer } from '../hooks/useGameState';
import { SUIT_COLORS } from '../constants';

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
    ...overrides,
  };
}

// ── NEW_GAME ──────────────────────────────────────────────────

describe('NEW_GAME', () => {
  it('returns a fresh dealt state', () => {
    const state = emptyState();
    const next = gameReducer(state, { type: 'NEW_GAME' });
    expect(next.stock).toHaveLength(24);
    expect(next.tableau).toHaveLength(7);
    expect(next.moves).toBe(0);
    expect(next.score).toBe(0);
    expect(next.hasWon).toBe(false);
  });
});

// ── DRAW_STOCK ────────────────────────────────────────────────

describe('DRAW_STOCK', () => {
  it('moves top stock card to waste face up', () => {
    const state = emptyState({
      stock: [makeCard('A', 'hearts', false), makeCard('3', 'spades', false)],
      waste: [],
    });
    const next = gameReducer(state, { type: 'DRAW_STOCK' });
    expect(next.stock).toHaveLength(1);
    expect(next.waste).toHaveLength(1);
    expect(next.waste[0].faceUp).toBe(true);
    expect(next.waste[0].rank).toBe('3'); // top of stock was last element
  });

  it('recycles waste to stock when stock is empty', () => {
    const state = emptyState({
      stock: [],
      waste: [makeCard('A', 'hearts'), makeCard('3', 'spades'), makeCard('K', 'diamonds')],
    });
    const next = gameReducer(state, { type: 'DRAW_STOCK' });
    expect(next.stock).toHaveLength(3);
    expect(next.waste).toHaveLength(0);
    // All cards should be face down
    for (const card of next.stock) {
      expect(card.faceUp).toBe(false);
    }
    // Waste was reversed into stock, so first waste card is now last in stock
    expect(next.stock[next.stock.length - 1].rank).toBe('A');
  });

  it('does nothing when both stock and waste are empty', () => {
    const state = emptyState();
    const next = gameReducer(state, { type: 'DRAW_STOCK' });
    expect(next).toBe(state); // Same reference = no change
  });

  it('draws 3 cards when count=3', () => {
    const state = emptyState({
      stock: [
        makeCard('A', 'hearts', false),
        makeCard('3', 'spades', false),
        makeCard('5', 'diamonds', false),
        makeCard('7', 'clubs', false),
      ],
      waste: [],
    });
    const next = gameReducer(state, { type: 'DRAW_STOCK', count: 3 });
    expect(next.stock).toHaveLength(1);
    expect(next.waste).toHaveLength(3);
    // All drawn cards should be face up
    for (const card of next.waste) {
      expect(card.faceUp).toBe(true);
    }
    // Top of waste is the last popped card — 3♠ was 2nd from top, popped 3rd
    // Stock pops: 7♣, 5♦, 3♠ → waste = [7♣, 5♦, 3♠]
    expect(next.waste[0].rank).toBe('7');
    expect(next.waste[2].rank).toBe('3');
  });

  it('draws remaining cards when stock has fewer than count', () => {
    const state = emptyState({
      stock: [makeCard('A', 'hearts', false), makeCard('3', 'spades', false)],
      waste: [],
    });
    const next = gameReducer(state, { type: 'DRAW_STOCK', count: 3 });
    expect(next.stock).toHaveLength(0);
    expect(next.waste).toHaveLength(2);
  });
});

// ── MOVE_CARDS ────────────────────────────────────────────────

describe('MOVE_CARDS', () => {
  it('transfers cards, flips source top, updates score and moves', () => {
    const state = emptyState({
      tableau: [
        [makeCard('Q', 'hearts', false), makeCard('A', 'hearts')],
        [],
        [], [], [], [], [],
      ],
    });
    const next = gameReducer(state, {
      type: 'MOVE_CARDS',
      from: 'tableau-0',
      to: 'foundation-0',
      cardIndex: 1,
    });
    // A♥ moved to foundation
    expect(next.foundations[0]).toHaveLength(1);
    expect(next.foundations[0][0].rank).toBe('A');
    // Source pile now has Q♥ face up (auto-flipped)
    expect(next.tableau[0]).toHaveLength(1);
    expect(next.tableau[0][0].faceUp).toBe(true);
    // Score: tableau→foundation = 10
    expect(next.score).toBe(10);
    expect(next.moves).toBe(1);
  });

  it('returns same state for invalid move', () => {
    const state = emptyState({
      tableau: [[makeCard('5', 'hearts')], [], [], [], [], [], []],
    });
    const next = gameReducer(state, {
      type: 'MOVE_CARDS',
      from: 'tableau-0',
      to: 'foundation-0',
      cardIndex: 0,
    });
    expect(next).toBe(state);
  });

  it('detects win when last cards reach foundations', () => {
    // Set up a state where moving one more card completes the game
    const makeFullFoundation = (suit: Suit): Card[] =>
      (['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as Rank[]).map(
        r => makeCard(r, suit)
      );

    const almostFull = makeFullFoundation('hearts').slice(0, 12); // A through Q
    const state = emptyState({
      foundations: [
        almostFull,
        makeFullFoundation('diamonds'),
        makeFullFoundation('clubs'),
        makeFullFoundation('spades'),
      ],
      tableau: [[makeCard('K', 'hearts')], [], [], [], [], [], []],
    });
    const next = gameReducer(state, {
      type: 'MOVE_CARDS',
      from: 'tableau-0',
      to: 'foundation-0',
      cardIndex: 0,
    });
    expect(next.hasWon).toBe(true);
    expect(next.foundations[0]).toHaveLength(13);
  });
});

// ── UNDO ──────────────────────────────────────────────────────

describe('UNDO', () => {
  it('restores previous state from history', () => {
    // Start with a state, make a move (which saves history), then undo
    const initial = emptyState({
      tableau: [[makeCard('A', 'hearts')], [], [], [], [], [], []],
    });
    const afterMove = gameReducer(initial, {
      type: 'MOVE_CARDS',
      from: 'tableau-0',
      to: 'foundation-0',
      cardIndex: 0,
    });
    expect(afterMove.foundations[0]).toHaveLength(1);
    expect(afterMove.history).toHaveLength(1);

    const afterUndo = gameReducer(afterMove, { type: 'UNDO' });
    expect(afterUndo.foundations[0]).toHaveLength(0);
    expect(afterUndo.tableau[0]).toHaveLength(1);
    expect(afterUndo.history).toHaveLength(0);
  });

  it('does nothing when history is empty', () => {
    const state = emptyState();
    const next = gameReducer(state, { type: 'UNDO' });
    expect(next).toBe(state);
  });
});

// ── SELECT_CARD ───────────────────────────────────────────────

describe('SELECT_CARD', () => {
  it('selects a face-up card when nothing is selected', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], []],
    });
    const next = gameReducer(state, {
      type: 'SELECT_CARD',
      pileId: 'tableau-0',
      cardIndex: 0,
    });
    expect(next.selectedCard).toEqual({ pileId: 'tableau-0', cardIndex: 0 });
  });

  it('deselects when tapping the same card', () => {
    const state = emptyState({
      tableau: [[makeCard('K', 'spades')], [], [], [], [], [], []],
      selectedCard: { pileId: 'tableau-0', cardIndex: 0 },
    });
    const next = gameReducer(state, {
      type: 'SELECT_CARD',
      pileId: 'tableau-0',
      cardIndex: 0,
    });
    expect(next.selectedCard).toBeNull();
  });

  it('executes move when tapping a valid target', () => {
    const state = emptyState({
      tableau: [
        [makeCard('A', 'hearts')],
        [], [], [], [], [], [],
      ],
      selectedCard: { pileId: 'tableau-0', cardIndex: 0 },
    });
    // Tap on foundation-0 (valid move for Ace)
    const next = gameReducer(state, {
      type: 'SELECT_CARD',
      pileId: 'foundation-0',
      cardIndex: 0,
    });
    expect(next.foundations[0]).toHaveLength(1);
    expect(next.tableau[0]).toHaveLength(0);
    expect(next.selectedCard).toBeNull();
  });

  it('re-selects a different face-up card when move is invalid', () => {
    const state = emptyState({
      tableau: [
        [makeCard('5', 'hearts')],  // Currently selected
        [makeCard('9', 'spades')],  // Not a valid target for 5♥
        [], [], [], [], [],
      ],
      selectedCard: { pileId: 'tableau-0', cardIndex: 0 },
    });
    const next = gameReducer(state, {
      type: 'SELECT_CARD',
      pileId: 'tableau-1',
      cardIndex: 0,
    });
    // Should re-select the 9♠ instead
    expect(next.selectedCard).toEqual({ pileId: 'tableau-1', cardIndex: 0 });
  });
});

// ── CLEAR_SELECTION ───────────────────────────────────────────

describe('CLEAR_SELECTION', () => {
  it('clears selectedCard to null', () => {
    const state = emptyState({
      selectedCard: { pileId: 'tableau-0', cardIndex: 0 },
    });
    const next = gameReducer(state, { type: 'CLEAR_SELECTION' });
    expect(next.selectedCard).toBeNull();
  });
});
