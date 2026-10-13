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
  'absolute w-[var(--card-width)] h-[var(--card-height)] rounded-[var(--card-radius)] card-back-pattern card-back-rim shadow-[inset_0_0_0_2px_var(--card-back-border),0_1px_3px_rgba(0,0,0,0.12)]';

export const StockPile = React.memo(function StockPile({ cards, canRecycle, isHinted = false, onDraw }: StockPileProps) {
  if (cards.length === 0) {
    return (
      <button
        type="button"
        className={`relative w-[var(--card-width)] h-[var(--card-height)] rounded-[var(--card-radius)] flex items-center justify-center border-2 border-dashed bg-black/5 p-0 transition-[border-color,color] duration-200 ${
          canRecycle
            ? 'cursor-pointer border-white/30 text-white/50 hover:border-white/50 hover:text-white/70'
            : 'cursor-default border-white/15 text-white/15'
        } ${isHinted ? 'pile-hint' : ''}`}
        style={{ fontSize: 'var(--card-center-font-size)' }}
        onClick={onDraw}
        data-pile-id="stock"
        aria-label={canRecycle ? 'Turn the waste pile back over' : 'Stock is empty'}
      >
        &#x21BB;
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
        className="absolute bottom-[6%] left-1/2 -translate-x-1/2 rounded-full bg-black/45 text-white/90 font-semibold tabular-nums leading-none"
        style={{ fontSize: 'calc(var(--card-font-size) * 0.62)', padding: '0.25em 0.6em' }}
      >
        {cards.length}
      </span>
    </button>
  );
});
