import type { MahjongTile, PlacedTile, LayoutPosition, MahjongGameState } from './types';
import { createTileSet, TURTLE_LAYOUT } from './constants';
import { newGameId } from '../../utils/gameId';

// ── Shuffle ───────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Solvable arrangements ─────────────────────────────────────

const ARRANGE_ATTEMPTS = 40;

export interface SolvableArrangement {
  tiles: PlacedTile[];
  /** Pairs of tile ids which, removed in this order, clear the board. */
  solution: [string, string][];
}

/**
 * Lay the tiles out on the given positions so the board can be cleared.
 *
 * Works backwards from a finished game: repeatedly take two positions that are
 * free on the (shrinking) board and give them a matching pair. Removing the
 * pairs in that same order is then always a valid solution.
 * Returns null if this attempt painted itself into a corner (or the tiles
 * cannot be split into matching pairs at all).
 */
export function tryArrangeSolvable(tiles: MahjongTile[], positions: LayoutPosition[]): SolvableArrangement | null {
  const byKey = new Map<string, MahjongTile[]>();
  for (const tile of tiles) {
    const group = byKey.get(tile.matchKey);
    if (group) group.push(tile);
    else byKey.set(tile.matchKey, [tile]);
  }
  const pairs: [MahjongTile, MahjongTile][] = [];
  for (const group of byKey.values()) {
    if (group.length % 2 !== 0) return null;
    const shuffled = shuffleArray(group);
    for (let i = 0; i < shuffled.length; i += 2) pairs.push([shuffled[i], shuffled[i + 1]]);
  }

  // Placeholder tiles, one per position, standing in for "something is here"
  let remaining: PlacedTile[] = positions.map((position, i) => ({
    tile: { id: `slot-${i}` } as MahjongTile,
    position,
  }));
  const slotIndex = new Map(remaining.map((slot, i) => [slot.tile.id, i]));
  const assigned: MahjongTile[] = new Array(positions.length);
  const solution: [string, string][] = [];

  for (const [a, b] of shuffleArray(pairs)) {
    const free = shuffleArray(getFreeTiles(remaining));
    if (free.length < 2) return null;
    const [first, second] = free;
    assigned[slotIndex.get(first.tile.id)!] = a;
    assigned[slotIndex.get(second.tile.id)!] = b;
    solution.push([a.id, b.id]);
    remaining = remaining.filter(slot => slot !== first && slot !== second);
  }

  return {
    tiles: positions.map((position, i) => ({ tile: assigned[i], position })),
    solution,
  };
}

function arrangeTiles(tiles: MahjongTile[], positions: LayoutPosition[]): PlacedTile[] {
  for (let attempt = 0; attempt < ARRANGE_ATTEMPTS; attempt++) {
    const arranged = tryArrangeSolvable(tiles, positions);
    if (arranged) return arranged.tiles;
  }
  // No guaranteed-solvable arrangement found — fall back to a plain shuffle
  const shuffled = shuffleArray(tiles);
  return positions.map((position, i) => ({ tile: shuffled[i], position }));
}

// ── Deal ──────────────────────────────────────────────────────

export function dealGame(layout: LayoutPosition[] = TURTLE_LAYOUT): MahjongGameState {
  return {
    gameId: newGameId(),
    tiles: arrangeTiles(createTileSet(), layout),
    removedPairs: [],
    selectedTile: null,
    moves: 0,
    score: 0,
    history: [],
    hasWon: false,
    hasLost: false,
  };
}

// ── Position lookup helpers ───────────────────────────────────


// ── Free tile detection ───────────────────────────────────────
// A tile is "free" if:
// 1. No tile is on the layer directly above covering it
// 2. At least one side (left or right) is unblocked on the same layer
//
// Tiles use even-spaced columns (step of 2) so a tile at col C
// is adjacent to tiles at col C-2 (left) and col C+2 (right).
// For upper layers with odd offsets, we check overlap within 2 cols.

