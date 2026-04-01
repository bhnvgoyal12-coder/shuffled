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

  // Calculate offsets — all cards face up in FreeCell
  let totalOffset = 0;
  const offsets: number[] = [];
  for (let i = 0; i < cards.length; i++) {
    offsets.push(totalOffset);
    if (i < cards.length - 1) {
      totalOffset += getCssVarPx('--tableau-offset', 22);
    }
  }
  const totalHeight = totalOffset + getCssVarPx('--card-height', 112);

  const isInSelectedStack = (i: number) =>
    selectedCard?.pileId === pileId && selectedCard.cardIndex <= i;

  return (
    <div
      className="relative w-[var(--card-width)]"
      data-pile-id={pileId}
      style={{ height: totalHeight }}
    >
      {cards.map((card, i) => (
        <CardComponent
          key={card.id}
          card={card}
          style={{
            top: offsets[i],
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

function getCssVarPx(name: string, fallback: number): number {
  if (typeof document === 'undefined') return fallback;
  // CSS custom properties return raw expressions (e.g. clamp(...)) from getComputedStyle.
  // To resolve to pixels, temporarily apply the var to a real property on a hidden element.
  const el = document.querySelector('.freecell-game') ?? document.documentElement;
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.height = `var(${name})`;
  el.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px || fallback;
}
