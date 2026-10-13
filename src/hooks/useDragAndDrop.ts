import { useRef, useState, useCallback, useEffect } from 'react';
import type { Card } from '../types';

interface DragInfo {
  sourcePileId: string;
  cardIndex: number;
  cards: Card[];
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
}

interface DragAndDropOptions<S> {
  state: S;
  moveCards: (from: string, to: string, cardIndex: number) => void;
  getValidDropTargets: (state: S, from: string, cardIndex: number) => string[];
  getPile: (state: S, pileId: string) => Card[] | null;
  /** Return false to refuse picking up the stack starting at `cardIndex` (defaults to any face-up card). */
  canDrag?: (state: S, pileId: string, cardIndex: number) => boolean;
  /** Called when a drag is released, with the viewport position each carried card was dropped at. */
  onRelease?: (positions: Map<string, { left: number; top: number }>) => void;
}

const DRAG_THRESHOLD = 5;
const NO_CARDS: Card[] = [];
const NO_IDS: Set<string> = new Set();
const NO_TARGETS: string[] = [];

function overlapArea(a: DOMRect, b: DOMRect): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Generic drag-and-drop hook for card games.
 *
 * Each game passes its own `getValidDropTargets` and `getPile` functions
 * so the hook works with any game's state shape and pile ID system.
 */
