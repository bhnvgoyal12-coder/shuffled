import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMahjongGameState } from './useGameState';
import { useSound } from '../../hooks/useSound';
import { getFreeTiles, getHint } from './gameLogic';
import { MahjongTileComponent } from './MahjongTile';
import { TopBar } from '../../components/TopBar';
import { WinOverlay } from '../../components/WinOverlay';
import { SettingsModal } from '../../components/SettingsModal';
import { HowToPlayModal } from '../../components/HowToPlayModal';
import { AdBanner } from '../../components/AdBanner';
import { useInterstitialAd } from '../../components/AdInterstitial';
import { AD_ENABLED } from '../../utils/adConfig';
import { useSettings } from '../../contexts/SettingsContext';
import { useGameTimer } from '../../hooks/useGameTimer';
import { computeDisplayScore } from '../../utils/scoreDrain';
import { trackNewGame, trackGameWon, trackGameLost, trackUndo, trackHint, trackShuffle, trackOpenSettings, trackOpenHelp } from '../../utils/analytics';

interface MahjongBoardProps {
  onGoHome?: () => void;
}

export function Board({ onGoHome }: MahjongBoardProps) {
  const { state, newGame, selectTile, shuffle, undo } = useMahjongGameState();
  const { settings } = useSettings();
  const { play } = useSound();
  const { maybeShowInterstitial } = useInterstitialAd();
  const { elapsedSeconds, resetTimer, formattedTime } = useGameTimer({
    gameType: 'mahjong',
    isGameOver: state.hasWon || state.hasLost,
    timerEnabled: settings.timerEnabled,
  });
  const displayScore = computeDisplayScore(state.score, elapsedSeconds, settings.timerEnabled);

  const newGameWithAd = useCallback(() => {
    trackNewGame('mahjong');
    maybeShowInterstitial();
    newGame();
    resetTimer();
  }, [maybeShowInterstitial, newGame, resetTimer]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [hintPair, setHintPair] = useState<[string, string] | null>(null);

  // Compute free tiles for visual state
  const freeTileIds = useMemo(
    () => new Set(getFreeTiles(state.tiles).map(t => t.tile.id)),
    [state.tiles]
  );

  const handleTileClick = useCallback(
    (tileId: string) => {
      if (!freeTileIds.has(tileId)) return;
      selectTile(tileId);
      play('cardPlace');
    },
    [freeTileIds, selectTile, play]
  );

  const handleHint = useCallback(() => {
    trackHint();
    const pair = getHint(state.tiles);
    if (pair) {
      setHintPair(pair);
      setTimeout(() => setHintPair(null), 2000);
    }
  }, [state.tiles]);

  const handleShuffle = useCallback(() => {
    trackShuffle();
    shuffle();
    play('stockClick');
  }, [shuffle, play]);

  // Board dimensions from layout
  const boardDimensions = useMemo(() => {
    if (state.tiles.length === 0) return { cols: 0, rows: 0 };
    const maxCol = Math.max(...state.tiles.map(t => t.position.col)) + 2;
    const maxRow = Math.max(...state.tiles.map(t => t.position.row)) + 2;
    return { cols: maxCol, rows: maxRow };
  }, [state.tiles]);

  // Win sound + analytics
  const prevWon = useRef(false);
  const prevLost = useRef(false);
  useEffect(() => {
    if (state.hasWon && !prevWon.current) {
      play('winCelebration');
      trackGameWon('mahjong', state.moves, elapsedSeconds, state.score);
    }
    if (state.hasLost && !state.hasWon && !prevLost.current) {
      trackGameLost('mahjong', state.moves);
    }
    prevWon.current = state.hasWon;
    prevLost.current = state.hasLost;
  }, [state.hasWon, state.hasLost, play, state.moves, elapsedSeconds, state.score]);

  const tileCount = state.tiles.length;
  const pairsLeft = Math.floor(tileCount / 2);

  return (
    <div
      className="mahjong-game flex-1 flex flex-col w-full overflow-auto"
      style={{ paddingBottom: AD_ENABLED ? 'var(--ad-banner-height, 50px)' : undefined }}
    >
      <TopBar
        moves={state.moves}
        score={displayScore}
        timerDisplay={settings.timerEnabled ? formattedTime : undefined}
        canAutoComplete={false}
        onNewGame={newGameWithAd}
        onUndo={() => { trackUndo('mahjong'); undo(); }}
        onAutoComplete={() => {}}
        onOpenSettings={() => { trackOpenSettings('mahjong'); setSettingsOpen(true); }}
        onOpenHelp={() => { trackOpenHelp('mahjong'); setHelpOpen(true); }}
        onGoHome={onGoHome}
        extraControls={
          <div className="flex items-center gap-1.5">
            <button
              className="bg-white/12 text-white border border-white/18 rounded-lg cursor-pointer backdrop-blur-[4px] transition-[background,transform] hover:bg-white/22 active:scale-[0.96]"
              style={{
                padding: 'clamp(3px, 0.8vw, 6px) clamp(6px, 1.5vw, 10px)',
                fontSize: 'clamp(10px, 2.2vw, 12px)',
              }}
              onClick={handleHint}
            >
              Hint
            </button>
            <button
              className="bg-white/12 text-white border border-white/18 rounded-lg cursor-pointer backdrop-blur-[4px] transition-[background,transform] hover:bg-white/22 active:scale-[0.96]"
              style={{
                padding: 'clamp(3px, 0.8vw, 6px) clamp(6px, 1.5vw, 10px)',
                fontSize: 'clamp(10px, 2.2vw, 12px)',
              }}
              onClick={handleShuffle}
            >
              Shuffle
            </button>
            <span
              className="text-white/60 whitespace-nowrap"
              style={{ fontSize: 'clamp(10px, 2.2vw, 12px)' }}
            >
              {pairsLeft} pairs
            </span>
          </div>
        }
      />

      {/* Board area */}
      <div className="flex-1 flex items-start justify-center overflow-auto" style={{ padding: 'clamp(4px, 1vw, 12px)' }}>
        <div
          className="relative"
          style={{
            width: `calc(${boardDimensions.cols} * var(--mahjong-tile-width) / 2 + 10px)`,
            height: `calc(${boardDimensions.rows} * var(--mahjong-tile-height) / 2 + 10px)`,
            minWidth: `calc(${boardDimensions.cols} * var(--mahjong-tile-width) / 2 + 10px)`,
          }}
        >
          {state.tiles.map((placed) => (
            <MahjongTileComponent
              key={placed.tile.id}
              placed={placed}
              isFree={freeTileIds.has(placed.tile.id)}
              isSelected={state.selectedTile?.tileId === placed.tile.id}
              isHinted={hintPair ? hintPair.includes(placed.tile.id) : false}
              onClick={() => handleTileClick(placed.tile.id)}
            />
          ))}
        </div>
      </div>

      {/* No more moves overlay */}
      {state.hasLost && !state.hasWon && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[20000] animate-[fadeIn_0.3s_ease] backdrop-blur-[4px]">
          <div
            className="win-card-bg rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[scaleIn_0.3s_ease] text-center"
            style={{ padding: 'clamp(24px, 5vw, 40px)', width: 'clamp(260px, 75vw, 340px)' }}
          >
            <h2
              className="font-bold text-[#c62828] m-0 mb-3"
              style={{ fontSize: 'clamp(20px, 5vw, 28px)' }}
            >
              No More Moves
            </h2>
            <p
              className="text-[#666] m-0 mb-5"
              style={{ fontSize: 'clamp(12px, 3vw, 15px)' }}
            >
              Try shuffling the remaining tiles or start a new game.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                className="bg-[#2e7d32] text-white font-semibold border-none rounded-full cursor-pointer transition-[background,transform] hover:bg-[#1b5e20] active:scale-[0.96]"
                style={{
                  padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
                  fontSize: 'clamp(13px, 3vw, 16px)',
                }}
                onClick={handleShuffle}
              >
                Shuffle
              </button>
              <button
                className="bg-[#e8e8e8] text-[#333] font-semibold border-none rounded-full cursor-pointer transition-[background,transform] hover:bg-[#ddd] active:scale-[0.96]"
                style={{
                  padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
                  fontSize: 'clamp(13px, 3vw, 16px)',
                }}
                onClick={newGameWithAd}
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      <AdBanner />

      {state.hasWon && (
        <WinOverlay moves={state.moves} score={displayScore} time={settings.timerEnabled ? formattedTime : undefined} onNewGame={newGameWithAd} />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onNewGame={() => { newGameWithAd(); setSettingsOpen(false); }}
          gameType="mahjong"
        />
      )}

      {helpOpen && (
        <HowToPlayModal gameType="mahjong" onClose={() => setHelpOpen(false)} />
      )}
    </div>
  );
}
