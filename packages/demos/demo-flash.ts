/**
 * Flash App Demo
 *
 * Demonstrates the full FlashApp framework with proper View architecture.
 *
 * Run with: bun run run:flash:native
 */

import { createWebGPUContext, runWebGPURenderLoop, createFlashPlatform } from "@glade/platform";
import {
  FlashApp,
  type FlashView,
  type FlashViewContext,
  div,
  rgb,
  type FlashDiv,
} from "@glade/flash";

/**
 * Main demo view - the root view of the application.
 */
class DemoRootView implements FlashView {
  render(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexRow()
      .w(cx.window.width)
      .h(cx.window.height)
      .bg(rgb(0x14141a))
      .gap(20)
      .p(20)
      .children_(
        // Left column - fixed width with hoverable items
        div()
          .flex()
          .flexCol()
          .w(240)
          .bg(rgb(0x1f1f28))
          .rounded(12)
          .p(16)
          .gap(12)
          .children_(
            div()
              .h(48)
              .bg(rgb(0x3b82f6))
              .rounded(8)
              .cursorPointer()
              .hover((s) => s.bg(rgb(0x2563eb)).shadow("md")),
            div()
              .h(48)
              .bg(rgb(0x10b981))
              .rounded(8)
              .cursorPointer()
              .hover((s) => s.bg(rgb(0x059669)).shadow("md")),
            div()
              .h(48)
              .bg(rgb(0xf59e0b))
              .rounded(8)
              .cursorPointer()
              .hover((s) => s.bg(rgb(0xd97706)).shadow("md"))
          ),
        // Right column - fills remaining space
        div().flexGrow().bg(rgb(0x2a2a35)).rounded(12)
      );
  }
}

async function main() {
  console.log("Initializing Flash App Demo...");

  const ctx = await createWebGPUContext({
    width: 1200,
    height: 800,
    title: "Flash App Demo",
  });

  const platform = createFlashPlatform(ctx);

  const app = new FlashApp({ platform });
  await app.initialize();

  await app.openWindow({ width: 1200, height: 800, title: "Flash App Demo" }, (cx) =>
    cx.newView<DemoRootView>(() => new DemoRootView())
  );

  console.log("Flash App initialized, starting render loop...");

  app.run();

  const platformAny = platform as { tick?: (time: number) => void };
  runWebGPURenderLoop(ctx, (time, _deltaTime) => {
    if (platformAny.tick) {
      platformAny.tick(time * 1000);
    }
  });
}

main().catch(console.error);
