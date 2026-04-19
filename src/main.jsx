import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { refreshBankFromCloud } from './itemBank/cloudLoader.js'

// The bundled snapshot is already in the cache (see src/itemBank/index.js),
// so the app renders immediately. Fire a cloud refresh in the background to
// pick up admin-approved changes without blocking first paint.
refreshBankFromCloud({ force: true });

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
