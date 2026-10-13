import { describe, it, expect } from 'vitest';
import type { MahjongTile, PlacedTile, MahjongGameState } from '../types';
import {
  dealGame,
  isTileFree,
  isTileFreeFast,
  getFreeTiles,
  tilesMatch,
  findValidPairs,
  removePair,
  shuffleRemainingTiles,
  tryArrangeSolvable,
  getHint,
  checkWin,
  checkLose,
} from '../gameLogic';
import { createTileSet, TURTLE_LAYOUT } from '../constants';

// ── Helpers ──────────────────────────────────────────────────

function makeTile(id: string, matchKey: string): MahjongTile {
  return {
    id,
    category: 'suited',
    suit: 'bamboo',
    rank: 1,
    matchKey,
    symbol: '1',
    label: 'Bamboo 1',
    color: '#2e7d32',
  };
}

function placeTile(
  id: string,
  matchKey: string,
  row: number,
  col: number,
  layer: number,
): PlacedTile {
  return {
    tile: makeTile(id, matchKey),
    position: { row, col, layer },
  };
}

function emptyState(overrides: Partial<MahjongGameState> = {}): MahjongGameState {
  return {
    gameId: 'test',
    tiles: [],
    removedPairs: [],
    selectedTile: null,
    moves: 0,
    score: 0,
    history: [],
    hasWon: false,
    hasLost: false,
    ...overrides,
  };
}

// ── createTileSet ────────────────────────────────────────────

describe('createTileSet', () => {
  it('creates exactly 144 tiles', () => {
    const tiles = createTileSet();
    expect(tiles).toHaveLength(144);
  });

  it('has unique IDs for every tile', () => {
    const tiles = createTileSet();
    const ids = new Set(tiles.map(t => t.id));
    expect(ids.size).toBe(144);
  });

  it('has 108 suited tiles (3 suits × 9 ranks × 4 copies)', () => {
    const tiles = createTileSet();
    const suited = tiles.filter(t => t.category === 'suited');
    expect(suited).toHaveLength(108);
  });

  it('has 16 wind tiles (4 winds × 4 copies)', () => {
    const tiles = createTileSet();
    const winds = tiles.filter(t => t.category === 'wind');
    expect(winds).toHaveLength(16);
  });

  it('has 12 dragon tiles (3 dragons × 4 copies)', () => {
    const tiles = createTileSet();
    const dragons = tiles.filter(t => t.category === 'dragon');
    expect(dragons).toHaveLength(12);
  });

  it('has 4 season tiles and 4 flower tiles', () => {
    const tiles = createTileSet();
    expect(tiles.filter(t => t.category === 'season')).toHaveLength(4);
    expect(tiles.filter(t => t.category === 'flower')).toHaveLength(4);
  });

  it('seasons all share the same matchKey', () => {
    const tiles = createTileSet();
    const seasons = tiles.filter(t => t.category === 'season');
    const keys = new Set(seasons.map(t => t.matchKey));
    expect(keys.size).toBe(1);
    expect(keys.has('season')).toBe(true);
  });

  it('flowers all share the same matchKey', () => {
    const tiles = createTileSet();
    const flowers = tiles.filter(t => t.category === 'flower');
    const keys = new Set(flowers.map(t => t.matchKey));
    expect(keys.size).toBe(1);
    expect(keys.has('flower')).toBe(true);
  });
});

// ── TURTLE_LAYOUT ────────────────────────────────────────────

