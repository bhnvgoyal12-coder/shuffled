import { useCallback, useEffect, useRef, useState } from 'react';

/** A short message shown at the bottom of the screen that dismisses itself. */
export function useToast(durationMs = 2000) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => setToast(null), durationMs);
  }, [durationMs]);

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  return { toast, showToast };
}
