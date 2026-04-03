import React from 'react';
import type { Card, SelectedCard } from '../../types';
import { CardComponent } from '../../components/Card';
import { Placeholder } from '../../components/Placeholder';

interface TableauPileProps {
  index: number;
  cards: Card[];
  selectedCard: SelectedCard | null;
  isValidTarget: boolean;
  draggingCards: Set<string>;
  onPointerDown: (e: React.PointerEvent, pileId: string, cardIndex: number) => void;
  onCardClick: (pileId: string, cardIndex: number) => void;
  onPileClick: (pileId: string) => void;
}

export const TableauPile = React.memo(function TableauPile({
  index,
  cards,
  selectedCard,
  isValidTarget,
  draggingCards,
  onPointerDown,
  onCardClick,
  onPileClick,
}: TableauPileProps) {
  const pileId = `tableau-${index}`;

  if (cards.length === 0) {
    return (
      <div className="relative w-[var(--card-width)]" data-pile-id={pileId} style={{ height: 'var(--card-height)' }}>
        <Placeholder
          hint="K"
          isValidTarget={isValidTarget}
          onClick={() => onPileClick(pileId)}
        />
      </div>
    );
  }

  // Build CSS calc() offsets so clamp() values resolve correctly
  let faceUpCount = 0;
  let faceDownCount = 0;
  const cssOffsets: string[] = [];
  for (let i = 0; i < cards.length; i++) {
    if (i === 0) {
      cssOffsets.push('0px');
    } else {
      cssOffsets.push(
        `calc(${faceUpCount} * var(--tableau-offset) + ${faceDownCount} * var(--tableau-offset-down))`
      );
    }
    if (i < cards.length - 1) {
      if (cards[i].faceUp) faceUpCount++;
      else faceDownCount++;
    }
  }
  const totalHeightCss = `calc(${faceUpCount} * var(--tableau-offset) + ${faceDownCount} * var(--tableau-offset-down) + var(--card-height))`;

  // Check if any card at or above index is selected
  const isInSelectedStack = (i: number) =>
    selectedCard?.pileId === pileId && selectedCard.cardIndex <= i;

  return (
    <div
      className="relative w-[var(--card-width)]"
      data-pile-id={pileId}
      style={{ height: totalHeightCss }}
    >
      {cards.map((card, i) => (
        <CardComponent
          key={card.id}
          card={card}
          style={{
            top: cssOffsets[i],
            left: 0,
            zIndex: i + 1,
          }}
          isSelected={isInSelectedStack(i)}
          isDragging={draggingCards.has(card.id)}
          isValidTarget={i === cards.length - 1 && isValidTarget}
          onPointerDown={(e) => onPointerDown(e, pileId, i)}
          onClick={() => onCardClick(pileId, i)}
        />
      ))}
    </div>
  );
});
