import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useCountUp } from '../hooks/useCountUp';

interface WinOverlayProps {
  /** Defaults to "You won" */
  title?: string;
  subtitle?: string;
  moves?: number;
  score: number;
  time?: string;
  isNewBest?: boolean;
  /** Label of the main button (defaults to "New game") */
  actionLabel?: string;
  onNewGame: () => void;
  onGoHome?: () => void;
}

/** The panel appears once the cards have taken their bow. */
const REVEAL_DELAY_MS = 950;
const CONFETTI_COLORS = ['#dec378', '#fbf8f0', '#cf3a2f', '#4a9a14', '#f3dc9a'];

export function WinOverlay({
  title = 'You won',
  subtitle,
  moves,
  score,
  time,
  isNewBest,
  actionLabel = 'New game',
  onNewGame,
  onGoHome,
}: WinOverlayProps) {
  const shownScore = useCountUp(score, 800, REVEAL_DELAY_MS + 150);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      confetti({ particleCount: 90, spread: 70, origin: { x: 0.2, y: 0.55 }, colors: CONFETTI_COLORS });
      confetti({ particleCount: 90, spread: 70, origin: { x: 0.8, y: 0.55 }, colors: CONFETTI_COLORS });
      interval = setInterval(() => {
        confetti({
          particleCount: 26,
          spread: 120,
          origin: { y: 0 },
          startVelocity: 30,
          gravity: 1.2,
          colors: CONFETTI_COLORS,
        });
      }, 250);
    }, REVEAL_DELAY_MS);
    const stop = setTimeout(() => clearInterval(interval), REVEAL_DELAY_MS + 2600);

    return () => {
      clearTimeout(start);
      clearTimeout(stop);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="sheet-backdrop sheet-backdrop--dialog sheet-backdrop--late"
    >
      <div className="sheet-panel">
        <h2 className="sheet-title" style={{ fontSize: 'clamp(30px, 9vw, 40px)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="m-0 mt-1 text-[var(--text-soft)]" style={{ fontSize: 15 }}>{subtitle}</p>
        )}
        {isNewBest && (
          <p className="m-0 mt-2 font-bold text-[var(--brass)]" style={{ fontSize: 15 }}>
            New personal best
          </p>
        )}

        <div className="flex justify-center my-6" style={{ gap: 'clamp(20px, 7vw, 34px)' }}>
          <Figure label="Score" value={shownScore} />
          {moves != null && <Figure label="Moves" value={moves} />}
          {time && <Figure label="Time" value={time} />}
        </div>

        <div className="flex items-stretch gap-3">
          {onGoHome && (
            <button className="btn btn-quiet" onClick={onGoHome}>
              Home
            </button>
          )}
          <button className="btn btn-primary flex-1" onClick={onNewGame}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="result-figure">{value}</span>
      <span className="text-[var(--text-soft)]" style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}
