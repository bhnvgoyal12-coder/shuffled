import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GameType } from '../types';

interface UseGameTimerOptions {
  gameType: GameType;
  isGameOver: boolean;
  timerEnabled: boolean;
}

interface TimerData {
  elapsedSeconds: number;
  lastTickTimestamp?: number;
}

function storageKey(gameType: GameType): string {
  return `shuffled-${gameType}-timer`;
}

function loadTimer(gameType: GameType, timerEnabled: boolean, isGameOver: boolean): number {
  try {
    const raw = localStorage.getItem(storageKey(gameType));
    if (!raw) return 0;
    const parsed: TimerData = JSON.parse(raw);
    let seconds = parsed.elapsedSeconds ?? 0;
    // Add wall-clock gap if game was active when page closed
    if (parsed.lastTickTimestamp && timerEnabled && !isGameOver) {
      const delta = Math.floor((Date.now() - parsed.lastTickTimestamp) / 1000);
      seconds += Math.max(0, delta);
    }
    return seconds;
  } catch {
    return 0;
  }
}

function saveTimer(gameType: GameType, elapsedSeconds: number, isActive: boolean): void {
  try {
    const data: TimerData = { elapsedSeconds };
    if (isActive) {
      data.lastTickTimestamp = Date.now();
    }
    localStorage.setItem(storageKey(gameType), JSON.stringify(data));
  } catch {
    // silently ignore
  }
}

export function useGameTimer({ gameType, isGameOver, timerEnabled }: UseGameTimerOptions) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() =>
    loadTimer(gameType, timerEnabled, isGameOver),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(elapsedSeconds);
  const wasReset = useRef(false);
  const isActive = timerEnabled && !isGameOver;

  // Keep ref in sync for cleanup closure
  useEffect(() => { elapsedRef.current = elapsedSeconds; }, [elapsedSeconds]);

  // Save WITHOUT timestamp on unmount → timer freezes when leaving
  // Skip if timer was just reset (to avoid overwriting the 0 with stale ref)
  useEffect(() => {
    return () => {
      if (!wasReset.current) {
        saveTimer(gameType, elapsedRef.current, false);
      }
    };
  }, [gameType]);

  // Start/stop interval
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive]);

  // Persist every 5 seconds (not every tick) to reduce writes
  useEffect(() => {
    saveTimer(gameType, elapsedSeconds, isActive);
  }, [Math.floor(elapsedSeconds / 5), gameType, isActive]);

  // Also persist on game over transition
  useEffect(() => {
    if (isGameOver) {
      saveTimer(gameType, elapsedSeconds, false);
    }
  }, [isGameOver, gameType, elapsedSeconds]);

  const resetTimer = useCallback(() => {
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    wasReset.current = true;
    saveTimer(gameType, 0, true);
  }, [gameType]);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [elapsedSeconds]);

  return { elapsedSeconds, resetTimer, formattedTime };
}
