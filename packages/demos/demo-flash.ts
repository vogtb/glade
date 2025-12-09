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
  type ScrollHandle,
} from "@glade/flash";

/**
 * Helper to create a hoverable button.
 */
function hoverButton(color: number, hoverColor: number): FlashDiv {
  return div()
    .h(48)
    .flexShrink0()
    .bg(rgb(color))
    .rounded(8)
    .cursorPointer()
    .hover((s) => s.bg(rgb(hoverColor)).shadow("md"));
}

/**
 * Main demo view - the root view of the application.
 */
class DemoRootView implements FlashView {
  private scrollHandle: ScrollHandle | null = null;

  render(cx: FlashViewContext<this>): FlashDiv {
    if (!this.scrollHandle) {
      this.scrollHandle = cx.newScrollHandle(cx.windowId);
    }

    return div()
      .flex()
      .flexRow()
      .w(cx.window.width)
      .h(cx.window.height)
      .bg(rgb(0x14141a))
      .gap(20)
      .p(20)
      .children_(
        // Left column - fixed width, scrollable
        div()
          .flex()
          .flexCol()
          .w(240)
          .bg(rgb(0x1f1f28))
          .rounded(12)
          .p(16)
          .gap(12)
          .overflowHidden()
          .trackScroll(this.scrollHandle)
          .children_(
            hoverButton(0x3b82f6, 0x2563eb),
            hoverButton(0x10b981, 0x059669),
            hoverButton(0xf59e0b, 0xd97706),
            hoverButton(0xef4444, 0xdc2626),
            hoverButton(0x8b5cf6, 0x7c3aed),
            hoverButton(0xec4899, 0xdb2777),
            hoverButton(0x06b6d4, 0x0891b2),
            hoverButton(0x84cc16, 0x65a30d),
            hoverButton(0xf97316, 0xea580c),
            hoverButton(0x6366f1, 0x4f46e5),
            hoverButton(0x14b8a6, 0x0d9488),
            hoverButton(0xa855f7, 0x9333ea),
            hoverButton(0xf43f5e, 0xe11d48),
            hoverButton(0x22c55e, 0x16a34a),
            hoverButton(0x0ea5e9, 0x0284c7)
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
