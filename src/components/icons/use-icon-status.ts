import { useCallback, useState } from "react";

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
  refCallback: (node: HTMLImageElement | null) => void;
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

  /**
   * On server-rendered pages (ACM-123: public build/comp share views) the
   * `<img>` tag is already present in the initial HTML with its final
   * `src`, so the browser starts fetching it while parsing — often before
   * React hydrates and attaches the `onLoad`/`onError` listeners below. A
   * load/error that completes in that window fires no React event at all,
   * so `status` gets stuck at "loading" forever and the icon renders as an
   * invisible (opacity-0) image over its grey placeholder. This callback
   * ref runs at mount/commit time and checks `HTMLImageElement.complete`
   * synchronously, catching exactly that race for images that finished
   * before hydration attached the handlers. Images still in flight at
   * mount (`complete === false`) are unaffected and resolve normally via
   * `handleLoad`/`handleError` once they finish.
   */
  const refCallback = useCallback(
    (node: HTMLImageElement | null) => {
      if (!node || !node.complete) return;
      // `naturalWidth === 0` on a `complete` image means the load failed
      // (mirrors `onError`, which native `<img>` never re-fires once
      // `complete` is already true) — `1` is the real 1x1 blank sprite
      // (mirrors `onLoad`'s "missing" branch).
      const nextStatus: IconStatus =
        node.naturalWidth === 0 ? "error" : node.naturalWidth <= 1 ? "missing" : "loaded";
      setState((prev) => (prev.src === src ? { ...prev, status: nextStatus } : prev));
    },
    [src]
  );

  return {
    status: state.src === src ? state.status : "loading",
    handleLoad,
    handleError,
    refCallback,
  };
}
