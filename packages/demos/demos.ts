import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };
import {
  createColorSchemeProvider,
  createGladePlatform,
  createWebGPUContext,
  runWebGPURenderLoop,
} from "@glade/platform";
import { GladeApp, type GladeContext } from "@glade/glade";
import { MainView } from "./main.ts";
import { base64ToBytes } from "@glade/utils";
import { log } from "@glade/logging";

const demoPngBase64 = COMPTIME_embedAsBase64("../../assets/image.png");
const flowerJpgBase64 = COMPTIME_embedAsBase64("../../assets/flower.jpg");

async function main() {
  const ctx = await createWebGPUContext({
    width: 960,
    height: 540,
    title: "Glade Example",
  });

  const platform = createGladePlatform(ctx);
  const colorSchemeProvider = createColorSchemeProvider();

  const app = new GladeApp({ platform, colorSchemeProvider });
  await app.initialize();

  const mainView = new MainView();
  const window = await app.openWindow(
    { width: ctx.width, height: ctx.height, title: "Glade Example" },
    (cx: GladeContext) => cx.newView(() => mainView)
  );

  const pngData = base64ToBytes(demoPngBase64);
  const decodedPng = await platform.decodeImage(pngData);
  const pngImageTile = window.uploadImage(decodedPng);

  const jpgData = base64ToBytes(flowerJpgBase64);
  const decodedJpg = await platform.decodeImage(jpgData);
  const jpgImageTile = window.uploadImage(decodedJpg);

  mainView.setImageTiles(pngImageTile, jpgImageTile);

  app.run();

  const tick = Reflect.get(platform, "tick");
  if (typeof tick === "function") {
    runWebGPURenderLoop(ctx, (time: number, _deltaTime: number) => {
      Reflect.apply(tick, platform, [time * 1000]);
    });
  }
}

main().catch((error) => {
  log.error(error);
  throw error;
});
