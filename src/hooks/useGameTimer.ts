import { useState, useEffect, useRef } from 'react';
import type { GameType } from '../types';
import { LEGACY_GAME_ID } from '../utils/gameId';

interface UseGameTimerOptions {
  gameType: GameType;
  /** Identifies the current deal. The clock restarts from zero whenever it changes. */
  gameId: string;
  /** The clock only advances while this is true (and the page is visible). */
  isRunning: boolean;
}

interface TimerData {
  elapsedSeconds: number;
  gameId?: string;
}

function storageKey(gameType: GameType): string {
  return `shuffled-${gameType}-timer`;
}

function loadTimer(gameType: GameType, gameId: string): number {
  try {
    const raw = localStorage.getItem(storageKey(gameType));
    if (!raw) return 0;
    const parsed: TimerData = JSON.parse(raw);
    if ((parsed.gameId ?? LEGACY_GAME_ID) !== gameId) return 0;
    const seconds = Number(parsed.elapsedSeconds);
    return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  } catch {
    return 0;
  }
}

function saveTimer(gameType: GameType, data: TimerData): void {
  try {
    localStorage.setItem(storageKey(gameType), JSON.stringify(data));
  } catch {
    // silently ignore
  }
}

export function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const mmss = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

/**
 * Play clock for one deal. Counts only time actually spent playing: it stops
 * while `isRunning` is false, while the tab is hidden, and while the app is closed.
 */
export function useGameTimer({ gameType, gameId, isRunning }: UseGameTimerOptions) {
  const [timer, setTimer] = useState(() => ({ gameId, seconds: loadTimer(gameType, gameId) }));

  // A new deal starts from zero
  if (timer.gameId !== gameId) {
    setTimer({ gameId, seconds: 0 });
  }
  const elapsedSeconds = timer.gameId === gameId ? timer.seconds : 0;

  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const isActive = isRunning && pageVisible;

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setTimer(t => ({ ...t, seconds: t.seconds + 1 }));
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, gameId]);

  // Latest value for the save-on-exit handlers below
  const latest = useRef<TimerData>({ gameId, elapsedSeconds });
  useEffect(() => {
    latest.current = { gameId, elapsedSeconds };
  });

  // Persist every 5 seconds (not every tick) and whenever the clock stops or the deal changes
  const saveBucket = Math.floor(elapsedSeconds / 5);
  useEffect(() => {
    saveTimer(gameType, latest.current);
  }, [gameType, gameId, saveBucket, isActive]);

  // …and when leaving the game or closing the page
  useEffect(() => {
    const flush = () => saveTimer(gameType, latest.current);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [gameType]);

  return { elapsedSeconds, formattedTime: formatTime(elapsedSeconds) };
}
