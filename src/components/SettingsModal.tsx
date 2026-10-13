import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { CARD_BACK_THEMES } from '../constants';
import type { CardBackTheme, DrawMode, GameType, SpiderSuitCount } from '../types';
import { trackSettingChange } from '../utils/analytics';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface SettingsModalProps {
  onClose: () => void;
  onNewGame: () => void;
  gameType?: GameType;
}

const THEME_KEYS: CardBackTheme[] = ['blue', 'red', 'green', 'purple', 'gold'];

export function SettingsModal({ onClose, onNewGame, gameType }: SettingsModalProps) {
  const { settings, updateSetting } = useSettings();
  const [confirmDrawChange, setConfirmDrawChange] = useState<DrawMode | null>(null);
  const [confirmSuitChange, setConfirmSuitChange] = useState<SpiderSuitCount | null>(null);
  useEscapeKey(onClose);

  const handleSuitCountChange = (count: SpiderSuitCount) => {
    if (count === settings.spiderSuitCount) return;
    setConfirmSuitChange(count);
  };

  const confirmSuitCountChange = () => {
    if (confirmSuitChange !== null) {
      trackSettingChange('spiderSuitCount', confirmSuitChange);
      updateSetting('spiderSuitCount', confirmSuitChange);
      setConfirmSuitChange(null);
      onNewGame();
    }
  };

  const handleDrawModeChange = (mode: DrawMode) => {
    if (mode === settings.drawMode) return;
    setConfirmDrawChange(mode);
  };

  const confirmDrawModeChange = () => {
    if (confirmDrawChange !== null) {
      trackSettingChange('drawMode', confirmDrawChange);
      updateSetting('drawMode', confirmDrawChange);
      setConfirmDrawChange(null);
      onNewGame();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="sheet-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sheet-panel">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="sheet-title">Settings</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Close settings">
            &times;
          </button>
        </div>

        {/* Draw Mode — Klondike only */}
        {(!gameType || gameType === 'klondike') && (
          <div className="mb-5">
            <label className="block text-[var(--text)] font-semibold mb-2" style={{ fontSize: 15 }}>
              Draw mode
            </label>
            {confirmDrawChange !== null ? (
              <div
                className="rounded-xl text-[var(--text)]"
                style={{ padding: 12, fontSize: 14, background: 'rgba(222,195,120,0.12)', border: '1px solid rgba(222,195,120,0.35)' }}
              >
                <p className="m-0 mb-2">Changing draw mode will start a new game.</p>
                <div className="flex gap-2">
                  <button
                    className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 14 }}
                    onClick={confirmDrawModeChange}
                  >
                    Start new game
                  </button>
                  <button
                    className="btn btn-quiet" style={{ padding: '8px 16px', fontSize: 14 }}
                    onClick={() => setConfirmDrawChange(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1 rounded-full p-1" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {([1, 3] as DrawMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`flex-1 border-none rounded-full py-2.5 cursor-pointer font-bold transition-[background,color,box-shadow] duration-200 ${
                      settings.drawMode === mode
                        ? 'bg-[var(--brass)] text-[#2a2008] shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
                        : 'bg-transparent text-[var(--text-soft)] hover:text-[var(--text)]'
                    }`}
                    style={{ fontSize: 14 }}
                    onClick={() => handleDrawModeChange(mode)}
                  >
                    Draw {mode}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suit Count — Spider only */}
        {gameType === 'spider' && (
          <div className="mb-5">
            <label className="block text-[var(--text)] font-semibold mb-2" style={{ fontSize: 15 }}>
              Suit count
            </label>
            {confirmSuitChange !== null ? (
              <div
                className="rounded-xl text-[var(--text)]"
                style={{ padding: 12, fontSize: 14, background: 'rgba(222,195,120,0.12)', border: '1px solid rgba(222,195,120,0.35)' }}
              >
                <p className="m-0 mb-2">Changing suit count will start a new game.</p>
                <div className="flex gap-2">
                  <button
                    className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 14 }}
                    onClick={confirmSuitCountChange}
                  >
                    Start new game
                  </button>
                  <button
                    className="btn btn-quiet" style={{ padding: '8px 16px', fontSize: 14 }}
                    onClick={() => setConfirmSuitChange(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1 rounded-full p-1" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {([1, 2, 4] as SpiderSuitCount[]).map((count) => (
                  <button
                    key={count}
                    className={`flex-1 border-none rounded-full py-2.5 cursor-pointer font-bold transition-[background,color,box-shadow] duration-200 ${
                      settings.spiderSuitCount === count
                        ? 'bg-[var(--brass)] text-[#2a2008] shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
                        : 'bg-transparent text-[var(--text-soft)] hover:text-[var(--text)]'
                    }`}
                    style={{ fontSize: 14 }}
                    onClick={() => handleSuitCountChange(count)}
                  >
                    {count} {count === 1 ? 'Suit' : 'Suits'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Card Back Theme */}
        <div className="mb-5">
          <label className="block text-[var(--text)] font-semibold mb-2" style={{ fontSize: 15 }}>
            Card back
          </label>
          <div className="flex gap-3 justify-start flex-wrap">
            {THEME_KEYS.map((theme) => {
              const colors = CARD_BACK_THEMES[theme];
              const isSelected = settings.cardBackTheme === theme;
              return (
                <button
                  key={theme}
                  className={`border-none cursor-pointer rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 active:scale-95 ${
                    isSelected
                      ? 'ring-2 ring-[var(--brass)] ring-offset-2 ring-offset-[#141614]'
                      : ''
                  }`}
                  style={{
                    width: 'clamp(36px, 8vw, 48px)',
                    height: 'clamp(50px, 11vw, 67px)',
                    background: `repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 1.5px, transparent 1.5px 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.14) 0 1.5px, transparent 1.5px 6px), linear-gradient(160deg, ${colors.color2}, ${colors.color1})`,
                    border: '2px solid var(--ivory)',
                  }}
                  onClick={() => { trackSettingChange('cardBackTheme', theme); updateSetting('cardBackTheme', theme); }}
                  aria-label={`${theme} card back`}
                />
              );
            })}
          </div>
        </div>

        {/* Sound Effects */}
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <label className="text-[var(--text)] font-semibold" style={{ fontSize: 15 }}>
              Sound effects
            </label>
            <ToggleSwitch
              label="Sound Effects"
              checked={settings.soundEnabled}
              onChange={(v) => { trackSettingChange('soundEnabled', v); updateSetting('soundEnabled', v); }}
            />
          </div>
        </div>

        {/* Timer */}
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="text-[var(--text)] font-semibold block" style={{ fontSize: 15 }}>
                Timer
              </label>
              <span className="text-[var(--text-soft)] leading-snug block" style={{ fontSize: 13 }}>
                Shows the clock; your score drains slowly as it runs
              </span>
            </div>
            <ToggleSwitch
              label="Timer"
              checked={settings.timerEnabled}
              onChange={(v) => { trackSettingChange('timerEnabled', v); updateSetting('timerEnabled', v); }}
            />
          </div>
        </div>

        {/* Tap to Move — Klondike & FreeCell */}
        {(!gameType || gameType === 'klondike' || gameType === 'freecell') && (
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="text-[var(--text)] font-semibold block" style={{ fontSize: 15 }}>
                  Tap to move
                </label>
                <span className="text-[var(--text-soft)] leading-snug block" style={{ fontSize: 13 }}>
                  One tap sends a card to its best spot. Off: tap a card, then tap where it goes
                </span>
              </div>
              <ToggleSwitch
                label="Tap to Move"
                checked={settings.tapToMove}
                onChange={(v) => { trackSettingChange('tapToMove', v); updateSetting('tapToMove', v); }}
              />
            </div>
          </div>
        )}

        {/* Auto-Move to Foundation — Klondike & FreeCell */}
        {(!gameType || gameType === 'klondike' || gameType === 'freecell') && (
          <div className="mb-5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[var(--text)] font-semibold block" style={{ fontSize: 15 }}>
                  Auto-move to foundation
                </label>
                <span className="text-[var(--text-soft)] leading-snug block" style={{ fontSize: 13 }}>
                  Cards that are no longer needed go up by themselves
                </span>
              </div>
              <ToggleSwitch
                label="Auto-Move to Foundation"
                checked={settings.autoMoveToFoundation}
                onChange={(v) => { trackSettingChange('autoMoveToFoundation', v); updateSetting('autoMoveToFoundation', v); }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function ToggleSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative border-none rounded-full cursor-pointer transition-colors duration-200 shrink-0 ${
        checked ? 'bg-[#4a9a14]' : 'bg-white/20'
      }`}
      style={{ width: 50, height: 30 }}
      onClick={() => onChange(!checked)}
    >
      <span
        className="absolute top-[2px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-[left] duration-200 ease-out"
        style={{
          width: 26,
          height: 26,
          left: checked ? 22 : 2,
        }}
      />
    </button>
  );
}
