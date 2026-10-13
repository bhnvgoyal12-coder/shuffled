import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMahjongGameState } from './useGameState';
import { useSound } from '../../hooks/useSound';
import { getFreeTiles, getHint, tilesMatch } from './gameLogic';
import type { PlacedTile } from './types';
import { BOARD_COLS, BOARD_ROWS } from './constants';
import { MahjongTileComponent } from './MahjongTile';
import { TopBar, TopBarButton, TopBarStat } from '../../components/TopBar';
import { WinOverlay } from '../../components/WinOverlay';
import { SettingsModal } from '../../components/SettingsModal';
import { HowToPlayModal } from '../../components/HowToPlayModal';
import { StatsModal } from '../../components/StatsModal';

import { useSettings } from '../../contexts/SettingsContext';
import { useGameTimer } from '../../hooks/useGameTimer';
import { computeDisplayScore } from '../../utils/scoreDrain';
import { trackNewGame, trackGameWon, trackGameLost, trackUndo, trackHint, trackShuffle, trackOpenSettings, trackOpenHelp } from '../../utils/analytics';
import { getBestScore, saveBestScore } from '../../utils/highScores';
import { recordGameStarted, recordGameWon, recordGameLost } from '../../utils/gameStats';

const HINT_MS = 2500;
const LEAVE_MS = 320;

type OpenModal = 'settings' | 'help' | 'stats' | null;

interface MahjongBoardProps {
  onGoHome?: () => void;
}

