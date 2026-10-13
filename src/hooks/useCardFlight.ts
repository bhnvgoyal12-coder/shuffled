import { useCallback, useLayoutEffect, useRef } from 'react';

interface Point {
  left: number;
  top: number;
}

interface UseCardFlightOptions {
  /** Selector (inside the board) of the element new cards should appear to come from, e.g. the stock pile. */
  spawnFrom?: string;
  /** Changes with every new deal: all cards are then dealt out from `spawnFrom` again. */
  dealKey?: string;
}

const FLIGHT_ID = 'card-flight';
const MIN_DISTANCE = 2;
/** Above this many simultaneous flights (a deal), cards leave one after another. */
const STAGGER_THRESHOLD = 8;
const STAGGER_MS = 14;

/**
 * Slides cards from where they were to where they now are whenever `deps` change.
 *
 * Cards are found by their `data-card-id` attribute inside the board element, so
 * a card that moved to another pile (and was re-mounted there) still animates.
 * Positions are tracked relative to the board, so scrolling never causes a flight.
 */
export function useCardFlight(deps: readonly unknown[], { spawnFrom, dealKey }: UseCardFlightOptions = {}) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const lastPositions = useRef(new Map<string, Point>());
  const origins = useRef(new Map<string, Point>());
  const lastDealKey = useRef(dealKey);

  /** Start a card's next flight from a viewport position instead of its last pile position (e.g. where a drag was released). */
  const setFlightOrigins = useCallback((viewportPositions: Map<string, Point>) => {
    origins.current = viewportPositions;
  }, []);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const boardRect = board.getBoundingClientRect();
    // A new deal: forget where the old cards were, so everything is dealt from the deck
    if (lastDealKey.current !== dealKey) {
      lastDealKey.current = dealKey;
      lastPositions.current = new Map();
    }
    const previous = lastPositions.current;
    const overrides = origins.current;
    const next = new Map<string, Point>();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const spawnRect = spawnFrom ? board.querySelector(spawnFrom)?.getBoundingClientRect() : undefined;

    const flights: { el: HTMLElement; dx: number; dy: number }[] = [];

    board.querySelectorAll<HTMLElement>('[data-card-id]').forEach((el) => {
      const id = el.dataset.cardId!;
      // A card still in flight continues from where it visibly is, so back-to-back
      // moves (auto-complete) don't snap. Cancel before measuring the resting position.
      let midFlight: Point | undefined;
      const running = el.getAnimations().filter((a) => a.id === FLIGHT_ID);
      if (running.length > 0) {
        midFlight = el.getBoundingClientRect();
        running.forEach((a) => a.cancel());
      }
      const rect = el.getBoundingClientRect();
      next.set(id, { left: rect.left - boardRect.left, top: rect.top - boardRect.top });

      const override = overrides.get(id);
      const prev = previous.get(id);
      let from: Point | undefined;
      if (override) from = override;
      else if (midFlight) from = midFlight;
      else if (prev) from = { left: prev.left + boardRect.left, top: prev.top + boardRect.top };
      else if (spawnRect) from = spawnRect;
      if (!from) return;

      const dx = from.left - rect.left;
      const dy = from.top - rect.top;
      if (Math.abs(dx) + Math.abs(dy) > MIN_DISTANCE) flights.push({ el, dx, dy });
    });

    lastPositions.current = next;
    origins.current = new Map();
    if (reduceMotion || typeof Element.prototype.animate !== 'function') return;

    const stagger = flights.length > STAGGER_THRESHOLD ? STAGGER_MS : 0;
    flights.forEach(({ el, dx, dy }, i) => {
      const distance = Math.hypot(dx, dy);
      const animation = el.animate(
        // Raised above the other piles, and click-through so a card in the air never swallows a tap
        [
          { transform: `translate(${dx}px, ${dy}px)`, zIndex: 999, pointerEvents: 'none' },
          { transform: 'translate(0, 0)', zIndex: 999, pointerEvents: 'none' },
        ],
        {
          duration: Math.min(320, 150 + distance * 0.25),
          delay: i * stagger,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          fill: 'backwards',
        },
      );
      animation.id = FLIGHT_ID;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { boardRef, setFlightOrigins };
}
