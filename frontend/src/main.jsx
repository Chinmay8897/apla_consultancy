import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Only use local 127.0.0.1 when running on localhost. In production (e.g. Vercel),
// use the configured VITE_CONVEX_URL. If not yet set, use a placeholder cloud HTTPS URL
// so Chromium NEVER triggers the "Access other apps and services on this device" permission popup!
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const rawConvexUrl = import.meta.env.VITE_CONVEX_URL;
const convexUrl =
  rawConvexUrl ||
  (isLocalhost ? 'http://127.0.0.1:3210' : 'https://placeholder.convex.cloud');

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
);
