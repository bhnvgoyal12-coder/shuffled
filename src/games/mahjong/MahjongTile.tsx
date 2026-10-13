import React from 'react';
import type { PlacedTile } from './types';
import { getSuitSymbol } from './constants';

interface MahjongTileProps {
  placed: PlacedTile;
  isFree: boolean;
  isSelected: boolean;
  isHinted: boolean;
  /** The tile has been matched and is on its way out */
  isLeaving?: boolean;
  onClick: (tileId: string) => void;
}

export const MahjongTileComponent = React.memo(function MahjongTileComponent({
  placed,
  isFree,
  isSelected,
  isHinted,
  isLeaving = false,
  onClick,
}: MahjongTileProps) {
  const { tile, position } = placed;

  // Each layer is shifted up and to the left by the thickness of a tile
  const style: React.CSSProperties = {
    left: `calc(${position.col} * var(--mahjong-tile-width) / 2 + ${4 - position.layer} * var(--mahjong-depth))`,
    top: `calc(${position.row} * var(--mahjong-tile-height) / 2 + ${4 - position.layer} * var(--mahjong-depth))`,
    // Tiles further right / down overlap the visible edge of their neighbours
    zIndex: position.layer * 1000 + position.row * 30 + position.col,
    // Lower layers land first when a board is laid out
    '--enter-delay': `${position.layer * 110 + position.col * 6}ms`,
  } as React.CSSProperties;

  const stateClass = isLeaving
    ? 'mahjong-tile--leaving'
    : isSelected
    ? 'mahjong-tile--selected'
    : isHinted
      ? 'mahjong-tile--hinted'
      : isFree
        ? 'mahjong-tile--free'
        : 'mahjong-tile--blocked';

  return (
    <button
      type="button"
      style={style}
      className={`mahjong-tile ${stateClass}`}
      onClick={isLeaving ? undefined : () => onClick(tile.id)}
      aria-hidden={isLeaving || undefined}
      aria-label={`${tile.label}${isFree ? '' : ' (blocked)'}`}
      aria-pressed={isSelected}
      tabIndex={isFree && !isLeaving ? 0 : -1}
    >
      {/* Suit indicator (small, top-left) */}
      {tile.suit && (
        <span className="mahjong-tile__suit" style={{ color: tile.color }}>
          {getSuitSymbol(tile)}
        </span>
      )}
      <span className="mahjong-tile__symbol" style={{ color: tile.color }}>
        {tile.symbol}
      </span>
    </button>
  );
});
