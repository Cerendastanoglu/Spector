import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

// Suppress WebSocket connection warnings from Vite HMR when using cloudflare tunnel
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filter out WebSocket connection errors
  if (
    typeof args[0] === 'string' && 
    args[0].includes('WebSocket connection')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
