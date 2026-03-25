import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PileId } from './types';
import { useGameState } from './useGameState';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useSettings } from '../../contexts/SettingsContext';
import { useSound } from '../../hooks/useSound';
import {
  canAutoComplete,
  getAutoCompleteMove,
  findAutoMoveToFoundation,
  findSafeAutoMoves,
  getValidDropTargets,
  getPileCards,
} from './gameLogic';
import { SUIT_SYMBOLS } from '../../constants';
import { TopBar } from '../../components/TopBar';
import { StockPile } from './StockPile';
import { WastePile } from './WastePile';
import { FoundationPile } from '../../components/FoundationPile';
import { TableauPile } from './TableauPile';
import { WinOverlay } from '../../components/WinOverlay';
import { SettingsModal } from '../../components/SettingsModal';
import { HowToPlayModal } from '../../components/HowToPlayModal';

import { useInterstitialAd } from '../../components/AdInterstitial';
import { useGameTimer } from '../../hooks/useGameTimer';
import { computeDisplayScore } from '../../utils/scoreDrain';
import { trackNewGame, trackGameWon, trackUndo, trackAutoComplete, trackOpenSettings, trackOpenHelp } from '../../utils/analytics';
import { saveBestScore } from '../../utils/highScores';

const DOUBLE_TAP_MS = 400;

interface KlondikeBoardProps {
  onGoHome?: () => void;
}

