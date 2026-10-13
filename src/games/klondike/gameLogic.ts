import type { Card, DrawMode, GameState, PileId } from './types';
import { SUITS, RANKS, SUIT_COLORS, RANK_VALUES, FOUNDATION_SUITS } from '../../constants';
import { newGameId } from '../../utils/gameId';

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        color: SUIT_COLORS[suit],
        faceUp: false,
      });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealGame(): GameState {
  const deck = shuffleDeck(createDeck());
  const tableau: Card[][] = [];
  let cardIndex = 0;

  for (let col = 0; col < 7; col++) {
    const pile: Card[] = [];
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[cardIndex] };
      card.faceUp = row === col;
      pile.push(card);
      cardIndex++;
    }
    tableau.push(pile);
  }

  const stock = deck.slice(cardIndex).map(c => ({ ...c, faceUp: false }));

  return {
    gameId: newGameId(),
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    moves: 0,
    score: 0,
    history: [],
    hasWon: false,
    selectedCard: null,
    wasteFanCount: 0,
  };
}

function getRankValue(rank: string): number {
  return RANK_VALUES[rank as keyof typeof RANK_VALUES] ?? 0;
}

export function getPileCards(state: GameState, pileId: PileId): Card[] {
  if (pileId === 'stock') return state.stock;
  if (pileId === 'waste') return state.waste;
  if (pileId.startsWith('foundation-')) {
    const idx = parseInt(pileId.split('-')[1]);
    return state.foundations[idx];
  }
  if (pileId.startsWith('tableau-')) {
    const idx = parseInt(pileId.split('-')[1]);
    return state.tableau[idx];
  }
  return [];
}

export function isValidMove(
  state: GameState,
  from: PileId,
  to: PileId,
  cardIndex: number
): boolean {
  if (from === to) return false;

  const sourcePile = getPileCards(state, from);
  if (cardIndex < 0 || cardIndex >= sourcePile.length) return false;

  const movingCard = sourcePile[cardIndex];
  if (!movingCard.faceUp) return false;

  // From waste: only top card
  if (from === 'waste' && cardIndex !== sourcePile.length - 1) return false;

  // From foundation: only top card
  if (from.startsWith('foundation-') && cardIndex !== sourcePile.length - 1) return false;

  const movingCards = sourcePile.slice(cardIndex);

  // To foundation
  if (to.startsWith('foundation-')) {
    // Only single cards to foundation
    if (movingCards.length !== 1) return false;
    const foundIdx = parseInt(to.split('-')[1]);
    const foundation = state.foundations[foundIdx];

    if (foundation.length === 0) {
      // Ace must match the foundation's designated suit
      return movingCard.rank === 'A' && movingCard.suit === FOUNDATION_SUITS[foundIdx];
    }
    const topCard = foundation[foundation.length - 1];
    return (
      movingCard.suit === topCard.suit &&
      getRankValue(movingCard.rank) === getRankValue(topCard.rank) + 1
    );
  }

  // To tableau
  if (to.startsWith('tableau-')) {
    const tabIdx = parseInt(to.split('-')[1]);
    const targetPile = state.tableau[tabIdx];

    if (targetPile.length === 0) {
      return movingCard.rank === 'K';
    }
    const topCard = targetPile[targetPile.length - 1];
    return (
      topCard.faceUp &&
      movingCard.color !== topCard.color &&
      getRankValue(movingCard.rank) === getRankValue(topCard.rank) - 1
    );
  }

  return false;
}

export function checkWin(state: GameState): boolean {
  return state.foundations.every(f => f.length === 13);
}

function allTableauFaceUp(state: GameState): boolean {
  return state.tableau.every(pile => pile.every(card => card.faceUp));
}

export type AutoCompleteStep =
  | { type: 'draw' }
  | { type: 'move'; from: PileId; to: PileId; cardIndex: number };

/**
 * Next step of an auto-finish: play a card to a foundation, or turn the stock
 * when the card that is needed is still in the stock / waste.
 * Only available once every tableau card is face up.
 */
export function getAutoCompleteStep(state: GameState): AutoCompleteStep | null {
  if (state.hasWon || !allTableauFaceUp(state)) return null;
  const move = getAutoCompleteMove(state);
  if (move) return { type: 'move', ...move };
  if (state.stock.length > 0 || state.waste.length > 0) return { type: 'draw' };
  return null;
}

/**
 * True when repeating getAutoCompleteStep() is guaranteed to win the game.
 * Plays the steps out on a copy so the button is never offered for a position
 * the auto-finish would get stuck in (e.g. a needed card buried in the waste
 * that Draw 3 can never reach).
 */
