import React from 'react';
import type { Card } from '../../types';
import type { SelectedCard } from './types';
import { CardComponent } from '../../components/Card';
import { Placeholder } from '../../components/Placeholder';

interface FreeCellTableauPileProps {
  index: number;
  cards: Card[];
  selectedCard: SelectedCard | null;
  isValidTarget: boolean;
  /** Index of the first card of a hinted run in this pile, if any */
  hintFromIndex?: number | null;
  draggingCards: Set<string>;
  onPointerDown: (e: React.PointerEvent, pileId: string, cardIndex: number) => void;
  onCardClick: (pileId: string, cardIndex: number) => void;
  onPileClick: (pileId: string) => void;
}

export const FreeCellTableauPile = React.memo(function FreeCellTableauPile({
  index,
  cards,
  selectedCard,
  isValidTarget,
  hintFromIndex = null,
  draggingCards,
  onPointerDown,
  onCardClick,
  onPileClick,
}: FreeCellTableauPileProps) {
  const pileId = `tableau-${index}`;

  if (cards.length === 0) {
    return (
      <div className="relative w-[var(--card-width)]" data-pile-id={pileId} style={{ height: 'var(--card-height)' }}>
        <Placeholder
          hint=""
          isValidTarget={isValidTarget}
          onClick={() => onPileClick(pileId)}
        />
      </div>
    );
  }

  const isInSelectedStack = (i: number) =>
    selectedCard?.pileId === pileId && selectedCard.cardIndex <= i;

  const lastIdx = cards.length - 1;
  // A long column is fanned more tightly so it still fits on screen
  const pileOffset = `max(var(--tableau-offset-min), min(var(--tableau-offset), calc((var(--tableau-avail) - var(--card-height)) / ${Math.max(1, lastIdx)})))`;

  return (
    <div
      className="relative w-[var(--card-width)]"
      data-pile-id={pileId}
      style={{
        '--pile-offset': pileOffset,
        height: `calc(${lastIdx} * var(--pile-offset) + var(--card-height))`,
      } as React.CSSProperties}
    >
      {cards.map((card, i) => (
        <CardComponent
          key={card.id}
          card={card}
          style={{
            top: `calc(${i} * var(--pile-offset))`,
            left: 0,
            zIndex: i + 1,
          }}
          isSelected={isInSelectedStack(i)}
          isDragging={draggingCards.has(card.id)}
          isValidTarget={i === cards.length - 1 && isValidTarget}
          isHinted={hintFromIndex !== null && i >= hintFromIndex}
          onPointerDown={(e) => onPointerDown(e, pileId, i)}
          onClick={() => onCardClick(pileId, i)}
        />
      ))}
    </div>
  );
});
