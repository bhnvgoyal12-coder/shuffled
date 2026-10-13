import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWordSearchGameState } from './useGameState';
import { useGridDrag } from './useGridDrag';
import { GridCell } from './GridCell';
import { getFoundColor } from './foundColors';
import { checkSelection } from './gameLogic';
import { WordList } from './WordList';
import { TopBar, TopBarStat } from '../../components/TopBar';
import { WinOverlay } from '../../components/WinOverlay';
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

  // Found cells → which word (for its colour) and where in the word (for the sweep)
  const foundPositionMap = useMemo(() => {
    const map = new Map<string, { wordIndex: number; order: number }>();
    state.foundWords.forEach((word, wordIndex) => {
      const placed = state.grid.words.find(w => w.word === word);
      placed?.positions.forEach((p, order) => {
        map.set(`${p.row},${p.col}`, { wordIndex, order });
      });
    });
    return map;
  }, [state.foundWords, state.grid.words]);

  // Level complete: record it once
  const recordedWin = useRef<string | null>(null);
  useEffect(() => {
    if (!state.hasWon || recordedWin.current === state.gameId) return;
    recordedWin.current = state.gameId;
    play('winCelebration');
    saveBestScore('wordsearch', { score: state.score, moves: state.moves, elapsedSeconds, date: Date.now() });
    trackGameWon('wordsearch', state.moves, elapsedSeconds, state.score, { level: state.currentLevel });
    recordGameWon('wordsearch', state.gameId, elapsedSeconds);
    trackLevelComplete(state.currentLevel, state.foundWords.length, state.score, elapsedSeconds);
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
    <div className="wordsearch-game screen-enter flex-1 flex flex-col">
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
        {/* Keyed by level so each new grid ripples in */}
        <div key={state.gameId} ref={gridRef} className="grid select-none" style={gridStyle}>
          {state.grid.cells.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r},${c}`;
              const found = foundPositionMap.get(key);

              return (
                <div
                  key={key}
                  style={found ? { '--ws-found-color': getFoundColor(found.wordIndex) } as React.CSSProperties : undefined}
                >
                  <GridCell
                    letter={letter}
                    row={r}
                    col={c}
                    isInDragSelection={dragSet.has(key)}
                    isFound={found !== undefined}
                    foundOrder={found?.order}
                    isHinted={hintCell === key && !found}
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

      {state.hasWon && (
        <WinOverlay
          title={`Level ${state.currentLevel} complete`}
          subtitle={`All ${state.grid.words.length} words found`}
          score={state.score}
          time={settings.timerEnabled ? formattedTime : undefined}
          actionLabel="Next level"
          onNewGame={() => { trackNextLevel(state.currentLevel + 1); nextLevel(); }}
          onGoHome={onGoHome}
        />
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
