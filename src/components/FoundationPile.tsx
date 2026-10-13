import React from 'react';
import type { Card } from '../types';
import { SUIT_SYMBOLS, FOUNDATION_SUITS } from '../constants';
import { CardComponent } from './Card';
import { CardMarkers } from './CardMarker';
import { Placeholder } from './Placeholder';

interface FoundationPileProps {
  index: number;
  cards: Card[];
  isValidTarget: boolean;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent, pileId: string, cardIndex: number) => void;
  onCardClick: (pileId: string, cardIndex: number) => void;
  onPileClick: (pileId: string) => void;
}

export const FoundationPile = React.memo(function FoundationPile({
  index,
  cards,
  isValidTarget,
  isSelected = false,
  onPointerDown,
  onCardClick,
  onPileClick,
}: FoundationPileProps) {
  const pileId = `foundation-${index}`;
  const suitHint = SUIT_SYMBOLS[FOUNDATION_SUITS[index]];

  if (cards.length === 0) {
    return (
      <div className="relative w-[var(--card-width)] h-[var(--card-height)]" data-pile-id={pileId}>
        <Placeholder
          hint={suitHint}
          isValidTarget={isValidTarget}
          onClick={() => onPileClick(pileId)}
        />
      </div>
    );
  }

  const topIndex = cards.length - 1;
  const topCard = cards[topIndex];
  // Drawn underneath so the pile isn't empty while the top card is carried or flying away
  const cardBelow = topIndex > 0 ? cards[topIndex - 1] : null;

  return (
    <div className="relative w-[var(--card-width)] h-[var(--card-height)]" data-pile-id={pileId}>
      <CardMarkers cards={cards.slice(0, Math.max(0, topIndex - 1))} />
      {cardBelow && <CardComponent key={cardBelow.id} card={cardBelow} style={{ top: 0, left: 0 }} />}
      <CardComponent
        key={topCard.id}
        card={topCard}
        isStatic
        isSelected={isSelected}
        isValidTarget={isValidTarget}
        onPointerDown={onPointerDown ? (e) => onPointerDown(e, pileId, topIndex) : undefined}
        onClick={() => onCardClick(pileId, topIndex)}
      />
    </div>
  );
});
