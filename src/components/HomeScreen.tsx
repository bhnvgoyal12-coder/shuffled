import type { GameType } from '../types';
import { getBestScore } from '../utils/highScores';
import { ENABLED_GAMES } from '../config/enabledGames';
import { GameCard, type GameCardVariant } from './card/card';

interface HomeScreenProps {
  onSelectGame: (game: GameType) => void;
}

const GAMES: { type: GameType; name: string; description: string; variant: GameCardVariant }[] = [
  {
    type: 'klondike',
    name: 'Classic Solitaire',
    description: 'The classic solitaire card game',
    variant: 'hero',
  },
  {
    type: 'freecell',
    name: 'FreeCell',
    description: 'Use free cells strategically to win',
    variant: 'small',
  },
  {
    type: 'spider',
    name: 'Spider Solitaire',
    description: 'Build suit runs with two decks',
    variant: 'small',
  },
  {
    type: 'mahjong',
    name: 'Mahjong',
    description: 'Match pairs of free tiles',
    variant: 'small',
  },
  {
    type: 'wordsearch',
    name: 'Word Search',
    description: 'Find hidden words in the grid',
    variant: 'medium',
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
  const visibleGames = GAMES.filter(g => ENABLED_GAMES.includes(g.type));

  return (
    <div
      className="flex-1 flex flex-col items-center w-full overflow-y-auto"
      style={{ padding: 'clamp(16px, 4vw, 32px) clamp(12px, 3vw, 24px)' }}
    >
      {/* Logo */}
      <div className="text-center mb-4" style={{ marginBottom: 'clamp(20px, 3vh, 40px)' }}>
        <img
          src="/logo.png"
          alt="Shuffled — fanned playing cards"
          className="mx-auto block"
          style={{
            width: 'clamp(150px, 72vw, 200px)',
            height: 'auto',
            marginBottom: '4px',
          }}
          loading="eager"
        />
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
          Your favorite card and word games
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
            <GameCard
              key={game.type}
              variant={game.variant}
              title={game.name}
              subtitle={game.description}
              imageSrc={`/previews/${game.type}.png`}
              imageAlt={game.name}
              playLabel={hasSave ? 'Continue' : 'Play now'}
              bestScore={best?.score}
              onPlay={() => onSelectGame(game.type)}
            />
          );
        })}
      </div>
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
