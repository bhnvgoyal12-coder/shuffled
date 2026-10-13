import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FreeCellGameState, FreeCellPileId } from './types';
import { useFreeCellGameState } from './useGameState';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useCardFlight } from '../../hooks/useCardFlight';
import { useSettings } from '../../contexts/SettingsContext';
import { useSound } from '../../hooks/useSound';
import { useToast } from '../../hooks/useToast';
import {
  canAutoComplete,
  getAutoCompleteMove,
  findAutoMoveToFoundation,
  findBestMoveTarget,
  findSafeFreeCellAutoMoves,
  getHint,
  getValidFreeCellDropTargets,
  getPileCards,
  getMoveRejectionReason,
  getMaxMovableCards,
  hasAnyMove,
  isMovableRun,
  type Hint,
} from './gameLogic';
import { TopBar } from '../../components/TopBar';
import { FreeCellPile } from './FreeCellPile';
import { FoundationPile } from '../../components/FoundationPile';
import { FreeCellTableauPile } from './FreeCellTableauPile';
import { DragOverlay } from '../../components/DragOverlay';
import { Toast } from '../../components/Toast';
import { WinOverlay } from '../../components/WinOverlay';
import { SettingsModal } from '../../components/SettingsModal';
import { HowToPlayModal } from '../../components/HowToPlayModal';
import { StatsModal } from '../../components/StatsModal';

import { useGameTimer } from '../../hooks/useGameTimer';
import { computeDisplayScore } from '../../utils/scoreDrain';
import { shakeCard } from '../../utils/shakeCard';
import { trackNewGame, trackGameWon, trackGameLost, trackUndo, trackAutoComplete, trackOpenSettings, trackOpenHelp } from '../../utils/analytics';
import { getBestScore, saveBestScore } from '../../utils/highScores';
import { recordGameStarted, recordGameWon, recordGameLost } from '../../utils/gameStats';

const DOUBLE_TAP_MS = 400;
const HINT_MS = 2500;

type OpenModal = 'settings' | 'help' | 'stats' | null;

interface FreeCellBoardProps {
  onGoHome?: () => void;
}

/** If the move is blocked only by the supermove limit, how many cards could move instead. */
function supermoveLimit(
  state: FreeCellGameState,
  from: FreeCellPileId,
  to: FreeCellPileId,
  cardIndex: number
): number | null {
  if (getMoveRejectionReason(state, from, to, cardIndex) !== 'supermove') return null;
  const toEmpty = getPileCards(state, to).length === 0;
  return getMaxMovableCards(state, toEmpty);
}

