import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { Toaster } from 'sonner';

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
    <Toaster position="top-right" />
  </BrowserRouter>
);

// Global error hooks: show a toast and log to console (lightweight fallback for Sentry)
window.addEventListener('error', (ev) => {
  try { console.error('Unhandled error', ev.error || ev.message, ev); } catch (e) {}
});
window.addEventListener('unhandledrejection', (ev) => {
  try { console.error('Unhandled rejection', ev.reason); } catch (e) {}
});

// Capture submit events and prevent any form submits originating from dialog content.
// This avoids accidental Enter/submit behavior in modal forms which caused full-page reloads.
window.addEventListener('submit', (e) => {
  try {
    const form = e.target;
    if (!form || typeof form.closest !== 'function') return;
    if (form.closest('[data-slot="dialog-content"]')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  } catch (err) {
    // ignore
  }
}, true);