export function Board({ onGoHome }: KlondikeBoardProps) {
  const { state, newGame, drawStock, moveCards, undo, selectCard } =
    useGameState();
  const { settings } = useSettings();
  const { play } = useSound();
  const { maybeShowInterstitial } = useInterstitialAd();
  const { elapsedSeconds, resetTimer, formattedTime } = useGameTimer({
    gameType: 'klondike',
    isGameOver: state.hasWon,
    timerEnabled: settings.timerEnabled,
  });
  const displayScore = computeDisplayScore(state.score, elapsedSeconds, settings.timerEnabled);

  // Wrap newGame so every trigger (TopBar, WinOverlay, Settings) goes
  // through the interstitial counter — ad shows every 3rd new game.
  const newGameWithAd = useCallback(() => {
    trackNewGame('klondike');
    maybeShowInterstitial();
    newGame();
    resetTimer();
  }, [maybeShowInterstitial, newGame, resetTimer]);

  // Wrap moveCards to play sound on drag-drop
  const moveCardsWithSound = useCallback(
    (from: string, to: string, cardIndex: number) => {
      moveCards(from as PileId, to as PileId, cardIndex);
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
    (s, from, idx) => getValidDropTargets(s, from as PileId, idx),
    (s, id) => getPileCards(s, id as PileId),
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const showAutoComplete = canAutoComplete(state) && !state.hasWon;

  // Custom double-tap detector — browser dblclick is unreliable with touch-none
  const lastTap = useRef<{ pileId: PileId; cardIndex: number; time: number } | null>(null);

  const handleCardClick = useCallback(
    (pileId: string, cardIndex: number) => {
      const id = pileId as PileId;
      const now = Date.now();
      const prev = lastTap.current;

      if (prev && prev.pileId === id && prev.cardIndex === cardIndex && now - prev.time < DOUBLE_TAP_MS) {
        // Double-tap detected — try auto-move to foundation
        lastTap.current = null;
        const target = findAutoMoveToFoundation(state, id, cardIndex);
        if (target) {
          moveCards(id, target, cardIndex);
          play('cardPlace');
          return;
        }
      }

      lastTap.current = { pileId: id, cardIndex, time: now };
      selectCard(id, cardIndex);
    },
    [selectCard, state, moveCards, play]
  );

  const handlePileClick = useCallback(
    (pileId: string) => {
      if (state.selectedCard) {
        selectCard(pileId as PileId, 0);
      }
    },
    [state.selectedCard, selectCard]
  );

  const handleDrawStock = useCallback(() => {
    drawStock(settings.drawMode);
    play('stockClick');
  }, [drawStock, settings.drawMode, play]);

  // Auto-complete via repeated effect
  const [autoCompleting, setAutoCompleting] = React.useState(false);

  const startAutoComplete = useCallback(() => {
    trackAutoComplete('klondike');
    setAutoCompleting(true);
  }, []);

  useEffect(() => {
    if (!autoCompleting) return;

    const move = getAutoCompleteMove(state);
    if (!move || state.hasWon) {
      setAutoCompleting(false);
      return;
    }

    const timeout = setTimeout(() => {
      moveCards(move.from, move.to, move.cardIndex);
      play('cardPlace');
    }, 120);

    return () => clearTimeout(timeout);
  }, [autoCompleting, state, moveCards, play]);

  // Auto-move safe cards to foundation
  useEffect(() => {
    if (!settings.autoMoveToFoundation) return;
    if (state.hasWon || autoCompleting) return;

    const safeMoves = findSafeAutoMoves(state);
    if (safeMoves.length === 0) return;

    const timeout = setTimeout(() => {
      const move = safeMoves[0];
      moveCards(move.from, move.to, move.cardIndex);
      play('cardPlace');
    }, 200);

    return () => clearTimeout(timeout);
  }, [state, settings.autoMoveToFoundation, autoCompleting, moveCards, play]);

  // Win celebration sound + analytics + high score
  const prevWon = useRef(false);
  const [isNewBest, setIsNewBest] = useState(false);
  useEffect(() => {
    if (state.hasWon && !prevWon.current) {
      play('winCelebration');
      trackGameWon('klondike', state.moves, elapsedSeconds, state.score);
      const newBest = saveBestScore('klondike', {
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
    <div className="flex-1 flex flex-col w-full overflow-y-auto">
      <TopBar
        moves={state.moves}
        score={displayScore}
        timerDisplay={settings.timerEnabled ? formattedTime : undefined}
        canAutoComplete={showAutoComplete}
        onNewGame={newGameWithAd}
        onUndo={() => { trackUndo('klondike'); undo(); }}
        onAutoComplete={startAutoComplete}
        onOpenSettings={() => { trackOpenSettings('klondike'); setSettingsOpen(true); }}
        onOpenHelp={() => { trackOpenHelp('klondike'); setHelpOpen(true); }}
        onGoHome={onGoHome}
      />
      <div className="board-grid mx-auto w-full justify-center">
        {/* Top row */}
        <StockPile cards={state.stock} onDraw={handleDrawStock} />
        <WastePile
          cards={state.waste}
          drawMode={settings.drawMode}
          fanCount={state.wasteFanCount}
          selectedCardIndex={
            state.selectedCard?.pileId === 'waste'
              ? state.selectedCard.cardIndex
              : null
          }
          isValidTarget={validTargetSet.has('waste')}
          onPointerDown={handlePointerDown}
          onCardClick={handleCardClick}
        />
        <div style={{ width: 'var(--card-width)' }} />
        {state.foundations.map((pile, i) => (
          <FoundationPile
            key={i}
            index={i}
            cards={pile}
            isValidTarget={validTargetSet.has(`foundation-${i}` as PileId)}
            onCardClick={handleCardClick}
            onPileClick={handlePileClick}
          />
        ))}

        {/* Tableau row */}
        {state.tableau.map((pile, i) => (
          <TableauPile
            key={i}
            index={i}
            cards={pile}
            selectedCard={state.selectedCard}
            isValidTarget={validTargetSet.has(`tableau-${i}` as PileId)}
            draggingCards={draggingCardIds}
            onPointerDown={handlePointerDown}
            onCardClick={handleCardClick}
            onPileClick={handlePileClick}
          />
        ))}
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
                    style={{
                      borderRadius: 'var(--card-radius)',
                      padding: 'clamp(2px, 0.5vw, 5px)',
                    }}
                  >
                    <div className={`flex flex-col items-center leading-none self-start ${textColor}`}>
                      <span className="font-bold leading-[1.1]" style={{ fontSize: 'var(--card-font-size)' }}>
                        {card.rank}
                      </span>
                      <span className="leading-none" style={{ fontSize: 'calc(var(--card-font-size) * 0.8)' }}>
                        {SUIT_SYMBOLS[card.suit]}
                      </span>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <span
                        className={`leading-none opacity-85 ${textColor}`}
                        style={{ fontSize: 'var(--card-center-font-size)' }}
                      >
                        {SUIT_SYMBOLS[card.suit]}
                      </span>
                    </div>
                    <div className={`flex flex-col items-center leading-none self-end rotate-180 ${textColor}`}>
                      <span className="font-bold leading-[1.1]" style={{ fontSize: 'var(--card-font-size)' }}>
                        {card.rank}
                      </span>
                      <span className="leading-none" style={{ fontSize: 'calc(var(--card-font-size) * 0.8)' }}>
                        {SUIT_SYMBOLS[card.suit]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {state.hasWon && (
        <WinOverlay
          moves={state.moves}
          score={displayScore}
          time={settings.timerEnabled ? formattedTime : undefined}
          isNewBest={isNewBest}
          onNewGame={() => { setIsNewBest(false); newGameWithAd(); }}
          onGoHome={onGoHome}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onNewGame={() => { newGameWithAd(); setSettingsOpen(false); }}
          gameType="klondike"
        />
      )}

      {helpOpen && (
        <HowToPlayModal gameType="klondike" onClose={() => setHelpOpen(false)} />
      )}
    </div>
  );
}
