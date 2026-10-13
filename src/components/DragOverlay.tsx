import type { Card } from '../types';
import { CardFace } from './Card';

interface DragOverlayProps {
  cards: Card[];
  overlayRef: React.RefObject<HTMLDivElement | null>;
  initialPos: { x: number; y: number } | null;
}

/** The stack of cards that follows the pointer during a drag. */
export function DragOverlay({ cards, overlayRef, initialPos }: DragOverlayProps) {
  return (
    <div
      className="fixed top-0 left-0 pointer-events-none z-[10000]"
      ref={overlayRef}
      style={initialPos ? { transform: `translate(${initialPos.x}px, ${initialPos.y}px)` } : undefined}
    >
      {cards.map((card, i) => (
        <div
          key={card.id}
          className="absolute w-[var(--card-width)] h-[var(--card-height)] pointer-events-none"
          style={{ top: `calc(${i} * var(--tableau-offset))`, left: 0 }}
          data-drag-card-id={card.id}
        >
          <CardFace card={card} className="shadow-[0_14px_28px_rgba(0,0,0,0.25),0_10px_10px_rgba(0,0,0,0.22)]" />
        </div>
      ))}
    </div>
  );
}
