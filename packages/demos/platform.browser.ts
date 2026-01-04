import { FontFamily, FontVariant } from "@glade/glade";
import { createGladePlatform, type GladePlatformOptions } from "@glade/glade/platform";

const FONT_BASE_URL = "/fonts";

async function loadFonts(): Promise<FontFamily[]> {
  const [inter, interItalic, jetbrains, emoji] = await Promise.all([
    fetch(`${FONT_BASE_URL}/InterVariable.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${FONT_BASE_URL}/InterVariable-Italic.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${FONT_BASE_URL}/JetBrainsMono-Regular.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${FONT_BASE_URL}/NotoColorEmoji-Regular.ttf`).then((r) => r.arrayBuffer()),
  ]);

  return [
    new FontFamily({
      name: "Inter",
      upright: FontVariant.fromBytes(new Uint8Array(inter)),
      italic: FontVariant.fromBytes(new Uint8Array(interItalic)),
    }),
    new FontFamily({
      name: "JetBrains Mono",
      upright: FontVariant.fromBytes(new Uint8Array(jetbrains)),
    }),
    new FontFamily({
      name: "Noto Color Emoji",
      upright: FontVariant.fromBytes(new Uint8Array(emoji)),
    }),
  ];
}

export type DemosPlatformResult = {
  platform: Awaited<ReturnType<typeof createGladePlatform>>;
  fonts: FontFamily[];
};

export async function createDemosPlatform(
  options: GladePlatformOptions
): Promise<DemosPlatformResult> {
  const platform = await createGladePlatform(options);
  const fonts = await loadFonts();
  return { platform, fonts };
}
