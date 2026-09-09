import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement `matchMedia` — `useIsMobile` (ACM-082) and shadcn's
// `sidebar.tsx` both call it on mount, so every test needs a stub, not just
// the ones that exercise responsive behavior directly.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
