/** Briefly shake a card on the board to show that it can't move. */
export function shakeCard(cardId: string): void {
  const el = document.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`);
  if (!el || typeof el.animate !== 'function') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(2px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 280, easing: 'ease-in-out' },
  );
}
