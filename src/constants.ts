import type { Suit, Rank, Color, Settings, CardBackTheme } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

export const SUIT_COLORS: Record<Suit, Color> = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black',
};

export const FOUNDATION_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export const DEFAULT_SETTINGS: Settings = {
  drawMode: 1,
  cardBackTheme: 'blue',
  soundEnabled: true,
  autoMoveToFoundation: false,
  spiderSuitCount: 1,
  homeLayout: 'list',
  timerEnabled: true,
};

export const CARD_BACK_THEMES: Record<CardBackTheme, { color1: string; color2: string; border: string }> = {
  blue:   { color1: '#1565C0', color2: '#1976D2', border: '#1565C0' },
  red:    { color1: '#C62828', color2: '#E53935', border: '#C62828' },
  green:  { color1: '#2E7D32', color2: '#43A047', border: '#2E7D32' },
  purple: { color1: '#6A1B9A', color2: '#8E24AA', border: '#6A1B9A' },
  gold:   { color1: '#E65100', color2: '#F57C00', border: '#E65100' },
};
