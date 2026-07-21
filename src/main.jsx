import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { refreshBankFromCloud } from './itemBank/cloudLoader.js'
import { bootstrapTelemetry } from './telemetry/telemetryClient.js'
import { setProgressLoader } from './mathEngine.js'
import { loadProgressSync } from './progressStore.js'

// The engine no longer imports progressStore (so it can bundle for
// JavaScriptCore). Wire the real saved-progress source here for the web app.
setProgressLoader(loadProgressSync);

refreshBankFromCloud({ force: true });
bootstrapTelemetry();

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
