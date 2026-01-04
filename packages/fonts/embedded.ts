import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };
import { log } from "@glade/logging";
import { formatBytes, timed } from "@glade/utils";

import { FontFamily, FontVariant } from "./font";

const INTER_VAR_BASE_64 = COMPTIME_embedAsBase64("../../assets/InterVariable.ttf");
const INTER_VAR_ITALIC_BASE_64 = COMPTIME_embedAsBase64("../../assets/InterVariable-Italic.ttf");
const JETBRAINS_MONO_REGULAR_BASE_64 = COMPTIME_embedAsBase64(
  "../../assets/JetBrainsMono-Regular.ttf"
);
const NOTO_COLOR_EMOJI_REGULAR = COMPTIME_embedAsBase64("../../assets/NotoColorEmoji-Regular.ttf");

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
      upright: FontVariant.fromBase64(INTER_VAR_BASE_64),
      italic: FontVariant.fromBase64(INTER_VAR_ITALIC_BASE_64),
    }),
  logFontFamilyInfo
);

export const JETBRAINS_MONO_FAMILY = timed(
  () =>
    new FontFamily({
      name: "JetBrains Mono",
      upright: FontVariant.fromBase64(JETBRAINS_MONO_REGULAR_BASE_64),
    }),
  logFontFamilyInfo
);

export const NOTO_COLOR_EMOJI_FAMILY = timed(
  () =>
    new FontFamily({
      name: "Noto Color Emoji",
      upright: FontVariant.fromBase64(NOTO_COLOR_EMOJI_REGULAR),
    }),
  logFontFamilyInfo
);

export const FONT_FAMILIES = {
  Inter: INTER_FAMILY,
  JetBrainsMono: JETBRAINS_MONO_FAMILY,
  NotoColorEmoji: NOTO_COLOR_EMOJI_FAMILY,
};
