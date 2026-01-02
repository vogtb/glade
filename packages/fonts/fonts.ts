import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };
import { base64ToBytes, timed } from "@glade/utils";

const INTER_VAR_BASE_64 = COMPTIME_embedAsBase64("../../assets/InterVariable.ttf");
const JETBRAINS_MONO_REGULAR_BASE_64 = COMPTIME_embedAsBase64(
  "../../assets/JetBrainsMono-Regular.ttf"
);
const NOTO_COLOR_EMOJI_REGULAR = COMPTIME_embedAsBase64("../../assets/NotoColorEmoji-Regular.ttf");

export class Font {
  readonly name: string;
  readonly base64Data: string;
  readonly sizeBytes: number;

  constructor({ name, base64Data }: { name: string; base64Data: string }) {
    this.name = name;
    this.base64Data = base64Data;
    this.sizeBytes = new TextEncoder().encode(base64Data).length;
  }

  toBytes(): Uint8Array {
    return base64ToBytes(this.base64Data);
  }
}

export const INTER_FONT = timed(
  () =>
    new Font({
      name: "Inter",
      base64Data: INTER_VAR_BASE_64,
    }),
  (ms) => console.log(`[fonts] Inter font loaded in in ${ms.toFixed(2)}ms`)
);
export const JETBRAINS_MONO = timed(
  () =>
    new Font({
      name: "JetBrains Mono",
      base64Data: JETBRAINS_MONO_REGULAR_BASE_64,
    }),
  (ms) => console.log(`[fonts] Jetbrains Mono font loaded in in ${ms.toFixed(2)}ms`)
);

export const NOTO_COLOR_EMOJI = timed(
  () =>
    new Font({
      name: "Noto Color Emoji",
      base64Data: NOTO_COLOR_EMOJI_REGULAR,
    }),
  (ms) => console.log(`[fonts] Noto Color Emoji font loaded in in ${ms.toFixed(2)}ms`)
);
