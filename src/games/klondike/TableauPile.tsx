import React from 'react';
import type { Card, SelectedCard } from '../../types';
import { CardComponent } from '../../components/Card';
import { Placeholder } from '../../components/Placeholder';

interface TableauPileProps {
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

export const TableauPile = React.memo(function TableauPile({
  index,
  cards,
  selectedCard,
  isValidTarget,
  hintFromIndex = null,
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

  // Each card sits below the ones before it: face-up cards by --pile-offset,
  // face-down cards by the smaller --tableau-offset-down.
  let faceUpBefore = 0;
  let faceDownBefore = 0;
  const cssOffsets: string[] = [];
  for (let i = 0; i < cards.length; i++) {
    cssOffsets.push(
      `calc(${faceUpBefore} * var(--pile-offset) + ${faceDownBefore} * var(--tableau-offset-down))`
    );
    if (cards[i].faceUp) faceUpBefore++;
    else faceDownBefore++;
  }
  const lastCard = cards[cards.length - 1];
  const faceUpGaps = faceUpBefore - (lastCard.faceUp ? 1 : 0);
  const faceDownGaps = faceDownBefore - (lastCard.faceUp ? 0 : 1);

  // A long run is fanned more tightly so the pile still fits on screen
  const pileOffset = `max(var(--tableau-offset-min), min(var(--tableau-offset), calc((var(--tableau-avail) - var(--card-height) - ${faceDownGaps} * var(--tableau-offset-down)) / ${Math.max(1, faceUpGaps)})))`;
  const totalHeightCss = `calc(${faceUpGaps} * var(--pile-offset) + ${faceDownGaps} * var(--tableau-offset-down) + var(--card-height))`;

  // Check if any card at or above index is selected
  const isInSelectedStack = (i: number) =>
    selectedCard?.pileId === pileId && selectedCard.cardIndex <= i;

  return (
    <div
      className="relative w-[var(--card-width)]"
      data-pile-id={pileId}
      style={{ '--pile-offset': pileOffset, height: totalHeightCss } as React.CSSProperties}
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
          isHinted={hintFromIndex !== null && i >= hintFromIndex}
          onPointerDown={(e) => onPointerDown(e, pileId, i)}
          onClick={() => onCardClick(pileId, i)}
        />
      ))}
    </div>
  );
});
