import type { GameType } from '../types';

export interface GameStats {
  played: number;
  won: number;
  currentStreak: number;
  bestStreak: number;
  bestTimeSeconds: number | null; // fastest win in seconds
  /** The deal currently counted as "played" but not yet won. */
  activeGameId: string | null;
}

const DEFAULT_STATS: GameStats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestTimeSeconds: null,
  activeGameId: null,
};

function storageKey(game: GameType): string {
  return `shuffled-stats-${game}`;
}

export function getStats(game: GameType): GameStats {
  try {
    const raw = localStorage.getItem(storageKey(game));
    if (!raw) return { ...DEFAULT_STATS };
    const stats: GameStats = { ...DEFAULT_STATS, ...JSON.parse(raw) };
    // Older versions never counted the first game, so wins could outnumber games
    stats.played = Math.max(stats.played, stats.won);
    return stats;
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function saveStats(game: GameType, stats: GameStats): void {
  try {
    localStorage.setItem(storageKey(game), JSON.stringify(stats));
  } catch {
    // Storage unavailable
  }
}

/**
 * Count a deal as played. Call when the player makes their first move in it;
 * repeat calls for the same deal are ignored. Leaving an earlier deal unfinished
 * ends the win streak.
 */
export function recordGameStarted(game: GameType, gameId: string): void {
  const stats = getStats(game);
  if (stats.activeGameId === gameId) return;
  if (stats.activeGameId !== null) stats.currentStreak = 0;
  stats.played += 1;
  stats.activeGameId = gameId;
  saveStats(game, stats);
}

export function recordGameWon(game: GameType, gameId: string, timeSeconds: number): void {
  const stats = getStats(game);
  if (stats.activeGameId !== gameId) stats.played += 1; // won without ever being counted as started
  stats.activeGameId = null;
  stats.won += 1;
  stats.currentStreak += 1;
  if (stats.currentStreak > stats.bestStreak) {
    stats.bestStreak = stats.currentStreak;
  }
  if (timeSeconds > 0 && (stats.bestTimeSeconds === null || timeSeconds < stats.bestTimeSeconds)) {
    stats.bestTimeSeconds = timeSeconds;
  }
  saveStats(game, stats);
}

/** The deal reached a dead end. It stays active, so recovering (e.g. a Mahjong shuffle) can still win it. */
export function recordGameLost(game: GameType): void {
  const stats = getStats(game);
  stats.currentStreak = 0;
  saveStats(game, stats);
}

export function getWinPercent(stats: GameStats): number {
  if (stats.played === 0) return 0;
  return Math.min(100, Math.round((stats.won / stats.played) * 100));
}

export function formatBestTime(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
