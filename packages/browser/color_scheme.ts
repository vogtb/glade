import type { ColorScheme, ColorSchemeProvider } from "@glade/core";

function detectScheme(mediaQuery: MediaQueryList | null): ColorScheme {
  if (mediaQuery) {
    return mediaQuery.matches ? "dark" : "light";
  }
  return "light";
}

/**
 * Create a color scheme provider for browser environments using
 * prefers-color-scheme media queries.
 */
export function createColorSchemeProvider(): ColorSchemeProvider {
  const listeners = new Set<(scheme: ColorScheme) => void>();
  const mediaQuery =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  let scheme = detectScheme(mediaQuery);

  let cleanup: (() => void) | null = null;
  if (mediaQuery) {
    const handler = (event: MediaQueryListEvent): void => {
      const nextScheme = event.matches ? "dark" : "light";
      if (nextScheme !== scheme) {
        scheme = nextScheme;
        for (const listener of listeners) {
          listener(scheme);
        }
      }
    };
    mediaQuery.addEventListener("change", handler);
    cleanup = () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }

  return {
    get(): ColorScheme {
      return scheme;
    },
    subscribe(callback: (value: ColorScheme) => void): () => void {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
        if (listeners.size === 0 && cleanup) {
          cleanup();
          cleanup = null;
        }
      };
    },
  };
}