export function canAutoComplete(state: GameState, drawMode: DrawMode = 1): boolean {
  if (state.hasWon || !allTableauFaceUp(state)) return false;

  const sim: GameState = {
    ...state,
    stock: [...state.stock],
    waste: [...state.waste],
    foundations: state.foundations.map(f => [...f]),
    tableau: state.tableau.map(t => [...t]),
  };
  let drawsSinceMove = 0;

  for (;;) {
    if (checkWin(sim)) return true;
    const step = getAutoCompleteStep(sim);
    if (!step) return false;

    if (step.type === 'move') {
      const card = getPileCards(sim, step.from).pop()!;
      getPileCards(sim, step.to).push(card);
      drawsSinceMove = 0;
      continue;
    }

    // A full pass through the stock without playing a card means it never will
    if (++drawsSinceMove > sim.stock.length + sim.waste.length + 1) return false;
    if (sim.stock.length > 0) {
      const count = Math.min(drawMode, sim.stock.length);
      for (let i = 0; i < count; i++) sim.waste.push({ ...sim.stock.pop()!, faceUp: true });
    } else {
      sim.stock = sim.waste.reverse();
      sim.waste = [];
    }
  }
}

export function getAutoCompleteMove(
  state: GameState
): { from: PileId; to: PileId; cardIndex: number } | null {
  // Try waste first
  if (state.waste.length > 0) {
    for (let f = 0; f < 4; f++) {
      const pileId: PileId = `foundation-${f as 0 | 1 | 2 | 3}`;
      if (isValidMove(state, 'waste', pileId, state.waste.length - 1)) {
        return { from: 'waste', to: pileId, cardIndex: state.waste.length - 1 };
      }
    }
  }

  // Try tableau piles - find lowest rank card that can go to foundation
  let bestMove: { from: PileId; to: PileId; cardIndex: number; rankValue: number } | null = null;

  for (let t = 0; t < 7; t++) {
    const pile = state.tableau[t];
    if (pile.length === 0) continue;
    const card = pile[pile.length - 1];
    for (let f = 0; f < 4; f++) {
      const fromId: PileId = `tableau-${t as 0 | 1 | 2 | 3 | 4 | 5 | 6}`;
      const toId: PileId = `foundation-${f as 0 | 1 | 2 | 3}`;
      if (isValidMove(state, fromId, toId, pile.length - 1)) {
        const rv = getRankValue(card.rank);
        if (!bestMove || rv < bestMove.rankValue) {
          bestMove = { from: fromId, to: toId, cardIndex: pile.length - 1, rankValue: rv };
        }
      }
    }
  }

  if (bestMove) {
    return { from: bestMove.from, to: bestMove.to, cardIndex: bestMove.cardIndex };
  }
  return null;
}

export function getValidDropTargets(
  state: GameState,
  from: PileId,
  cardIndex: number
): PileId[] {
  const targets: PileId[] = [];

  for (let f = 0; f < 4; f++) {
    const pileId: PileId = `foundation-${f as 0 | 1 | 2 | 3}`;
    if (isValidMove(state, from, pileId, cardIndex)) {
      targets.push(pileId);
    }
  }

  for (let t = 0; t < 7; t++) {
    const pileId: PileId = `tableau-${t as 0 | 1 | 2 | 3 | 4 | 5 | 6}`;
    if (isValidMove(state, from, pileId, cardIndex)) {
      targets.push(pileId);
    }
  }

  return targets;
}

export function calculateScore(from: PileId, to: PileId): number {
  if (from === 'waste' && to.startsWith('tableau-')) return 5;
  if (from === 'waste' && to.startsWith('foundation-')) return 10;
  if (from.startsWith('tableau-') && to.startsWith('foundation-')) return 10;
  if (from.startsWith('foundation-') && to.startsWith('tableau-')) return -15;
  return 0;
}

export function findAutoMoveToFoundation(
  state: GameState,
  pileId: PileId,
  cardIndex: number
): PileId | null {
  const pile = getPileCards(state, pileId);
  if (cardIndex !== pile.length - 1) return null; // only top card

  for (let f = 0; f < 4; f++) {
    const foundId: PileId = `foundation-${f as 0 | 1 | 2 | 3}`;
    if (isValidMove(state, pileId, foundId, cardIndex)) {
      return foundId;
    }
  }
  return null;
}

/**
 * Find cards that can safely be auto-moved to foundation.
 * A card is "safe" to auto-move if both opposite-color cards of rank-1
 * are already on their foundations. Aces and 2s are always safe.
 */
