import React, { useEffect, useRef, useState } from 'react';
import { AD_ENABLED } from '../utils/adConfig';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Persistent bottom banner ad.
 *
 * Fixed to the bottom of the viewport. Collapses to zero height when
 * no ad is served (e.g. in dev or before AdSense approval).
 */
export const AdBanner = React.memo(function AdBanner() {
  const adRef = useRef<HTMLModElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    if (adRef.current && !pushed.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch {
        // AdSense not loaded or blocked
      }
    }

    // Watch for AdSense filling the slot (it changes the <ins> height)
    const ins = adRef.current;
    if (!ins) return;

    const observer = new MutationObserver(() => {
      if (ins.offsetHeight > 0 && ins.querySelector('iframe')) {
        setAdLoaded(true);
        observer.disconnect();
      }
    });
    observer.observe(ins, { childList: true, subtree: true, attributes: true });

    return () => observer.disconnect();
  }, []);

  if (!AD_ENABLED) return null;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 z-[9000]"
      style={{
        paddingBottom: adLoaded ? 'env(safe-area-inset-bottom)' : 0,
        overflow: 'hidden',
        // Only visible once an ad actually loads
        maxHeight: adLoaded ? 'none' : 0,
      }}
    >
      <ins
        className="adsbygoogle"
        ref={adRef}
        style={{ display: 'block' }}
        data-ad-client="ca-pub-0252848696122291"
        data-ad-slot="7277828243"
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
});
