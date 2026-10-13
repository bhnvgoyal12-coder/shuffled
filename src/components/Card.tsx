import React from 'react';
import type { Card as CardType } from '../types';
import { SuitSvg } from './SuitSvg';

interface CardProps {
  card: CardType;
  style?: React.CSSProperties;
  isStatic?: boolean;
  isSelected?: boolean;
  isDragging?: boolean;
  isValidTarget?: boolean;
  isHinted?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

interface CardFaceProps {
  card: CardType;
  className?: string;
}

/** The printed front of a card. Shared by piles and the drag overlay so a card looks the same while it is carried. */
export function CardFace({ card, className = '' }: CardFaceProps) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden card-face card-front-bg ${card.color === 'red' ? 'card--red' : ''} ${className}`}
      style={{ padding: 'calc(var(--card-width) * 0.04) calc(var(--card-width) * 0.08)' }}
    >
      {/* Top row: rank left, suit right — the part that stays visible in a fanned pile */}
      <div className="flex items-start justify-between">
        <span className="card-rank">{card.rank}</span>
        <SuitSvg suit={card.suit} color="currentColor" className="card-suit-corner" />
      </div>
      <SuitSvg suit={card.suit} color="currentColor" className="card-suit-center" />
    </div>
  );
}

export const CardComponent = React.memo(function CardComponent({
  card,
  style,
  isStatic = false,
  isSelected = false,
  isDragging = false,
  isValidTarget = false,
  isHinted = false,
  onPointerDown,
  onClick,
}: CardProps) {
  const containerClasses = [
    'w-[var(--card-width)] h-[var(--card-height)] card-3d-container z-[1]',
    isStatic ? 'relative' : 'absolute',
    isSelected ? '-translate-y-2 transition-[translate] duration-150 ease-out' : '',
    isDragging ? 'opacity-0 pointer-events-none' : '',
    card.faceUp ? 'touch-none' : '',
  ].filter(Boolean).join(' ');

  const faceClasses = [
    'card-hover card-shadow',
    isSelected ? 'card-selected' : '',
    isValidTarget ? 'card-target' : '',
    isHinted ? 'card-hint' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClasses}
      style={style}
      data-card-id={card.id}
      onPointerDown={card.faceUp ? onPointerDown : undefined}
      onClick={onClick}
    >
      <div
        className={`w-full h-full relative card-3d ${
          card.faceUp ? 'card-3d--face-up cursor-grab active:cursor-grabbing' : 'card-3d--face-down cursor-default'
        }`}
      >
        <CardFace card={card} className={faceClasses} />

        {/* Back face */}
        <div
          className="absolute inset-0 overflow-hidden card-face card-face--back card-shadow"
          style={{ borderRadius: 'var(--card-radius)' }}
        >
          <div
            className="w-full h-full card-back-pattern card-back-rim"
            style={{ borderRadius: 'var(--card-radius)' }}
          />
        </div>
      </div>
    </div>
  );
});
