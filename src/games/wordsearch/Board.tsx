import { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { useWordSearchGameState } from './useGameState';
import { useGridDrag } from './useGridDrag';
import { GridCell, getFoundColor } from './GridCell';
import { WordList } from './WordList';
import { TopBar } from '../../components/TopBar';
import { HowToPlayModal } from '../../components/HowToPlayModal';
import { SettingsModal } from '../../components/SettingsModal';

import { useSettings } from '../../contexts/SettingsContext';
import { useGameTimer } from '../../hooks/useGameTimer';
import { useSound } from '../../hooks/useSound';
import { trackNewGame, trackGameWon, trackUndo, trackOpenSettings, trackOpenHelp, trackWordFound, trackLevelComplete, trackNextLevel } from '../../utils/analytics';
import { saveBestScore } from '../../utils/highScores';
import type { GridPosition } from './types';

interface WordSearchBoardProps {
  onGoHome?: () => void;
}

export function Board({ onGoHome }: WordSearchBoardProps) {
  const { state, newGame, selectWord, nextLevel, undo } = useWordSearchGameState();
  const { settings } = useSettings();
  const { play } = useSound();

  const { elapsedSeconds, resetTimer, formattedTime } = useGameTimer({
    gameType: 'wordsearch',
    isGameOver: state.hasWon,
    timerEnabled: settings.timerEnabled,
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleNewGame = useCallback(() => {
    trackNewGame('wordsearch');
    newGame();
    resetTimer();
  }, [newGame, resetTimer]);

  const handleUndo = useCallback(() => {
    trackUndo('wordsearch');
    undo();
  }, [undo]);

  const handleSelectionComplete = useCallback((positions: GridPosition[]) => {
    selectWord(positions);
    // Track word found if a new word was matched (foundWords will update on next render,
    // so we check by comparing with the grid words)
    const posKey = positions.map(p => `${p.row},${p.col}`).join('|');
    const matched = state.grid.words.find(w => {
      const fwd = w.positions.map(p => `${p.row},${p.col}`).join('|');
      const rev = [...w.positions].reverse().map(p => `${p.row},${p.col}`).join('|');
      return (posKey === fwd || posKey === rev) && !state.foundWords.includes(w.word);
    });
    if (matched) {
      trackWordFound(matched.word, state.currentLevel);
    }
    play('cardPlace');
  }, [selectWord, play, state.foundWords, state.grid.words, state.currentLevel]);

  const { dragSelection, handlePointerDown, gridRef } = useGridDrag({
    rows: state.grid.rows,
    cols: state.grid.cols,
    onSelectionComplete: handleSelectionComplete,
  });

  // Build set of dragged positions for fast lookup
  const dragSet = useMemo(() => {
    if (!dragSelection) return new Set<string>();
    return new Set(dragSelection.positions.map(p => `${p.row},${p.col}`));
  }, [dragSelection]);

  // Build map of found positions → color index
  const foundPositionMap = useMemo(() => {
    const map = new Map<string, number>();
    state.foundWords.forEach((word, foundIdx) => {
      const placed = state.grid.words.find(w => w.word === word);
      if (placed) {
        placed.positions.forEach(p => {
          map.set(`${p.row},${p.col}`, foundIdx);
        });
      }
    });
    return map;
  }, [state.foundWords, state.grid.words]);

  // Save best score on win
  const hasTrackedWin = useMemo(() => ({ current: false }), []);
  if (state.hasWon && !hasTrackedWin.current) {
    hasTrackedWin.current = true;
    saveBestScore('wordsearch', { score: state.score, moves: state.moves, elapsedSeconds, date: Date.now() });
    trackGameWon('wordsearch', state.moves, elapsedSeconds, state.score, { level: state.currentLevel });
    trackLevelComplete(state.currentLevel, state.foundWords.length, state.score, elapsedSeconds);
  }
  if (!state.hasWon) hasTrackedWin.current = false;

  // Confetti on level complete
  useEffect(() => {
    if (!state.hasWon) return;
    confetti({ particleCount: 100, spread: 70, origin: { x: 0.2, y: 0.5 } });
    confetti({ particleCount: 100, spread: 70, origin: { x: 0.8, y: 0.5 } });
    const interval = setInterval(() => {
      confetti({ particleCount: 30, spread: 120, origin: { y: 0 }, startVelocity: 30, gravity: 1.2 });
    }, 250);
    const timeout = setTimeout(() => clearInterval(interval), 3000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [state.hasWon]);

  const wordsRemaining = state.grid.words.length - state.foundWords.length;

  return (
    <div className="wordsearch-game flex-1 flex flex-col">
      <TopBar
        score={state.score}
        timerDisplay={settings.timerEnabled ? formattedTime : undefined}
        canAutoComplete={false}
        onNewGame={handleNewGame}
        onUndo={handleUndo}
        onAutoComplete={() => {}}
        onOpenSettings={() => { trackOpenSettings('wordsearch'); setSettingsOpen(true); }}
        onOpenHelp={() => { trackOpenHelp('wordsearch'); setHelpOpen(true); }}
        onGoHome={onGoHome}
        extraControls={
          <span
            className="text-white/70 font-semibold whitespace-nowrap"
            style={{ fontSize: 'clamp(11px, 2.5vw, 13px)' }}
          >
            Lv.{state.currentLevel}
          </span>
        }
      />

      {/* Grid */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: '0 clamp(8px, 2vw, 16px)' }}>
        <div
          ref={gridRef}
          className="grid select-none"
          style={{
            gridTemplateColumns: `repeat(${state.grid.cols}, var(--ws-cell-size))`,
            gap: 'clamp(2px, 0.5vw, 4px)',
            touchAction: 'none',
          }}
        >
          {state.grid.cells.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r},${c}`;
              const foundIdx = foundPositionMap.get(key);
              const isFound = foundIdx !== undefined;
              const isInDrag = dragSet.has(key);

              return (
                <div
                  key={key}
                  style={isFound ? { '--ws-found-color': getFoundColor(foundIdx) } as React.CSSProperties : undefined}
                >
                  <GridCell
                    letter={letter}
                    row={r}
                    col={c}
                    isInDragSelection={isInDrag}
                    isFound={isFound}
                    onPointerDown={handlePointerDown}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Word List */}
        <WordList words={state.grid.words} foundWords={state.foundWords} />
      </div>

      {/* Win Overlay — with Next Level */}
      {state.hasWon && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[20000] animate-[fadeIn_0.5s_ease] backdrop-blur-[4px]">
          <div
            className="win-card-bg rounded-[20px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[scaleIn_0.4s_ease]"
            style={{ padding: 'clamp(24px, 5vw, 40px) clamp(32px, 7vw, 56px)' }}
          >
            <div
              className="font-[800] text-[#2e7d32] mb-1 tracking-tight"
              style={{ fontSize: 'clamp(28px, 7vw, 42px)', letterSpacing: '-0.5px' }}
            >
              Level {state.currentLevel} Complete!
            </div>
            <div
              className="text-[#666] mb-4"
              style={{ fontSize: 'clamp(13px, 3vw, 16px)' }}
            >
              All {state.grid.words.length} words found
            </div>
            <div
              className="flex gap-6 justify-center mb-6 text-[#666]"
              style={{ fontSize: 'clamp(14px, 3vw, 16px)' }}
            >
              <div>
                <span>Score</span>
                <span className="font-bold text-[#333] block mt-1" style={{ fontSize: 'clamp(20px, 4vw, 24px)' }}>
                  {state.score}
                </span>
              </div>
              <div>
                <span>Moves</span>
                <span className="font-bold text-[#333] block mt-1" style={{ fontSize: 'clamp(20px, 4vw, 24px)' }}>
                  {state.moves}
                </span>
              </div>
              {settings.timerEnabled && (
                <div>
                  <span>Time</span>
                  <span className="font-bold text-[#333] block mt-1 tabular-nums" style={{ fontSize: 'clamp(20px, 4vw, 24px)' }}>
                    {formattedTime}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              {onGoHome && (
                <button
                  className="bg-[#e0e0e0] text-[#555] border-none rounded-xl p-3.5 cursor-pointer transition-[background,transform] duration-200 hover:bg-[#d0d0d0] active:scale-[0.96]"
                  onClick={onGoHome}
                  aria-label="Go home"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12l9-9 9 9" />
                    <path d="M9 21V12h6v9" />
                  </svg>
                </button>
              )}
              <button
                className="bg-[#2e7d32] text-white border-none rounded-xl px-9 py-3.5 text-base font-semibold cursor-pointer transition-[background,transform] duration-200 hover:bg-[#388e3c] active:scale-[0.96]"
                onClick={() => { trackNextLevel(state.currentLevel + 1); nextLevel(); resetTimer(); }}
              >
                Next Level
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsModal gameType="wordsearch" onClose={() => setSettingsOpen(false)} onNewGame={() => { handleNewGame(); setSettingsOpen(false); }} />
      )}
      {helpOpen && (
        <HowToPlayModal gameType="wordsearch" onClose={() => setHelpOpen(false)} />
      )}
    </div>
  );
}
