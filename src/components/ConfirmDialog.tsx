import { useEscapeKey } from '../hooks/useEscapeKey';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  useEscapeKey(onCancel);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[20000] animate-[fadeIn_0.2s_ease] backdrop-blur-[4px]"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="win-card-bg rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[scaleIn_0.2s_ease] text-center"
        style={{ padding: 'clamp(20px, 5vw, 32px)', width: 'clamp(260px, 80vw, 340px)' }}
      >
        <h2 className="font-bold text-[#2e7d32] m-0 mb-2" style={{ fontSize: 'clamp(18px, 4.5vw, 22px)' }}>
          {title}
        </h2>
        <p className="text-[#666] m-0 mb-5 leading-snug" style={{ fontSize: 'clamp(13px, 3vw, 15px)' }}>
          {message}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            className="flex-1 bg-[#e8e8e8] text-[#333] font-semibold border-none rounded-xl py-3 cursor-pointer transition-[background,transform] hover:bg-[#ddd] active:scale-[0.96]"
            onClick={onCancel}
          >
            Keep playing
          </button>
          <button
            className="flex-1 bg-[#2e7d32] text-white font-semibold border-none rounded-xl py-3 cursor-pointer transition-[background,transform] hover:bg-[#388e3c] active:scale-[0.96]"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
