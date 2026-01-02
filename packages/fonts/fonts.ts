import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };
import { base64ToBytes } from "@glade/utils";

const INTER_VAR_BASE_64 = COMPTIME_embedAsBase64(
  "../../assets/InterVariable.ttf"
) as unknown as string;
const JETBRAINS_MONO_REGULAR_BASE_64 = COMPTIME_embedAsBase64(
  "../../assets/JetBrainsMono-Regular.ttf"
) as unknown as string;
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

export const INTER_FONT = new Font({
  name: "Inter",
  base64Data: INTER_VAR_BASE_64,
});

export const JETBRAINS_MONO = new Font({
  name: "JetBrains Mono",
  base64Data: JETBRAINS_MONO_REGULAR_BASE_64,
});

export const NOTO_COLOR_EMOJI = new Font({
  name: "Noto Color Emoji",
  base64Data: NOTO_COLOR_EMOJI_REGULAR,
});
