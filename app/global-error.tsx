"use client";

import { useEffect } from "react";

// Catches errors in the root layout itself — layout.tsx doesn't render at
// all in that case, so unlike error.tsx this can't rely on I18nProvider or
// any other context from it. Has to render its own <html>/<body> and stay
// dependency-free.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>Something went wrong.</p>
        <p style={{ color: "#666", fontSize: "0.875rem" }}>
          Please refresh the page. Wenn das Problem bestehen bleibt, versuche es später erneut.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #ccc",
            background: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
