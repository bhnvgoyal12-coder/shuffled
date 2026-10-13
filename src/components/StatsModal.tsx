import type { GameType } from '../types';
import { getStats, getWinPercent, formatBestTime } from '../utils/gameStats';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface StatsModalProps {
  gameType: GameType;
  onClose: () => void;
}

const GAME_NAMES: Record<GameType, string> = {
  klondike: 'Classic Solitaire',
  freecell: 'FreeCell',
  spider: 'Spider Solitaire',
  mahjong: 'Mahjong',
  wordsearch: 'Word Search',
};

export function StatsModal({ gameType, onClose }: StatsModalProps) {
  const stats = getStats(gameType);
  const winPct = getWinPercent(stats);
  useEscapeKey(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Statistics"
      className="sheet-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sheet-panel flex flex-col" style={{ gap: 18 }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="sheet-title">Your record</h2>
            <p className="m-0 mt-0.5 text-[var(--text-soft)]" style={{ fontSize: 14 }}>{GAME_NAMES[gameType]}</p>
          </div>
          <button onClick={onClose} className="sheet-close" aria-label="Close statistics">
            ×
          </button>
        </div>

        {stats.played === 0 ? (
          <p className="m-0 text-[var(--text-soft)] leading-snug" style={{ fontSize: 15 }}>
            Nothing here yet. Finish a game and your wins, streaks and best time will show up.
          </p>
        ) : (
          <>
            {/* Win rate, with the games behind it */}
            <div
              className="rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.06)', padding: '16px 18px' }}
            >
              <div className="flex items-end justify-between gap-3">
                <span className="result-figure" style={{ fontSize: 'clamp(40px, 12vw, 52px)', color: 'var(--brass)' }}>
                  {winPct}%
                </span>
                <span className="text-[var(--text-soft)] text-right leading-snug" style={{ fontSize: 14 }}>
                  {stats.won} won of {stats.played} played
                </span>
              </div>
              <div className="mt-3 rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${winPct}%`, background: 'linear-gradient(90deg, var(--brass-deep), var(--brass))' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Streak" value={String(stats.currentStreak)} />
              <StatBox label="Best streak" value={String(stats.bestStreak)} />
              <StatBox label="Best time" value={formatBestTime(stats.bestTimeSeconds)} />
            </div>
          </>
        )}

        <button onClick={onClose} className="btn btn-primary w-full">
          Done
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl text-center"
      style={{ background: 'rgba(255,255,255,0.06)', padding: '14px 6px', gap: 6 }}
    >
      <span className="result-figure" style={{ fontSize: 'clamp(22px, 6.5vw, 28px)' }}>{value}</span>
      <span className="text-[var(--text-soft)] leading-tight" style={{ fontSize: 12.5 }}>{label}</span>
    </div>
  );
}
