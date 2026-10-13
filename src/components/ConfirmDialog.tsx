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
      className="sheet-backdrop sheet-backdrop--dialog"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="sheet-panel">
        <h2 className="sheet-title mb-2">{title}</h2>
        <p className="m-0 mb-6 leading-snug text-[var(--text-soft)]" style={{ fontSize: 15 }}>
          {message}
        </p>
        <div className="flex gap-3">
          <button className="btn btn-quiet flex-1" onClick={onCancel}>
            Keep playing
          </button>
          <button className="btn btn-primary flex-1" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
