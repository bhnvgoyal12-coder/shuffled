import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpiderPileId } from './types';
import { useSpiderGameState } from './useGameState';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useSound } from '../../hooks/useSound';
import { getValidSpiderDropTargets, getPileCards, canDealStock } from './gameLogic';
import { SUIT_SYMBOLS } from '../../constants';
import { TopBar } from '../../components/TopBar';
import { SpiderStockPile } from './SpiderStockPile';
import { SpiderTableauPile } from './SpiderTableauPile';
import { CompletedSuitsDisplay } from './CompletedSuitsDisplay';
import { WinOverlay } from '../../components/WinOverlay';
import { SettingsModal } from '../../components/SettingsModal';
import { HowToPlayModal } from '../../components/HowToPlayModal';


import { useSettings } from '../../contexts/SettingsContext';
import { useGameTimer } from '../../hooks/useGameTimer';
import { computeDisplayScore } from '../../utils/scoreDrain';
import { trackNewGame, trackGameWon, trackUndo, trackOpenSettings, trackOpenHelp } from '../../utils/analytics';
import { saveBestScore } from '../../utils/highScores';

interface SpiderBoardProps {
  onGoHome?: () => void;
}

export function Board({ onGoHome }: SpiderBoardProps) {
  const { state, newGame, dealStock, moveCards, undo, selectCard } = useSpiderGameState();
  const { settings } = useSettings();
  const { play } = useSound();

  const { elapsedSeconds, resetTimer, formattedTime } = useGameTimer({
    gameType: 'spider',
    isGameOver: state.hasWon,
    timerEnabled: settings.timerEnabled,
  });
  const displayScore = computeDisplayScore(state.score, elapsedSeconds, settings.timerEnabled);

  const handleNewGame = useCallback(() => {
    trackNewGame('spider');
    newGame();
    resetTimer();
  }, [newGame, resetTimer]);

  const moveCardsWithSound = useCallback(
    (from: string, to: string, cardIndex: number) => {
      moveCards(from as SpiderPileId, to as SpiderPileId, cardIndex);
      play('cardPlace');
    },
    [moveCards, play]
  );

  const {
    isDragging,
    dragCards,
    draggingCardIds,
    validTargets,
    overlayRef,
    initialPos,
    handlePointerDown,
  } = useDragAndDrop(
    state,
    moveCardsWithSound,
    (s, from, idx) => getValidSpiderDropTargets(s, from as SpiderPileId, idx),
    (s, id) => getPileCards(s, id as SpiderPileId),
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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
  const prevWon = useRef(false);
  const [isNewBest, setIsNewBest] = useState(false);
  useEffect(() => {
    if (state.hasWon && !prevWon.current) {
      play('winCelebration');
      trackGameWon('spider', state.moves, elapsedSeconds, state.score);
      const newBest = saveBestScore('spider', {
        score: displayScore,
        moves: state.moves,
        elapsedSeconds,
        date: Date.now(),
      });
      setIsNewBest(newBest);
    }
    prevWon.current = state.hasWon;
  }, [state.hasWon, play, state.moves, elapsedSeconds, state.score, displayScore]);

  const validTargetSet = new Set(validTargets);

  return (
    <div className="spider-game flex-1 flex flex-col w-full overflow-y-auto">
      <TopBar
        moves={state.moves}
        score={displayScore}
        timerDisplay={settings.timerEnabled ? formattedTime : undefined}
        canAutoComplete={false}
        onNewGame={handleNewGame}
        onUndo={() => { trackUndo('spider'); undo(); }}
        onAutoComplete={() => {}}
        onOpenSettings={() => { trackOpenSettings('spider'); setSettingsOpen(true); }}
        onOpenHelp={() => { trackOpenHelp('spider'); setHelpOpen(true); }}
        onGoHome={onGoHome}
        layoutClass="topbar-layout-10"
        extraControls={<CompletedSuitsDisplay completedSuits={state.completedSuits} />}
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

      {/* Drag overlay */}
      {isDragging && (
        <div
          className="fixed top-0 left-0 pointer-events-none z-[10000]"
          ref={overlayRef}
          style={initialPos ? { transform: `translate(${initialPos.x}px, ${initialPos.y}px)` } : undefined}
        >
          {dragCards.map((card, i) => {
            const textColor = card.color === 'red' ? 'text-[#d32f2f]' : 'text-[#212121]';
            return (
              <div
                key={card.id}
                className="absolute w-[var(--card-width)] h-[var(--card-height)] card-3d-container pointer-events-none"
                style={{ top: i * 22, left: 0 }}
              >
                <div className="w-full h-full relative card-3d card-3d--face-up cursor-grabbing">
                  <div
                    className="absolute inset-0 flex flex-col justify-between overflow-hidden border border-[#d0d0d0] card-face card-front-bg shadow-[0_14px_28px_rgba(0,0,0,0.25),0_10px_10px_rgba(0,0,0,0.22)]"
                    style={{ borderRadius: 'var(--card-radius)', padding: 'clamp(2px, 0.5vw, 5px)' }}
                  >
                    <div className={`flex flex-col items-center leading-none self-start ${textColor}`}>
                      <span className="font-bold leading-[1.1]" style={{ fontSize: 'var(--card-font-size)' }}>{card.rank}</span>
                      <span className="leading-none" style={{ fontSize: 'calc(var(--card-font-size) * 0.8)' }}>{SUIT_SYMBOLS[card.suit]}</span>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <span className={`leading-none opacity-85 ${textColor}`} style={{ fontSize: 'var(--card-center-font-size)' }}>{SUIT_SYMBOLS[card.suit]}</span>
                    </div>
                    <div className={`flex flex-col items-center leading-none self-end rotate-180 ${textColor}`}>
                      <span className="font-bold leading-[1.1]" style={{ fontSize: 'var(--card-font-size)' }}>{card.rank}</span>
                      <span className="leading-none" style={{ fontSize: 'calc(var(--card-font-size) * 0.8)' }}>{SUIT_SYMBOLS[card.suit]}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {state.hasWon && (
        <WinOverlay moves={state.moves} score={displayScore} time={settings.timerEnabled ? formattedTime : undefined} isNewBest={isNewBest} onNewGame={() => { setIsNewBest(false); handleNewGame(); }} onGoHome={onGoHome} />
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
