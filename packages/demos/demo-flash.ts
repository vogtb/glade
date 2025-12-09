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
  path,
  type FlashDiv,
  type ScrollHandle,
  FlashElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type Bounds,
} from "@glade/flash";
import { embedAsBase64 } from "./embed" with { type: "macro" };

// Embed fonts as base64 at build time via Bun macro
const interFontBase64 = embedAsBase64("../../assets/InterVariable.ttf") as unknown as string;
const jetBrainsMonoRegularBase64 = embedAsBase64(
  "../../assets/JetBrainsMono-Regular.ttf"
) as unknown as string;
const jetBrainsMonoSemiBoldBase64 = embedAsBase64(
  "../../assets/JetBrainsMono-SemiBold.ttf"
) as unknown as string;

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
 * Custom element that renders vector paths.
 */
class PathDemoElement extends FlashElement<void, void> {
  private shapeType: "star" | "polygon" | "circle" | "heart" | "arrow";
  private color: { r: number; g: number; b: number; a: number };
  private size: number;

  constructor(
    shapeType: "star" | "polygon" | "circle" | "heart" | "arrow",
    color: { r: number; g: number; b: number; a: number },
    size: number
  ) {
    super();
    this.shapeType = shapeType;
    this.color = color;
    this.size = size;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<void> {
    const layoutId = cx.requestLayout({ width: this.size, height: this.size }, []);
    return { layoutId, requestState: undefined };
  }

  prepaint(_cx: PrepaintContext, _bounds: Bounds, _requestState: void): void {}

  paint(cx: PaintContext, bounds: Bounds, _prepaintState: void): void {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const radius = Math.min(bounds.width, bounds.height) / 2 - 4;

    const p = path();

    switch (this.shapeType) {
      case "star":
        p.star(centerX, centerY, radius, radius * 0.4, 5);
        break;
      case "polygon":
        p.polygon(centerX, centerY, radius, 6);
        break;
      case "circle":
        p.circle(centerX, centerY, radius);
        break;
      case "heart":
        this.drawHeart(p, centerX, centerY, radius);
        break;
      case "arrow":
        this.drawArrow(p, centerX, centerY, radius);
        break;
    }

    cx.paintPath(p, this.color);
  }

  private drawHeart(p: ReturnType<typeof path>, cx: number, cy: number, size: number): void {
    const r = size * 0.22;
    const offsetX = r * 0.7;
    const offsetY = r * 0.5;

    p.circle(cx - offsetX, cy - offsetY, r);
    p.circle(cx + offsetX, cy - offsetY, r);

    const triangleTop = cy - offsetY + r * 0.3;
    const triangleBottom = cy + size * 0.35;
    const triangleHalfWidth = r + offsetX;
    p.moveTo(cx - triangleHalfWidth, triangleTop);
    p.lineTo(cx + triangleHalfWidth, triangleTop);
    p.lineTo(cx, triangleBottom);
    p.close();
  }

  private drawArrow(p: ReturnType<typeof path>, cx: number, cy: number, size: number): void {
    const s = size * 0.4;
    const headWidth = s * 0.9;
    const shaftWidth = s * 0.35;
    const headX = cx + s * 0.3;

    p.moveTo(cx + s, cy);
    p.lineTo(headX, cy - headWidth);
    p.lineTo(headX, cy + headWidth);
    p.close();

    p.rect(cx - s, cy - shaftWidth, headX - (cx - s) + shaftWidth * 0.5, shaftWidth * 2);
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): null {
    return null;
  }
}

function pathShape(
  shape: "star" | "polygon" | "circle" | "heart" | "arrow",
  color: { r: number; g: number; b: number; a: number },
  size: number
): PathDemoElement {
  return new PathDemoElement(shape, color, size);
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
  private leftScrollHandle: ScrollHandle | null = null;
  private rightScrollHandle: ScrollHandle | null = null;

  render(cx: FlashViewContext<this>): FlashDiv {
    if (!this.leftScrollHandle) {
      this.leftScrollHandle = cx.newScrollHandle(cx.windowId);
    }
    if (!this.rightScrollHandle) {
      this.rightScrollHandle = cx.newScrollHandle(cx.windowId);
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
          .trackScroll(this.leftScrollHandle)
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
        // Right column - main content area with text demo (scrollable)
        div()
          .flexGrow()
          .bg(rgb(0x2a2a35))
          .rounded(12)
          .p(24)
          .flex()
          .flexCol()
          .gap(16)
          .overflowHidden()
          .trackScroll(this.rightScrollHandle)
          .children_(
            div()
              .flexShrink0()
              .child(
                text("Flash Text Demo").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 })
              ),
            div()
              .flexShrink0()
              .child(
                text("GPU-accelerated text rendering with cosmic-text shaping")
                  .font("Inter")
                  .size(16)
                  .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 })
              ),
            div().h(1).flexShrink0().bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),

            // Inter font section
            div()
              .flexShrink0()
              .child(
                text("Inter Variable Font")
                  .font("Inter")
                  .size(18)
                  .color({ r: 0.9, g: 0.9, b: 1, a: 1 })
              ),
            div()
              .flexShrink0()
              .child(
                text("The quick brown fox jumps over the lazy dog.")
                  .font("Inter")
                  .size(14)
                  .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 })
              ),

            div().h(1).flexShrink0().bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),

            // JetBrains Mono section
            div()
              .flexShrink0()
              .child(
                text("JetBrains Mono Regular")
                  .font("JetBrains Mono")
                  .size(18)
                  .color({ r: 0.9, g: 0.9, b: 1, a: 1 })
              ),
            div()
              .flexShrink0()
              .child(
                text("const greeting = 'Hello, World!';")
                  .font("JetBrains Mono")
                  .size(14)
                  .color({ r: 0.6, g: 0.9, b: 0.6, a: 1 })
              ),
            div()
              .flexShrink0()
              .child(
                text("function fibonacci(n: number): number {")
                  .font("JetBrains Mono")
                  .size(14)
                  .color({ r: 0.9, g: 0.7, b: 0.5, a: 1 })
              ),
            div()
              .flexShrink0()
              .child(
                text("  return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);")
                  .font("JetBrains Mono")
                  .size(14)
                  .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 })
              ),
            div()
              .flexShrink0()
              .child(
                text("}").font("JetBrains Mono").size(14).color({ r: 0.9, g: 0.7, b: 0.5, a: 1 })
              ),

            div().h(1).flexShrink0().bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),

            // JetBrains Mono SemiBold section
            div()
              .flexShrink0()
              .child(
                text("JetBrains Mono SemiBold")
                  .font("JetBrains Mono SemiBold")
                  .size(18)
                  .color({ r: 0.9, g: 0.9, b: 1, a: 1 })
              ),
            div()
              .flexShrink0()
              .child(
                text("0O 1lI |! {} [] () <> => != === // /* */")
                  .font("JetBrains Mono SemiBold")
                  .size(16)
                  .color({ r: 0.5, g: 0.8, b: 1, a: 1 })
              ),
            div()
              .flexShrink0()
              .child(
                text("ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789")
                  .font("JetBrains Mono SemiBold")
                  .size(14)
                  .color({ r: 0.8, g: 0.6, b: 0.9, a: 1 })
              ),

            div().h(1).flexShrink0().bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),

            // Path/Vector Demo section
            div()
              .flexShrink0()
              .child(
                text("Vector Path Rendering")
                  .font("Inter")
                  .size(18)
                  .color({ r: 0.9, g: 0.9, b: 1, a: 1 })
              ),
            div()
              .flexShrink0()
              .child(
                text("GPU-accelerated vector graphics with tessellation")
                  .font("Inter")
                  .size(14)
                  .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 })
              ),

            // Row of vector shapes
            div()
              .flex()
              .flexRow()
              .flexShrink0()
              .gap(16)
              .flexWrap()
              .children_(
                pathShape("star", { r: 1, g: 0.8, b: 0.2, a: 1 }, 64),
                pathShape("polygon", { r: 0.3, g: 0.8, b: 1, a: 1 }, 64),
                pathShape("circle", { r: 0.9, g: 0.3, b: 0.5, a: 1 }, 64),
                pathShape("heart", { r: 1, g: 0.3, b: 0.4, a: 1 }, 64),
                pathShape("arrow", { r: 0.4, g: 0.9, b: 0.5, a: 1 }, 64)
              ),

            // Smaller shapes row
            div()
              .flex()
              .flexRow()
              .flexShrink0()
              .gap(8)
              .flexWrap()
              .children_(
                pathShape("star", { r: 0.9, g: 0.5, b: 0.9, a: 1 }, 32),
                pathShape("polygon", { r: 0.5, g: 0.9, b: 0.7, a: 1 }, 32),
                pathShape("circle", { r: 0.9, g: 0.7, b: 0.3, a: 1 }, 32),
                pathShape("heart", { r: 0.7, g: 0.3, b: 0.9, a: 1 }, 32),
                pathShape("arrow", { r: 0.3, g: 0.7, b: 0.9, a: 1 }, 32),
                pathShape("star", { r: 0.9, g: 0.4, b: 0.4, a: 1 }, 32),
                pathShape("polygon", { r: 0.4, g: 0.9, b: 0.4, a: 1 }, 32)
              )
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

  // Load embedded fonts
  window.registerFont("Inter", base64ToBytes(interFontBase64));
  window.registerFont("JetBrains Mono", base64ToBytes(jetBrainsMonoRegularBase64));
  window.registerFont("JetBrains Mono SemiBold", base64ToBytes(jetBrainsMonoSemiBoldBase64));
  console.log("Loaded fonts: Inter, JetBrains Mono, JetBrains Mono SemiBold");

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
