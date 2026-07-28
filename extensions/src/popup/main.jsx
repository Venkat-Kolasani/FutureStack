import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/chrome-extension';
import Popup from './popup.jsx';
import { CLERK_PUBLISHABLE_KEY, SYNC_HOST } from '../lib/clerk.js';

createRoot(document.getElementById('root')).render(
  <ClerkProvider
    publishableKey={CLERK_PUBLISHABLE_KEY}
    syncHost={SYNC_HOST}
    __experimental_syncHostListener
  >
    <Popup />
  </ClerkProvider>
);
