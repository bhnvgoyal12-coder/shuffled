import React from 'react';
import type { Card } from '../../types';
import { CardMarkers } from '../../components/CardMarker';

interface StockPileProps {
  cards: Card[];
  /** Whether tapping the empty stock would turn the waste back over */
  canRecycle: boolean;
  isHinted?: boolean;
  onDraw: () => void;
}

const backClass =
  'absolute w-[var(--card-width)] h-[var(--card-height)] rounded-[var(--card-radius)] card-back-pattern card-back-rim card-shadow';

export const StockPile = React.memo(function StockPile({ cards, canRecycle, isHinted = false, onDraw }: StockPileProps) {
  if (cards.length === 0) {
    return (
      <button
        type="button"
        className={`pile-slot relative ${canRecycle ? 'cursor-pointer' : 'cursor-default opacity-50'} ${isHinted ? 'pile-hint' : ''}`}
        onClick={onDraw}
        data-pile-id="stock"
        aria-label={canRecycle ? 'Turn the waste pile back over' : 'Stock is empty'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '46%', height: '46%' }}>
          <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`relative cursor-pointer w-[var(--card-width)] h-[var(--card-height)] bg-transparent border-none p-0 ${isHinted ? 'pile-hint' : ''}`}
      onClick={onDraw}
      data-pile-id="stock"
      aria-label={`Draw from stock, ${cards.length} card${cards.length === 1 ? '' : 's'} left`}
    >
      <CardMarkers cards={cards} />
      {cards.length > 2 && <div className={`${backClass} top-[3px] left-[2px] opacity-60`} />}
      {cards.length > 1 && <div className={`${backClass} top-[1.5px] left-[1px] opacity-80`} />}
      <div className={`${backClass} top-0 left-0`} />
      <span
        className="absolute bottom-[7%] left-1/2 -translate-x-1/2 rounded-full bg-black/50 text-white tabular-nums leading-none"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'calc(var(--card-font-size) * 0.8)', padding: '0.2em 0.55em' }}
      >
        {cards.length}
      </span>
    </button>
  );
});