export function findSafeAutoMoves(
  state: GameState
): { from: PileId; to: PileId; cardIndex: number }[] {
  const moves: { from: PileId; to: PileId; cardIndex: number }[] = [];

  // Get min foundation rank for each color
  const foundationMinRank = (color: 'red' | 'black'): number => {
    let minRank = 14; // higher than K=13
    for (let f = 0; f < 4; f++) {
      const suit = FOUNDATION_SUITS[f];
      const suitColor = SUIT_COLORS[suit];
      if (suitColor === color) {
        const pile = state.foundations[f];
        const topRank = pile.length > 0 ? getRankValue(pile[pile.length - 1].rank) : 0;
        minRank = Math.min(minRank, topRank);
      }
    }
    return minRank;
  };

  const isSafeToMove = (card: Card): boolean => {
    const cardRankVal = getRankValue(card.rank);
    // Aces and 2s are always safe
    if (cardRankVal <= 2) return true;
    // Safe if both opposite-color cards of rank-1 are on foundations
    const oppositeColor = card.color === 'red' ? 'black' : 'red';
    const oppositeMinRank = foundationMinRank(oppositeColor);
    return oppositeMinRank >= cardRankVal - 1;
  };

  // Check waste top
  if (state.waste.length > 0) {
    const topCard = state.waste[state.waste.length - 1];
    const target = findAutoMoveToFoundation(state, 'waste', state.waste.length - 1);
    if (target && isSafeToMove(topCard)) {
      moves.push({ from: 'waste', to: target, cardIndex: state.waste.length - 1 });
    }
  }

  // Check tableau pile tops
  for (let t = 0; t < 7; t++) {
    const pile = state.tableau[t];
    if (pile.length === 0) continue;
    const topCard = pile[pile.length - 1];
    const fromId: PileId = `tableau-${t as 0 | 1 | 2 | 3 | 4 | 5 | 6}`;
    const target = findAutoMoveToFoundation(state, fromId, pile.length - 1);
    if (target && isSafeToMove(topCard)) {
      moves.push({ from: fromId, to: target, cardIndex: pile.length - 1 });
    }
  }

  return moves;
}

// ── Tap-to-move ───────────────────────────────────────────────

/**
 * Where a tapped card should go: a foundation if it fits, otherwise onto
 * another tableau pile, otherwise (Kings) into an empty column.
 */
export function findBestMoveTarget(
  state: GameState,
  from: PileId,
  cardIndex: number
): PileId | null {
  if (from.startsWith('foundation-')) return null;
  const targets = getValidDropTargets(state, from, cardIndex);
  if (targets.length === 0) return null;

  const foundation = targets.find(t => t.startsWith('foundation-'));
  if (foundation) return foundation;

  const occupied = targets.find(t => getPileCards(state, t).length > 0);
  if (occupied) return occupied;

  // A King that already sits at the bottom of its column gains nothing from moving
  if (from.startsWith('tableau-') && cardIndex === 0) return null;
  return targets[0];
}

// ── Hints ─────────────────────────────────────────────────────

export type Hint =
  | { type: 'draw' }
  | { type: 'move'; from: PileId; to: PileId; cardIndex: number };

const TABLEAU_IDS: PileId[] = [
  'tableau-0', 'tableau-1', 'tableau-2', 'tableau-3', 'tableau-4', 'tableau-5', 'tableau-6',
];

/** Suggest a move that makes progress, or drawing from the stock when nothing on the board does. */
export function getHint(state: GameState): Hint | null {
  if (state.hasWon) return null;

  // 1. Anything that can go up to a foundation
  const toFoundation = getAutoCompleteMove(state);
  if (toFoundation) return { type: 'move', ...toFoundation };

  // 2. Move a whole face-up run to uncover a face-down card
  for (const from of TABLEAU_IDS) {
    const pile = getPileCards(state, from);
    const runStart = pile.findIndex(c => c.faceUp);
    if (runStart <= 0) continue;
    for (const to of TABLEAU_IDS) {
      if (isValidMove(state, from, to, runStart)) return { type: 'move', from, to, cardIndex: runStart };
    }
  }

  // 3. Bring the waste card into play
  if (state.waste.length > 0) {
    const cardIndex = state.waste.length - 1;
    for (const to of TABLEAU_IDS) {
      if (isValidMove(state, 'waste', to, cardIndex)) return { type: 'move', from: 'waste', to, cardIndex };
    }
  }

  // 4. Clear a column — worth it only when a King is waiting for the space
  const wasteTop = state.waste[state.waste.length - 1];
  const kingWaiting =
    wasteTop?.rank === 'K' ||
    state.tableau.some(pile => {
      const runStart = pile.findIndex(c => c.faceUp);
      return runStart > 0 && pile[runStart].rank === 'K';
    });
  if (kingWaiting && state.tableau.every(pile => pile.length > 0)) {
    for (const from of TABLEAU_IDS) {
      const pile = getPileCards(state, from);
      if (pile.length === 0 || !pile[0].faceUp || pile[0].rank === 'K') continue;
      for (const to of TABLEAU_IDS) {
        if (isValidMove(state, from, to, 0)) return { type: 'move', from, to, cardIndex: 0 };
      }
    }
  }

  // 5. Otherwise turn over more cards
  if (state.stock.length > 0 || state.waste.length > 1) return { type: 'draw' };
  return null;
}
