import type { GameType } from '../types';
import { getStats, getWinPercent, formatBestTime } from '../utils/gameStats';

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

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl flex flex-col"
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: 'clamp(20px, 5vw, 32px)',
          width: 'clamp(280px, 85vw, 360px)',
          gap: '20px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold m-0" style={{ fontSize: 'clamp(16px, 4vw, 20px)' }}>
            {GAME_NAMES[gameType]} Stats
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors rounded-full flex items-center justify-center"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', fontSize: 18 }}
          >
            ×
          </button>
        </div>

        {/* Big numbers row */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Played" value={String(stats.played)} />
          <StatBox label="Won" value={String(stats.won)} />
          <StatBox label="Win %" value={`${winPct}%`} highlight />
        </div>

        {/* Second row */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Current Streak" value={String(stats.currentStreak)} />
          <StatBox label="Best Streak" value={String(stats.bestStreak)} />
        </div>

        {/* Best time */}
        <div>
          <StatBox label="Best Time" value={formatBestTime(stats.bestTimeSeconds)} wide />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full font-semibold rounded-xl transition-opacity hover:opacity-90"
          style={{
            background: '#2e7d32',
            color: 'white',
            border: 'none',
            padding: '12px',
            cursor: 'pointer',
            fontSize: 15,
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value, highlight, wide }: { label: string; value: string; highlight?: boolean; wide?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl${wide ? ' w-full' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        padding: '12px 8px',
        gap: 4,
      }}
    >
      <span
        className="font-bold"
        style={{
          fontSize: 'clamp(22px, 6vw, 32px)',
          color: highlight ? '#4caf50' : 'white',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        className="uppercase tracking-wide text-center"
        style={{ fontSize: 'clamp(9px, 2.2vw, 11px)', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em' }}
      >
        {label}
      </span>
    </div>
  );
}
