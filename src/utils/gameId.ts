/** Unique id for one deal, used to tie the clock and stats to the game they belong to. */
export function newGameId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Deals saved before game ids existed are loaded with this id. */
export const LEGACY_GAME_ID = 'legacy';
