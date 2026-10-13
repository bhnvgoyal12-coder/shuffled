import React from 'react';
import type { Suit } from '../types';
import { SuitSvg } from './SuitSvg';

interface PlaceholderProps {
  /** Short text shown in the empty slot (e.g. "K") */
  hint?: string;
  /** Suit shown in the empty slot (foundations) */
  suit?: Suit;
  isValidTarget?: boolean;
  onClick?: () => void;
  'data-pile-id'?: string;
}

export const Placeholder = React.memo(function Placeholder({
  hint,
  suit,
  isValidTarget = false,
  onClick,
  ...rest
}: PlaceholderProps) {
  return (
    <div
      className={`pile-slot ${isValidTarget ? 'pile-slot--target' : ''}`}
      onClick={onClick}
      {...rest}
    >
      {suit && (
        <SuitSvg suit={suit} color="currentColor" style={{ width: '44%', height: '44%' }} />
      )}
      {hint && (
        <span
          className="leading-none text-center"
          style={{ fontSize: hint.length > 1 ? 'calc(var(--card-font-size) * 0.95)' : 'calc(var(--card-center-font-size) * 0.95)' }}
        >
          {hint}
        </span>
      )}
    </div>
  );
});
