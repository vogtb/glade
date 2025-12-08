/**
 * Flash App Demo
 *
 * Demonstrates the full FlashApp framework with proper View architecture,
 * entity management, and the three-phase render cycle.
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

// ============================================================================
// Demo Views
// ============================================================================

/**
 * Main demo view - the root view of the application.
 */
class DemoRootView implements FlashView {
  private time = 0;

  render(cx: FlashViewContext<this>): FlashDiv {
    this.time += 0.016;

    // Request continuous rendering for animation
    cx.notify();

    return div()
      .flex()
      .flexCol()
      .size("100%")
      .bg(rgb(0x14141a))
      .p(20)
      .gap(20)
      .children_(
        this.renderHeader(cx),
        div()
          .flex()
          .flexRow()
          .flexGrow()
          .gap(20)
          .children_(
            this.renderLeftPanel(cx),
            this.renderMainContent(cx),
            this.renderRightPanel(cx)
          )
      );
  }

  private renderHeader(_cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexRow()
      .h(60)
      .bg(rgb(0x1f1f28))
      .rounded(12)
      .px(20)
      .itemsCenter()
      .justifyBetween()
      .shadowMd()
      .children_(
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children_(
            div().size(36).bg(rgb(0x6366f1)).roundedLg(),
            div().w(120).h(20).bg(rgb(0x3f3f4a)).rounded(4)
          ),
        div()
          .flex()
          .flexRow()
          .gap(8)
          .children_(
            this.renderWindowControl(rgb(0xff5f56)),
            this.renderWindowControl(rgb(0xffbd2e)),
            this.renderWindowControl(rgb(0x27c93f))
          )
      );
  }

  private renderWindowControl(color: { r: number; g: number; b: number; a: number }): FlashDiv {
    return div()
      .size(14)
      .bg(color)
      .roundedFull()
      .cursorPointer()
      .hover((s) => s.bg({ ...color, a: 0.8 }));
  }

  private renderLeftPanel(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .w(240)
      .bg(rgb(0x1f1f28))
      .rounded(12)
      .p(16)
      .gap(12)
      .shadowMd()
      .children_(
        div().h(24).bg(rgb(0x3f3f4a)).rounded(4),
        this.renderNavItem("Dashboard", true),
        this.renderNavItem("Projects", false),
        this.renderNavItem("Settings", false),
        div().flexGrow(),
        this.renderButtonDemo(cx)
      );
  }

  private renderNavItem(_label: string, active: boolean): FlashDiv {
    const baseColor = active ? rgb(0x6366f1) : rgb(0x2f2f38);
    const hoverColor = active ? rgb(0x7c7cf9) : rgb(0x3f3f4a);

    return div()
      .flex()
      .flexRow()
      .h(40)
      .px(12)
      .itemsCenter()
      .bg(baseColor)
      .rounded(8)
      .cursorPointer()
      .hover((s) => s.bg(hoverColor))
      .child(
        div()
          .w(80)
          .h(14)
          .bg({ r: 1, g: 1, b: 1, a: active ? 0.9 : 0.5 })
          .rounded(4)
      );
  }

  private renderButtonDemo(cx: FlashViewContext<this>): FlashDiv {
    const handleClick = cx.listener((view, _event, _window, ecx) => {
      console.log("Button clicked!");
      view.time = 0;
      ecx.notify();
    });

    return div()
      .flex()
      .flexCol()
      .gap(8)
      .children_(
        div()
          .h(40)
          .bg(rgb(0x3b82f6))
          .rounded(8)
          .cursorPointer()
          .hover((s) => s.bg(rgb(0x2563eb)).shadow("md"))
          .active((s) => s.bg(rgb(0x1d4ed8)))
          .onClick(handleClick),
        div()
          .h(40)
          .bg(rgb(0x10b981))
          .rounded(8)
          .cursorPointer()
          .hover((s) => s.bg(rgb(0x059669)).shadow("md"))
          .active((s) => s.bg(rgb(0x047857)))
      );
  }

  private renderMainContent(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .flexGrow()
      .bg(rgb(0x1f1f28))
      .rounded(12)
      .p(20)
      .gap(16)
      .shadowMd()
      .children_(
        div()
          .flex()
          .flexRow()
          .gap(16)
          .children_(this.renderCard(cx, 0), this.renderCard(cx, 1), this.renderCard(cx, 2)),
        this.renderScrollDemo()
      );
  }

  private renderCard(_cx: FlashViewContext<this>, index: number): FlashDiv {
    const hue = (index * 0.15 + this.time * 0.1) % 1;
    const color = this.hslToRgb(hue, 0.6, 0.5);
    const yOffset = Math.sin(this.time * 2 + index * 0.8) * 3;

    return div()
      .flex()
      .flexCol()
      .flex1()
      .h(120)
      .bg(color)
      .rounded(12)
      .p(16)
      .gap(8)
      .shadowLg()
      .mt(yOffset)
      .cursorPointer()
      .hover((s) => s.shadow("xl"))
      .children_(
        div().h(12).w("60%").bg({ r: 1, g: 1, b: 1, a: 0.4 }).rounded(4),
        div().h(8).w("40%").bg({ r: 1, g: 1, b: 1, a: 0.25 }).rounded(3)
      );
  }

