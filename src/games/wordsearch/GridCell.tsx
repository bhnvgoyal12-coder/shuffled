import React from 'react';

interface GridCellProps {
  letter: string;
  row: number;
  col: number;
  isInDragSelection: boolean;
  isFound: boolean;
  isHinted?: boolean;
  /** Position of this letter within its found word, so the colour sweeps along the word */
  foundOrder?: number;
  onPointerDown: (row: number, col: number, e: React.PointerEvent) => void;
}

export const GridCell = React.memo(function GridCell({
  letter,
  row,
  col,
  isInDragSelection,
  isFound,
  isHinted = false,
  foundOrder = 0,
  onPointerDown,
}: GridCellProps) {
  const stateClass = isFound ? 'ws-cell--found' : isInDragSelection ? 'ws-cell--drag' : '';

  return (
    <div
      data-row={row}
      data-col={col}
      className={`ws-cell ${stateClass} ${isHinted ? 'ws-cell--hinted' : ''}`}
      style={{ '--cell-order': row + col, '--found-order': foundOrder } as React.CSSProperties}
      onPointerDown={(e) => onPointerDown(row, col, e)}
    >
      {letter}
    </div>
  );
});
