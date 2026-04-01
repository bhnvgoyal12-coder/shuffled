import React, { useState, useCallback, useEffect, useRef } from 'react';

interface TopBarProps {
  moves: number;
  score: number;
  timerDisplay?: string;
  canAutoComplete: boolean;
  onNewGame: () => void;
  onUndo: () => void;
  onAutoComplete: () => void;
  onOpenSettings: () => void;
  onOpenHelp?: () => void;
  onGoHome?: () => void;
  layoutClass?: string;
  extraControls?: React.ReactNode;
}

const iconBtnClass =
  'bg-white/12 text-white border border-white/18 rounded-lg cursor-pointer backdrop-blur-[4px] transition-[background,transform] hover:bg-white/22 active:scale-[0.96] flex items-center justify-center';
const iconSize = { width: 'clamp(16px, 3.5vw, 20px)', height: 'clamp(16px, 3.5vw, 20px)' };
const iconPad = { padding: 'clamp(6px, 1.2vw, 8px)' };

export const TopBar = React.memo(function TopBar({
  moves,
  score,
  timerDisplay,
  canAutoComplete,
  onNewGame,
  onUndo,
  onAutoComplete,
  onOpenSettings,
  onOpenHelp,
  onGoHome,
  layoutClass = 'topbar-layout',
  extraControls,
}: TopBarProps) {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((label: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(label);
    toastTimer.current = setTimeout(() => setToast(null), 1200);
  }, []);

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  return (
    <>
      <div
        className={`${layoutClass} flex justify-between items-center text-white/85 mx-auto w-full`}
        style={{
          padding: 'clamp(8px, 1.5vw, 12px) var(--board-padding) 0',
          marginBottom: 'clamp(8px, 2vh, 20px)',
          gap: 'clamp(4px, 1vw, 12px)',
        }}
      >
        <div className="flex items-center" style={{ gap: 'clamp(4px, 1vw, 8px)' }}>
          {onGoHome && (
            <button className={iconBtnClass} style={iconPad} onClick={onGoHome} title="Back" aria-label="Home">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={iconSize}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <button
            className="bg-white/12 text-white border border-white/18 rounded-lg cursor-pointer backdrop-blur-[4px] transition-[background,transform] hover:bg-white/22 active:scale-[0.96] flex items-center justify-center font-semibold whitespace-nowrap"
            style={{
              padding: 'clamp(6px, 1.2vw, 8px) clamp(10px, 2vw, 14px)',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
            }}
            onClick={() => { onNewGame(); showToast('New Game'); }}
            title="New Game"
            aria-label="New Game"
          >
            New
          </button>
          <button
            className={iconBtnClass}
            style={iconPad}
            onClick={() => { onUndo(); showToast('Undo'); }}
            title="Undo"
            aria-label="Undo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={iconSize}>
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          {canAutoComplete && (
            <button
              className="bg-[rgba(255,193,7,0.25)] text-white border border-[rgba(255,193,7,0.4)] rounded-lg cursor-pointer font-medium backdrop-blur-[4px] whitespace-nowrap transition-[background,transform] hover:bg-[rgba(255,193,7,0.35)] active:scale-[0.96]"
              style={{
                padding: 'clamp(6px, 1.2vw, 8px) clamp(10px, 2vw, 16px)',
                fontSize: 'clamp(11px, 2.5vw, 14px)',
              }}
              onClick={onAutoComplete}
            >
              Auto Complete
            </button>
          )}
        </div>
        <div className="flex items-center" style={{ gap: 'clamp(8px, 2vw, 16px)' }}>
          {extraControls}
          <div
            className="flex items-center font-medium"
            style={{
              gap: 'clamp(6px, 1.5vw, 12px)',
              fontSize: 'clamp(12px, 2.8vw, 14px)',
            }}
          >
            <span
              className="flex items-center gap-0.5 cursor-default"
              title="Moves"
              onClick={() => showToast(`Moves: ${moves}`)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50" style={{ width: 'clamp(12px, 2.5vw, 14px)', height: 'clamp(12px, 2.5vw, 14px)' }}>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              {moves}
            </span>
            <span
              className="flex items-center gap-0.5 cursor-default"
              title="Score"
              onClick={() => showToast(`Score: ${score}`)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50" style={{ width: 'clamp(12px, 2.5vw, 14px)', height: 'clamp(12px, 2.5vw, 14px)' }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {score}
            </span>
          </div>
          {timerDisplay && (
            <div
              className="flex items-center gap-1 bg-black/25 border border-white/12 rounded-full tabular-nums text-white/85 font-medium"
              style={{
                padding: 'clamp(2px, 0.5vw, 4px) clamp(8px, 1.8vw, 10px)',
                fontSize: 'clamp(11px, 2.5vw, 13px)',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-50"
                style={{ width: 'clamp(10px, 2.2vw, 12px)', height: 'clamp(10px, 2.2vw, 12px)' }}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {timerDisplay}
            </div>
          )}
          {onOpenHelp && (
            <button
              className={`${iconBtnClass} font-bold`}
              style={{ ...iconPad, width: 'clamp(28px, 6vw, 36px)', height: 'clamp(28px, 6vw, 36px)', fontSize: 'clamp(14px, 3vw, 18px)' }}
              onClick={onOpenHelp}
              title="How to play"
              aria-label="How to play"
            >
              ?
            </button>
          )}
          <button className={iconBtnClass} style={iconPad} onClick={onOpenSettings} title="Settings" aria-label="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconSize}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[15000] bg-black/70 text-white text-sm font-medium rounded-full backdrop-blur-sm pointer-events-none animate-[fadeIn_0.15s_ease]"
          style={{
            bottom: '16px',
            padding: '6px 20px',
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
});
