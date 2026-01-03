import {
  createColorSchemeProvider,
  createGladePlatform,
  createWebGPUContext,
  runWebGPURenderLoop,
} from "@glade/platform";
import { GladeApp, type GladeContext } from "@glade/glade";
import { MainView } from "./main.ts";
import { log } from "@glade/logging";

async function main() {
  const ctx = await createWebGPUContext({
    width: 960,
    height: 540,
    title: "Glade Example",
    titleBarStyle: "controlled",
  });

  const platform = createGladePlatform(ctx);
  const colorSchemeProvider = createColorSchemeProvider();

  const app = new GladeApp({ platform, colorSchemeProvider });
  await app.initialize();

  const mainView = new MainView({ showTitlebar: platform.runtime === "macos" });
  const _window = await app.openWindow(
    { width: ctx.width, height: ctx.height, title: "Glade Example" },
    (cx: GladeContext) => cx.newView(() => mainView)
  );

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
