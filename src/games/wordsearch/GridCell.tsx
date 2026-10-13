import React from 'react';

interface GridCellProps {
  letter: string;
  row: number;
  col: number;
  isInDragSelection: boolean;
  isFound: boolean;
  isHinted?: boolean;
  onPointerDown: (row: number, col: number, e: React.PointerEvent) => void;
}

export const GridCell = React.memo(function GridCell({
  letter,
  row,
  col,
  isInDragSelection,
  isFound,
  isHinted = false,
  onPointerDown,
}: GridCellProps) {
  return (
    <div
      data-row={row}
      data-col={col}
      className={`flex items-center justify-center font-bold select-none cursor-pointer rounded-md transition-colors duration-100 ${isHinted ? 'pile-hint' : ''}`}
      style={{
        width: 'var(--ws-cell-size)',
        height: 'var(--ws-cell-size)',
        fontSize: 'calc(var(--ws-cell-size) * 0.5)',
        color: isFound ? '#fff' : isInDragSelection ? '#fff' : '#e8e8e8',
        background: isFound
          ? 'var(--ws-found-color, #4CAF50)'
          : isInDragSelection
            ? 'rgba(255, 193, 7, 0.85)'
            : 'rgba(255, 255, 255, 0.08)',
        textShadow: (isFound || isInDragSelection) ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
      }}
      onPointerDown={(e) => onPointerDown(row, col, e)}
    >
      {letter}
    </div>
  );
});
