// Ensure safe polyfills for browser runtime environment
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).process = (window as any).process || { env: {} };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/vazirmatn';
import './index.css';
import App from './App';
import { registerTwaServiceWorker } from './lib/twaServiceWorker';

// Register Service Worker for PWA & Android TWA offline-first caching
registerTwaServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
