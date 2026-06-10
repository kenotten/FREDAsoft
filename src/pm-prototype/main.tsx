/**
 * FREDAsoft PM Prototype — separate entry point.
 *
 * MOCK ONLY · NO FIREBASE · NO PRODUCTION DATA · DISPOSABLE
 *
 * This bundle intentionally does not import App.tsx, production services, or data hooks.
 * Staff review prototype for Project Management workflow — delete or replace after review.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { PmPrototypeApp } from './PmPrototypeApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('PM prototype root element not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <PmPrototypeApp />
  </StrictMode>
);
