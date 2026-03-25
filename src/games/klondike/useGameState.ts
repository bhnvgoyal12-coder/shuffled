import { useReducer, useCallback, useEffect } from 'react';
import type { GameState, GameAction, PileId, HistoryEntry, Card } from './types';
import { dealGame, isValidMove, checkWin, calculateScore } from './gameLogic';

const STORAGE_KEY = 'shuffled-klondike-state';
const OLD_STORAGE_KEY = 'solitaire-game-state';

function cloneCards(cards: Card[]): Card[] {
  return cards.map(c => ({ ...c }));
}

function saveHistory(state: GameState): HistoryEntry {
  return {
    stock: cloneCards(state.stock),
    waste: cloneCards(state.waste),
    foundations: state.foundations.map(cloneCards),
    tableau: state.tableau.map(cloneCards),
    moves: state.moves,
    score: state.score,
    wasteFanCount: state.wasteFanCount,
  };
}

function getPileCards(state: GameState, pileId: PileId): Card[] {
  if (pileId === 'stock') return state.stock;
  if (pileId === 'waste') return state.waste;
  if (pileId.startsWith('foundation-')) {
    return state.foundations[parseInt(pileId.split('-')[1])];
  }
  if (pileId.startsWith('tableau-')) {
    return state.tableau[parseInt(pileId.split('-')[1])];
  }
  return [];
}

function applyMove(state: GameState, from: PileId, to: PileId, cardIndex: number): GameState {
  if (!isValidMove(state, from, to, cardIndex)) return state;

  const history = [...state.history, saveHistory(state)];

  // Deep clone current piles
  const newStock = cloneCards(state.stock);
  const newWaste = cloneCards(state.waste);
  const newFoundations = state.foundations.map(cloneCards);
  const newTableau = state.tableau.map(cloneCards);

  const getSourcePile = (): Card[] => {
    if (from === 'stock') return newStock;
    if (from === 'waste') return newWaste;
    if (from.startsWith('foundation-')) return newFoundations[parseInt(from.split('-')[1])];
    return newTableau[parseInt(from.split('-')[1])];
  };

  const getDestPile = (): Card[] => {
    if (to === 'stock') return newStock;
    if (to === 'waste') return newWaste;
    if (to.startsWith('foundation-')) return newFoundations[parseInt(to.split('-')[1])];
    return newTableau[parseInt(to.split('-')[1])];
  };

  const sourcePile = getSourcePile();
  const destPile = getDestPile();
  const movedCards = sourcePile.splice(cardIndex);
  destPile.push(...movedCards);

  // Auto-flip top card of source tableau pile
  if (from.startsWith('tableau-')) {
    const tabIdx = parseInt(from.split('-')[1]);
    const pile = newTableau[tabIdx];
    if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
      pile[pile.length - 1] = { ...pile[pile.length - 1], faceUp: true };
    }
  }

  const score = state.score + calculateScore(from, to);

  const newState: GameState = {
    stock: newStock,
    waste: newWaste,
    foundations: newFoundations,
    tableau: newTableau,
    moves: state.moves + 1,
    score: Math.max(0, score),
    history,
    hasWon: false,
    selectedCard: null,
    // When playing from waste, shrink the fan; otherwise keep it
    wasteFanCount: from === 'waste'
      ? Math.max(1, state.wasteFanCount - 1)
      : state.wasteFanCount,
  };

  newState.hasWon = checkWin(newState);
  return newState;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return dealGame();

    case 'DRAW_STOCK': {
      const count = action.count ?? 1;
      const history = [...state.history, saveHistory(state)];

      if (state.stock.length > 0) {
        const newStock = cloneCards(state.stock);
        const newWaste = cloneCards(state.waste);
        const drawCount = Math.min(count, newStock.length);
        for (let i = 0; i < drawCount; i++) {
          const card = newStock.pop()!;
          card.faceUp = true;
          newWaste.push(card);
        }
        return {
          ...state,
          stock: newStock,
          waste: newWaste,
          history,
          selectedCard: null,
          wasteFanCount: drawCount,
        };
      }

      if (state.waste.length > 0) {
        const newStock = cloneCards(state.waste).reverse().map(c => ({ ...c, faceUp: false }));
        return {
          ...state,
          stock: newStock,
          waste: [],
          history,
          selectedCard: null,
          wasteFanCount: 0,
        };
      }

      return state;
    }

    case 'MOVE_CARDS':
      return applyMove(state, action.from, action.to, action.cardIndex);

    case 'UNDO': {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      return {
        ...prev,
        history: state.history.slice(0, -1),
        hasWon: false,
        selectedCard: null,
      };
    }

    case 'SELECT_CARD': {
      const { pileId, cardIndex } = action;

      if (state.selectedCard === null) {
        // First tap: select
        const pile = getPileCards(state, pileId);
        if (cardIndex >= 0 && cardIndex < pile.length && pile[cardIndex].faceUp) {
          return { ...state, selectedCard: { pileId, cardIndex } };
        }
        return state;
      }

      // Same card tapped: deselect
      if (state.selectedCard.pileId === pileId && state.selectedCard.cardIndex === cardIndex) {
        return { ...state, selectedCard: null };
      }

      // Different target: attempt move
      const from = state.selectedCard.pileId;
      const fromIndex = state.selectedCard.cardIndex;
      if (isValidMove(state, from, pileId, fromIndex)) {
        return applyMove(state, from, pileId, fromIndex);
      }

      // If clicking a different face-up card, select it instead
      const targetPile = getPileCards(state, pileId);
      if (cardIndex >= 0 && cardIndex < targetPile.length && targetPile[cardIndex].faceUp) {
        return { ...state, selectedCard: { pileId, cardIndex } };
      }

      return { ...state, selectedCard: null };
    }

    case 'CLEAR_SELECTION':
      return { ...state, selectedCard: null };

    default:
      return state;
  }
}

function loadSavedState(): GameState | null {
  try {
    // Try new key first, then migrate from old key
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(OLD_STORAGE_KEY);
      if (raw) {
        // Migrate: save under new key, remove old key
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(OLD_STORAGE_KEY);
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    // Basic validation: must have the expected shape
    if (
      !parsed.stock ||
      !parsed.foundations ||
      !parsed.tableau ||
      parsed.foundations.length !== 4 ||
      parsed.tableau.length !== 7
    ) {
      return null;
    }
    // Ensure transient UI state is clean on restore
    parsed.selectedCard = null;
    // Backfill for saves from before wasteFanCount existed
    if (parsed.wasteFanCount == null) parsed.wasteFanCount = 1;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, () => {
    const saved = loadSavedState();
    // If previous game was won, start fresh instead of showing win overlay
    if (saved?.hasWon) return dealGame();
    return saved ?? dealGame();
  });

  // Persist state to localStorage on every change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const newGame = useCallback(() => dispatch({ type: 'NEW_GAME' }), []);
  const drawStock = useCallback(
    (count: number = 1) => dispatch({ type: 'DRAW_STOCK', count }),
    []
  );
  const moveCards = useCallback(
    (from: PileId, to: PileId, cardIndex: number) =>
      dispatch({ type: 'MOVE_CARDS', from, to, cardIndex }),
    []
  );
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const selectCard = useCallback(
    (pileId: PileId, cardIndex: number) =>
      dispatch({ type: 'SELECT_CARD', pileId, cardIndex }),
    []
  );
  const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);

  return { state, newGame, drawStock, moveCards, undo, selectCard, clearSelection };
}
