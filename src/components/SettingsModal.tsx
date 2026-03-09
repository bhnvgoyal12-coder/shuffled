import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { CARD_BACK_THEMES } from '../constants';
import type { CardBackTheme, DrawMode, GameType, SpiderSuitCount } from '../types';
import { trackSettingChange } from '../utils/analytics';

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
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[20000] animate-[fadeIn_0.3s_ease] backdrop-blur-[4px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="win-card-bg rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[scaleIn_0.3s_ease] w-[90vw] max-w-[380px] max-h-[85vh] overflow-y-auto relative"
        style={{ padding: 'clamp(20px, 4vw, 32px)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2
            className="font-bold text-[#2e7d32] m-0"
            style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}
          >
            Settings
          </h2>
          <button
            className="bg-transparent border-none text-[#999] cursor-pointer hover:text-[#333] transition-colors leading-none"
            style={{ fontSize: 'clamp(24px, 5vw, 30px)' }}
            onClick={onClose}
            aria-label="Close settings"
          >
            &times;
          </button>
        </div>

        {/* Draw Mode — Klondike only */}
        {(!gameType || gameType === 'klondike') && (
          <div className="mb-5">
            <label className="block text-[#555] font-semibold mb-2" style={{ fontSize: 'clamp(12px, 3vw, 14px)' }}>
              Draw Mode
            </label>
            {confirmDrawChange !== null ? (
              <div
                className="bg-[#FFF3E0] rounded-lg text-[#E65100]"
                style={{ padding: 'clamp(8px, 2vw, 12px)', fontSize: 'clamp(11px, 2.5vw, 13px)' }}
              >
                <p className="m-0 mb-2">Changing draw mode will start a new game.</p>
                <div className="flex gap-2">
                  <button
                    className="bg-[#E65100] text-white border-none rounded-md px-3 py-1.5 cursor-pointer font-medium text-xs hover:bg-[#BF360C] active:scale-[0.96] transition-[background,transform]"
                    onClick={confirmDrawModeChange}
                  >
                    Continue
                  </button>
                  <button
                    className="bg-transparent text-[#E65100] border border-[#E65100] rounded-md px-3 py-1.5 cursor-pointer font-medium text-xs hover:bg-[#FFF3E0] active:scale-[0.96] transition-[background,transform]"
                    onClick={() => setConfirmDrawChange(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1 bg-[#e8e8e8] rounded-lg p-1">
                {([1, 3] as DrawMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`flex-1 border-none rounded-md py-2 cursor-pointer font-semibold transition-[background,color,box-shadow] duration-200 ${
                      settings.drawMode === mode
                        ? 'bg-white text-[#2e7d32] shadow-[0_1px_3px_rgba(0,0,0,0.15)]'
                        : 'bg-transparent text-[#666] hover:text-[#333]'
                    }`}
                    style={{ fontSize: 'clamp(12px, 2.8vw, 14px)' }}
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
            <label className="block text-[#555] font-semibold mb-2" style={{ fontSize: 'clamp(12px, 3vw, 14px)' }}>
              Suit Count
            </label>
            {confirmSuitChange !== null ? (
              <div
                className="bg-[#FFF3E0] rounded-lg text-[#E65100]"
                style={{ padding: 'clamp(8px, 2vw, 12px)', fontSize: 'clamp(11px, 2.5vw, 13px)' }}
              >
                <p className="m-0 mb-2">Changing suit count will start a new game.</p>
                <div className="flex gap-2">
                  <button
                    className="bg-[#E65100] text-white border-none rounded-md px-3 py-1.5 cursor-pointer font-medium text-xs hover:bg-[#BF360C] active:scale-[0.96] transition-[background,transform]"
                    onClick={confirmSuitCountChange}
                  >
                    Continue
                  </button>
                  <button
                    className="bg-transparent text-[#E65100] border border-[#E65100] rounded-md px-3 py-1.5 cursor-pointer font-medium text-xs hover:bg-[#FFF3E0] active:scale-[0.96] transition-[background,transform]"
                    onClick={() => setConfirmSuitChange(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1 bg-[#e8e8e8] rounded-lg p-1">
                {([1, 2, 4] as SpiderSuitCount[]).map((count) => (
                  <button
                    key={count}
                    className={`flex-1 border-none rounded-md py-2 cursor-pointer font-semibold transition-[background,color,box-shadow] duration-200 ${
                      settings.spiderSuitCount === count
                        ? 'bg-white text-[#2e7d32] shadow-[0_1px_3px_rgba(0,0,0,0.15)]'
                        : 'bg-transparent text-[#666] hover:text-[#333]'
                    }`}
                    style={{ fontSize: 'clamp(12px, 2.8vw, 14px)' }}
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
          <label className="block text-[#555] font-semibold mb-2" style={{ fontSize: 'clamp(12px, 3vw, 14px)' }}>
            Card Back
          </label>
          <div className="flex gap-3 justify-start">
            {THEME_KEYS.map((theme) => {
              const colors = CARD_BACK_THEMES[theme];
              const isSelected = settings.cardBackTheme === theme;
              return (
                <button
                  key={theme}
                  className={`border-none cursor-pointer rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 active:scale-95 ${
                    isSelected
                      ? 'ring-2 ring-[#FFC107] ring-offset-2'
                      : ''
                  }`}
                  style={{
                    width: 'clamp(36px, 8vw, 48px)',
                    height: 'clamp(50px, 11vw, 67px)',
                    background: `repeating-linear-gradient(45deg, ${colors.color1}, ${colors.color1} 2px, ${colors.color2} 2px, ${colors.color2} 4px)`,
                    boxShadow: isSelected ? undefined : '0 1px 3px rgba(0,0,0,0.2)',
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
            <label className="text-[#555] font-semibold" style={{ fontSize: 'clamp(12px, 3vw, 14px)' }}>
              Sound Effects
            </label>
            <ToggleSwitch
              checked={settings.soundEnabled}
              onChange={(v) => { trackSettingChange('soundEnabled', v); updateSetting('soundEnabled', v); }}
            />
          </div>
        </div>

        {/* Timer */}
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-[#555] font-semibold block" style={{ fontSize: 'clamp(12px, 3vw, 14px)' }}>
                Timer
              </label>
              <span className="text-[#999]" style={{ fontSize: 'clamp(10px, 2.2vw, 12px)' }}>
                Show elapsed time, score drains over time
              </span>
            </div>
            <ToggleSwitch
              checked={settings.timerEnabled}
              onChange={(v) => { trackSettingChange('timerEnabled', v); updateSetting('timerEnabled', v); }}
            />
          </div>
        </div>

        {/* Auto-Move to Foundation — Klondike & FreeCell */}
        {(!gameType || gameType === 'klondike' || gameType === 'freecell') && (
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[#555] font-semibold block" style={{ fontSize: 'clamp(12px, 3vw, 14px)' }}>
                  Auto-Move to Foundation
                </label>
                <span className="text-[#999]" style={{ fontSize: 'clamp(10px, 2.2vw, 12px)' }}>
                  Automatically move safe cards up
                </span>
              </div>
              <ToggleSwitch
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

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={`relative border-none rounded-full cursor-pointer transition-colors duration-200 shrink-0 ${
        checked ? 'bg-[#2e7d32]' : 'bg-[#ccc]'
      }`}
      style={{ width: 'clamp(40px, 9vw, 48px)', height: 'clamp(22px, 5vw, 26px)' }}
      onClick={() => onChange(!checked)}
    >
      <span
        className="absolute top-[2px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-[left] duration-200"
        style={{
          width: 'clamp(18px, 4vw, 22px)',
          height: 'clamp(18px, 4vw, 22px)',
          left: checked ? 'calc(100% - clamp(18px, 4vw, 22px) - 2px)' : '2px',
        }}
      />
    </button>
  );
}
