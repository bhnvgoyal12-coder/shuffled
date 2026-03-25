import { useReducer, useCallback, useEffect } from 'react';
import type { Card, SpiderGameState, SpiderGameAction, SpiderPileId, SpiderHistoryEntry } from './types';
import { dealSpiderGame, isValidSpiderMove, checkCompletedRun, canDealStock, getPileCards } from './gameLogic';
import { useSettings } from '../../contexts/SettingsContext';

const STORAGE_KEY = 'shuffled-spider-state';

function cloneCards(cards: Card[]): Card[] {
  return cards.map(c => ({ ...c }));
}

function saveHistory(state: SpiderGameState): SpiderHistoryEntry {
  return {
    stock: cloneCards(state.stock),
    tableau: state.tableau.map(cloneCards),
    completedSuits: state.completedSuits,
    moves: state.moves,
    score: state.score,
  };
}

function applyMove(
  state: SpiderGameState,
  from: SpiderPileId,
  to: SpiderPileId,
  cardIndex: number
): SpiderGameState {
  if (!isValidSpiderMove(state, from, to, cardIndex)) return state;

  const history = [...state.history, saveHistory(state)];

  const newStock = cloneCards(state.stock);
  const newTableau = state.tableau.map(cloneCards);

  // Move cards
  const fromIdx = parseInt(from.split('-')[1]);
  const toIdx = parseInt(to.split('-')[1]);
  const movedCards = newTableau[fromIdx].splice(cardIndex);
  newTableau[toIdx].push(...movedCards);

  // Auto-flip top card of source
  const sourcePile = newTableau[fromIdx];
  if (sourcePile.length > 0 && !sourcePile[sourcePile.length - 1].faceUp) {
    sourcePile[sourcePile.length - 1] = { ...sourcePile[sourcePile.length - 1], faceUp: true };
  }

  let score = state.score - 1; // -1 per move
  let completedSuits = state.completedSuits;

  // Check for completed run on destination pile
  if (checkCompletedRun(newTableau[toIdx])) {
    newTableau[toIdx].splice(newTableau[toIdx].length - 13);
    completedSuits += 1;
    score += 100;

    // Auto-flip new top card of destination after removing completed run
    const destPile = newTableau[toIdx];
    if (destPile.length > 0 && !destPile[destPile.length - 1].faceUp) {
      destPile[destPile.length - 1] = { ...destPile[destPile.length - 1], faceUp: true };
    }
  }

  const hasWon = completedSuits === 8;

  return {
    stock: newStock,
    tableau: newTableau,
    completedSuits,
    moves: state.moves + 1,
    score: Math.max(0, score),
    history,
    hasWon,
    selectedCard: null,
  };
}

function dealStock(state: SpiderGameState): SpiderGameState {
  if (!canDealStock(state)) return state;

  const history = [...state.history, saveHistory(state)];
  const newStock = cloneCards(state.stock);
  const newTableau = state.tableau.map(cloneCards);

  // Deal 10 cards, one to each column
  for (let t = 0; t < 10; t++) {
    const card = newStock.pop()!;
    card.faceUp = true;
    newTableau[t].push(card);
  }

  let score = state.score;
  let completedSuits = state.completedSuits;

  // Check each column for completed runs after dealing
  for (let t = 0; t < 10; t++) {
    if (checkCompletedRun(newTableau[t])) {
      newTableau[t].splice(newTableau[t].length - 13);
      completedSuits += 1;
      score += 100;

      const pile = newTableau[t];
      if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
        pile[pile.length - 1] = { ...pile[pile.length - 1], faceUp: true };
      }
    }
  }

  return {
    stock: newStock,
    tableau: newTableau,
    completedSuits,
    moves: state.moves,
    score,
    history,
    hasWon: completedSuits === 8,
    selectedCard: null,
  };
}

export function gameReducer(state: SpiderGameState, action: SpiderGameAction): SpiderGameState {
  switch (action.type) {
    case 'NEW_GAME':
      return dealSpiderGame(action.suitCount);

    case 'DEAL_STOCK':
      return dealStock(state);

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
        const pile = getPileCards(state, pileId);
        if (cardIndex >= 0 && cardIndex < pile.length && pile[cardIndex].faceUp) {
          return { ...state, selectedCard: { pileId, cardIndex } };
        }
        return state;
      }

      if (state.selectedCard.pileId === pileId && state.selectedCard.cardIndex === cardIndex) {
        return { ...state, selectedCard: null };
      }

      const from = state.selectedCard.pileId;
      const fromIndex = state.selectedCard.cardIndex;
      if (isValidSpiderMove(state, from, pileId, fromIndex)) {
        return applyMove(state, from, pileId, fromIndex);
      }

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

function loadSavedState(): SpiderGameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpiderGameState;
    if (!parsed.tableau || parsed.tableau.length !== 10) return null;
    parsed.selectedCard = null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: SpiderGameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silently ignore
  }
}

export function useSpiderGameState() {
  const { settings } = useSettings();

  const [state, dispatch] = useReducer(gameReducer, null, () => {
    const saved = loadSavedState();
    if (saved?.hasWon) return dealSpiderGame(settings.spiderSuitCount);
    return saved ?? dealSpiderGame(settings.spiderSuitCount);
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const newGame = useCallback(
    () => dispatch({ type: 'NEW_GAME', suitCount: settings.spiderSuitCount }),
    [settings.spiderSuitCount]
  );
  const dealStockAction = useCallback(() => dispatch({ type: 'DEAL_STOCK' }), []);
  const moveCards = useCallback(
    (from: SpiderPileId, to: SpiderPileId, cardIndex: number) =>
      dispatch({ type: 'MOVE_CARDS', from, to, cardIndex }),
    []
  );
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const selectCard = useCallback(
    (pileId: SpiderPileId, cardIndex: number) =>
      dispatch({ type: 'SELECT_CARD', pileId, cardIndex }),
    []
  );

  return { state, newGame, dealStock: dealStockAction, moveCards, undo, selectCard };
}
