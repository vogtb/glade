import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };
import { log } from "@glade/logging";
import { base64ToBytes, formatBytes, timed } from "@glade/utils";

const INTER_VAR_BASE_64 = COMPTIME_embedAsBase64("../../assets/InterVariable.ttf");
const INTER_VAR_ITALIC_BASE_64 = COMPTIME_embedAsBase64("../../assets/InterVariable-Italic.ttf");
const JETBRAINS_MONO_REGULAR_BASE_64 = COMPTIME_embedAsBase64(
  "../../assets/JetBrainsMono-Regular.ttf"
);
const NOTO_COLOR_EMOJI_REGULAR = COMPTIME_embedAsBase64("../../assets/NotoColorEmoji-Regular.ttf");

/**
 * A single font variant (e.g., upright or italic).
 */
export class FontVariant {
  readonly base64Data: string;
  readonly bytes: Uint8Array;

  constructor({ base64Data }: { base64Data: string }) {
    this.base64Data = base64Data;
    this.bytes = base64ToBytes(base64Data);
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

const logFontFamilyInfo = (f: FontFamily, ms: number) => {
  const uprightSize = formatBytes(f.upright.bytes.byteLength);
  const italicSize = f.italic ? formatBytes(f.italic.bytes.byteLength) : null;
  const sizeInfo = italicSize
    ? `upright=${uprightSize}, italic=${italicSize}`
    : `size=${uprightSize}`;
  log.info(`loaded ${f.name} duration=${ms.toFixed(2)}ms, ${sizeInfo}`);
};

export const INTER_FAMILY = timed(
  () =>
    new FontFamily({
      name: "Inter",
      upright: new FontVariant({ base64Data: INTER_VAR_BASE_64 }),
      italic: new FontVariant({ base64Data: INTER_VAR_ITALIC_BASE_64 }),
    }),
  logFontFamilyInfo
);

export const JETBRAINS_MONO_FAMILY = timed(
  () =>
    new FontFamily({
      name: "JetBrains Mono",
      upright: new FontVariant({ base64Data: JETBRAINS_MONO_REGULAR_BASE_64 }),
      // JetBrains Mono doesn't have a separate italic file; cosmic-text will synthesize
    }),
  logFontFamilyInfo
);

export const NOTO_COLOR_EMOJI_FAMILY = timed(
  () =>
    new FontFamily({
      name: "Noto Color Emoji",
      upright: new FontVariant({ base64Data: NOTO_COLOR_EMOJI_REGULAR }),
      // Emoji fonts don't have italic variants
    }),
  logFontFamilyInfo
);

export const FONT_FAMILIES = {
  Inter: INTER_FAMILY,
  JetBrainsMono: JETBRAINS_MONO_FAMILY,
  NotoColorEmoji: NOTO_COLOR_EMOJI_FAMILY,
};
