import type { Card, Suit, SpiderSuitCount, SpiderGameState, SpiderPileId } from './types';
import { RANKS, SUIT_COLORS, RANK_VALUES } from '../../constants';
import { newGameId } from '../../utils/gameId';

const SPIDER_SUITS: Record<SpiderSuitCount, Suit[]> = {
  1: ['spades'],
  2: ['spades', 'hearts'],
  4: ['spades', 'hearts', 'diamonds', 'clubs'],
};

/**
 * Create a 104-card deck for Spider Solitaire.
 * With 1 suit: 8 copies of that suit (104 cards).
 * With 2 suits: 4 copies of each suit (104 cards).
 * With 4 suits: 2 copies of each suit (104 cards).
 */
export function createSpiderDeck(suitCount: SpiderSuitCount): Card[] {
  const suits = SPIDER_SUITS[suitCount];
  const copiesPerSuit = Math.floor(104 / (suits.length * 13));
  const deck: Card[] = [];

  for (const suit of suits) {
    for (let copy = 0; copy < copiesPerSuit; copy++) {
      for (const rank of RANKS) {
        deck.push({
          id: `${suit}-${rank}-${copy}`,
          suit,
          rank,
          color: SUIT_COLORS[suit],
          faceUp: false,
        });
      }
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

/**
 * Deal a Spider game.
 * Columns 0-3: 6 cards (5 face-down + 1 face-up)
 * Columns 4-9: 5 cards (4 face-down + 1 face-up)
 * Remaining 50 cards in stock.
 */
export function dealSpiderGame(suitCount: SpiderSuitCount): SpiderGameState {
  const deck = shuffleDeck(createSpiderDeck(suitCount));
  const tableau: Card[][] = Array.from({ length: 10 }, () => []);

  let cardIdx = 0;
  for (let col = 0; col < 10; col++) {
    const numCards = col < 4 ? 6 : 5;
    for (let row = 0; row < numCards; row++) {
      const card = { ...deck[cardIdx] };
      card.faceUp = row === numCards - 1;
      tableau[col].push(card);
      cardIdx++;
    }
  }

  const stock = deck.slice(cardIdx).map(c => ({ ...c, faceUp: false }));

  return {
    gameId: newGameId(),
    stock,
    tableau,
    completedSuits: 0,
    moves: 0,
    score: 500,
    history: [],
    hasWon: false,
    selectedCard: null,
  };
}

function getRankValue(rank: string): number {
  return RANK_VALUES[rank as keyof typeof RANK_VALUES] ?? 0;
}

export function getPileCards(state: SpiderGameState, pileId: SpiderPileId): Card[] {
  if (pileId === 'stock') return state.stock;
  if (pileId.startsWith('tableau-')) {
    const idx = parseInt(pileId.split('-')[1]);
    return state.tableau[idx];
  }
  return [];
}

/**
 * Check if cards from cardIndex to end form a descending same-suit run.
 */
export function isDescendingSameSuitRun(cards: Card[], fromIndex: number): boolean {
  for (let i = fromIndex; i < cards.length - 1; i++) {
    if (!cards[i].faceUp || !cards[i + 1].faceUp) return false;
    if (cards[i].suit !== cards[i + 1].suit) return false;
    if (getRankValue(cards[i].rank) !== getRankValue(cards[i + 1].rank) + 1) return false;
  }
  return cards[fromIndex]?.faceUp ?? false;
}

export function isValidSpiderMove(
  state: SpiderGameState,
  from: SpiderPileId,
  to: SpiderPileId,
  cardIndex: number
): boolean {
  if (from === to) return false;
  if (from === 'stock' || to === 'stock') return false;

  const sourcePile = getPileCards(state, from);
  if (cardIndex < 0 || cardIndex >= sourcePile.length) return false;
  if (!sourcePile[cardIndex].faceUp) return false;

  // Cards being moved must form a descending same-suit run
  if (!isDescendingSameSuitRun(sourcePile, cardIndex)) return false;

  const movingCard = sourcePile[cardIndex];

  if (to.startsWith('tableau-')) {
    const tabIdx = parseInt(to.split('-')[1]);
    const targetPile = state.tableau[tabIdx];

    if (targetPile.length === 0) return true; // any card to empty

    const topCard = targetPile[targetPile.length - 1];
    // Descending rank only (any suit allowed on tableau)
    return getRankValue(movingCard.rank) === getRankValue(topCard.rank) - 1;
  }

  return false;
}

/**
 * Check if the top 13 cards of a pile form a complete K→A same-suit run.
 * Returns true if they should be removed.
 */
export function checkCompletedRun(pile: Card[]): boolean {
  if (pile.length < 13) return false;

  const startIdx = pile.length - 13;
  const suit = pile[startIdx].suit;

  // Must be K at start
  if (pile[startIdx].rank !== 'K') return false;

  for (let i = 0; i < 13; i++) {
    const card = pile[startIdx + i];
    if (!card.faceUp) return false;
    if (card.suit !== suit) return false;
    if (getRankValue(card.rank) !== 13 - i) return false;
  }

  return true;
}

/**
 * Can deal from stock? Stock must be non-empty AND all 10 columns must have ≥1 card.
 */
export function canDealStock(state: SpiderGameState): boolean {
  if (state.stock.length === 0) return false;
  return state.tableau.every(pile => pile.length > 0);
}

export function getValidSpiderDropTargets(
  state: SpiderGameState,
  from: SpiderPileId,
  cardIndex: number
): SpiderPileId[] {
  const targets: SpiderPileId[] = [];

  for (let t = 0; t < 10; t++) {
    const pileId: SpiderPileId = `tableau-${t as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;
    if (isValidSpiderMove(state, from, pileId, cardIndex)) {
      targets.push(pileId);
    }
  }

  return targets;
}
