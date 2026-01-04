import { type FontFamily } from "@glade/glade";
import { FONT_FAMILIES } from "@glade/glade/fonts";
import { createGladePlatform, type GladePlatformOptions } from "@glade/glade/platform";

export type DemosPlatformResult = {
  platform: Awaited<ReturnType<typeof createGladePlatform>>;
  fonts: FontFamily[];
};

export async function createDemosPlatform(
  options: GladePlatformOptions
): Promise<DemosPlatformResult> {
  const platform = await createGladePlatform(options);
  const fonts = Object.values(FONT_FAMILIES);
  return { platform, fonts };
}
