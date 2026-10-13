import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpiderPileId } from './types';
import { useSpiderGameState } from './useGameState';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useSound } from '../../hooks/useSound';
import { getValidSpiderDropTargets, getPileCards, canDealStock } from './gameLogic';
import { TopBar } from '../../components/TopBar';
import { SpiderStockPile } from './SpiderStockPile';
import { SpiderTableauPile } from './SpiderTableauPile';
import { CompletedSuitsDisplay } from './CompletedSuitsDisplay';
import { DragOverlay } from '../../components/DragOverlay';
import { WinOverlay } from '../../components/WinOverlay';
import { SettingsModal } from '../../components/SettingsModal';
import { HowToPlayModal } from '../../components/HowToPlayModal';


import { useSettings } from '../../contexts/SettingsContext';
import { useGameTimer } from '../../hooks/useGameTimer';
import { computeDisplayScore } from '../../utils/scoreDrain';
import { trackNewGame, trackGameWon, trackUndo, trackOpenSettings, trackOpenHelp } from '../../utils/analytics';
import { getBestScore, saveBestScore } from '../../utils/highScores';

interface SpiderBoardProps {
  onGoHome?: () => void;
}

export function Board({ onGoHome }: SpiderBoardProps) {
  const { state, newGame, dealStock, moveCards, undo, selectCard } = useSpiderGameState();
  const { settings } = useSettings();
  const { play } = useSound();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const hasStarted = state.moves > 0 || state.history.length > 0;
  const { elapsedSeconds, formattedTime } = useGameTimer({
    gameType: 'spider',
    gameId: state.gameId,
    isRunning: hasStarted && !state.hasWon && !settingsOpen && !helpOpen,
  });
  const displayScore = computeDisplayScore(state.score, elapsedSeconds, settings.timerEnabled);

  const handleNewGame = useCallback(() => {
    trackNewGame('spider');
    newGame();
  }, [newGame]);

  const {
    isDragging,
    dragCards,
    draggingCardIds,
    validTargets,
    overlayRef,
    initialPos,
    handlePointerDown,
  } = useDragAndDrop({
    state,
    moveCards: (from, to, cardIndex) => {
      moveCards(from as SpiderPileId, to as SpiderPileId, cardIndex);
      play('cardPlace');
    },
    getValidDropTargets: (s, from, idx) => getValidSpiderDropTargets(s, from as SpiderPileId, idx),
    getPile: (s, id) => getPileCards(s, id as SpiderPileId),
  });

  const canDeal = canDealStock(state);

  const handleDealStock = useCallback(() => {
    if (canDealStock(state)) {
      dealStock();
      play('stockClick');
    }
  }, [state, dealStock, play]);

  const handleCardClick = useCallback(
    (pileId: string, cardIndex: number) => {
      selectCard(pileId as SpiderPileId, cardIndex);
    },
    [selectCard]
  );

  const handlePileClick = useCallback(
    (pileId: string) => {
      if (state.selectedCard) {
        selectCard(pileId as SpiderPileId, 0);
      }
    },
    [state.selectedCard, selectCard]
  );

  // Win sound + analytics + high score
  const [bestBefore, setBestBefore] = useState(() => ({
    gameId: state.gameId,
    score: getBestScore('spider')?.score ?? null,
  }));
  if (bestBefore.gameId !== state.gameId) {
    setBestBefore({ gameId: state.gameId, score: getBestScore('spider')?.score ?? null });
  }
  const isNewBest = state.hasWon && (bestBefore.score === null || displayScore > bestBefore.score);

  const recordedWin = useRef<string | null>(null);
  useEffect(() => {
    if (!state.hasWon || recordedWin.current === state.gameId) return;
    recordedWin.current = state.gameId;
    play('winCelebration');
    trackGameWon('spider', state.moves, elapsedSeconds, state.score);
    saveBestScore('spider', {
      score: displayScore,
      moves: state.moves,
      elapsedSeconds,
      date: Date.now(),
    });
  }, [state.hasWon, state.gameId, play, state.moves, elapsedSeconds, state.score, displayScore]);

  const validTargetSet = new Set(validTargets);

  return (
    <div className="spider-game flex-1 flex flex-col w-full overflow-y-auto">
      <TopBar
        moves={state.moves}
        score={displayScore}
        timerDisplay={settings.timerEnabled ? formattedTime : undefined}
        canAutoComplete={false}
        onNewGame={handleNewGame}
        canUndo={state.history.length > 0 && !state.hasWon}
        confirmNewGame={hasStarted && !state.hasWon}
        onUndo={() => { trackUndo('spider'); undo(); }}
        onAutoComplete={() => {}}
        onOpenSettings={() => { trackOpenSettings('spider'); setSettingsOpen(true); }}
        onOpenHelp={() => { trackOpenHelp('spider'); setHelpOpen(true); }}
        onGoHome={onGoHome}
        layoutClass="topbar-layout-10"
        extraInfo={<CompletedSuitsDisplay completedSuits={state.completedSuits} />}
      />

      <div className="board-grid-10 mx-auto w-full justify-center">
        {/* Tableau: 10 columns */}
        {state.tableau.map((pile, i) => (
          <SpiderTableauPile
            key={i}
            index={i}
            cards={pile}
            selectedCard={state.selectedCard}
            isValidTarget={validTargetSet.has(`tableau-${i}`)}
            draggingCards={draggingCardIds}
            onPointerDown={handlePointerDown}
            onCardClick={handleCardClick}
            onPileClick={handlePileClick}
          />
        ))}
      </div>

      {/* Stock pile — right-aligned below the grid */}
      <div
        className="flex justify-end mt-2"
        style={{ padding: '0 var(--board-padding)' }}
      >
        <SpiderStockPile
          cards={state.stock}
          canDeal={canDeal}
          onDeal={handleDealStock}
        />
      </div>

      {isDragging && <DragOverlay cards={dragCards} overlayRef={overlayRef} initialPos={initialPos} />}

      {state.hasWon && (
        <WinOverlay moves={state.moves} score={displayScore} time={settings.timerEnabled ? formattedTime : undefined} isNewBest={isNewBest} onNewGame={handleNewGame} onGoHome={onGoHome} />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onNewGame={() => { handleNewGame(); setSettingsOpen(false); }}
          gameType="spider"
        />
      )}

      {helpOpen && (
        <HowToPlayModal gameType="spider" onClose={() => setHelpOpen(false)} />
      )}
    </div>
  );
}