export function useDragAndDrop<S>(options: DragAndDropOptions<S>) {
  const dragRef = useRef<DragInfo | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCards, setDragCards] = useState<Card[]>(NO_CARDS);
  const [draggingCardIds, setDraggingCardIds] = useState<Set<string>>(NO_IDS);
  const [validTargets, setValidTargets] = useState<string[]>(NO_TARGETS);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | null>(null);
  const dragActivated = useRef(false);
  const pendingDrag = useRef<DragInfo | null>(null);
  const validTargetsRef = useRef<string[]>(NO_TARGETS);
  /** Until this timestamp, the click the browser fires after releasing a drag is swallowed. */
  const suppressClickUntil = useRef(0);

  const pointerIdRef = useRef<number | null>(null);
  const pointerTargetRef = useRef<HTMLElement | null>(null);

  // Latest options, read by the document-level listeners below
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, pileId: string, cardIndex: number) => {
      // Don't prevent default or stop propagation — let clicks work
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const { state, getPile, canDrag } = optionsRef.current;
      const pile = getPile(state, pileId);
      if (!pile || cardIndex < 0 || cardIndex >= pile.length) return;
      if (!pile[cardIndex].faceUp) return;
      if (canDrag && !canDrag(state, pileId, cardIndex)) return;

      const cards = pile.slice(cardIndex);
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();

      pendingDrag.current = {
        sourcePileId: pileId,
        cardIndex,
        cards,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        startX: e.clientX,
        startY: e.clientY,
      };
      dragActivated.current = false;

      // Store pointer info — capture is deferred until drag threshold is crossed
      // (capturing immediately breaks click/dblclick event sequence)
      pointerIdRef.current = e.pointerId;
      pointerTargetRef.current = el;
    },
    []
  );

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      // Check if we have a pending drag that hasn't activated yet
      if (pendingDrag.current && !dragActivated.current) {
        const dx = e.clientX - pendingDrag.current.startX;
        const dy = e.clientY - pendingDrag.current.startY;

        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          // Prevent browser scroll/pan once drag is confirmed
          e.preventDefault();

          // Now capture the pointer so mobile touch events keep firing during drag
          if (pointerIdRef.current !== null && pointerTargetRef.current) {
            try {
              pointerTargetRef.current.setPointerCapture(pointerIdRef.current);
            } catch {
              // Element may have been removed
            }
          }

          // Activate the drag
          dragActivated.current = true;
          dragRef.current = pendingDrag.current;

          const { state, getValidDropTargets } = optionsRef.current;
          const targets = getValidDropTargets(
            state,
            dragRef.current.sourcePileId,
            dragRef.current.cardIndex
          );
          validTargetsRef.current = targets;
          setValidTargets(targets);
          setDragCards(dragRef.current.cards);
          setDraggingCardIds(new Set(dragRef.current.cards.map(c => c.id)));
          setInitialPos({
            x: e.clientX - dragRef.current.offsetX,
            y: e.clientY - dragRef.current.offsetY,
          });
          setIsDragging(true);
        }
      }

      // Update overlay position during active drag
      if (dragActivated.current && dragRef.current && overlayRef.current) {
        e.preventDefault();
        const x = e.clientX - dragRef.current.offsetX;
        const y = e.clientY - dragRef.current.offsetY;
        overlayRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };

    /** The valid pile the carried stack covers most, falling back to whatever is under the pointer. */
    const findDropTarget = (e: PointerEvent): string | null => {
      const targets = validTargetsRef.current;
      const carried = overlayRef.current?.querySelector<HTMLElement>('[data-drag-card-id]');
      if (carried) {
        const carriedRect = carried.getBoundingClientRect();
        let best: string | null = null;
        let bestArea = 0;
        for (const id of targets) {
          const pileEl = document.querySelector<HTMLElement>(`[data-pile-id="${id}"]`);
          if (!pileEl) continue;
          const area = overlapArea(carriedRect, pileEl.getBoundingClientRect());
          if (area > bestArea) {
            best = id;
            bestArea = area;
          }
        }
        if (best) return best;
      }

      for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
        const pileAttr = (el as HTMLElement).dataset?.pileId;
        if (pileAttr) return targets.includes(pileAttr) ? pileAttr : null;
      }
      return null;
    };

    const handleUp = (e: PointerEvent) => {
      const wasDragging = dragActivated.current && dragRef.current !== null;

      if (wasDragging) {
        const drag = dragRef.current!;
        suppressClickUntil.current = Date.now() + 100;
        const { moveCards, onRelease } = optionsRef.current;

        if (onRelease && overlayRef.current) {
          const positions = new Map<string, { left: number; top: number }>();
          overlayRef.current.querySelectorAll<HTMLElement>('[data-drag-card-id]').forEach((el) => {
            const rect = el.getBoundingClientRect();
            positions.set(el.dataset.dragCardId!, { left: rect.left, top: rect.top });
          });
          onRelease(positions);
        }

        const targetPileId = e.type === 'pointercancel' ? null : findDropTarget(e);
        if (targetPileId) {
          moveCards(drag.sourcePileId, targetPileId, drag.cardIndex);
        }
      }

      // Release pointer capture
      if (pointerIdRef.current !== null && pointerTargetRef.current) {
        try {
          pointerTargetRef.current.releasePointerCapture(pointerIdRef.current);
        } catch {
          // Already released
        }
      }
      pointerIdRef.current = null;
      pointerTargetRef.current = null;

      dragRef.current = null;
      pendingDrag.current = null;
      dragActivated.current = false;
      validTargetsRef.current = NO_TARGETS;

      // Plain clicks never touched drag state — skip the re-render
      if (wasDragging) {
        setIsDragging(false);
        setDragCards(NO_CARDS);
        setDraggingCardIds(NO_IDS);
        setValidTargets(NO_TARGETS);
        setInitialPos(null);
      }
    };

    // Releasing a drag over the card it started on would otherwise count as a tap
    const handleClickCapture = (e: MouseEvent) => {
      if (Date.now() < suppressClickUntil.current) {
        e.stopPropagation();
        suppressClickUntil.current = 0;
      }
    };

    document.addEventListener('pointermove', handleMove, { passive: false });
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);
    document.addEventListener('click', handleClickCapture, true);

    return () => {
      document.removeEventListener('click', handleClickCapture, true);
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };
  }, []);

  return {
    isDragging,
    dragCards,
    draggingCardIds,
    validTargets,
    overlayRef,
    initialPos,
    handlePointerDown,
  };
}
