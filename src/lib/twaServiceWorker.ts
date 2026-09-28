/**
 * Service Worker Registration & TWA Lifecycle Handler
 */

export function registerTwaServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    // In local dev, proactively unregister any stale SW to prevent cached module conflicts
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for service worker updates periodically
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[TWA SW] New version available; will activate on next launch.');
                  } else {
                    console.log('[TWA SW] Content cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          // Safe handling for iframe environments or sandboxed domains
          console.debug('[TWA SW] Service worker registration bypassed or not permitted in this context:', error);
        });
    });
  }
}
