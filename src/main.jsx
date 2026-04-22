import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Catch stray promise rejections that escape try/catch and react-query's
// own handlers. Log to console today; this is the observability hook point
// for Sentry/LogRocket when those land.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[unhandledrejection]', event.reason);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
