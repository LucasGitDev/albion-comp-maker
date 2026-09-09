"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Last-resort fallback (ACM-110 AC#3). Only triggers when the root layout
 * itself throws, in which case `error.tsx` never gets to render — Next.js
 * requires this file to render its own `<html>`/`<body>` since it replaces
 * the root layout entirely. Kept intentionally free of app dependencies
 * (no Tailwind theme vars, no shared components) so it can't itself fail.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps): React.JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", textAlign: "center", padding: "2rem" }}>
          <p style={{ fontWeight: 600 }}>Algo deu muito errado</p>
          <p style={{ fontSize: "0.875rem", color: "#666" }}>Recarregue a página ou tente novamente.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "0.5rem",
              borderRadius: "9999px",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "1px solid #ccc",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
