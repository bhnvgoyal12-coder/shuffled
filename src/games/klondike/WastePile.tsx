import React from 'react';
import type { Card, DrawMode } from '../../types';
import { CardComponent } from '../../components/Card';
import { CardMarkers } from '../../components/CardMarker';

interface WastePileProps {
  cards: Card[];
  drawMode: DrawMode;
  fanCount: number;
  selectedCardIndex: number | null;
  isHinted?: boolean;
  isDragging?: boolean;
  onPointerDown: (e: React.PointerEvent, pileId: string, cardIndex: number) => void;
  onCardClick: (pileId: string, cardIndex: number) => void;
}

export const WastePile = React.memo(function WastePile({
  cards,
  drawMode,
  fanCount,
  selectedCardIndex,
  isHinted = false,
  isDragging = false,
  onPointerDown,
  onCardClick,
}: WastePileProps) {
  // Draw 3 fans the cards of the current draw; Draw 1 shows a single card
  const fanned = drawMode === 3 ? Math.min(Math.max(fanCount, 1), cards.length) : Math.min(1, cards.length);
  const containerStyle = drawMode === 3
    ? { width: 'calc(var(--card-width) + var(--card-width) * 0.3 * 2)' }
    : { width: 'var(--card-width)' };

  if (cards.length === 0) {
    return <div className="relative h-[var(--card-height)]" style={containerStyle} data-pile-id="waste" />;
  }

  const topIndex = cards.length - 1;
  const startIndex = cards.length - fanned;
  // One more card underneath, so the pile isn't empty while the top card is carried or flying away
  const cardBelow = startIndex > 0 ? cards[startIndex - 1] : null;

  return (
    <div className="relative h-[var(--card-height)]" style={containerStyle} data-pile-id="waste">
      <CardMarkers cards={cards.slice(0, Math.max(0, startIndex - 1))} />
      {cardBelow && <CardComponent key={cardBelow.id} card={cardBelow} style={{ top: 0, left: 0, zIndex: 0 }} />}
      {cards.slice(startIndex).map((card, i) => {
        const isTop = startIndex + i === topIndex;
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
            isHinted={isTop && isHinted}
            isDragging={isTop && isDragging}
            onPointerDown={isTop ? (e) => onPointerDown(e, 'waste', topIndex) : undefined}
            onClick={isTop ? () => onCardClick('waste', topIndex) : undefined}
          />
        );
      })}
    </div>
  );
});
