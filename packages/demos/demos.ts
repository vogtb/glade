import { GladeApp, type GladeContext, log } from "@glade/glade";
import { createGladePlatform } from "@glade/glade/platform";

import { MainView } from "./main.ts";

async function main() {
  const platform = await createGladePlatform({
    width: 960,
    height: 540,
    title: "Glade Example",
    titleBarStyle: "controlled",
  });

  const app = new GladeApp({ platform });
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
