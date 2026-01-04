import { FONT_FAMILIES, type FontFamily } from "@glade/fonts";
import { createGladePlatform, type MacOSGladePlatformOptions } from "@glade/glade/platform.macos";

export type DemosPlatformResult = {
  platform: Awaited<ReturnType<typeof createGladePlatform>>;
  fonts: FontFamily[];
};

export async function createDemosPlatform(
  options: MacOSGladePlatformOptions
): Promise<DemosPlatformResult> {
  const platform = await createGladePlatform(options);
  const fonts = Object.values(FONT_FAMILIES);
  return { platform, fonts };
}