export function isTileFree(tile: PlacedTile, allTiles: PlacedTile[]): boolean {
  const { row, col, layer } = tile.position;

  // Check if blocked from above: any tile on layer+1 whose position
  // overlaps with this tile. Overlap if |row diff| < 2 AND |col diff| < 2.
  for (const t of allTiles) {
    if (t.position.layer === layer + 1) {
      if (Math.abs(t.position.row - row) < 2 && Math.abs(t.position.col - col) < 2) {
        return false;
      }
    }
  }

  // Check left/right blocking on same layer.
  // A tile is blocked on the left if any tile at same layer has
  // col = col-2 and |row diff| < 2.
  let blockedLeft = false;
  let blockedRight = false;
  for (const t of allTiles) {
    if (t.position.layer !== layer || t.tile.id === tile.tile.id) continue;
    const rowDiff = Math.abs(t.position.row - row);
    if (rowDiff < 2) {
      if (t.position.col === col - 2) blockedLeft = true;
      if (t.position.col === col + 2) blockedRight = true;
    }
  }

  return !blockedLeft || !blockedRight;
}

export function isTileFreeFast(
  tile: PlacedTile,
  allTiles: PlacedTile[],
): boolean {
  const { row, col, layer } = tile.position;

  // Check above: scan tiles on layer+1 for overlaps
  for (const t of allTiles) {
    if (t.position.layer === layer + 1) {
      if (Math.abs(t.position.row - row) < 2 && Math.abs(t.position.col - col) < 2) {
        return false;
      }
    }
  }

  // Check left/right on same layer
  let blockedLeft = false;
  let blockedRight = false;
  for (const t of allTiles) {
    if (t.position.layer !== layer || t.tile.id === tile.tile.id) continue;
    if (Math.abs(t.position.row - row) < 2) {
      if (t.position.col === col - 2) blockedLeft = true;
      if (t.position.col === col + 2) blockedRight = true;
    }
    if (blockedLeft && blockedRight) return false;
  }

  return true;
}

export function getFreeTiles(tiles: PlacedTile[]): PlacedTile[] {
  return tiles.filter(t => isTileFreeFast(t, tiles));
}

// ── Matching ──────────────────────────────────────────────────

export function tilesMatch(a: MahjongTile, b: MahjongTile): boolean {
  return a.id !== b.id && a.matchKey === b.matchKey;
}

export function findValidPairs(tiles: PlacedTile[]): [PlacedTile, PlacedTile][] {
  const free = getFreeTiles(tiles);
  const pairs: [PlacedTile, PlacedTile][] = [];
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (tilesMatch(free[i].tile, free[j].tile)) {
        pairs.push([free[i], free[j]]);
      }
    }
  }
  return pairs;
}

// ── Remove pair ───────────────────────────────────────────────

export function removePair(
  state: MahjongGameState,
  tileId1: string,
  tileId2: string
): MahjongGameState {
  const historyEntry = {
    tiles: state.tiles,
    removedPairs: state.removedPairs,
    moves: state.moves,
    score: state.score,
  };

  const newTiles = state.tiles.filter(
    t => t.tile.id !== tileId1 && t.tile.id !== tileId2
  );
  const newScore = state.score + 10;
  const newMoves = state.moves + 1;
  const hasWon = newTiles.length === 0;
  const hasLost = !hasWon && findValidPairs(newTiles).length === 0;

  return {
    gameId: state.gameId,
    tiles: newTiles,
    removedPairs: [...state.removedPairs, [tileId1, tileId2]],
    selectedTile: null,
    moves: newMoves,
    score: newScore,
    history: [...state.history, historyEntry],
    hasWon,
    hasLost,
  };
}

// ── Shuffle remaining tiles ───────────────────────────────────

export function shuffleRemainingTiles(state: MahjongGameState): MahjongGameState {
  // Same positions, new faces — arranged so the rest of the board can be cleared
  const newTiles = arrangeTiles(
    state.tiles.map(t => t.tile),
    state.tiles.map(t => t.position),
  );

  const hasLost = findValidPairs(newTiles).length === 0;

  return {
    ...state,
    tiles: newTiles,
    selectedTile: null,
    score: Math.max(0, state.score - 50),
    hasLost,
  };
}

// ── Hint ──────────────────────────────────────────────────────

export function getHint(tiles: PlacedTile[]): [string, string] | null {
  const pairs = findValidPairs(tiles);
  if (pairs.length === 0) return null;
  return [pairs[0][0].tile.id, pairs[0][1].tile.id];
}

// ── Win/Lose ──────────────────────────────────────────────────

export function checkWin(tiles: PlacedTile[]): boolean {
  return tiles.length === 0;
}

export function checkLose(tiles: PlacedTile[]): boolean {
  return tiles.length > 0 && findValidPairs(tiles).length === 0;
}
