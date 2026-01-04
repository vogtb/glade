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
