import type { GameType } from '../types';

/**
 * Global config: controls which games appear on the home screen.
 * Toggle a game by adding/removing it from this list.
 */
export const ENABLED_GAMES: GameType[] = [
  'klondike',
  'freecell',
  // 'spider',    // hidden for now
  'mahjong',
  'wordsearch',
];
