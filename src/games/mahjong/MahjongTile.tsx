import React from 'react';
import type { PlacedTile } from './types';
import { getSuitSymbol } from './constants';

interface MahjongTileProps {
  placed: PlacedTile;
  isFree: boolean;
  isSelected: boolean;
  isHinted: boolean;
  onClick: (tileId: string) => void;
}

export const MahjongTileComponent = React.memo(function MahjongTileComponent({
  placed,
  isFree,
  isSelected,
  isHinted,
  onClick,
}: MahjongTileProps) {
  const { tile, position } = placed;

  // Each layer is shifted up and to the left by the thickness of a tile
  const style: React.CSSProperties = {
    left: `calc(${position.col} * var(--mahjong-tile-width) / 2 + ${4 - position.layer} * var(--mahjong-depth))`,
    top: `calc(${position.row} * var(--mahjong-tile-height) / 2 + ${4 - position.layer} * var(--mahjong-depth))`,
    // Tiles further right / down overlap the visible edge of their neighbours
    zIndex: position.layer * 1000 + position.row * 30 + position.col,
  };

  const stateClass = isSelected
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
      onClick={() => onClick(tile.id)}
      aria-label={`${tile.label}${isFree ? '' : ' (blocked)'}`}
      aria-pressed={isSelected}
      tabIndex={isFree ? 0 : -1}
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