  private renderScrollDemo(): FlashDiv {
    const scrollItems: FlashDiv[] = [];
    for (let i = 0; i < 15; i++) {
      const hue = i / 15;
      const color = this.hslToRgb(hue, 0.5, 0.4);
      scrollItems.push(
        div()
          .h(40)
          .bg(color)
          .rounded(8)
          .cursorPointer()
          .hover((s) => s.bg(this.hslToRgb(hue, 0.6, 0.5)))
      );
    }

    return div()
      .flex()
      .flexCol()
      .flexGrow()
      .bg(rgb(0x14141a))
      .rounded(8)
      .p(12)
      .gap(8)
      .overflowScroll()
      .children_(...scrollItems);
  }

  private renderRightPanel(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .w(280)
      .bg(rgb(0x1f1f28))
      .rounded(12)
      .p(16)
      .gap(16)
      .shadowMd()
      .children_(
        div().h(24).bg(rgb(0x3f3f4a)).rounded(4),
        this.renderGroupHoverDemo(),
        this.renderDragDropDemo(cx),
        this.renderTooltipDemo()
      );
  }

  private renderGroupHoverDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(8)
      .children_(
        div().h(16).w("50%").bg(rgb(0x3f3f4a)).rounded(4),
        div()
          .flex()
          .flexRow()
          .gap(8)
          .children_(
            div()
              .flex1()
              .h(48)
              .bg(rgb(0x3730a3))
              .rounded(8)
              .group("buttons")
              .groupHover("buttons", (s) => s.bg(rgb(0x4338ca)))
              .cursorPointer()
              .hover((s) => s.bg(rgb(0x6366f1))),
            div()
              .flex1()
              .h(48)
              .bg(rgb(0x3730a3))
              .rounded(8)
              .group("buttons")
              .groupHover("buttons", (s) => s.bg(rgb(0x4338ca)))
              .cursorPointer()
              .hover((s) => s.bg(rgb(0x6366f1))),
            div()
              .flex1()
              .h(48)
              .bg(rgb(0x3730a3))
              .rounded(8)
              .group("buttons")
              .groupHover("buttons", (s) => s.bg(rgb(0x4338ca)))
              .cursorPointer()
              .hover((s) => s.bg(rgb(0x6366f1)))
          )
      );
  }

  private renderDragDropDemo(_cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(8)
      .children_(
        div().h(16).w("60%").bg(rgb(0x3f3f4a)).rounded(4),
        div()
          .flex()
          .flexRow()
          .gap(8)
          .children_(
            div()
              .flex1()
              .h(60)
              .bg(rgb(0xf59e0b))
              .rounded(8)
              .cursor("grab")
              .onDragStart(() => ({ data: { id: 1 } })),
            div()
              .flex1()
              .h(60)
              .bg(rgb(0xef4444))
              .rounded(8)
              .cursor("grab")
              .onDragStart(() => ({ data: { id: 2 } }))
          ),
        div()
          .h(80)
          .bg(rgb(0x2f2f38))
          .rounded(8)
          .border(2)
          .borderColor(rgb(0x4f4f5a))
          .onDrop(() => {
            console.log("Dropped!");
          })
          .dragOver((s) => s.bg(rgb(0x3f3f4a)).borderColor(rgb(0x6366f1)))
      );
  }

  private renderTooltipDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(8)
      .children_(
        div().h(16).w("40%").bg(rgb(0x3f3f4a)).rounded(4),
        div()
          .flex()
          .flexRow()
          .gap(8)
          .children_(
            div()
              .flex1()
              .h(48)
              .bg(rgb(0x8b5cf6))
              .rounded(8)
              .cursorPointer()
              .hover((s) => s.bg(rgb(0xa78bfa)))
              .tooltip(() => div().p(8).bg(rgb(0x1f1f28)).rounded(6).shadowLg()),
            div()
              .flex1()
              .h(48)
              .bg(rgb(0xec4899))
              .rounded(8)
              .cursorPointer()
              .hover((s) => s.bg(rgb(0xf472b6)))
              .tooltip(
                () => div().p(8).bg(rgb(0x1f1f28)).rounded(6).shadowLg(),
                (cfg) => cfg.delay(200).position("bottom")
              )
          )
      );
  }

  private hslToRgb(
    h: number,
    s: number,
    l: number
  ): { r: number; g: number; b: number; a: number } {
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return { r, g, b, a: 1 };
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

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

  // On Darwin, we need to tick the platform from the render loop
  const platformAny = platform as { tick?: (time: number) => void };
  runWebGPURenderLoop(ctx, (time, _deltaTime) => {
    if (platformAny.tick) {
      platformAny.tick(time * 1000);
    }
  });
}

main().catch(console.error);
