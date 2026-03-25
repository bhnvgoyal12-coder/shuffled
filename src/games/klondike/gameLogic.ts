import type { Card, GameState, PileId } from './types';
import { SUITS, RANKS, SUIT_COLORS, RANK_VALUES, FOUNDATION_SUITS } from '../../constants';

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

export function canAutoComplete(state: GameState): boolean {
  if (state.stock.length > 0) return false;
  if (state.waste.length > 0) {
    // waste is ok if all tableau cards are face up
  }
  for (const pile of state.tableau) {
    for (const card of pile) {
      if (!card.faceUp) return false;
    }
  }
  return true;
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
