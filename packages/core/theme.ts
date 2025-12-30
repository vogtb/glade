/**
 * Color scheme preference utilities.
 *
 * Provides a minimal interface for querying and subscribing to system-level
 * light/dark preferences across platforms.
 */

export type ColorScheme = "light" | "dark";

export interface ColorSchemeProvider {
  /**
   * Get the current color scheme.
   */
  get(): ColorScheme;

  /**
   * Subscribe to changes in the color scheme.
   * Returns a cleanup function to remove the listener.
   */
  subscribe(callback: (scheme: ColorScheme) => void): () => void;
}

/**
 * Create a provider that always reports the given scheme.
 */
export function createStaticColorSchemeProvider(scheme: ColorScheme): ColorSchemeProvider {
  const listeners = new Set<(value: ColorScheme) => void>();

  return {
    get(): ColorScheme {
      return scheme;
    },
    subscribe(callback: (value: ColorScheme) => void): () => void {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
  };
}
