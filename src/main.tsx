import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// PWA install/offline support for the web build (iPhone/Android/any browser).
// Skipped entirely in dev (HMR + a caching SW fight each other) and inside
// the Electron desktop app (loaded via http://localhost in dev or file:// in
// a packaged build — neither needs offline caching, and file:// can't
// register a service worker at all).
if (import.meta.env.PROD && 'serviceWorker' in navigator && !window.coop) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
