import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PileId } from './types';
import { useGameState } from './useGameState';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useCardFlight } from '../../hooks/useCardFlight';
import { useSettings } from '../../contexts/SettingsContext';
import { useSound } from '../../hooks/useSound';
import { useToast } from '../../hooks/useToast';
import {
  canAutoComplete,
  getAutoCompleteStep,
  findAutoMoveToFoundation,
  findBestMoveTarget,
  findSafeAutoMoves,
  getHint,
  getValidDropTargets,
  getPileCards,
  type Hint,
} from './gameLogic';
import { TopBar } from '../../components/TopBar';
import { StockPile } from './StockPile';
import { WastePile } from './WastePile';
import { FoundationPile } from '../../components/FoundationPile';
import { TableauPile } from './TableauPile';
import { DragOverlay } from '../../components/DragOverlay';
import { Toast } from '../../components/Toast';
import { WinOverlay } from '../../components/WinOverlay';
import { SettingsModal } from '../../components/SettingsModal';
import { HowToPlayModal } from '../../components/HowToPlayModal';
import { StatsModal } from '../../components/StatsModal';

import { useGameTimer } from '../../hooks/useGameTimer';
import { computeDisplayScore } from '../../utils/scoreDrain';
import { shakeCard } from '../../utils/shakeCard';
import { trackNewGame, trackGameWon, trackUndo, trackAutoComplete, trackOpenSettings, trackOpenHelp } from '../../utils/analytics';
import { getBestScore, saveBestScore } from '../../utils/highScores';
import { recordGameStarted, recordGameWon } from '../../utils/gameStats';

const DOUBLE_TAP_MS = 400;
const HINT_MS = 2500;

type OpenModal = 'settings' | 'help' | 'stats' | null;

interface KlondikeBoardProps {
  onGoHome?: () => void;
}

