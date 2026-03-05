import React, { useState } from 'react';
import type { GameType } from '../types';
import { HowToPlayModal } from './HowToPlayModal';

interface HomeScreenProps {
  onSelectGame: (game: GameType) => void;
}

const GAMES: { type: GameType; name: string; description: string; preview: React.ReactNode }[] = [
  {
    type: 'klondike',
    name: 'Classic Solitaire',
    description: 'The classic solitaire card game',
    preview: <KlondikePreview />,
  },
  {
    type: 'freecell',
    name: 'FreeCell',
    description: 'Use free cells strategically to win',
    preview: <FreeCellPreview />,
  },
  {
    type: 'spider',
    name: 'Spider Solitaire',
    description: 'Build suit runs with two decks',
    preview: <SpiderPreview />,
  },
  {
    type: 'mahjong',
    name: 'Mahjong',
    description: 'Match pairs of free tiles',
    preview: <MahjongPreview />,
  },
];

const STORAGE_KEYS: Record<GameType, string> = {
  klondike: 'shuffled-klondike-state',
  freecell: 'shuffled-freecell-state',
  spider: 'shuffled-spider-state',
  mahjong: 'shuffled-mahjong-state',
};

export function HomeScreen({ onSelectGame }: HomeScreenProps) {
  const [helpGame, setHelpGame] = useState<GameType | null>(null);

  return (
    <div
      className="flex-1 flex flex-col items-center w-full overflow-y-auto"
      style={{ padding: 'clamp(16px, 4vw, 32px) clamp(12px, 3vw, 24px)' }}
    >
      {/* Logo */}
      <div className="text-center mb-6" style={{ marginTop: 'clamp(24px, 6vh, 56px)' }}>
        {/* Fanned card suits */}
        <div className="flex items-center justify-center mb-2" style={{ gap: 'clamp(2px, 0.8vw, 6px)' }}>
          {(['#e53935', '#333', '#e53935', '#333'] as const).map((color, i) => (
            <div
              key={i}
              className="bg-white/95 rounded-[3px] flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
              style={{
                width: 'clamp(22px, 5.5vw, 30px)',
                height: 'clamp(30px, 7.5vw, 42px)',
                fontSize: 'clamp(14px, 3.5vw, 20px)',
                color,
                transform: `rotate(${(i - 1.5) * 6}deg)`,
              }}
            >
              {['\u2665', '\u2663', '\u2666', '\u2660'][i]}
            </div>
          ))}
        </div>
        <h1
          className="text-white font-extrabold italic m-0"
          style={{
            fontSize: 'clamp(36px, 10vw, 56px)',
            textShadow: '0 2px 12px rgba(0,0,0,0.3), 0 0 40px rgba(255,255,255,0.08)',
            letterSpacing: '-1px',
            transform: 'rotate(-2deg)',
          }}
        >
          Shuffled
        </h1>
        <p className="text-white/45 m-0 tracking-wide uppercase font-medium" style={{ fontSize: 'clamp(9px, 2.2vw, 12px)', letterSpacing: '2.5px', marginTop: '2px' }}>
          Your favorite card games
        </p>
      </div>

      {/* Game Cards — always 2-column grid */}
      <div
        className="grid grid-cols-2 w-full"
        style={{
          gap: 'clamp(10px, 2.5vw, 16px)',
          maxWidth: 'clamp(300px, 92vw, 480px)',
        }}
      >
        {GAMES.map((game) => {
          const hasSave = hasSavedGame(game.type);

          return (
            <button
              key={game.type}
              className="win-card-bg rounded-2xl border-none cursor-pointer text-left transition-[transform,box-shadow] duration-200 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] active:scale-[0.98] flex flex-col"
              style={{ padding: 'clamp(10px, 2.5vw, 16px)' }}
              onClick={() => onSelectGame(game.type)}
            >
              {/* Preview */}
              <div
                className="w-full rounded-lg bg-[#1b5e20] flex items-end justify-center overflow-hidden"
                style={{
                  height: 'clamp(68px, 18vw, 92px)',
                  padding: '12px 6px 6px',
                }}
              >
                {game.preview}
              </div>

              {/* Text content */}
              <h3
                className="font-bold text-[#2e7d32] m-0"
                style={{ fontSize: 'clamp(12px, 3vw, 15px)', marginTop: 'clamp(6px, 1.5vw, 10px)' }}
              >
                {game.name}
              </h3>
              <p
                className="text-[#888] m-0 leading-snug"
                style={{ fontSize: 'clamp(9px, 2vw, 11px)', marginTop: '2px' }}
              >
                {game.description}
              </p>

              {/* Bottom row */}
              <div className="flex items-center justify-between" style={{ marginTop: 'clamp(6px, 1.5vw, 10px)' }}>
                <span
                  className="text-[#2e7d32]/70 hover:text-[#2e7d32] transition-colors underline decoration-[#2e7d32]/30"
                  style={{ fontSize: 'clamp(9px, 2vw, 11px)' }}
                  onClick={(e) => { e.stopPropagation(); setHelpGame(game.type); }}
                >
                  How to play
                </span>
                <div
                  className={`shrink-0 rounded-full font-semibold whitespace-nowrap ${
                    hasSave
                      ? 'bg-[#FFC107]/20 text-[#F57F17]'
                      : 'bg-[#2e7d32]/10 text-[#2e7d32]'
                  }`}
                  style={{
                    padding: 'clamp(2px, 0.6vw, 4px) clamp(8px, 2vw, 12px)',
                    fontSize: 'clamp(9px, 2vw, 11px)',
                  }}
                >
                  {hasSave ? 'Continue' : 'Play'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {helpGame && (
        <HowToPlayModal gameType={helpGame} onClose={() => setHelpGame(null)} />
      )}
    </div>
  );
}

function hasSavedGame(game: GameType): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS[game]) !== null;
  } catch {
    return false;
  }
}

// ── Mini Previews ─────────────────────────────────────────────

function MiniCard({ faceUp = true, className = '' }: { faceUp?: boolean; className?: string }) {
  return (
    <div
      className={`rounded-[2px] ${faceUp ? 'bg-white' : 'bg-[#1565C0]'} ${className}`}
      style={{
        width: 'clamp(6px, 1.5vw, 8px)',
        height: 'clamp(9px, 2.2vw, 12px)',
        boxShadow: '0 0.5px 1px rgba(0,0,0,0.2)',
      }}
    />
  );
}

function KlondikePreview() {
  return (
    <div className="flex items-end gap-[2px]">
      {[1, 2, 3, 4, 5, 6, 7].map((count, col) => (
        <div key={col} className="flex flex-col-reverse gap-[1px]">
          {Array.from({ length: count }, (_, i) => (
            <MiniCard key={i} faceUp={i === 0} />
          ))}
        </div>
      ))}
    </div>
  );
}

function FreeCellPreview() {
  return (
    <div className="flex flex-col gap-[2px] items-center">
      <div className="flex gap-[2px]">
        {Array.from({ length: 8 }, (_, i) => (
          <MiniCard key={i} faceUp={i < 4 ? false : true} />
        ))}
      </div>
      <div className="flex gap-[2px]">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-[1px]">
            <MiniCard faceUp />
            <MiniCard faceUp />
          </div>
        ))}
      </div>
    </div>
  );
}

function SpiderPreview() {
  return (
    <div className="flex items-end gap-[1px]">
      {Array.from({ length: 10 }, (_, col) => {
        const count = col < 4 ? 3 : 2;
        return (
          <div key={col} className="flex flex-col-reverse gap-[1px]">
            {Array.from({ length: count }, (_, i) => (
              <MiniCard key={i} faceUp={i === 0} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function MiniTile() {
  return (
    <div
      className="rounded-[1px]"
      style={{
        width: 'clamp(7px, 1.8vw, 10px)',
        height: 'clamp(9px, 2.2vw, 12px)',
        background: 'linear-gradient(145deg, #fffff0, #e8e0c8)',
        boxShadow: '0.5px 0.5px 1px rgba(0,0,0,0.25)',
        border: '0.5px solid #c0b090',
      }}
    />
  );
}

function MahjongPreview() {
  return (
    <div className="flex flex-col items-center gap-[1px]">
      <MiniTile />
      <div className="flex gap-[1px]">
        <MiniTile /><MiniTile /><MiniTile />
      </div>
      <div className="flex gap-[1px]">
        <MiniTile /><MiniTile /><MiniTile /><MiniTile /><MiniTile />
      </div>
    </div>
  );
}
