import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface TopBarProps {
  moves?: number;
  score: number;
  timerDisplay?: string;
  canAutoComplete: boolean;
  /** Greys out Undo when there is nothing to take back. */
  canUndo?: boolean;
  /** Ask before New Game throws away a game in progress. */
  confirmNewGame?: boolean;
  newGameWarning?: string;
  onNewGame: () => void;
  onUndo: () => void;
  onAutoComplete: () => void;
  onHint?: () => void;
  onOpenSettings: () => void;
  onOpenHelp?: () => void;
  onOpenStats?: () => void;
  onGoHome?: () => void;
  layoutClass?: string;
  /** Extra buttons shown after Undo / Hint. */
  extraActions?: React.ReactNode;
  /** Extra read-only status shown with moves / score / time. */
  extraInfo?: React.ReactNode;
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/** A button matching the bar's own buttons, for a game's extra actions. */
export function TopBarButton({ children, label, title, onClick }: { children: React.ReactNode; label: string; title?: string; onClick: () => void }) {
  return (
    <button className="bar-btn" onClick={onClick} title={title ?? label} aria-label={label}>
      {children}
    </button>
  );
}

/** A labelled figure in the status strip (also used by games for their own figures). */
export function TopBarStat({ label, value, bump = false }: { label: string; value: React.ReactNode; bump?: boolean }) {
  return (
    <span className="bar-stat">
      {label}
      {/* Re-keyed on change so the figure ticks */}
      <span key={bump ? String(value) : undefined} className={`bar-stat__value ${bump ? 'bar-stat__value--bump' : ''}`}>
        {value}
      </span>
    </span>
  );
}

export const TopBar = React.memo(function TopBar({
  moves,
  score,
  timerDisplay,
  canAutoComplete,
  canUndo = true,
  confirmNewGame = false,
  newGameWarning = 'Your current game will be abandoned.',
  onNewGame,
  onUndo,
  onAutoComplete,
  onHint,
  onOpenSettings,
  onOpenHelp,
  onOpenStats,
  onGoHome,
  layoutClass = 'topbar-layout',
  extraActions,
  extraInfo,
}: TopBarProps) {
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);

  const requestNewGame = useCallback(() => {
    if (confirmNewGame) setConfirmingNewGame(true);
    else onNewGame();
  }, [confirmNewGame, onNewGame]);

  // Keyboard shortcuts: Z / Ctrl+Z undo, H hint, N new game
  const shortcuts = useRef({ canUndo, onUndo, onHint, requestNewGame });
  useEffect(() => {
    shortcuts.current = { canUndo, onUndo, onHint, requestNewGame };
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.repeat) return;
      if (document.querySelector('[role="dialog"]')) return;
      const key = e.key.toLowerCase();
      const s = shortcuts.current;
      if (key === 'z' && !e.shiftKey) {
        if (s.canUndo) s.onUndo();
        e.preventDefault();
      } else if (e.ctrlKey || e.metaKey) {
        return;
      } else if (key === 'h' && s.onHint) {
        s.onHint();
      } else if (key === 'n') {
        s.requestNewGame();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <div
        className={`${layoutClass} flex flex-wrap justify-between items-center mx-auto w-full shrink-0`}
        style={{
          padding: 'clamp(8px, 1.5vw, 12px) max(var(--board-padding), 6px) 0',
          marginBottom: 'clamp(8px, 2vh, 20px)',
          columnGap: 'clamp(4px, 1vw, 12px)',
          rowGap: '8px',
        }}
      >
        <div className="order-1 flex items-center" style={{ gap: 'clamp(4px, 1.3vw, 8px)' }}>
          {onGoHome && (
            <button className="bar-btn" onClick={onGoHome} title="Back to games" aria-label="Home">
              <svg {...iconProps} strokeWidth={2.5}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <button className="bar-btn bar-btn--text" onClick={requestNewGame} title="New game (N)" aria-label="New Game">
            New
          </button>
          <button className="bar-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Z)" aria-label="Undo">
            <svg {...iconProps}>
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
            </svg>
          </button>
          {onHint && (
            <button className="bar-btn" onClick={onHint} title="Hint (H)" aria-label="Hint">
              <svg {...iconProps}>
                <path d="M9 18h6" />
                <path d="M10 21h4" />
                <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />
              </svg>
            </button>
          )}
          {extraActions}
        </div>

        <div
          className="order-3 basis-full md:order-2 md:basis-auto flex items-center justify-center"
          style={{ gap: 'clamp(10px, 3.2vw, 18px)' }}
        >
          {extraInfo}
          {moves != null && <TopBarStat label="Moves" value={moves} />}
          <TopBarStat label="Score" value={score} bump />
          {timerDisplay && (
            <div className="bar-clock" title="Time played">
              <svg {...iconProps} strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {timerDisplay}
            </div>
          )}
        </div>

        <div className="order-2 md:order-3 flex items-center" style={{ gap: 'clamp(4px, 1.3vw, 8px)' }}>
          {onOpenStats && (
            <button className="bar-btn" onClick={onOpenStats} title="Stats" aria-label="Stats">
              <svg {...iconProps}>
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </button>
          )}
          {onOpenHelp && (
            <button className="bar-btn" onClick={onOpenHelp} title="How to play" aria-label="How to play">
              <svg {...iconProps}>
                <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" />
                <line x1="12" y1="18" x2="12" y2="18.01" />
              </svg>
            </button>
          )}
          <button className="bar-btn" onClick={onOpenSettings} title="Settings" aria-label="Settings">
            <svg {...iconProps} strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Auto-finish — offered once the game can no longer be lost */}
      {canAutoComplete && (
        <button
          className="auto-finish-btn fixed left-1/2 z-[9000] rounded-full cursor-pointer font-bold text-[#33270a] whitespace-nowrap border border-[#f6e6b4] active:scale-[0.96]"
          style={{
            bottom: 'calc(clamp(16px, 4vh, 32px) + env(safe-area-inset-bottom))',
            padding: 'clamp(11px, 2.4vw, 14px) clamp(24px, 6vw, 34px)',
            fontSize: 'clamp(15px, 3.6vw, 17px)',
          }}
          onClick={onAutoComplete}
        >
          Finish the game
        </button>
      )}

      {confirmingNewGame && (
        <ConfirmDialog
          title="Start a new game?"
          message={newGameWarning}
          confirmLabel="New game"
          onCancel={() => setConfirmingNewGame(false)}
          onConfirm={() => { setConfirmingNewGame(false); onNewGame(); }}
        />
      )}
    </>
  );
});
