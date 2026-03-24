import React, { useState } from 'react';
import type { GameType } from '../types';
import { HowToPlayModal } from './HowToPlayModal';
import { trackOpenHelp } from '../utils/analytics';
import { getBestScore } from '../utils/highScores';
import { ENABLED_GAMES } from '../config/enabledGames';

interface HomeScreenProps {
  onSelectGame: (game: GameType) => void;
}

const GAMES: { type: GameType; name: string; description: string; preview?: React.ReactNode }[] = [
  {
    type: 'klondike',
    name: 'Classic Solitaire',
    description: 'The classic solitaire card game',
  },
  {
    type: 'freecell',
    name: 'FreeCell',
    description: 'Use free cells strategically to win',
  },
  {
    type: 'spider',
    name: 'Spider Solitaire',
    description: 'Build suit runs with two decks',
  },
  {
    type: 'mahjong',
    name: 'Mahjong',
    description: 'Match pairs of free tiles',
  },
  {
    type: 'wordsearch',
    name: 'Word Search',
    description: 'Find hidden words in the grid',
    preview: <WordSearchPreview />,
  },
];

const STORAGE_KEYS: Record<GameType, string> = {
  klondike: 'shuffled-klondike-state',
  freecell: 'shuffled-freecell-state',
  spider: 'shuffled-spider-state',
  mahjong: 'shuffled-mahjong-state',
  wordsearch: 'shuffled-wordsearch-state',
};

export function HomeScreen({ onSelectGame }: HomeScreenProps) {
  const [helpGame, setHelpGame] = useState<GameType | null>(null);
  const visibleGames = GAMES.filter(g => ENABLED_GAMES.includes(g.type));

  return (
    <div
      className="flex-1 flex flex-col items-center w-full overflow-y-auto"
      style={{ padding: 'clamp(16px, 4vw, 32px) clamp(12px, 3vw, 24px)' }}
    >
      {/* Logo */}
      <div className="text-center mb-4" style={{ marginTop: 'clamp(12px, 3vh, 32px)' }}>
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
        {visibleGames.map((game) => {
          const hasSave = hasSavedGame(game.type);
          const best = getBestScore(game.type);

          return (
            <button
              key={game.type}
              className="win-card-bg rounded-2xl border-none cursor-pointer text-left transition-[transform,box-shadow] duration-200 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] active:scale-[0.98] flex flex-col"
              style={{ padding: 'clamp(10px, 2.5vw, 16px)' }}
              onClick={() => onSelectGame(game.type)}
            >
              {/* Preview */}
              <div
                className="w-full rounded-lg overflow-hidden"
                style={{ height: 'clamp(85px, 22vw, 130px)' }}
              >
                {game.preview ? (
                  <div className="w-full h-full bg-[#1b5e20] flex items-end justify-center" style={{ padding: '16px 6px 8px' }}>
                    {game.preview}
                  </div>
                ) : (
                  <img
                    src={`/previews/${game.type}.png`}
                    alt={game.name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                )}
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
              {best && (
                <p
                  className="text-[#F57F17] m-0 font-semibold"
                  style={{ fontSize: 'clamp(9px, 2vw, 11px)', marginTop: '3px' }}
                >
                  Best: {best.score}
                </p>
              )}

              {/* Bottom row */}
              <div className="flex items-center justify-between" style={{ marginTop: 'clamp(6px, 1.5vw, 10px)' }}>
                <span
                  className="text-[#2e7d32]/70 hover:text-[#2e7d32] transition-colors underline decoration-[#2e7d32]/30"
                  style={{ fontSize: 'clamp(9px, 2vw, 11px)' }}
                  onClick={(e) => { e.stopPropagation(); trackOpenHelp(game.type); setHelpGame(game.type); }}
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

function WordSearchPreview() {
  const letters = ['F', 'I', 'N', 'D', 'W', 'O', 'R', 'D', 'S'];
  return (
    <div className="grid grid-cols-3 gap-[2px]">
      {letters.map((l, i) => (
        <div
          key={i}
          className="flex items-center justify-center font-bold text-white/90 rounded-[2px]"
          style={{
            width: 'clamp(14px, 3.5vw, 20px)',
            height: 'clamp(14px, 3.5vw, 20px)',
            fontSize: 'clamp(8px, 2vw, 11px)',
            background: [0, 1, 2, 3].includes(i) ? 'rgba(76,175,80,0.7)' : 'rgba(255,255,255,0.15)',
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
}

