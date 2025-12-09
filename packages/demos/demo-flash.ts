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
  text,
  type FlashDiv,
  type ScrollHandle,
} from "@glade/flash";
import { embedAsBase64 } from "./embed" with { type: "macro" };

// Embed font as base64 at build time via Bun macro
const interFontBase64 = embedAsBase64("../../assets/InterVariable.ttf") as unknown as string;

/**
 * Decode base64 to Uint8Array (works in both browser and Node/Bun)
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Helper to create a hoverable button with text label.
 */
function hoverButton(label: string, color: number, hoverColor: number): FlashDiv {
  return div()
    .h(48)
    .flexShrink0()
    .bg(rgb(color))
    .rounded(8)
    .cursorPointer()
    .hover((s) => s.bg(rgb(hoverColor)).shadow("md"))
    .flex()
    .itemsCenter()
    .justifyCenter()
    .child(text(label).font("Inter").size(14).color({ r: 1, g: 1, b: 1, a: 1 }));
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
            hoverButton("Dashboard", 0x3b82f6, 0x2563eb),
            hoverButton("Analytics", 0x10b981, 0x059669),
            hoverButton("Settings", 0xf59e0b, 0xd97706),
            hoverButton("Users", 0xef4444, 0xdc2626),
            hoverButton("Reports", 0x8b5cf6, 0x7c3aed),
            hoverButton("Messages", 0xec4899, 0xdb2777),
            hoverButton("Calendar", 0x06b6d4, 0x0891b2),
            hoverButton("Projects", 0x84cc16, 0x65a30d),
            hoverButton("Tasks", 0xf97316, 0xea580c),
            hoverButton("Files", 0x6366f1, 0x4f46e5),
            hoverButton("Teams", 0x14b8a6, 0x0d9488),
            hoverButton("Integrations", 0xa855f7, 0x9333ea),
            hoverButton("Billing", 0xf43f5e, 0xe11d48),
            hoverButton("Help", 0x22c55e, 0x16a34a),
            hoverButton("Logout", 0x0ea5e9, 0x0284c7)
          ),
        // Right column - main content area with text demo
        div()
          .flexGrow()
          .bg(rgb(0x2a2a35))
          .rounded(12)
          .p(24)
          .flex()
          .flexCol()
          .gap(16)
          .children_(
            text("Flash Text Demo").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
            text("GPU-accelerated text rendering with cosmic-text shaping")
              .font("Inter")
              .size(16)
              .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
            div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
            text("The Inter font is embedded at build time using Bun macros.")
              .font("Inter")
              .size(14)
              .color({ r: 0.6, g: 0.6, b: 0.7, a: 1 }),
            text("Text shaping is handled by cosmic-text compiled to WASM.")
              .font("Inter")
              .size(14)
              .color({ r: 0.6, g: 0.6, b: 0.7, a: 1 }),
            text("Glyphs are rasterized to a GPU texture atlas for efficient rendering.")
              .font("Inter")
              .size(14)
              .color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
          )
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

  const window = await app.openWindow({ width: 1200, height: 800, title: "Flash App Demo" }, (cx) =>
    cx.newView<DemoRootView>(() => new DemoRootView())
  );

  // Load embedded font
  const fontData = base64ToBytes(interFontBase64);
  window.registerFont("Inter", fontData);
  console.log("Loaded Inter font for text rendering");

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
