import type { Card } from '../types';

/**
 * Invisible stand-ins for cards that are in a pile but not drawn (the stock,
 * or cards buried under the top of a pile). They let the move animation know
 * where such a card is, so it flies out of the right pile when it reappears.
 * Must be rendered inside a positioned pile container.
 */
export function CardMarkers({ cards }: { cards: Card[] }) {
  return (
    <>
      {cards.map(card => (
        <span key={card.id} data-card-id={card.id} className="absolute inset-0 pointer-events-none" aria-hidden="true" />
      ))}
    </>
  );
}
