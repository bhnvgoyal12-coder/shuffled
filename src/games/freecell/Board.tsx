import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FreeCellPileId } from './types';
import { useFreeCellGameState } from './useGameState';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useSettings } from '../../contexts/SettingsContext';
import { useSound } from '../../hooks/useSound';
import {
  canAutoComplete,
  getAutoCompleteMove,
  findAutoMoveToFoundation,
  findSafeFreeCellAutoMoves,
  getValidFreeCellDropTargets,
  getPileCards,
  getMoveRejectionReason,
  getMaxMovableCards,
} from './gameLogic';
import { SUIT_SYMBOLS } from '../../constants';
import { TopBar } from '../../components/TopBar';
import { FreeCellPile } from './FreeCellPile';
import { FoundationPile } from '../../components/FoundationPile';
import { FreeCellTableauPile } from './FreeCellTableauPile';
import { WinOverlay } from '../../components/WinOverlay';
import { SettingsModal } from '../../components/SettingsModal';
import { HowToPlayModal } from '../../components/HowToPlayModal';

import { useInterstitialAd } from '../../components/AdInterstitial';
import { useGameTimer } from '../../hooks/useGameTimer';
import { computeDisplayScore } from '../../utils/scoreDrain';
import { trackNewGame, trackGameWon, trackUndo, trackAutoComplete, trackOpenSettings, trackOpenHelp } from '../../utils/analytics';
import { saveBestScore } from '../../utils/highScores';

const DOUBLE_TAP_MS = 400;

interface FreeCellBoardProps {
  onGoHome?: () => void;
}

