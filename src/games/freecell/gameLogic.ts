import type { Card, FreeCellGameState, FreeCellPileId } from './types';
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
        faceUp: true, // ALL cards face up in FreeCell
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

export function dealFreeCellGame(): FreeCellGameState {
  const deck = shuffleDeck(createDeck());
  const tableau: Card[][] = Array.from({ length: 8 }, () => []);

  // Deal all 52 cards into 8 columns
  // Columns 0-3 get 7 cards, columns 4-7 get 6 cards
  for (let i = 0; i < 52; i++) {
    tableau[i % 8].push(deck[i]);
  }

  return {
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    tableau,
    moves: 0,
    score: 0,
    history: [],
    hasWon: false,
    selectedCard: null,
  };
}

function getRankValue(rank: string): number {
  return RANK_VALUES[rank as keyof typeof RANK_VALUES] ?? 0;
}

export function getPileCards(state: FreeCellGameState, pileId: FreeCellPileId): Card[] {
  if (pileId.startsWith('freecell-')) {
    const idx = parseInt(pileId.split('-')[1]);
    const card = state.freeCells[idx];
    return card ? [card] : [];
  }
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

/**
 * Supermove: how many cards can be moved at once.
 * Formula: (emptyFreeCells + 1) × 2^(emptyTableauCols)
 * When moving to an empty tableau, that empty slot doesn't count.
 */
/**
 * Returns 'supermove' if the move would be valid except for the supermove limit,
 * null if the move is valid or invalid for other reasons.
 */
export function getMoveRejectionReason(
  state: FreeCellGameState,
  from: FreeCellPileId,
  to: FreeCellPileId,
  cardIndex: number
): 'supermove' | null {
  if (from === to) return null;
  const sourcePile = getPileCards(state, from);
  if (cardIndex < 0 || cardIndex >= sourcePile.length) return null;
  const movingCards = sourcePile.slice(cardIndex);
  if (movingCards.length <= 1) return null; // single card — never a supermove issue

  // Only tableau destinations can have supermove limits
  if (!to.startsWith('tableau-')) return null;

  // Must be a valid descending alternating-color sequence
  for (let i = 0; i < movingCards.length - 1; i++) {
    const curr = movingCards[i];
    const next = movingCards[i + 1];
    if (curr.color === next.color) return null;
    if (getRankValue(curr.rank) !== getRankValue(next.rank) + 1) return null;
  }

  const tabIdx = parseInt(to.split('-')[1]);
  const targetPile = state.tableau[tabIdx];
  const toEmpty = targetPile.length === 0;

  // Check if the stack placement would be valid (ignoring supermove)
  if (!toEmpty) {
    const topCard = targetPile[targetPile.length - 1];
    const movingCard = movingCards[0];
    if (movingCard.color === topCard.color || getRankValue(movingCard.rank) !== getRankValue(topCard.rank) - 1) {
      return null; // invalid for other reasons
    }
  }

  // If we get here, placement is valid — check if supermove blocks it
  const maxMovable = getMaxMovableCards(state, toEmpty);
  if (movingCards.length > maxMovable) return 'supermove';

  return null;
}

export function getMaxMovableCards(state: FreeCellGameState, toEmpty = false): number {
  const emptyFreeCells = state.freeCells.filter(c => c === null).length;
  let emptyTableau = state.tableau.filter(t => t.length === 0).length;
  if (toEmpty && emptyTableau > 0) emptyTableau -= 1; // destination doesn't count
  return (emptyFreeCells + 1) * Math.pow(2, emptyTableau);
}

export function isValidFreeCellMove(
  state: FreeCellGameState,
  from: FreeCellPileId,
  to: FreeCellPileId,
  cardIndex: number
): boolean {
  if (from === to) return false;

  const sourcePile = getPileCards(state, from);
  if (cardIndex < 0 || cardIndex >= sourcePile.length) return false;

  const movingCard = sourcePile[cardIndex];
  const movingCards = sourcePile.slice(cardIndex);

  // From free cell or foundation: only single card
  if (from.startsWith('freecell-') && cardIndex !== 0) return false;
  if (from.startsWith('foundation-') && cardIndex !== sourcePile.length - 1) return false;

  // Validate moving stack is a valid descending alternating-color sequence
  for (let i = 0; i < movingCards.length - 1; i++) {
    const curr = movingCards[i];
    const next = movingCards[i + 1];
    if (curr.color === next.color) return false;
    if (getRankValue(curr.rank) !== getRankValue(next.rank) + 1) return false;
  }

  // To free cell
  if (to.startsWith('freecell-')) {
    if (movingCards.length !== 1) return false; // only single cards
    const idx = parseInt(to.split('-')[1]);
    return state.freeCells[idx] === null;
  }

  // To foundation
  if (to.startsWith('foundation-')) {
    if (movingCards.length !== 1) return false;
    const foundIdx = parseInt(to.split('-')[1]);
    const foundation = state.foundations[foundIdx];

    if (foundation.length === 0) {
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
    const toEmpty = targetPile.length === 0;

    // Check supermove limit
    const maxMovable = getMaxMovableCards(state, toEmpty);
    if (movingCards.length > maxMovable) return false;

    if (toEmpty) {
      return true; // any card/sequence can go to empty tableau
    }

    const topCard = targetPile[targetPile.length - 1];
    return (
      movingCard.color !== topCard.color &&
      getRankValue(movingCard.rank) === getRankValue(topCard.rank) - 1
    );
  }

  return false;
}

export function checkWin(state: FreeCellGameState): boolean {
  return state.foundations.every(f => f.length === 13);
}

export function getValidFreeCellDropTargets(
  state: FreeCellGameState,
  from: FreeCellPileId,
  cardIndex: number
): FreeCellPileId[] {
  const targets: FreeCellPileId[] = [];

  // Check free cells
  for (let i = 0; i < 4; i++) {
    const pileId: FreeCellPileId = `freecell-${i as 0 | 1 | 2 | 3}`;
    if (isValidFreeCellMove(state, from, pileId, cardIndex)) {
      targets.push(pileId);
    }
  }

  // Check foundations
  for (let f = 0; f < 4; f++) {
    const pileId: FreeCellPileId = `foundation-${f as 0 | 1 | 2 | 3}`;
    if (isValidFreeCellMove(state, from, pileId, cardIndex)) {
      targets.push(pileId);
    }
  }

  // Check tableau
  for (let t = 0; t < 8; t++) {
    const pileId: FreeCellPileId = `tableau-${t as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`;
    if (isValidFreeCellMove(state, from, pileId, cardIndex)) {
      targets.push(pileId);
    }
  }

  return targets;
}

export function calculateScore(to: FreeCellPileId): number {
  if (to.startsWith('foundation-')) return 10;
  return 0;
}

export function findAutoMoveToFoundation(
  state: FreeCellGameState,
  pileId: FreeCellPileId,
  cardIndex: number
): FreeCellPileId | null {
  const pile = getPileCards(state, pileId);
  if (pileId.startsWith('freecell-')) {
    if (pile.length === 0) return null;
    // Free cell always has 1 card, cardIndex must be 0
    if (cardIndex !== 0) return null;
  } else if (cardIndex !== pile.length - 1) {
    return null; // only top card
  }

  for (let f = 0; f < 4; f++) {
    const foundId: FreeCellPileId = `foundation-${f as 0 | 1 | 2 | 3}`;
    if (isValidFreeCellMove(state, pileId, foundId, cardIndex)) {
      return foundId;
    }
  }
  return null;
}

/**
 * Find cards that can safely be auto-moved to foundation.
 * Same logic as Klondike: safe when both opposite-color (rank-1) are on foundations.
 */
export function findSafeFreeCellAutoMoves(
  state: FreeCellGameState
): { from: FreeCellPileId; to: FreeCellPileId; cardIndex: number }[] {
  const moves: { from: FreeCellPileId; to: FreeCellPileId; cardIndex: number }[] = [];

  const foundationMinRank = (color: 'red' | 'black'): number => {
    let minRank = 14;
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
    if (cardRankVal <= 2) return true;
    const oppositeColor = card.color === 'red' ? 'black' : 'red';
    const oppositeMinRank = foundationMinRank(oppositeColor);
    return oppositeMinRank >= cardRankVal - 1;
  };

  // Check free cells
  for (let i = 0; i < 4; i++) {
    const card = state.freeCells[i];
    if (!card) continue;
    const fromId: FreeCellPileId = `freecell-${i as 0 | 1 | 2 | 3}`;
    const target = findAutoMoveToFoundation(state, fromId, 0);
    if (target && isSafeToMove(card)) {
      moves.push({ from: fromId, to: target, cardIndex: 0 });
    }
  }

  // Check tableau tops
  for (let t = 0; t < 8; t++) {
    const pile = state.tableau[t];
    if (pile.length === 0) continue;
    const topCard = pile[pile.length - 1];
    const fromId: FreeCellPileId = `tableau-${t as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`;
    const target = findAutoMoveToFoundation(state, fromId, pile.length - 1);
    if (target && isSafeToMove(topCard)) {
      moves.push({ from: fromId, to: target, cardIndex: pile.length - 1 });
    }
  }

  return moves;
}

export function canAutoComplete(state: FreeCellGameState): boolean {
  // Can auto-complete when all tableau cards form valid descending sequences
  // and all free cells are empty (or we can just check if all cards are face-up
  // and in order). Simpler: just check all face up (always true in FreeCell)
  // and no face-down cards. We check the same heuristic: all tableau sorted.
  for (const pile of state.tableau) {
    for (let i = 0; i < pile.length - 1; i++) {
      if (getRankValue(pile[i].rank) <= getRankValue(pile[i + 1].rank)) {
        return false; // not descending
      }
    }
  }
  // Also require free cells empty
  return state.freeCells.every(c => c === null);
}

export function getAutoCompleteMove(
  state: FreeCellGameState
): { from: FreeCellPileId; to: FreeCellPileId; cardIndex: number } | null {
  // Try free cells first
  for (let i = 0; i < 4; i++) {
    if (!state.freeCells[i]) continue;
    const fromId: FreeCellPileId = `freecell-${i as 0 | 1 | 2 | 3}`;
    for (let f = 0; f < 4; f++) {
      const toId: FreeCellPileId = `foundation-${f as 0 | 1 | 2 | 3}`;
      if (isValidFreeCellMove(state, fromId, toId, 0)) {
        return { from: fromId, to: toId, cardIndex: 0 };
      }
    }
  }

  // Try tableau — pick lowest rank
  let bestMove: { from: FreeCellPileId; to: FreeCellPileId; cardIndex: number; rankValue: number } | null = null;
  for (let t = 0; t < 8; t++) {
    const pile = state.tableau[t];
    if (pile.length === 0) continue;
    const card = pile[pile.length - 1];
    for (let f = 0; f < 4; f++) {
      const fromId: FreeCellPileId = `tableau-${t as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`;
      const toId: FreeCellPileId = `foundation-${f as 0 | 1 | 2 | 3}`;
      if (isValidFreeCellMove(state, fromId, toId, pile.length - 1)) {
        const rv = getRankValue(card.rank);
        if (!bestMove || rv < bestMove.rankValue) {
          bestMove = { from: fromId, to: toId, cardIndex: pile.length - 1, rankValue: rv };
        }
      }
    }
  }

  return bestMove ? { from: bestMove.from, to: bestMove.to, cardIndex: bestMove.cardIndex } : null;
}
