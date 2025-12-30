import {
  div,
  h1,
  text,
  type FlashView,
  type FlashViewContext,
  type ScrollHandle,
  type Theme,
} from "@glade/flash";
import type { Demo } from "./demo";
import { TEXT_DEMO } from "./text_demo";

const DEMOS: Demo[] = [
  TEXT_DEMO,
  { name: "Divs", renderElement: () => div() },
  { name: "Fonts", renderElement: () => div() },
  { name: "Monospaced", renderElement: () => div() },
  { name: "Code/Pre", renderElement: () => div() },
  { name: "Emoji", renderElement: () => div() },
  { name: "Underlined", renderElement: () => div() },
  { name: "Input", renderElement: () => div() },
  { name: "Focus", renderElement: () => div() },
  { name: "Headers", renderElement: () => div() },
  { name: "Canvas", renderElement: () => div() },
  { name: "Simple Selection", renderElement: () => div() },
  { name: "X-Element Selection", renderElement: () => div() },
  { name: "Flexbox", renderElement: () => div() },
  { name: "Grid", renderElement: () => div() },
  { name: "Table", renderElement: () => div() },
  { name: "Border", renderElement: () => div() },
  { name: "Padding", renderElement: () => div() },
  { name: "Margin", renderElement: () => div() },
  { name: "Focus", renderElement: () => div() },
  { name: "Groups", renderElement: () => div() },
  { name: "Scrollbars", renderElement: () => div() },
  { name: "Virtual Scrolling", renderElement: () => div() },
  { name: "Clipboard", renderElement: () => div() },
  { name: "WebGPU", renderElement: () => div() },
  { name: "Images", renderElement: () => div() },
  { name: "Deferred", renderElement: () => div() },
  { name: "Icon", renderElement: () => div() },
  { name: "Link", renderElement: () => div() },
  { name: "Button", renderElement: () => div() },
  { name: "Tab", renderElement: () => div() },
  { name: "Radio", renderElement: () => div() },
  { name: "Switch", renderElement: () => div() },
  { name: "Checkbox", renderElement: () => div() },
  { name: "Popover", renderElement: () => div() },
  { name: "Dropdown", renderElement: () => div() },
  { name: "Right-Click Menu", renderElement: () => div() },
];

export class MainView implements FlashView {
  private readonly demos: Demo[] = DEMOS;
  private selectedDemo: Demo;
  private selectedDemoName: string;
  private navScrollHandle: ScrollHandle | null = null;
  private contentScrollHandle: ScrollHandle | null = null;

  constructor() {
    this.selectedDemoName = this.demos[0]?.name ?? "Demo";
    this.selectedDemo = this.demos[0]!;
  }

  render(cx: FlashViewContext<this>) {
    const theme = cx.getTheme();
    const navWidth = Math.min(320, Math.max(220, Math.floor(cx.window.width * 0.28)));

    if (!this.navScrollHandle) {
      this.navScrollHandle = cx.newScrollHandle(cx.windowId);
    }
    if (!this.contentScrollHandle) {
      this.contentScrollHandle = cx.newScrollHandle(cx.windowId);
    }

    return div()
      .flex()
      .flexRow()
      .w(cx.window.width)
      .h(cx.window.height)
      .bg(theme.surface)
      .children(
        div()
          .flex()
          .flexCol()
          .w(navWidth)
          .hFull()
          .flexShrink0()
          .bg(theme.surfaceMuted)
          .overflowHidden()
          .children(
            div()
              .flex()
              .flexCol()
              .flexGrow()
              .hMax(cx.window.height)
              .overflowScroll()
              .scrollbarAlways()
              .trackScroll(this.navScrollHandle!)
              .children(...this.demos.map((demo) => this.renderDemoButton(cx, theme, demo)))
          ),
        div()
          .flex()
          .flexCol()
          .flexGrow()
          .hFull()
          .bg(theme.background)
          .overflowHidden()
          .child(this.renderActiveDemo(cx, theme))
      );
  }

  private renderActiveDemo(cx: FlashViewContext<this>, theme: Theme) {
    return div()
      .flex()
      .flexCol()
      .gap(12)
      .p(12)
      .hFull()
      .overflowScroll()
      .scrollbarAlways()
      .trackScroll(this.contentScrollHandle!)
      .children(
        div().child(h1(this.selectedDemoName).font("Inter").color(theme.text)),
        div().child(this.selectedDemo.renderElement())
      );
  }

  private renderDemoButton(cx: FlashViewContext<this>, theme: Theme, demo: Demo) {
    const isSelected = demo.name === this.selectedDemoName;
    const baseBg = isSelected ? theme.primary : theme.background;
    const hoverBg = isSelected ? theme.primary : theme.backgroundHover;
    const textColor = isSelected ? theme.primaryForeground : theme.text;

    return div()
      .flex()
      .flexCol()
      .h(20)
      .px(6)
      .cursorPointer()
      .bg(baseBg)
      .hover((state) => state.bg(hoverBg))
      .onClick(
        cx.listener((view, _event, _window, entityCx) => {
          view.selectedDemoName = demo.name;
          view.selectedDemo = demo;
          entityCx.notify();
        })
      )
      .child(text(demo.name).font("Inter").size(12).lineHeight(20).color(textColor));
  }
}