export function Board({ onGoHome }: FreeCellBoardProps) {
  const { state, newGame, moveCards, undo, selectCard } = useFreeCellGameState();
  const { settings } = useSettings();
  const { play } = useSound();
  const { maybeShowInterstitial } = useInterstitialAd();
  const { elapsedSeconds, resetTimer, formattedTime } = useGameTimer({
    gameType: 'freecell',
    isGameOver: state.hasWon,
    timerEnabled: settings.timerEnabled,
  });
  const displayScore = computeDisplayScore(state.score, elapsedSeconds, settings.timerEnabled);

  const newGameWithAd = useCallback(() => {
    trackNewGame('freecell');
    maybeShowInterstitial();
    newGame();
    resetTimer();
  }, [maybeShowInterstitial, newGame, resetTimer]);

  // Toast state for supermove rejection
  const [toast, setToast] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSupermoveToast = useCallback((maxCards: number) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast(`Can only move ${maxCards} card${maxCards === 1 ? '' : 's'} — free up cells or columns`);
    setShakeKey(k => k + 1);
    toastTimeout.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const moveCardsWithSound = useCallback(
    (from: string, to: string, cardIndex: number) => {
      const reason = getMoveRejectionReason(state, from as FreeCellPileId, to as FreeCellPileId, cardIndex);
      if (reason === 'supermove') {
        const toIdx = parseInt(to.split('-')[1]);
        const toEmpty = state.tableau[toIdx]?.length === 0;
        showSupermoveToast(getMaxMovableCards(state, toEmpty));
        return;
      }
      moveCards(from as FreeCellPileId, to as FreeCellPileId, cardIndex);
      play('cardPlace');
    },
    [moveCards, play, state, showSupermoveToast]
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
    (s, from, idx) => getValidFreeCellDropTargets(s, from as FreeCellPileId, idx),
    (s, id) => getPileCards(s, id as FreeCellPileId),
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const showAutoComplete = canAutoComplete(state) && !state.hasWon;

  const lastTap = useRef<{ pileId: FreeCellPileId; cardIndex: number; time: number } | null>(null);

  const handleCardClick = useCallback(
    (pileId: string, cardIndex: number) => {
      const id = pileId as FreeCellPileId;
      const now = Date.now();
      const prev = lastTap.current;

      if (prev && prev.pileId === id && prev.cardIndex === cardIndex && now - prev.time < DOUBLE_TAP_MS) {
        lastTap.current = null;
        const target = findAutoMoveToFoundation(state, id, cardIndex);
        if (target) {
          moveCards(id, target, cardIndex);
          play('cardPlace');
          return;
        }
      }

      lastTap.current = { pileId: id, cardIndex, time: now };

      // Check for supermove rejection before selecting
      if (state.selectedCard) {
        const reason = getMoveRejectionReason(state, state.selectedCard.pileId, id, state.selectedCard.cardIndex);
        if (reason === 'supermove') {
          const toIdx = parseInt(id.split('-')[1]);
          const toEmpty = id.startsWith('tableau-') && state.tableau[toIdx]?.length === 0;
          showSupermoveToast(getMaxMovableCards(state, toEmpty));
          return;
        }
      }

      selectCard(id, cardIndex);
    },
    [selectCard, state, moveCards, play, showSupermoveToast]
  );

  const handlePileClick = useCallback(
    (pileId: string) => {
      if (state.selectedCard) {
        const id = pileId as FreeCellPileId;
        const reason = getMoveRejectionReason(state, state.selectedCard.pileId, id, state.selectedCard.cardIndex);
        if (reason === 'supermove') {
          const toIdx = parseInt(id.split('-')[1]);
          const toEmpty = id.startsWith('tableau-') && state.tableau[toIdx]?.length === 0;
          showSupermoveToast(getMaxMovableCards(state, toEmpty));
          return;
        }
        selectCard(id, 0);
      }
    },
    [state.selectedCard, state, selectCard, showSupermoveToast]
  );

  // Auto-complete
  const [autoCompleting, setAutoCompleting] = React.useState(false);

  const startAutoComplete = useCallback(() => {
    trackAutoComplete('freecell');
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

  // Auto-move safe cards
  useEffect(() => {
    if (!settings.autoMoveToFoundation) return;
    if (state.hasWon || autoCompleting) return;
    const safeMoves = findSafeFreeCellAutoMoves(state);
    if (safeMoves.length === 0) return;
    const timeout = setTimeout(() => {
      const move = safeMoves[0];
      moveCards(move.from, move.to, move.cardIndex);
      play('cardPlace');
    }, 200);
    return () => clearTimeout(timeout);
  }, [state, settings.autoMoveToFoundation, autoCompleting, moveCards, play]);

  // Win sound + analytics + high score
  const prevWon = useRef(false);
  const [isNewBest, setIsNewBest] = useState(false);
  useEffect(() => {
    if (state.hasWon && !prevWon.current) {
      play('winCelebration');
      trackGameWon('freecell', state.moves, elapsedSeconds, state.score);
      const newBest = saveBestScore('freecell', {
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
    <div className="freecell-game flex-1 flex flex-col w-full overflow-y-auto">
      <TopBar
        moves={state.moves}
        score={displayScore}
        timerDisplay={settings.timerEnabled ? formattedTime : undefined}
        canAutoComplete={showAutoComplete}
        onNewGame={newGameWithAd}
        onUndo={() => { trackUndo('freecell'); undo(); }}
        onAutoComplete={startAutoComplete}
        onOpenSettings={() => { trackOpenSettings('freecell'); setSettingsOpen(true); }}
        onOpenHelp={() => { trackOpenHelp('freecell'); setHelpOpen(true); }}
        onGoHome={onGoHome}
        layoutClass="topbar-layout-8"
      />

      {/* Toast for supermove rejection */}
      {toast && (
        <div
          key={shakeKey}
          className="mx-auto px-4 py-2 rounded-lg bg-black/70 text-white text-center backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
          style={{ fontSize: 'clamp(11px, 2.8vw, 14px)', maxWidth: '90%', marginBottom: 'clamp(4px, 1vw, 8px)' }}
        >
          {toast}
        </div>
      )}

      {/* Top row: 4 free cells + 4 foundations */}
      <div key={shakeKey} className={`board-grid-8 mx-auto w-full justify-center${toast ? ' animate-shake' : ''}`}>
        {state.freeCells.map((card, i) => (
          <FreeCellPile
            key={`fc-${i}`}
            index={i}
            card={card}
            isSelected={state.selectedCard?.pileId === `freecell-${i}`}
            isValidTarget={validTargetSet.has(`freecell-${i}`)}
            onCardClick={handleCardClick}
            onPileClick={handlePileClick}
          />
        ))}
        {state.foundations.map((pile, i) => (
          <FoundationPile
            key={`found-${i}`}
            index={i}
            cards={pile}
            isValidTarget={validTargetSet.has(`foundation-${i}`)}
            onCardClick={handleCardClick}
            onPileClick={handlePileClick}
          />
        ))}

        {/* Tableau: 8 columns */}
        {state.tableau.map((pile, i) => (
          <FreeCellTableauPile
            key={`tab-${i}`}
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
        <WinOverlay moves={state.moves} score={displayScore} time={settings.timerEnabled ? formattedTime : undefined} isNewBest={isNewBest} onNewGame={() => { setIsNewBest(false); newGameWithAd(); }} onGoHome={onGoHome} />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onNewGame={() => { newGameWithAd(); setSettingsOpen(false); }}
          gameType="freecell"
        />
      )}

      {helpOpen && (
        <HowToPlayModal gameType="freecell" onClose={() => setHelpOpen(false)} />
      )}
    </div>
  );
}
