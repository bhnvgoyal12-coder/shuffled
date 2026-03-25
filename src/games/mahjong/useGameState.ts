import { useReducer, useCallback, useEffect } from 'react';
import type { MahjongGameState, MahjongGameAction } from './types';
import {
  dealGame,
  isTileFreeFast,
  tilesMatch,
  removePair,
  shuffleRemainingTiles,
  getHint,
} from './gameLogic';

const STORAGE_KEY = 'shuffled-mahjong-state';

function gameReducer(state: MahjongGameState, action: MahjongGameAction): MahjongGameState {
  switch (action.type) {
    case 'NEW_GAME':
      return dealGame();

    case 'SELECT_TILE': {
      const { tileId } = action;
      const clicked = state.tiles.find(t => t.tile.id === tileId);
      if (!clicked) return state;

      // Must be a free tile
      if (!isTileFreeFast(clicked, state.tiles)) return state;

      // No tile selected yet: select this one
      if (!state.selectedTile) {
        return { ...state, selectedTile: { tileId } };
      }

      // Same tile: deselect
      if (state.selectedTile.tileId === tileId) {
        return { ...state, selectedTile: null };
      }

      // Different tile: check match
      const first = state.tiles.find(t => t.tile.id === state.selectedTile!.tileId);
      if (first && tilesMatch(first.tile, clicked.tile)) {
        return removePair(state, first.tile.id, clicked.tile.id);
      }

      // No match: select the new tile instead
      return { ...state, selectedTile: { tileId } };
    }

    case 'SHUFFLE':
      return shuffleRemainingTiles(state);

    case 'UNDO': {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      return {
        tiles: prev.tiles,
        removedPairs: prev.removedPairs,
        moves: prev.moves,
        score: prev.score,
        history: state.history.slice(0, -1),
        hasWon: false,
        hasLost: false,
        selectedTile: null,
      };
    }

    case 'CLEAR_SELECTION':
      return { ...state, selectedTile: null };

    default:
      return state;
  }
}

function loadSavedState(): MahjongGameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MahjongGameState;
    if (!parsed.tiles || !Array.isArray(parsed.tiles)) return null;
    parsed.selectedTile = null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: MahjongGameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silently ignore
  }
}

export function useMahjongGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, () => {
    const saved = loadSavedState();
    if (saved?.hasWon) return dealGame();
    return saved ?? dealGame();
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const newGame = useCallback(() => dispatch({ type: 'NEW_GAME' }), []);
  const selectTile = useCallback(
    (tileId: string) => dispatch({ type: 'SELECT_TILE', tileId }),
    []
  );
  const shuffle = useCallback(() => dispatch({ type: 'SHUFFLE' }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const hint = useCallback(() => getHint(state.tiles), [state.tiles]);

  return { state, newGame, selectTile, shuffle, undo, hint };
}
