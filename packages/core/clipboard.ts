/**
 * Cross-platform clipboard contract. Impl should provide async access to read
 * and write plain text, exposing capability flags so callers can gracefully
 * degrade when unavailable.
 */
export type Clipboard = {
  /** True when the environment exposes any clipboard access. */
  readonly isSupported: boolean;
  /** True when plain-text reads are available. */
  readonly supportsReadText: boolean;
  /** True when plain-text writes are available. */
  readonly supportsWriteText: boolean;
  /**
   * Read plain text from the clipboard.
   * Rejects when reading is unavailable or denied.
   */
  readText(): Promise<string>;
  /**
   * Write plain text to the clipboard.
   * Rejects when writing is unavailable or denied.
   */
  writeText(text: string): Promise<void>;
};
