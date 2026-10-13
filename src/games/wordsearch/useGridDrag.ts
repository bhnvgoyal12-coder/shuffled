import { useState, useCallback, useEffect, useRef } from 'react';
import type { GridPosition, DragSelection } from './types';
import { computeLinePath } from './gameLogic';

interface UseGridDragOptions {
  rows: number;
  cols: number;
  onSelectionComplete: (positions: GridPosition[]) => void;
}

export function useGridDrag({ rows, cols, onSelectionComplete }: UseGridDragOptions) {
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  // Mirror of dragSelection for the window listeners
  const selectionRef = useRef<DragSelection | null>(null);
  const isDragging = useRef(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const onSelectionCompleteRef = useRef(onSelectionComplete);
  useEffect(() => {
    onSelectionCompleteRef.current = onSelectionComplete;
  });

  const getCellFromPoint = useCallback((x: number, y: number): GridPosition | null => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cell = (el as HTMLElement).closest('[data-row][data-col]') as HTMLElement | null;
    if (!cell) return null;
    const row = parseInt(cell.dataset.row!, 10);
    const col = parseInt(cell.dataset.col!, 10);
    if (isNaN(row) || isNaN(col) || row < 0 || row >= rows || col < 0 || col >= cols) return null;
    return { row, col };
  }, [rows, cols]);

  const handlePointerDown = useCallback((row: number, col: number, e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const start = { row, col };
    selectionRef.current = { start, current: start, positions: [start] };
    setDragSelection(selectionRef.current);

    // Capture pointer on the grid container
    if (gridRef.current) {
      gridRef.current.setPointerCapture(e.pointerId);
    }
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (!cell) return;

      const prev = selectionRef.current;
      if (!prev) return;
      if (prev.current.row === cell.row && prev.current.col === cell.col) return;
      selectionRef.current = { start: prev.start, current: cell, positions: computeLinePath(prev.start, cell) };
      setDragSelection(selectionRef.current);
    };

    const handlePointerUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;

      const selection = selectionRef.current;
      selectionRef.current = null;
      setDragSelection(null);
      if (selection && selection.positions.length >= 2) {
        onSelectionCompleteRef.current(selection.positions);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [getCellFromPoint]);

  return { dragSelection, handlePointerDown, gridRef };
}
