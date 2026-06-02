import type { GameType } from '../types';

export interface GameStats {
  played: number;
  won: number;
  currentStreak: number;
  bestStreak: number;
  bestTimeSeconds: number | null; // fastest win in seconds
}

const DEFAULT_STATS: GameStats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestTimeSeconds: null,
};

function storageKey(game: GameType): string {
  return `shuffled-stats-${game}`;
}

export function getStats(game: GameType): GameStats {
  try {
    const raw = localStorage.getItem(storageKey(game));
    if (!raw) return { ...DEFAULT_STATS };
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function recordGamePlayed(game: GameType): void {
  try {
    const stats = getStats(game);
    stats.played += 1;
    localStorage.setItem(storageKey(game), JSON.stringify(stats));
  } catch {}
}

export function recordGameWon(game: GameType, timeSeconds: number): void {
  try {
    const stats = getStats(game);
    stats.won += 1;
    stats.currentStreak += 1;
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
    if (stats.bestTimeSeconds === null || timeSeconds < stats.bestTimeSeconds) {
      stats.bestTimeSeconds = timeSeconds;
    }
    localStorage.setItem(storageKey(game), JSON.stringify(stats));
  } catch {}
}

export function recordGameLost(game: GameType): void {
  try {
    const stats = getStats(game);
    stats.currentStreak = 0;
    localStorage.setItem(storageKey(game), JSON.stringify(stats));
  } catch {}
}

export function getWinPercent(stats: GameStats): number {
  if (stats.played === 0) return 0;
  return Math.round((stats.won / stats.played) * 100);
}

export function formatBestTime(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function getAllStats(): Record<GameType, GameStats> {
  const games: GameType[] = ['klondike', 'freecell', 'mahjong', 'wordsearch'];
  const result = {} as Record<GameType, GameStats>;
  for (const g of games) result[g] = getStats(g);
  return result;
}
