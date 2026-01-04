/**
 * A single font variant (e.g., upright or italic).
 */
export class FontVariant {
  readonly bytes: Uint8Array;

  private constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  /**
   * Create a FontVariant from base64-encoded font data.
   * Used for embedded fonts loaded at compile time.
   */
  static fromBase64(base64Data: string): FontVariant {
    // Inline base64 decoding to avoid importing from @glade/utils
    // which could pull in other dependencies
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new FontVariant(bytes);
  }

  /**
   * Create a FontVariant from raw bytes.
   * Used for fonts loaded dynamically at runtime (e.g., via fetch).
   */
  static fromBytes(bytes: Uint8Array): FontVariant {
    return new FontVariant(bytes);
  }
}

/**
 * A font family containing upright and optional italic variants.
 *
 * For fonts like Inter that have separate upright and italic font files,
 * both variants should be provided. For fonts that support italic via
 * a variation axis (like some variable fonts), or that don't need italic,
 * the italic variant can be omitted.
 */
export class FontFamily {
  readonly name: string;
  readonly upright: FontVariant;
  readonly italic: FontVariant | null;

  constructor(options: { name: string; upright: FontVariant; italic?: FontVariant }) {
    this.name = options.name;
    this.upright = options.upright;
    this.italic = options.italic ?? null;
  }

  /**
   * Check if this family has a separate italic variant.
   */
  hasItalic(): boolean {
    return this.italic !== null;
  }
}
