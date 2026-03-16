import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface WinOverlayProps {
  moves: number;
  score: number;
  time?: string;
  isNewBest?: boolean;
  onNewGame: () => void;
  onGoHome?: () => void;
}

export function WinOverlay({ moves, score, time, isNewBest, onNewGame, onGoHome }: WinOverlayProps) {
  useEffect(() => {
    // Initial bursts
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.2, y: 0.5 },
    });
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.8, y: 0.5 },
    });

    // Continuous shower
    const interval = setInterval(() => {
      confetti({
        particleCount: 30,
        spread: 120,
        origin: { y: 0 },
        startVelocity: 30,
        gravity: 1.2,
      });
    }, 250);

    const timeout = setTimeout(() => clearInterval(interval), 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[20000] animate-[fadeIn_0.5s_ease] backdrop-blur-[4px]">
      <div
        className="win-card-bg rounded-[20px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[scaleIn_0.4s_ease]"
        style={{ padding: 'clamp(24px, 5vw, 40px) clamp(32px, 7vw, 56px)' }}
      >
        <div
          className="font-[800] text-[#2e7d32] mb-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 7vw, 42px)', letterSpacing: '-0.5px' }}
        >
          You Win!
        </div>
        {isNewBest && (
          <div
            className="text-[#F57F17] font-bold mb-2"
            style={{ fontSize: 'clamp(13px, 3vw, 16px)' }}
          >
            New Personal Best!
          </div>
        )}
        <div
          className="flex gap-6 justify-center mb-6 text-[#666]"
          style={{ fontSize: 'clamp(14px, 3vw, 16px)' }}
        >
          <div>
            <span>Moves</span>
            <span
              className="font-bold text-[#333] block mt-1"
              style={{ fontSize: 'clamp(20px, 4vw, 24px)' }}
            >
              {moves}
            </span>
          </div>
          <div>
            <span>Score</span>
            <span
              className="font-bold text-[#333] block mt-1"
              style={{ fontSize: 'clamp(20px, 4vw, 24px)' }}
            >
              {score}
            </span>
          </div>
          {time && (
            <div>
              <span>Time</span>
              <span
                className="font-bold text-[#333] block mt-1 tabular-nums"
                style={{ fontSize: 'clamp(20px, 4vw, 24px)' }}
              >
                {time}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          {onGoHome && (
            <button
              className="bg-[#e0e0e0] text-[#555] border-none rounded-xl p-3.5 cursor-pointer transition-[background,transform] duration-200 hover:bg-[#d0d0d0] active:scale-[0.96]"
              onClick={onGoHome}
              aria-label="Go home"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12l9-9 9 9" />
                <path d="M9 21V12h6v9" />
              </svg>
            </button>
          )}
          <button
            className="bg-[#2e7d32] text-white border-none rounded-xl px-9 py-3.5 text-base font-semibold cursor-pointer transition-[background,transform] duration-200 hover:bg-[#388e3c] active:scale-[0.96]"
            onClick={onNewGame}
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