export function Board({ onGoHome }: KlondikeBoardProps) {
  const { state, newGame, drawStock, moveCards, undo, selectCard, clearSelection } =
    useGameState();
  const { settings } = useSettings();
  const { play } = useSound();
  const { toast, showToast } = useToast();

  const [openModal, setOpenModal] = useState<OpenModal>(null);

  // The clock starts with the first move or draw, and stops while a menu is open
  const hasStarted = state.moves > 0 || state.history.length > 0;
  const { elapsedSeconds, formattedTime } = useGameTimer({
    gameType: 'klondike',
    gameId: state.gameId,
    isRunning: hasStarted && !state.hasWon && openModal === null,
  });
  const displayScore = computeDisplayScore(state.score, elapsedSeconds, settings.timerEnabled);

  useEffect(() => {
    if (hasStarted) recordGameStarted('klondike', state.gameId);
  }, [hasStarted, state.gameId]);

  const handleNewGame = useCallback(() => {
    trackNewGame('klondike');
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
    moveCards: (from, to, cardIndex) => moveCards(from as PileId, to as PileId, cardIndex),
    getValidDropTargets: (s, from, idx) => getValidDropTargets(s, from as PileId, idx),
    getPile: (s, id) => getPileCards(s, id as PileId),
    onRelease: (positions) => setFlightOrigins(positions),
  });

  const { boardRef, setFlightOrigins } = useCardFlight(
    [state.stock, state.waste, state.foundations, state.tableau, isDragging],
    { spawnFrom: '[data-pile-id="stock"]' },
  );

  // One sound per card move, however it was made (tap, drag, auto-move)
  const lastMoves = useRef(state.moves);
  useEffect(() => {
    if (state.moves > lastMoves.current) play('cardPlace');
    lastMoves.current = state.moves;
  }, [state.moves, play]);

  // ── Hint ────────────────────────────────────────────────────
  // Remembered together with the position it was computed for, so it disappears as soon as a card moves
  const [hintState, setHintState] = useState<{ hint: Hint; history: unknown } | null>(null);
  const hint = hintState && hintState.history === state.history ? hintState.hint : null;
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  const showHint = useCallback(() => {
    if (state.hasWon) return;
    const next = getHint(state);
    if (!next) {
      showToast('No moves left — try Undo or a new game');
      return;
    }
    clearSelection();
    setHintState({ hint: next, history: state.history });
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintState(null), HINT_MS);
  }, [state, clearSelection, showToast]);

  // ── Tapping cards ───────────────────────────────────────────
  // Custom double-tap detector — browser dblclick is unreliable with touch-none
  const lastTap = useRef<{ pileId: PileId; cardIndex: number; time: number } | null>(null);

  const handleCardClick = useCallback(
    (pileId: string, cardIndex: number) => {
      const id = pileId as PileId;
      const card = getPileCards(state, id)[cardIndex];
      if (!card) return;

      // A card is already picked up: this tap says where it goes
      if (state.selectedCard) {
        selectCard(id, cardIndex);
        return;
      }
      if (!card.faceUp) return;

      if (settings.tapToMove) {
        const target = findBestMoveTarget(state, id, cardIndex);
        if (target) {
          moveCards(id, target, cardIndex);
        } else if (getValidDropTargets(state, id, cardIndex).length > 0) {
          // It can move, but there is no obvious best place — let the player choose
          selectCard(id, cardIndex);
        } else {
          shakeCard(card.id);
        }
        return;
      }

      const now = Date.now();
      const prev = lastTap.current;
      if (prev && prev.pileId === id && prev.cardIndex === cardIndex && now - prev.time < DOUBLE_TAP_MS) {
        // Double-tap — send the card to a foundation if it fits
        lastTap.current = null;
        const target = findAutoMoveToFoundation(state, id, cardIndex);
        if (target) {
          moveCards(id, target, cardIndex);
          return;
        }
      }

      lastTap.current = { pileId: id, cardIndex, time: now };
      selectCard(id, cardIndex);
    },
    [selectCard, state, moveCards, settings.tapToMove]
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
    if (state.stock.length === 0 && state.waste.length === 0) return;
    drawStock(settings.drawMode);
    play('stockClick');
  }, [drawStock, settings.drawMode, play, state.stock.length, state.waste.length]);

  // ── Auto-finish ─────────────────────────────────────────────
  // Stored per deal, so it switches itself off when a new game starts
  const [autoCompleteFor, setAutoCompleteFor] = useState<string | null>(null);
  const autoCompleting = autoCompleteFor === state.gameId && !state.hasWon;
  const showAutoComplete = useMemo(
    () => !autoCompleting && canAutoComplete(state, settings.drawMode),
    [autoCompleting, state, settings.drawMode]
  );

  const startAutoComplete = useCallback(() => {
    trackAutoComplete('klondike');
    clearSelection();
    setAutoCompleteFor(state.gameId);
  }, [clearSelection, state.gameId]);

  useEffect(() => {
    if (!autoCompleting) return;
    const step = getAutoCompleteStep(state);
    if (!step) return;

    const timeout = setTimeout(() => {
      if (step.type === 'move') moveCards(step.from, step.to, step.cardIndex);
      else drawStock(settings.drawMode);
    }, step.type === 'move' ? 110 : 70);

    return () => clearTimeout(timeout);
  }, [autoCompleting, state, moveCards, drawStock, settings.drawMode]);

  // ── Undo ────────────────────────────────────────────────────
  // After an undo, automatic foundation moves wait until the player makes their own
  // next move — otherwise the card that was just taken back would be sent straight up again.
  const autoMoveHold = useRef(-1);

  const handleUndo = useCallback(() => {
    if (state.history.length === 0) return;
    trackUndo('klondike');
    autoMoveHold.current = state.history.length - 1;
    setAutoCompleteFor(null);
    undo();
  }, [state.history.length, undo]);

  // Auto-move safe cards to foundation
  useEffect(() => {
    if (!settings.autoMoveToFoundation) return;
    if (state.hasWon || autoCompleting || isDragging) return;
    if (state.history.length <= autoMoveHold.current) return;
    autoMoveHold.current = -1;

    const safeMoves = findSafeAutoMoves(state);
    if (safeMoves.length === 0) return;

    const timeout = setTimeout(() => {
      const move = safeMoves[0];
      moveCards(move.from, move.to, move.cardIndex);
    }, 200);

    return () => clearTimeout(timeout);
  }, [state, settings.autoMoveToFoundation, autoCompleting, isDragging, moveCards]);

  // ── Winning ─────────────────────────────────────────────────
  const [bestBefore, setBestBefore] = useState(() => ({
    gameId: state.gameId,
    score: getBestScore('klondike')?.score ?? null,
  }));
  if (bestBefore.gameId !== state.gameId) {
    setBestBefore({ gameId: state.gameId, score: getBestScore('klondike')?.score ?? null });
  }
  const isNewBest = state.hasWon && (bestBefore.score === null || displayScore > bestBefore.score);

  const recordedWin = useRef<string | null>(null);
  useEffect(() => {
    if (!state.hasWon || recordedWin.current === state.gameId) return;
    recordedWin.current = state.gameId;
    play('winCelebration');
    trackGameWon('klondike', state.moves, elapsedSeconds, state.score);
    recordGameWon('klondike', state.gameId, elapsedSeconds);
    saveBestScore('klondike', {
      score: displayScore,
      moves: state.moves,
      elapsedSeconds,
      date: Date.now(),
    });
  }, [state.hasWon, state.gameId, play, state.moves, elapsedSeconds, state.score, displayScore]);

  // ── Highlights ──────────────────────────────────────────────
  const highlightedPiles = useMemo(() => {
    const piles = new Set<string>(validTargets);
    if (state.selectedCard) {
      getValidDropTargets(state, state.selectedCard.pileId, state.selectedCard.cardIndex)
        .forEach(id => piles.add(id));
    }
    if (hint?.type === 'move') piles.add(hint.to);
    return piles;
  }, [validTargets, state, hint]);

  const hintMove = hint?.type === 'move' ? hint : null;
  const wasteTop = state.waste[state.waste.length - 1];

  return (
    <div
      className="flex-1 flex flex-col w-full overflow-y-auto"
      onClick={(e) => {
        if (!state.selectedCard) return;
        if ((e.target as HTMLElement).closest('[data-pile-id], [data-card-id], button')) return;
        clearSelection();
      }}
    >
      <TopBar
        moves={state.moves}
        score={displayScore}
        timerDisplay={settings.timerEnabled ? formattedTime : undefined}
        canAutoComplete={showAutoComplete}
        canUndo={state.history.length > 0 && !state.hasWon}
        confirmNewGame={hasStarted && !state.hasWon}
        newGameWarning="Your current game will be abandoned and count as a loss."
        onNewGame={handleNewGame}
        onUndo={handleUndo}
        onAutoComplete={startAutoComplete}
        onHint={showHint}
        onOpenSettings={() => { trackOpenSettings('klondike'); setOpenModal('settings'); }}
        onOpenHelp={() => { trackOpenHelp('klondike'); setOpenModal('help'); }}
        onOpenStats={() => setOpenModal('stats')}
        onGoHome={onGoHome}
      />
      <div className="board-grid mx-auto w-full justify-center" ref={boardRef}>
        {/* Top row */}
        <StockPile
          cards={state.stock}
          canRecycle={state.waste.length > 0}
          isHinted={hint?.type === 'draw'}
          onDraw={handleDrawStock}
        />
        <div style={{ gridColumn: 'span 2' }}>
          <WastePile
            cards={state.waste}
            drawMode={settings.drawMode}
            fanCount={state.wasteFanCount}
            selectedCardIndex={
              state.selectedCard?.pileId === 'waste'
                ? state.selectedCard.cardIndex
                : null
            }
            isHinted={hintMove?.from === 'waste'}
            isDragging={wasteTop !== undefined && draggingCardIds.has(wasteTop.id)}
            onPointerDown={handlePointerDown}
            onCardClick={handleCardClick}
          />
        </div>
        {state.foundations.map((pile, i) => (
          <FoundationPile
            key={i}
            index={i}
            cards={pile}
            isValidTarget={highlightedPiles.has(`foundation-${i}`)}
            isSelected={state.selectedCard?.pileId === `foundation-${i}`}
            onPointerDown={handlePointerDown}
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
            isValidTarget={highlightedPiles.has(`tableau-${i}`)}
            hintFromIndex={hintMove?.from === `tableau-${i}` ? hintMove.cardIndex : null}
            draggingCards={draggingCardIds}
            onPointerDown={handlePointerDown}
            onCardClick={handleCardClick}
            onPileClick={handlePileClick}
          />
        ))}
      </div>

      {isDragging && <DragOverlay cards={dragCards} overlayRef={overlayRef} initialPos={initialPos} />}

      <Toast message={toast} />

      {state.hasWon && (
        <WinOverlay
          moves={state.moves}
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
          gameType="klondike"
        />
      )}

      {openModal === 'help' && (
        <HowToPlayModal gameType="klondike" onClose={() => setOpenModal(null)} />
      )}

      {openModal === 'stats' && (
        <StatsModal gameType="klondike" onClose={() => setOpenModal(null)} />
      )}
    </div>
  );
}
