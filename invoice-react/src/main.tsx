import { Buffer } from 'buffer/';

if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './analytics';
import './globals.css';
import './index.css';
import App from './App';
import PublicInvoiceView from './components/PublicInvoiceView';
import { ActivityProvider } from './contexts/activity';

// Public, no-auth read-only invoice page served at /i/<token>.
const publicMatch = window.location.pathname.match(
  /^\/i\/([A-Za-z0-9_-]+)\/?$/,
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ActivityProvider>
      {publicMatch ? <PublicInvoiceView token={publicMatch[1]} /> : <App />}
    </ActivityProvider>
  </StrictMode>,
);

// Register the PWA service worker (production builds only; skipped in dev).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
