/**
 * Google Analytics 4 event tracking utility.
 *
 * Wraps `gtag('event', ...)` so the rest of the app stays clean
 * and we get type-safe event names + params.
 */

type GameType = 'klondike' | 'freecell' | 'spider' | 'mahjong';

/* global gtag shim — defined in index.html */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function track(event: string, params?: Record<string, string | number | boolean>) {
  window.gtag?.('event', event, params);
}

// ── Navigation ───────────────────────────────────────────────

/** User selects a game from the home screen */
export function trackGameSelect(game: GameType) {
  track('game_select', { game });
}

/** User returns to the home screen */
export function trackGoHome() {
  track('go_home');
}

// ── Game lifecycle ───────────────────────────────────────────

/** User starts a new game */
export function trackNewGame(game: GameType) {
  track('new_game', { game });
}

/** User wins a game */
export function trackGameWon(game: GameType, moves: number, seconds: number, score: number) {
  track('game_won', { game, moves, seconds, score });
}

/** User loses (Mahjong: no more moves) */
export function trackGameLost(game: GameType, moves: number) {
  track('game_lost', { game, moves });
}

// ── In-game actions ──────────────────────────────────────────

/** User taps Undo */
export function trackUndo(game: GameType) {
  track('undo', { game });
}

/** User triggers auto-complete */
export function trackAutoComplete(game: GameType) {
  track('auto_complete', { game });
}

/** Mahjong: user requests a hint */
export function trackHint() {
  track('hint', { game: 'mahjong' });
}

/** Mahjong: user shuffles remaining tiles */
export function trackShuffle() {
  track('shuffle', { game: 'mahjong' });
}

// ── Settings ─────────────────────────────────────────────────

/** User changes a setting */
export function trackSettingChange(setting: string, value: string | number | boolean) {
  track('setting_change', { setting, value: String(value) });
}

// ── Modals ───────────────────────────────────────────────────

/** User opens "How to play" */
export function trackOpenHelp(game: GameType) {
  track('open_help', { game });
}

/** User opens settings */
export function trackOpenSettings(game: GameType) {
  track('open_settings', { game });
}