export function Board({ onGoHome }: MahjongBoardProps) {
  const { state, newGame, selectTile, shuffle, undo } = useMahjongGameState();
  const { settings } = useSettings();
  const { play } = useSound();

  const [openModal, setOpenModal] = useState<OpenModal>(null);

  // The clock starts with the first pair, and stops while a menu is open
  const hasStarted = state.moves > 0 || state.history.length > 0;
  const isOver = state.hasWon || state.hasLost;
  const { elapsedSeconds, formattedTime } = useGameTimer({
    gameType: 'mahjong',
    gameId: state.gameId,
    isRunning: hasStarted && !isOver && openModal === null,
  });
  const displayScore = computeDisplayScore(state.score, elapsedSeconds, settings.timerEnabled);

  useEffect(() => {
    if (hasStarted) recordGameStarted('mahjong', state.gameId);
  }, [hasStarted, state.gameId]);

  const handleNewGame = useCallback(() => {
    trackNewGame('mahjong');
    newGame();
  }, [newGame]);

  // Compute free tiles for visual state
  const freeTileIds = useMemo(
    () => new Set(getFreeTiles(state.tiles).map(t => t.tile.id)),
    [state.tiles]
  );

  // A matched pair lingers for a moment so it can be seen leaving the board
  const [leaving, setLeaving] = useState<PlacedTile[]>([]);
  const leavingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (leavingTimer.current) clearTimeout(leavingTimer.current); }, []);

  const handleTileClick = useCallback(
    (tileId: string) => {
      if (!freeTileIds.has(tileId)) return;

      const selectedId = state.selectedTile?.tileId;
      const first = selectedId ? state.tiles.find(t => t.tile.id === selectedId) : undefined;
      const second = state.tiles.find(t => t.tile.id === tileId);
      if (first && second && tilesMatch(first.tile, second.tile)) {
        setLeaving([first, second]);
        if (leavingTimer.current) clearTimeout(leavingTimer.current);
        leavingTimer.current = setTimeout(() => setLeaving([]), LEAVE_MS);
        play('stockClick');
      } else {
        play('cardPlace');
      }
      selectTile(tileId);
    },
    [freeTileIds, selectTile, play, state.selectedTile, state.tiles]
  );

  // Hint — remembered with the board it was computed for, so it clears when tiles change
  const [hintState, setHintState] = useState<{ pair: [string, string]; tiles: unknown } | null>(null);
  const hintPair = hintState && hintState.tiles === state.tiles ? hintState.pair : null;
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  const handleHint = useCallback(() => {
    trackHint();
    const pair = getHint(state.tiles);
    if (!pair) return;
    setHintState({ pair, tiles: state.tiles });
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintState(null), HINT_MS);
  }, [state.tiles]);

  const handleShuffle = useCallback(() => {
    trackShuffle();
    shuffle();
    play('stockClick');
  }, [shuffle, play]);

  const handleUndo = useCallback(() => {
    if (state.history.length === 0) return;
    trackUndo('mahjong');
    undo();
  }, [state.history.length, undo]);

  // Board size in half-tile units — at least the standard layout, larger if a saved game needs it
  const boardSize = useMemo(() => {
    let cols = BOARD_COLS;
    let rows = BOARD_ROWS;
    for (const t of state.tiles) {
      cols = Math.max(cols, t.position.col + 2);
      rows = Math.max(rows, t.position.row + 2);
    }
    return { cols, rows };
  }, [state.tiles]);

  // Winning / losing
  const [bestBefore, setBestBefore] = useState(() => ({
    gameId: state.gameId,
    score: getBestScore('mahjong')?.score ?? null,
  }));
  if (bestBefore.gameId !== state.gameId) {
    setBestBefore({ gameId: state.gameId, score: getBestScore('mahjong')?.score ?? null });
  }
  const isNewBest = state.hasWon && (bestBefore.score === null || displayScore > bestBefore.score);

  const recordedWin = useRef<string | null>(null);
  useEffect(() => {
    if (!state.hasWon || recordedWin.current === state.gameId) return;
    recordedWin.current = state.gameId;
    play('winCelebration');
    trackGameWon('mahjong', state.moves, elapsedSeconds, state.score);
    recordGameWon('mahjong', state.gameId, elapsedSeconds);
    saveBestScore('mahjong', {
      score: displayScore,
      moves: state.moves,
      elapsedSeconds,
      date: Date.now(),
    });
  }, [state.hasWon, state.gameId, play, state.moves, elapsedSeconds, state.score, displayScore]);

  const isStuck = state.hasLost && !state.hasWon;
  useEffect(() => {
    if (!isStuck) return;
    trackGameLost('mahjong', state.moves);
    recordGameLost('mahjong');
    // Only the transition into a dead end is recorded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStuck]);

  const pairsLeft = Math.floor(state.tiles.length / 2);

  return (
    <div className="mahjong-game screen-enter flex-1 flex flex-col w-full overflow-hidden">
      <TopBar
        score={displayScore}
        timerDisplay={settings.timerEnabled ? formattedTime : undefined}
        canAutoComplete={false}
        canUndo={state.history.length > 0 && !state.hasWon}
        confirmNewGame={hasStarted && !isOver}
        newGameWarning="Your current game will be abandoned and count as a loss."
        onNewGame={handleNewGame}
        onUndo={handleUndo}
        onAutoComplete={() => {}}
        onHint={handleHint}
        onOpenSettings={() => { trackOpenSettings('mahjong'); setOpenModal('settings'); }}
        onOpenHelp={() => { trackOpenHelp('mahjong'); setOpenModal('help'); }}
        onOpenStats={() => setOpenModal('stats')}
        onGoHome={onGoHome}
        extraActions={
          <TopBarButton onClick={handleShuffle} label="Shuffle" title="Shuffle the remaining tiles (-50 points)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 3h5v5" />
              <path d="M4 20 21 3" />
              <path d="M21 16v5h-5" />
              <path d="m15 15 6 6" />
              <path d="m4 4 5 5" />
            </svg>
          </TopBarButton>
        }
        extraInfo={<TopBarStat label="Pairs" value={pairsLeft} />}
      />

      {/* Board area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ padding: 'clamp(4px, 1vw, 12px)' }}>
        {/* Keyed by deal so a new board builds itself up layer by layer */}
        <div
          key={state.gameId}
          className="relative shrink-0"
          style={{
            width: `calc(${boardSize.cols} * var(--mahjong-tile-width) / 2 + 6 * var(--mahjong-depth))`,
            height: `calc(${boardSize.rows} * var(--mahjong-tile-height) / 2 + 6 * var(--mahjong-depth))`,
          }}
        >
          {state.tiles.map((placed) => (
            <MahjongTileComponent
              key={placed.tile.id}
              placed={placed}
              isFree={freeTileIds.has(placed.tile.id)}
              isSelected={state.selectedTile?.tileId === placed.tile.id}
              isHinted={hintPair ? hintPair.includes(placed.tile.id) : false}
              onClick={handleTileClick}
            />
          ))}
          {leaving
            .filter(placed => !state.tiles.some(t => t.tile.id === placed.tile.id))
            .map((placed) => (
              <MahjongTileComponent
                key={`leaving-${placed.tile.id}`}
                placed={placed}
                isFree
                isSelected={false}
                isHinted={false}
                isLeaving
                onClick={handleTileClick}
              />
            ))}
        </div>
      </div>

      {/* No more moves overlay */}
      {isStuck && openModal === null && (
        <div role="dialog" aria-modal="true" aria-label="No more moves" className="sheet-backdrop sheet-backdrop--dialog">
          <div className="sheet-panel">
            <h2 className="sheet-title mb-2">No moves left</h2>
            <p className="m-0 mb-6 leading-snug text-[var(--text-soft)]" style={{ fontSize: 15 }}>
              No free tiles match. Shuffle what's left for 50 points, take a move back, or start over.
            </p>
            <div className="flex flex-col gap-3">
              <button className="btn btn-primary" onClick={handleShuffle}>
                Shuffle tiles
              </button>
              <div className="flex gap-3">
                <button className="btn btn-quiet flex-1" onClick={handleUndo} disabled={state.history.length === 0}>
                  Undo
                </button>
                <button className="btn btn-quiet flex-1" onClick={handleNewGame}>
                  New game
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.hasWon && (
        <WinOverlay
          score={displayScore}
          time={settings.timerEnabled ? formattedTime : undefined}
          isNewBest={isNewBest}
          onNewGame={handleNewGame}
          onGoHome={onGoHome}
        />
      )}

      {openModal === 'settings' && (
        <SettingsModal
          onClose={() => setOpenModal(null)}
          onNewGame={() => { handleNewGame(); setOpenModal(null); }}
          gameType="mahjong"
        />
      )}

      {openModal === 'help' && (
        <HowToPlayModal gameType="mahjong" onClose={() => setOpenModal(null)} />
      )}

      {openModal === 'stats' && (
        <StatsModal gameType="mahjong" onClose={() => setOpenModal(null)} />
      )}
    </div>
  );
}
