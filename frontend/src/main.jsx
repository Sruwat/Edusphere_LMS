import { createRoot } from "react-dom/client";
import { AppProviders } from "./app/providers.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <AppProviders />
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

