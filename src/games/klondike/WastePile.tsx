import React from 'react';
import type { Card, DrawMode } from '../../types';
import { CardComponent } from '../../components/Card';

interface WastePileProps {
  cards: Card[];
  drawMode: DrawMode;
  fanCount: number;
  selectedCardIndex: number | null;
  isValidTarget: boolean;
  onPointerDown: (e: React.PointerEvent, pileId: string, cardIndex: number) => void;
  onCardClick: (pileId: string, cardIndex: number) => void;
}

export const WastePile = React.memo(function WastePile({
  cards,
  drawMode,
  fanCount,
  selectedCardIndex,
  isValidTarget,
  onPointerDown,
  onCardClick,
}: WastePileProps) {
  if (cards.length === 0) {
    return <div className="relative w-[var(--card-width)] h-[var(--card-height)]" data-pile-id="waste" />;
  }

  const topIndex = cards.length - 1;

  // For Draw 3, fan only the cards from the current draw batch
  if (drawMode === 3) {
    const visibleCount = Math.min(fanCount || 1, cards.length);
    const visibleCards = cards.slice(cards.length - visibleCount);
    const startIndex = cards.length - visibleCount;

    return (
      <div
        className="relative h-[var(--card-height)]"
        data-pile-id="waste"
        style={{ width: 'calc(var(--card-width) + var(--card-width) * 0.3 * 2)' }}
      >
        {visibleCards.map((card, i) => {
          const actualIndex = startIndex + i;
          const isTop = actualIndex === topIndex;
          return (
            <CardComponent
              key={card.id}
              card={card}
              style={{
                left: `calc(var(--card-width) * 0.3 * ${i})`,
                top: 0,
                zIndex: i + 1,
              }}
              isSelected={isTop && selectedCardIndex === topIndex}
              isValidTarget={isTop && isValidTarget}
              onPointerDown={isTop ? (e) => onPointerDown(e, 'waste', topIndex) : undefined}
              onClick={isTop ? () => onCardClick('waste', topIndex) : undefined}
            />
          );
        })}
      </div>
    );
  }

  // Draw 1 — single card
  const topCard = cards[topIndex];
  return (
    <div className="relative w-[var(--card-width)] h-[var(--card-height)]" data-pile-id="waste">
      <CardComponent
        card={topCard}
        isStatic
        isSelected={selectedCardIndex === topIndex}
        isValidTarget={isValidTarget}
        onPointerDown={(e) => onPointerDown(e, 'waste', topIndex)}
        onClick={() => onCardClick('waste', topIndex)}
      />
    </div>
  );
});
