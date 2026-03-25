import { useReducer, useCallback, useEffect } from 'react';
import type { WordSearchGameState, WordSearchAction, GridPosition } from './types';
import { generateGrid } from './gridGenerator';
import { getLevelConfig } from './levels';
import { checkSelection, scoreForWord, levelBonus, isLevelComplete } from './gameLogic';

const STORAGE_KEY = 'shuffled-wordsearch-state';

function createNewGame(level: number = 1, carryScore: number = 0): WordSearchGameState {
  const config = getLevelConfig(level);
  return {
    grid: generateGrid(config),
    currentLevel: level,
    foundWords: [],
    score: carryScore,
    moves: 0,
    hasWon: false,
    history: [],
  };
}

function gameReducer(state: WordSearchGameState, action: WordSearchAction): WordSearchGameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createNewGame();

    case 'SELECT_WORD': {
      const word = checkSelection(state.grid, action.positions, state.foundWords);
      const newMoves = state.moves + 1;

      if (!word) {
        return { ...state, moves: newMoves };
      }

      const newFoundWords = [...state.foundWords, word];
      const newScore = state.score + scoreForWord(word);
      const allFound = isLevelComplete(state.grid, newFoundWords);
      const finalScore = allFound ? newScore + levelBonus(state.currentLevel) : newScore;

      return {
        ...state,
        foundWords: newFoundWords,
        score: finalScore,
        moves: newMoves,
        hasWon: allFound,
        history: [...state.history, {
          foundWords: state.foundWords,
          score: state.score,
          moves: state.moves,
        }],
      };
    }

    case 'NEXT_LEVEL': {
      const nextLevel = state.currentLevel + 1;
      const config = getLevelConfig(nextLevel);
      return {
        grid: generateGrid(config),
        currentLevel: nextLevel,
        foundWords: [],
        score: state.score,
        moves: state.moves,
        hasWon: false,
        history: [],
      };
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      return {
        ...state,
        foundWords: prev.foundWords,
        score: prev.score,
        moves: prev.moves,
        hasWon: false,
        history: state.history.slice(0, -1),
      };
    }

    default:
      return state;
  }
}

function loadState(): WordSearchGameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as WordSearchGameState;
      // Validate basic structure
      if (parsed.grid && parsed.grid.cells && parsed.grid.words) {
        // If previous level was won, auto-advance to next level
        if (parsed.hasWon) {
          return createNewGame(parsed.currentLevel + 1, parsed.score);
        }
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return createNewGame();
}

export function useWordSearchGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, loadState);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [state]);

  const newGame = useCallback(() => dispatch({ type: 'NEW_GAME' }), []);
  const selectWord = useCallback((positions: GridPosition[]) =>
    dispatch({ type: 'SELECT_WORD', positions }), []);
  const nextLevel = useCallback(() => dispatch({ type: 'NEXT_LEVEL' }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);

  return { state, newGame, selectWord, nextLevel, undo };
}
