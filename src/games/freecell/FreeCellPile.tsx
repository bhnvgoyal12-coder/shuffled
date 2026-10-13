import React from 'react';
import type { Card } from '../../types';
import { CardComponent } from '../../components/Card';
import { Placeholder } from '../../components/Placeholder';

interface FreeCellPileProps {
  index: number;
  card: Card | null;
  isSelected: boolean;
  isValidTarget: boolean;
  isHinted?: boolean;
  isDragging?: boolean;
  onPointerDown: (e: React.PointerEvent, pileId: string, cardIndex: number) => void;
  onCardClick: (pileId: string, cardIndex: number) => void;
  onPileClick: (pileId: string) => void;
}

export const FreeCellPile = React.memo(function FreeCellPile({
  index,
  card,
  isSelected,
  isValidTarget,
  isHinted = false,
  isDragging = false,
  onPointerDown,
  onCardClick,
  onPileClick,
}: FreeCellPileProps) {
  const pileId = `freecell-${index}`;

  return (
    <div className="relative w-[var(--card-width)] h-[var(--card-height)]" data-pile-id={pileId}>
      {/* The empty cell stays underneath, so it shows while its card is carried away */}
      <div className="absolute inset-0">
        <Placeholder
          hint="Free"
          isValidTarget={!card && isValidTarget}
          onClick={() => onPileClick(pileId)}
        />
      </div>
      {card && (
        <CardComponent
          key={card.id}
          card={card}
          style={{ top: 0, left: 0 }}
          isSelected={isSelected}
          isHinted={isHinted}
          isDragging={isDragging}
          onPointerDown={(e) => onPointerDown(e, pileId, 0)}
          onClick={() => onCardClick(pileId, 0)}
        />
      )}
    </div>
  );
});
