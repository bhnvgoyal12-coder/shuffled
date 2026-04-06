import { useReducer, useCallback, useEffect } from 'react';
import type { Card, FreeCellGameState, FreeCellGameAction, FreeCellPileId, FreeCellHistoryEntry } from './types';
import { dealFreeCellGame, isValidFreeCellMove, checkWin, calculateScore, getPileCards } from './gameLogic';

const STORAGE_KEY = 'shuffled-freecell-state';

function cloneCards(cards: Card[]): Card[] {
  return cards.map(c => ({ ...c }));
}

function saveHistory(state: FreeCellGameState): FreeCellHistoryEntry {
  return {
    freeCells: state.freeCells.map(c => c ? { ...c } : null),
    foundations: state.foundations.map(cloneCards),
    tableau: state.tableau.map(cloneCards),
    moves: state.moves,
    score: state.score,
  };
}

function applyMove(
  state: FreeCellGameState,
  from: FreeCellPileId,
  to: FreeCellPileId,
  cardIndex: number
): FreeCellGameState {
  if (!isValidFreeCellMove(state, from, to, cardIndex)) return state;

  const history = [...state.history, saveHistory(state)];

  const newFreeCells = state.freeCells.map(c => c ? { ...c } : null);
  const newFoundations = state.foundations.map(cloneCards);
  const newTableau = state.tableau.map(cloneCards);

  // Get source cards
  let movedCards: Card[];
  if (from.startsWith('freecell-')) {
    const idx = parseInt(from.split('-')[1]);
    movedCards = newFreeCells[idx] ? [newFreeCells[idx]!] : [];
    newFreeCells[idx] = null;
  } else if (from.startsWith('foundation-')) {
    const idx = parseInt(from.split('-')[1]);
    movedCards = newFoundations[idx].splice(cardIndex);
  } else {
    const idx = parseInt(from.split('-')[1]);
    movedCards = newTableau[idx].splice(cardIndex);
  }

  // Place in destination
  if (to.startsWith('freecell-')) {
    const idx = parseInt(to.split('-')[1]);
    newFreeCells[idx] = movedCards[0];
  } else if (to.startsWith('foundation-')) {
    const idx = parseInt(to.split('-')[1]);
    newFoundations[idx].push(...movedCards);
  } else {
    const idx = parseInt(to.split('-')[1]);
    newTableau[idx].push(...movedCards);
  }

  const score = state.score + calculateScore(to);

  const newState: FreeCellGameState = {
    freeCells: newFreeCells,
    foundations: newFoundations,
    tableau: newTableau,
    moves: state.moves + 1,
    score: Math.max(0, score),
    history,
    hasWon: false,
    selectedCard: null,
  };

  newState.hasWon = checkWin(newState);
  return newState;
}

export function gameReducer(state: FreeCellGameState, action: FreeCellGameAction): FreeCellGameState {
  switch (action.type) {
    case 'NEW_GAME':
      return dealFreeCellGame();

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
        if (cardIndex >= 0 && cardIndex < pile.length) {
          return { ...state, selectedCard: { pileId, cardIndex } };
        }
        return state;
      }

      if (state.selectedCard.pileId === pileId && state.selectedCard.cardIndex === cardIndex) {
        return { ...state, selectedCard: null };
      }

      // Attempt move
      const from = state.selectedCard.pileId;
      const fromIndex = state.selectedCard.cardIndex;
      if (isValidFreeCellMove(state, from, pileId, fromIndex)) {
        return applyMove(state, from, pileId, fromIndex);
      }

      // Re-select different card
      const targetPile = getPileCards(state, pileId);
      if (cardIndex >= 0 && cardIndex < targetPile.length) {
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

function loadSavedState(): FreeCellGameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FreeCellGameState;
    if (
      !parsed.freeCells ||
      !parsed.foundations ||
      !parsed.tableau ||
      parsed.freeCells.length !== 4 ||
      parsed.foundations.length !== 4 ||
      parsed.tableau.length !== 8
    ) {
      return null;
    }
    parsed.selectedCard = null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: FreeCellGameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silently ignore
  }
}

export function useFreeCellGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, () => {
    const saved = loadSavedState();
    if (saved?.hasWon) return dealFreeCellGame();
    return saved ?? dealFreeCellGame();
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const newGame = useCallback(() => dispatch({ type: 'NEW_GAME' }), []);
  const moveCards = useCallback(
    (from: FreeCellPileId, to: FreeCellPileId, cardIndex: number) =>
      dispatch({ type: 'MOVE_CARDS', from, to, cardIndex }),
    []
  );
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const selectCard = useCallback(
    (pileId: FreeCellPileId, cardIndex: number) =>
      dispatch({ type: 'SELECT_CARD', pileId, cardIndex }),
    []
  );

  const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);

  return { state, newGame, moveCards, undo, selectCard, clearSelection };
}
