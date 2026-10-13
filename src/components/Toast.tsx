export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[15000] bg-black/75 text-white text-sm font-medium rounded-full backdrop-blur-sm pointer-events-none animate-[fadeIn_0.15s_ease] whitespace-nowrap border border-white/10"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))', padding: '7px 20px' }}
    >
      {message}
    </div>
  );
}
