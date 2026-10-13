import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useWordSearchGameState } from './useGameState';
import { useGridDrag } from './useGridDrag';
import { GridCell } from './GridCell';
import { getFoundColor } from './foundColors';
import { checkSelection } from './gameLogic';
import { WordList } from './WordList';
import { TopBar, TopBarStat } from '../../components/TopBar';
import { HowToPlayModal } from '../../components/HowToPlayModal';
import { SettingsModal } from '../../components/SettingsModal';
import { StatsModal } from '../../components/StatsModal';

import { useSettings } from '../../contexts/SettingsContext';
import { useGameTimer } from '../../hooks/useGameTimer';
import { useSound } from '../../hooks/useSound';
import { trackNewGame, trackGameWon, trackUndo, trackOpenSettings, trackOpenHelp, trackWordFound, trackLevelComplete, trackNextLevel } from '../../utils/analytics';
import { saveBestScore } from '../../utils/highScores';
import { recordGameStarted, recordGameWon } from '../../utils/gameStats';
import type { GridPosition } from './types';

const HINT_MS = 2500;

type OpenModal = 'settings' | 'help' | 'stats' | null;

interface WordSearchBoardProps {
  onGoHome?: () => void;
}

export function Board({ onGoHome }: WordSearchBoardProps) {
  const { state, newGame, selectWord, nextLevel, undo } = useWordSearchGameState();
  const { settings } = useSettings();
  const { play } = useSound();

  const [openModal, setOpenModal] = useState<OpenModal>(null);

  // Searching starts the moment the grid is shown; the clock stops while a menu is open
  const { elapsedSeconds, formattedTime } = useGameTimer({
    gameType: 'wordsearch',
    gameId: state.gameId,
    isRunning: !state.hasWon && openModal === null,
  });

  const hasStarted = state.foundWords.length > 0;
  useEffect(() => {
    if (hasStarted) recordGameStarted('wordsearch', state.gameId);
  }, [hasStarted, state.gameId]);

  const handleNewGame = useCallback(() => {
    trackNewGame('wordsearch');
    newGame();
  }, [newGame]);

  const handleUndo = useCallback(() => {
    if (state.history.length === 0) return;
    trackUndo('wordsearch');
    undo();
  }, [state.history.length, undo]);

  const { dragSelection, handlePointerDown, gridRef } = useGridDrag({
    rows: state.grid.rows,
    cols: state.grid.cols,
    onSelectionComplete: (positions: GridPosition[]) => {
      const word = checkSelection(state.grid, positions, state.foundWords);
      selectWord(positions);
      if (word) {
        trackWordFound(word, state.currentLevel);
        play('cardPlace');
      } else if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        // Not a word — a quick shake says "no"
        gridRef.current?.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-5px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(-2px)' },
            { transform: 'translateX(0)' },
          ],
          { duration: 240, easing: 'ease-in-out' },
        );
      }
    },
  });

  // Hint: point at the first letter of a word that hasn't been found yet
  const [hintState, setHintState] = useState<{ cell: string; foundWords: unknown } | null>(null);
  const hintCell = hintState && hintState.foundWords === state.foundWords ? hintState.cell : null;
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  const showHint = useCallback(() => {
    const remaining = state.grid.words.filter(w => !state.foundWords.includes(w.word));
    if (remaining.length === 0) return;
    const { start } = remaining[0];
    setHintState({ cell: `${start.row},${start.col}`, foundWords: state.foundWords });
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintState(null), HINT_MS);
  }, [state.grid.words, state.foundWords]);

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

  // Level complete: record it once, with confetti
  const recordedWin = useRef<string | null>(null);
  useEffect(() => {
    if (!state.hasWon) return;

    if (recordedWin.current !== state.gameId) {
      recordedWin.current = state.gameId;
      play('winCelebration');
      saveBestScore('wordsearch', { score: state.score, moves: state.moves, elapsedSeconds, date: Date.now() });
      trackGameWon('wordsearch', state.moves, elapsedSeconds, state.score, { level: state.currentLevel });
      recordGameWon('wordsearch', state.gameId, elapsedSeconds);
      trackLevelComplete(state.currentLevel, state.foundWords.length, state.score, elapsedSeconds);
    }

    confetti({ particleCount: 100, spread: 70, origin: { x: 0.2, y: 0.5 } });
    confetti({ particleCount: 100, spread: 70, origin: { x: 0.8, y: 0.5 } });
    const interval = setInterval(() => {
      confetti({ particleCount: 30, spread: 120, origin: { y: 0 }, startVelocity: 30, gravity: 1.2 });
    }, 250);
    const timeout = setTimeout(() => clearInterval(interval), 3000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
    // Runs once per completed level; the figures recorded are those at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hasWon, state.gameId]);

  const inProgress = !state.hasWon && (state.currentLevel > 1 || state.foundWords.length > 0);

  // Cells grow to fill the screen, however many rows and columns the level has
  const gridStyle = {
    '--ws-cell-size': `clamp(22px, min(calc((100vw - 24px) / ${state.grid.cols} - 3px), calc((100dvh - var(--topbar-height) - 140px) / ${state.grid.rows} - 3px)), 56px)`,
    gridTemplateColumns: `repeat(${state.grid.cols}, var(--ws-cell-size))`,
    gap: '3px',
    touchAction: 'none',
  } as React.CSSProperties;

  return (
    <div className="wordsearch-game flex-1 flex flex-col">
      <TopBar
        score={state.score}
        timerDisplay={settings.timerEnabled ? formattedTime : undefined}
        canAutoComplete={false}
        canUndo={state.history.length > 0 && !state.hasWon}
        confirmNewGame={inProgress}
        newGameWarning={
          state.currentLevel > 1
            ? `You'll go back to Level 1 and your score will reset.`
            : 'The words you have found will be cleared.'
        }
        onNewGame={handleNewGame}
        onUndo={handleUndo}
        onAutoComplete={() => {}}
        onHint={showHint}
        onOpenSettings={() => { trackOpenSettings('wordsearch'); setOpenModal('settings'); }}
        onOpenHelp={() => { trackOpenHelp('wordsearch'); setOpenModal('help'); }}
        onOpenStats={() => setOpenModal('stats')}
        onGoHome={onGoHome}
        extraInfo={
          <>
            <TopBarStat label="Level" value={state.currentLevel} />
            <TopBarStat label="Words" value={`${state.foundWords.length}/${state.grid.words.length}`} />
          </>
        }
      />

      {/* Grid */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: '0 12px' }}>
        <div ref={gridRef} className="grid select-none" style={gridStyle}>
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
                    isHinted={hintCell === key && !isFound}
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Level complete"
          className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[20000] animate-[fadeIn_0.5s_ease] backdrop-blur-[4px]"
        >
          <div
            className="win-card-bg rounded-[20px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[scaleIn_0.4s_ease]"
            style={{ padding: 'clamp(24px, 5vw, 40px) clamp(24px, 6vw, 56px)', maxWidth: '92vw' }}
          >
            <div
              className="font-[800] text-[#2e7d32] mb-1 tracking-tight"
              style={{ fontSize: 'clamp(24px, 6.5vw, 42px)', letterSpacing: '-0.5px' }}
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
                onClick={() => { trackNextLevel(state.currentLevel + 1); nextLevel(); }}
              >
                Next Level
              </button>
            </div>
          </div>
        </div>
      )}

      {openModal === 'settings' && (
        <SettingsModal gameType="wordsearch" onClose={() => setOpenModal(null)} onNewGame={() => { handleNewGame(); setOpenModal(null); }} />
      )}
      {openModal === 'help' && (
        <HowToPlayModal gameType="wordsearch" onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'stats' && (
        <StatsModal gameType="wordsearch" onClose={() => setOpenModal(null)} />
      )}
    </div>
  );
}
