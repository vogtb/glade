import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };
import { base64ToBytes, formatBytes, timed } from "@glade/utils";
import { log } from "@glade/logging";

const INTER_VAR_BASE_64 = COMPTIME_embedAsBase64("../../assets/InterVariable.ttf");
const JETBRAINS_MONO_REGULAR_BASE_64 = COMPTIME_embedAsBase64(
  "../../assets/JetBrainsMono-Regular.ttf"
);
const NOTO_COLOR_EMOJI_REGULAR = COMPTIME_embedAsBase64("../../assets/NotoColorEmoji-Regular.ttf");

export class Font {
  readonly name: string;
  readonly base64Data: string;
  readonly bytes: Uint8Array;

  constructor({ name, base64Data }: { name: string; base64Data: string }) {
    this.name = name;
    this.base64Data = base64Data;
    this.bytes = base64ToBytes(base64Data);
  }
}

const logFontInfo = (f: Font, ms: number) => {
  log.info(`loaded ${f.name} duration=${ms.toFixed(2)}ms, size=${formatBytes(f.bytes.byteLength)}`);
};

export const INTER_FONT = timed(
  () =>
    new Font({
      name: "Inter",
      base64Data: INTER_VAR_BASE_64,
    }),
  logFontInfo
);

export const JETBRAINS_MONO = timed(
  () =>
    new Font({
      name: "JetBrains Mono",
      base64Data: JETBRAINS_MONO_REGULAR_BASE_64,
    }),
  logFontInfo
);

export const NOTO_COLOR_EMOJI = timed(
  () =>
    new Font({
      name: "Noto Color Emoji",
      base64Data: NOTO_COLOR_EMOJI_REGULAR,
    }),
  logFontInfo
);

export const FONTS = {
  Inter: INTER_FONT,
  JetbrainsMono: JETBRAINS_MONO,
  NotoColorEmoji: NOTO_COLOR_EMOJI,
};
