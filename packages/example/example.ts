import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };
import {
  createColorSchemeProvider,
  createFlashPlatform,
  createWebGPUContext,
  runWebGPURenderLoop,
} from "@glade/platform";
import { FlashApp, type FlashContext } from "@glade/flash";
import { MainView } from "./main.ts";
import { base64ToBytes } from "@glade/utils";

const interFontBase64 = COMPTIME_embedAsBase64(
  "../../assets/InterVariable.ttf"
) as unknown as string;
const jetBrainsMonoSemiBoldBase64 = COMPTIME_embedAsBase64(
  "../../assets/JetBrainsMono-SemiBold.ttf"
) as unknown as string;
const notoEmojiBase64 = COMPTIME_embedAsBase64("../../assets/NotoColorEmoji-Regular.ttf");

async function main() {
  const ctx = await createWebGPUContext({
    width: 960,
    height: 540,
    title: "Glade Example",
  });

  const platform = createFlashPlatform(ctx);
  const colorSchemeProvider = createColorSchemeProvider();

  const app = new FlashApp({ platform, colorSchemeProvider });
  await app.initialize();

  const window = await app.openWindow(
    { width: ctx.width, height: ctx.height, title: "Glade Example" },
    (cx: FlashContext) => cx.newView(() => new MainView())
  );

  window.registerFont("Inter", base64ToBytes(interFontBase64));
  window.registerFont("JetBrains Mono SemiBold", base64ToBytes(jetBrainsMonoSemiBoldBase64));
  window.registerFont("Noto Color Emoji", base64ToBytes(notoEmojiBase64));

  app.run();

  const tick = Reflect.get(platform, "tick");
  if (typeof tick === "function") {
    runWebGPURenderLoop(ctx, (time: number, _deltaTime: number) => {
      Reflect.apply(tick, platform, [time * 1000]);
    });
  }
}

main().catch((error) => {
  console.error(error);
  throw error;
});