describe('TURTLE_LAYOUT', () => {
  it('has exactly 144 positions', () => {
    expect(TURTLE_LAYOUT).toHaveLength(144);
  });

  it('uses 5 layers (0-4)', () => {
    const layers = new Set(TURTLE_LAYOUT.map(p => p.layer));
    expect(layers).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('is the classic turtle: 87 / 36 / 16 / 4 / 1 tiles per layer', () => {
    const perLayer = [0, 1, 2, 3, 4].map(layer => TURTLE_LAYOUT.filter(p => p.layer === layer).length);
    expect(perLayer).toEqual([87, 36, 16, 4, 1]);
  });

  it('never puts two tiles in the same or an overlapping spot', () => {
    for (let i = 0; i < TURTLE_LAYOUT.length; i++) {
      for (let j = i + 1; j < TURTLE_LAYOUT.length; j++) {
        const a = TURTLE_LAYOUT[i];
        const b = TURTLE_LAYOUT[j];
        const overlaps = a.layer === b.layer && Math.abs(a.row - b.row) < 2 && Math.abs(a.col - b.col) < 2;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('rests every upper tile on at least one tile of the layer below', () => {
    for (const tile of TURTLE_LAYOUT.filter(p => p.layer > 0)) {
      const supported = TURTLE_LAYOUT.some(p =>
        p.layer === tile.layer - 1 && Math.abs(p.row - tile.row) < 2 && Math.abs(p.col - tile.col) < 2
      );
      expect(supported).toBe(true);
    }
  });
});

// ── Solvable deals ───────────────────────────────────────────

describe('solvable arrangements', () => {
  it('lays out a full set with a solution that really clears the board', () => {
    let checked = 0;
    for (let attempt = 0; attempt < 60 && checked < 5; attempt++) {
      const arranged = tryArrangeSolvable(createTileSet(), TURTLE_LAYOUT);
      if (!arranged) continue; // an attempt may paint itself into a corner; dealGame retries
      checked++;

      expect(arranged.tiles).toHaveLength(144);
      expect(arranged.solution).toHaveLength(72);

      let tiles = arranged.tiles;
      for (const [idA, idB] of arranged.solution) {
        const a = tiles.find(t => t.tile.id === idA)!;
        const b = tiles.find(t => t.tile.id === idB)!;
        expect(tilesMatch(a.tile, b.tile)).toBe(true);
        expect(isTileFree(a, tiles)).toBe(true);
        expect(isTileFree(b, tiles)).toBe(true);
        tiles = tiles.filter(t => t !== a && t !== b);
      }
      expect(tiles).toHaveLength(0);
    }
    expect(checked).toBe(5);
  });

  it('returns null when the tiles cannot be paired up', () => {
    const tiles = [makeTile('a', 'k1'), makeTile('b', 'k2')];
    const positions = [{ row: 0, col: 0, layer: 0 }, { row: 0, col: 8, layer: 0 }];
    expect(tryArrangeSolvable(tiles, positions)).toBeNull();
  });

  it('deals a board that starts with moves available', () => {
    for (let i = 0; i < 10; i++) {
      const state = dealGame();
      expect(findValidPairs(state.tiles).length).toBeGreaterThan(0);
      expect(new Set(state.tiles.map(t => t.tile.id)).size).toBe(144);
    }
  });

  it('shuffles the remaining tiles into a position with moves available', () => {
    let state = dealGame();
    for (let i = 0; i < 20; i++) {
      const [a, b] = findValidPairs(state.tiles)[0];
      state = removePair(state, a.tile.id, b.tile.id);
    }
    const shuffled = shuffleRemainingTiles(state);
    expect(shuffled.tiles).toHaveLength(state.tiles.length);
    expect(shuffled.tiles.map(t => t.position)).toEqual(state.tiles.map(t => t.position));
    expect(shuffled.hasLost).toBe(false);
  });
});

// ── dealGame ─────────────────────────────────────────────────

describe('dealGame', () => {
  it('creates a game with 144 placed tiles', () => {
    const state = dealGame();
    expect(state.tiles).toHaveLength(144);
  });

  it('starts with zero moves and score', () => {
    const state = dealGame();
    expect(state.moves).toBe(0);
    expect(state.score).toBe(0);
  });

  it('starts with no selection, no win/loss', () => {
    const state = dealGame();
    expect(state.selectedTile).toBeNull();
    expect(state.hasWon).toBe(false);
    expect(state.hasLost).toBe(false);
  });

  it('shuffles tiles across deals', () => {
    const a = dealGame();
    const b = dealGame();
    // It's theoretically possible for two shuffles to be identical,
    // but astronomically unlikely with 144 tiles
    const aIds = a.tiles.map(t => t.tile.id);
    const bIds = b.tiles.map(t => t.tile.id);
    expect(aIds).not.toEqual(bIds);
  });
});

// ── isTileFree / isTileFreeFast ──────────────────────────────

describe('isTileFree', () => {
  it('returns true for a lone tile', () => {
    const tile = placeTile('a', 'k1', 0, 0, 0);
    expect(isTileFree(tile, [tile])).toBe(true);
  });

  it('returns false when blocked from above', () => {
    const bottom = placeTile('a', 'k1', 0, 0, 0);
    const top = placeTile('b', 'k2', 0, 0, 1);
    expect(isTileFree(bottom, [bottom, top])).toBe(false);
  });

  it('returns true when tile above is offset far enough', () => {
    const bottom = placeTile('a', 'k1', 0, 0, 0);
    const top = placeTile('b', 'k2', 0, 4, 1); // col offset >= 2, no overlap
    expect(isTileFree(bottom, [bottom, top])).toBe(true);
  });

  it('returns false when blocked both left and right', () => {
    const center = placeTile('a', 'k1', 0, 4, 0);
    const left = placeTile('b', 'k2', 0, 2, 0);
    const right = placeTile('c', 'k3', 0, 6, 0);
    expect(isTileFree(center, [center, left, right])).toBe(false);
  });

  it('returns true when only blocked on one side', () => {
    const center = placeTile('a', 'k1', 0, 4, 0);
    const left = placeTile('b', 'k2', 0, 2, 0);
    expect(isTileFree(center, [center, left])).toBe(true);
  });

  it('does not consider tiles on different layers as side blockers', () => {
    const center = placeTile('a', 'k1', 0, 4, 0);
    const otherLayer = placeTile('b', 'k2', 0, 2, 1);
    expect(isTileFree(center, [center, otherLayer])).toBe(true);
  });

  it('considers row proximity for side blocking', () => {
    const center = placeTile('a', 'k1', 0, 4, 0);
    // Row difference of 2 — NOT blocking (must be < 2)
    const farLeft = placeTile('b', 'k2', 2, 2, 0);
    const farRight = placeTile('c', 'k3', 2, 6, 0);
    expect(isTileFree(center, [center, farLeft, farRight])).toBe(true);
  });

  it('blocks when row difference is 1', () => {
    const center = placeTile('a', 'k1', 0, 4, 0);
    const left = placeTile('b', 'k2', 1, 2, 0);
    const right = placeTile('c', 'k3', 1, 6, 0);
    expect(isTileFree(center, [center, left, right])).toBe(false);
  });
});

describe('isTileFreeFast', () => {
  it('matches isTileFree results', () => {
    const tiles = [
      placeTile('a', 'k1', 0, 0, 0),
      placeTile('b', 'k2', 0, 2, 0),
      placeTile('c', 'k3', 0, 4, 0),
      placeTile('d', 'k4', 1, 1, 1),
    ];
    for (const t of tiles) {
      expect(isTileFreeFast(t, tiles)).toBe(isTileFree(t, tiles));
    }
  });
});

// ── getFreeTiles ─────────────────────────────────────────────

describe('getFreeTiles', () => {
  it('returns all tiles when none are blocked', () => {
    const tiles = [
      placeTile('a', 'k1', 0, 0, 0),
      placeTile('b', 'k2', 0, 4, 0), // far apart, no blocking
    ];
    expect(getFreeTiles(tiles)).toHaveLength(2);
  });

  it('excludes blocked tiles', () => {
    const tiles = [
      placeTile('a', 'k1', 0, 0, 0),
      placeTile('b', 'k2', 0, 0, 1), // directly on top of 'a'
    ];
    const free = getFreeTiles(tiles);
    expect(free).toHaveLength(1);
    expect(free[0].tile.id).toBe('b');
  });
});

// ── tilesMatch ───────────────────────────────────────────────

describe('tilesMatch', () => {
  it('returns true for tiles with same matchKey and different IDs', () => {
    const a = makeTile('t1', 'bamboo-1');
    const b = makeTile('t2', 'bamboo-1');
    expect(tilesMatch(a, b)).toBe(true);
  });

  it('returns false for same tile ID', () => {
    const a = makeTile('t1', 'bamboo-1');
    expect(tilesMatch(a, a)).toBe(false);
  });

  it('returns false for different matchKeys', () => {
    const a = makeTile('t1', 'bamboo-1');
    const b = makeTile('t2', 'bamboo-2');
    expect(tilesMatch(a, b)).toBe(false);
  });
});

// ── findValidPairs ───────────────────────────────────────────

describe('findValidPairs', () => {
  it('finds a valid pair among free tiles', () => {
    const tiles = [
      placeTile('a', 'bamboo-1', 0, 0, 0),
      placeTile('b', 'bamboo-1', 0, 8, 0), // same matchKey, far apart
    ];
    const pairs = findValidPairs(tiles);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].map(p => p.tile.id).sort()).toEqual(['a', 'b']);
  });

  it('returns empty when no matches exist', () => {
    const tiles = [
      placeTile('a', 'bamboo-1', 0, 0, 0),
      placeTile('b', 'bamboo-2', 0, 8, 0),
    ];
    expect(findValidPairs(tiles)).toHaveLength(0);
  });

  it('does not pair blocked tiles', () => {
    const tiles = [
      placeTile('a', 'bamboo-1', 0, 0, 0),
      placeTile('b', 'bamboo-1', 0, 4, 0), // would match 'a'
      placeTile('c', 'other', 0, 2, 0),     // blocks both sides of 'a' and 'b'? No...
    ];
    // 'a' is blocked left? No, col 0, left would be col -2. 'a' blocked right by 'c' at col 2.
    // 'b' is blocked left by 'c' at col 2. 'b' blocked right? No tile at col 6.
    // So 'a' free on left side, 'b' free on right side — both free.
    const pairs = findValidPairs(tiles);
    expect(pairs).toHaveLength(1);
  });

  it('excludes tiles blocked from above', () => {
    const tiles = [
      placeTile('a', 'bamboo-1', 0, 0, 0),
      placeTile('b', 'bamboo-1', 0, 8, 0),
      placeTile('c', 'other', 0, 0, 1), // blocks 'a' from above
    ];
    const pairs = findValidPairs(tiles);
    expect(pairs).toHaveLength(0);
  });
});

// ── removePair ───────────────────────────────────────────────

describe('removePair', () => {
  it('removes two tiles and updates score/moves', () => {
    const tiles = [
      placeTile('a', 'bamboo-1', 0, 0, 0),
      placeTile('b', 'bamboo-1', 0, 8, 0),
      placeTile('c', 'bamboo-2', 0, 16, 0),
    ];
    const state = emptyState({ tiles });
    const next = removePair(state, 'a', 'b');

    expect(next.tiles).toHaveLength(1);
    expect(next.tiles[0].tile.id).toBe('c');
    expect(next.moves).toBe(1);
    expect(next.score).toBe(10);
  });

  it('records history for undo', () => {
    const tiles = [
      placeTile('a', 'k1', 0, 0, 0),
      placeTile('b', 'k1', 0, 8, 0),
    ];
    const state = emptyState({ tiles });
    const next = removePair(state, 'a', 'b');

    expect(next.history).toHaveLength(1);
    expect(next.history[0].tiles).toHaveLength(2);
  });

  it('sets hasWon when all tiles removed', () => {
    const tiles = [
      placeTile('a', 'k1', 0, 0, 0),
      placeTile('b', 'k1', 0, 8, 0),
    ];
    const state = emptyState({ tiles });
    const next = removePair(state, 'a', 'b');

    expect(next.hasWon).toBe(true);
    expect(next.tiles).toHaveLength(0);
  });

  it('sets hasLost when no valid pairs remain', () => {
    const tiles = [
      placeTile('a', 'k1', 0, 0, 0),
      placeTile('b', 'k1', 0, 8, 0),
      placeTile('c', 'k2', 0, 16, 0),
      placeTile('d', 'k3', 0, 24, 0),
    ];
    const state = emptyState({ tiles });
    const next = removePair(state, 'a', 'b');

    // 'c' and 'd' remain but have different matchKeys
    expect(next.hasLost).toBe(true);
  });

  it('clears selection', () => {
    const tiles = [
      placeTile('a', 'k1', 0, 0, 0),
      placeTile('b', 'k1', 0, 8, 0),
    ];
    const state = emptyState({ tiles, selectedTile: { tileId: 'a' } });
    const next = removePair(state, 'a', 'b');
    expect(next.selectedTile).toBeNull();
  });
});

// ── shuffleRemainingTiles ────────────────────────────────────

describe('shuffleRemainingTiles', () => {
  it('keeps the same number of tiles', () => {
    const tiles = [
      placeTile('a', 'k1', 0, 0, 0),
      placeTile('b', 'k2', 0, 8, 0),
      placeTile('c', 'k3', 0, 16, 0),
      placeTile('d', 'k4', 0, 24, 0),
    ];
    const state = emptyState({ tiles, score: 100 });
    const next = shuffleRemainingTiles(state);
    expect(next.tiles).toHaveLength(4);
  });

  it('preserves positions but may change tile assignments', () => {
    const tiles = [
      placeTile('a', 'k1', 0, 0, 0),
      placeTile('b', 'k2', 0, 8, 0),
    ];
    const state = emptyState({ tiles });
    const next = shuffleRemainingTiles(state);

    // Positions should be the same
    const origPositions = tiles.map(t => t.position);
    const newPositions = next.tiles.map(t => t.position);
    expect(newPositions).toEqual(origPositions);
  });

  it('applies -50 score penalty (minimum 0)', () => {
    const tiles = [placeTile('a', 'k1', 0, 0, 0), placeTile('b', 'k1', 0, 8, 0)];
    const state = emptyState({ tiles, score: 100 });
    expect(shuffleRemainingTiles(state).score).toBe(50);

    const lowScore = emptyState({ tiles, score: 20 });
    expect(shuffleRemainingTiles(lowScore).score).toBe(0);
  });

  it('clears selection', () => {
    const tiles = [placeTile('a', 'k1', 0, 0, 0)];
    const state = emptyState({ tiles, selectedTile: { tileId: 'a' } });
    expect(shuffleRemainingTiles(state).selectedTile).toBeNull();
  });
});

// ── getHint ──────────────────────────────────────────────────

describe('getHint', () => {
  it('returns a valid pair when one exists', () => {
    const tiles = [
      placeTile('a', 'bamboo-1', 0, 0, 0),
      placeTile('b', 'bamboo-1', 0, 8, 0),
    ];
    const hint = getHint(tiles);
    expect(hint).not.toBeNull();
    expect(hint!.sort()).toEqual(['a', 'b']);
  });

  it('returns null when no pairs exist', () => {
    const tiles = [
      placeTile('a', 'bamboo-1', 0, 0, 0),
      placeTile('b', 'bamboo-2', 0, 8, 0),
    ];
    expect(getHint(tiles)).toBeNull();
  });
});

// ── checkWin / checkLose ─────────────────────────────────────

describe('checkWin', () => {
  it('returns true when no tiles remain', () => {
    expect(checkWin([])).toBe(true);
  });

  it('returns false when tiles remain', () => {
    expect(checkWin([placeTile('a', 'k1', 0, 0, 0)])).toBe(false);
  });
});

describe('checkLose', () => {
  it('returns true when tiles remain but no valid pairs', () => {
    const tiles = [
      placeTile('a', 'k1', 0, 0, 0),
      placeTile('b', 'k2', 0, 8, 0),
    ];
    expect(checkLose(tiles)).toBe(true);
  });

  it('returns false when valid pairs exist', () => {
    const tiles = [
      placeTile('a', 'k1', 0, 0, 0),
      placeTile('b', 'k1', 0, 8, 0),
    ];
    expect(checkLose(tiles)).toBe(false);
  });

  it('returns false when no tiles remain', () => {
    expect(checkLose([])).toBe(false);
  });
});
