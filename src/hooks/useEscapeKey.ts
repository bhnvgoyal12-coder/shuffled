import { useEffect } from 'react';

/** Calls `onEscape` when the Escape key is pressed (used to dismiss modals). */
export function useEscapeKey(onEscape: () => void): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onEscape]);
}
