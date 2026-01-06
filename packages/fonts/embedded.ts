import { log } from "@glade/logging";
import { formatBytes, timed } from "@glade/utils";

import { FontFamily, FontVariant } from "./font";
import {
  INTER_VAR_BASE64,
  INTER_VAR_ITALIC_BASE64,
  JETBRAINS_MONO_REGULAR_BASE64,
  NOTO_COLOR_EMOJI_REGULAR_BASE64,
} from "./gen.embedded";

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
      upright: FontVariant.fromBase64(INTER_VAR_BASE64),
      italic: FontVariant.fromBase64(INTER_VAR_ITALIC_BASE64),
    }),
  logFontFamilyInfo
);

export const JETBRAINS_MONO_FAMILY = timed(
  () =>
    new FontFamily({
      name: "JetBrains Mono",
      upright: FontVariant.fromBase64(JETBRAINS_MONO_REGULAR_BASE64),
    }),
  logFontFamilyInfo
);

export const NOTO_COLOR_EMOJI_FAMILY = timed(
  () =>
    new FontFamily({
      name: "Noto Color Emoji",
      upright: FontVariant.fromBase64(NOTO_COLOR_EMOJI_REGULAR_BASE64),
    }),
  logFontFamilyInfo
);

export const FONT_FAMILIES = {
  Inter: INTER_FAMILY,
  JetBrainsMono: JETBRAINS_MONO_FAMILY,
  NotoColorEmoji: NOTO_COLOR_EMOJI_FAMILY,
};
