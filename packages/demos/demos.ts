import { createDemosPlatform } from "@glade/demos/platform";
import { GladeApp, type GladeContext, log } from "@glade/glade";

import { COMPTIME_buildDateTime } from "../comptime/comptime.ts" with { type: "macro" };
import { MainView } from "./main.ts";

const BUILD_TIME = COMPTIME_buildDateTime();

async function main() {
  log.info(`running glade demo`);
  log.info(`built at ${BUILD_TIME}`);
  const { platform, fonts } = await createDemosPlatform({
    width: 960,
    height: 540,
    title: "Glade Example",
    titleBarStyle: "controlled",
  });

  const app = new GladeApp({ platform, fonts });
  await app.initialize();

  const mainView = new MainView({ showTitlebar: platform.runtime === "macos" });
  const _window = await app.openWindow(
    { width: 960, height: 540, title: "Glade Example" },
    (cx: GladeContext) => cx.newView(() => mainView)
  );

  app.run();
  platform.runRenderLoop(() => true);
}

main().catch((error) => {
  log.error(error);
  throw error;
});
