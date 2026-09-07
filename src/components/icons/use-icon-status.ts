import { useState } from "react";

export type IconStatus = "loading" | "loaded" | "missing" | "error";

type IconStatusState = {
  src: string | null;
  status: IconStatus;
};

/**
 * `/api/icon` returns HTTP 200 with a 1x1 transparent PNG on an upstream
 * miss, so `onError` never fires for a missing sprite. The `missing` state
 * is detected inside `onLoad` via `naturalWidth <= 1` instead.
 *
 * The status resets to "loading" when `src` changes. That reset happens
 * during render (comparing against the previous `src` kept in state)
 * rather than in a `useEffect`, avoiding an extra cascading render.
 */
export function useIconStatus(src: string | null): {
  status: IconStatus;
  handleLoad: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  handleError: () => void;
} {
  const [state, setState] = useState<IconStatusState>({ src, status: "loading" });

  if (state.src !== src) {
    setState({ src, status: "loading" });
  }

  function handleLoad(event: React.SyntheticEvent<HTMLImageElement>): void {
    const image = event.currentTarget;
    setState((prev) => ({ ...prev, status: image.naturalWidth <= 1 ? "missing" : "loaded" }));
  }

  function handleError(): void {
    setState((prev) => ({ ...prev, status: "error" }));
  }

  return { status: state.src === src ? state.status : "loading", handleLoad, handleError };
}