export function Board({ onGoHome }: FreeCellBoardProps) {
  const { state, newGame, moveCards, undo, selectCard, clearSelection } = useFreeCellGameState();
  const { settings } = useSettings();
  const { play } = useSound();
  const { toast, showToast } = useToast();

  const [openModal, setOpenModal] = useState<OpenModal>(null);

  // The clock starts with the first move, and stops while a menu is open
  const hasStarted = state.moves > 0 || state.history.length > 0;
  const { elapsedSeconds, formattedTime } = useGameTimer({
    gameType: 'freecell',
    gameId: state.gameId,
    isRunning: hasStarted && !state.hasWon && openModal === null,
  });
  const displayScore = computeDisplayScore(state.score, elapsedSeconds, settings.timerEnabled);

  useEffect(() => {
    if (hasStarted) recordGameStarted('freecell', state.gameId);
  }, [hasStarted, state.gameId]);

  const handleNewGame = useCallback(() => {
    trackNewGame('freecell');
    newGame();
  }, [newGame]);

  const showSupermoveToast = useCallback((maxCards: number) => {
    showToast(`Can only move ${maxCards} card${maxCards === 1 ? '' : 's'} right now`);
  }, [showToast]);

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
    moveCards: (from, to, cardIndex) => moveCards(from as FreeCellPileId, to as FreeCellPileId, cardIndex),
    getValidDropTargets: (s, from, idx) => getValidFreeCellDropTargets(s, from as FreeCellPileId, idx),
    getPile: (s, id) => getPileCards(s, id as FreeCellPileId),
    canDrag: (s, id, idx) => isMovableRun(s, id as FreeCellPileId, idx),
    onRelease: (positions) => setFlightOrigins(positions),
  });

  const { boardRef, setFlightOrigins } = useCardFlight(
    [state.freeCells, state.foundations, state.tableau, isDragging],
    { spawnFrom: '[data-pile-id="freecell-0"]', dealKey: state.gameId },
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
      showToast('No obvious move — try freeing a column, or Undo');
      return;
    }
    clearSelection();
    setHintState({ hint: next, history: state.history });
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintState(null), HINT_MS);
  }, [state, clearSelection, showToast]);

  // ── Tapping cards ───────────────────────────────────────────
  const lastTap = useRef<{ pileId: FreeCellPileId; cardIndex: number; time: number } | null>(null);

  const handleCardClick = useCallback(
    (pileId: string, cardIndex: number) => {
      const id = pileId as FreeCellPileId;
      const pile = getPileCards(state, id);
      const card = pile[cardIndex];
      if (!card) return;

      // A card is already picked up: this tap says where it goes
      if (state.selectedCard) {
        const limit = supermoveLimit(state, state.selectedCard.pileId, id, state.selectedCard.cardIndex);
        if (limit !== null) {
          showSupermoveToast(limit);
          return;
        }
        selectCard(id, cardIndex);
        return;
      }

      if (settings.tapToMove) {
        if (id.startsWith('foundation-')) return; // cards on a foundation stay there
        if (!isMovableRun(state, id, cardIndex)) {
          shakeCard(card.id);
          return;
        }
        const target = findBestMoveTarget(state, id, cardIndex);
        if (target) {
          moveCards(id, target, cardIndex);
        } else if (getValidFreeCellDropTargets(state, id, cardIndex).length > 0) {
          // It can move, but there is no obvious best place — let the player choose
          selectCard(id, cardIndex);
        } else {
          // Too long a run for the free space available?
          if (id.startsWith('tableau-') && cardIndex < pile.length - 1) {
            for (let t = 0; t < 8; t++) {
              const limit = supermoveLimit(state, id, `tableau-${t}` as FreeCellPileId, cardIndex);
              if (limit !== null) {
                showSupermoveToast(limit);
                break;
              }
            }
          }
          shakeCard(card.id);
        }
        return;
      }

      const now = Date.now();
      const prev = lastTap.current;
      if (prev && prev.pileId === id && prev.cardIndex === cardIndex && now - prev.time < DOUBLE_TAP_MS) {
        lastTap.current = null;
        const target = findAutoMoveToFoundation(state, id, cardIndex);
        if (target) {
          moveCards(id, target, cardIndex);
          return;
        }
      }

      lastTap.current = { pileId: id, cardIndex, time: now };
      if (isMovableRun(state, id, cardIndex)) selectCard(id, cardIndex);
      else shakeCard(card.id);
    },
    [selectCard, state, moveCards, settings.tapToMove, showSupermoveToast]
  );

  const handlePileClick = useCallback(
    (pileId: string) => {
      if (!state.selectedCard) return;
      const id = pileId as FreeCellPileId;
      const limit = supermoveLimit(state, state.selectedCard.pileId, id, state.selectedCard.cardIndex);
      if (limit !== null) {
        showSupermoveToast(limit);
        return;
      }
      selectCard(id, 0);
    },
    [state, selectCard, showSupermoveToast]
  );

  // ── Auto-finish ─────────────────────────────────────────────
  // Stored per deal, so it switches itself off when a new game starts
  const [autoCompleteFor, setAutoCompleteFor] = useState<string | null>(null);
  const autoCompleting = autoCompleteFor === state.gameId && !state.hasWon;
  const showAutoComplete = useMemo(
    () => !autoCompleting && canAutoComplete(state),
    [autoCompleting, state]
  );

  const startAutoComplete = useCallback(() => {
    trackAutoComplete('freecell');
    clearSelection();
    setAutoCompleteFor(state.gameId);
  }, [clearSelection, state.gameId]);

  useEffect(() => {
    if (!autoCompleting) return;
    const move = getAutoCompleteMove(state);
    if (!move) return;
    const timeout = setTimeout(() => {
      moveCards(move.from, move.to, move.cardIndex);
    }, 110);
    return () => clearTimeout(timeout);
  }, [autoCompleting, state, moveCards]);

  // ── Undo ────────────────────────────────────────────────────
  // After an undo, automatic foundation moves wait until the player makes their own
  // next move — otherwise the card that was just taken back would be sent straight up again.
  const autoMoveHold = useRef(-1);

  const handleUndo = useCallback(() => {
    if (state.history.length === 0) return;
    trackUndo('freecell');
    autoMoveHold.current = state.history.length - 1;
    setAutoCompleteFor(null);
    undo();
  }, [state.history.length, undo]);

  // Auto-move safe cards
  useEffect(() => {
    if (!settings.autoMoveToFoundation) return;
    if (state.hasWon || autoCompleting || isDragging) return;
    if (state.history.length <= autoMoveHold.current) return;
    autoMoveHold.current = -1;

    const safeMoves = findSafeFreeCellAutoMoves(state);
    if (safeMoves.length === 0) return;
    const timeout = setTimeout(() => {
      const move = safeMoves[0];
      moveCards(move.from, move.to, move.cardIndex);
    }, 200);
    return () => clearTimeout(timeout);
  }, [state, settings.autoMoveToFoundation, autoCompleting, isDragging, moveCards]);

  // ── Winning / getting stuck ─────────────────────────────────
  const [bestBefore, setBestBefore] = useState(() => ({
    gameId: state.gameId,
    score: getBestScore('freecell')?.score ?? null,
  }));
  if (bestBefore.gameId !== state.gameId) {
    setBestBefore({ gameId: state.gameId, score: getBestScore('freecell')?.score ?? null });
  }
  const isNewBest = state.hasWon && (bestBefore.score === null || displayScore > bestBefore.score);

  const recordedWin = useRef<string | null>(null);
  useEffect(() => {
    if (!state.hasWon || recordedWin.current === state.gameId) return;
    recordedWin.current = state.gameId;
    play('winCelebration');
    trackGameWon('freecell', state.moves, elapsedSeconds, state.score);
    recordGameWon('freecell', state.gameId, elapsedSeconds);
    saveBestScore('freecell', {
      score: displayScore,
      moves: state.moves,
      elapsedSeconds,
      date: Date.now(),
    });
  }, [state.hasWon, state.gameId, play, state.moves, elapsedSeconds, state.score, displayScore]);

  const isStuck = useMemo(() => !state.hasWon && !hasAnyMove(state), [state]);
  useEffect(() => {
    if (!isStuck) return;
    trackGameLost('freecell', state.moves);
    recordGameLost('freecell');
    // Only the transition into a dead end is recorded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStuck]);

  // ── Highlights ──────────────────────────────────────────────
  const highlightedPiles = useMemo(() => {
    const piles = new Set<string>(validTargets);
    if (state.selectedCard) {
      getValidFreeCellDropTargets(state, state.selectedCard.pileId, state.selectedCard.cardIndex)
        .forEach(id => piles.add(id));
    }
    if (hint) piles.add(hint.to);
    return piles;
  }, [validTargets, state, hint]);

  return (
    <div
      className="freecell-game screen-enter flex-1 flex flex-col w-full overflow-y-auto"
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
        onOpenSettings={() => { trackOpenSettings('freecell'); setOpenModal('settings'); }}
        onOpenHelp={() => { trackOpenHelp('freecell'); setOpenModal('help'); }}
        onOpenStats={() => setOpenModal('stats')}
        onGoHome={onGoHome}
        layoutClass="topbar-layout-8"
      />

      {/* Top row: 4 free cells + 4 foundations */}
      <div className="board-grid-8 mx-auto w-full justify-center" ref={boardRef}>
        {state.freeCells.map((card, i) => (
          <FreeCellPile
            key={`fc-${i}`}
            index={i}
            card={card}
            isSelected={state.selectedCard?.pileId === `freecell-${i}`}
            isValidTarget={highlightedPiles.has(`freecell-${i}`)}
            isHinted={hint?.from === `freecell-${i}`}
            isDragging={card !== null && draggingCardIds.has(card.id)}
            onPointerDown={handlePointerDown}
            onCardClick={handleCardClick}
            onPileClick={handlePileClick}
          />
        ))}
        {state.foundations.map((pile, i) => (
          <FoundationPile
            key={`found-${i}`}
            index={i}
            cards={pile}
            isValidTarget={highlightedPiles.has(`foundation-${i}`)}
            isSelected={state.selectedCard?.pileId === `foundation-${i}`}
            celebrate={state.hasWon}
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
            isValidTarget={highlightedPiles.has(`tableau-${i}`)}
            hintFromIndex={hint?.from === `tableau-${i}` ? hint.cardIndex : null}
            draggingCards={draggingCardIds}
            onPointerDown={handlePointerDown}
            onCardClick={handleCardClick}
            onPileClick={handlePileClick}
          />
        ))}
      </div>

      {isDragging && <DragOverlay cards={dragCards} overlayRef={overlayRef} initialPos={initialPos} />}

      <Toast message={toast} />

      {/* Dead end — nothing can move */}
      {isStuck && openModal === null && (
        <div role="dialog" aria-modal="true" aria-label="No more moves" className="sheet-backdrop sheet-backdrop--dialog">
          <div className="sheet-panel">
            <h2 className="sheet-title mb-2">No moves left</h2>
            <p className="m-0 mb-6 leading-snug text-[var(--text-soft)]" style={{ fontSize: 15 }}>
              Every free cell is full and nothing fits. Take a move back or deal a new game.
            </p>
            <div className="flex gap-3">
              <button className="btn btn-quiet flex-1" onClick={handleNewGame}>
                New game
              </button>
              <button className="btn btn-primary flex-1" onClick={handleUndo}>
                Undo
              </button>
            </div>
          </div>
        </div>
      )}

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
          gameType="freecell"
        />
      )}

      {openModal === 'help' && (
        <HowToPlayModal gameType="freecell" onClose={() => setOpenModal(null)} />
      )}

      {openModal === 'stats' && (
        <StatsModal gameType="freecell" onClose={() => setOpenModal(null)} />
      )}
    </div>
  );
}
