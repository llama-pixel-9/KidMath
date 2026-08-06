import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { refreshBankFromCloud } from './itemBank/cloudLoader.js'
import { bootstrapTelemetry } from './telemetry/telemetryClient.js'
import { setProgressLoader } from './mathEngine.js'
import { loadProgressSync } from './progressStore.js'
import { supabase } from './supabaseClient.js'
import { captureInvite } from './launchFlags.js'

// The engine no longer imports progressStore (so it can bundle for
// JavaScriptCore). Wire the real saved-progress source here for the web app.
setProgressLoader(loadProgressSync);

// Private-test mode: ?invite=1 marks this browser as a tester (launchFlags).
captureInvite();

refreshBankFromCloud({ force: true });

// Session diagnostics run for signed-in users only — anonymous visitors
// (including every free-tier kid) are never telemetered — and Global Privacy
// Control is honoured outright.
if (typeof navigator === 'undefined' || navigator.globalPrivacyControl !== true) {
  supabase?.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      bootstrapTelemetry().then((client) => client?.setUser?.(session.user.id));
    }
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshBankFromCloud();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
