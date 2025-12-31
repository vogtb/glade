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
  { name: "Divs", renderElement: (_cx) => div() },
  { name: "Headers", renderElement: (_cx) => div() },
  { name: "Fonts", renderElement: (_cx) => div() },
  { name: "Monospaced", renderElement: (_cx) => div() },
  { name: "Code/Pre", renderElement: (_cx) => div() },
  { name: "Emoji", renderElement: (_cx) => div() },
  { name: "Underlined", renderElement: (_cx) => div() },
  { name: "Input", renderElement: (_cx) => div() },
  { name: "Focus", renderElement: (_cx) => div() },
  { name: "Canvas", renderElement: (_cx) => div() },
  { name: "Simple Selection", renderElement: (_cx) => div() },
  { name: "X-Element Selection", renderElement: (_cx) => div() },
  { name: "Flexbox", renderElement: (_cx) => div() },
  { name: "Grid", renderElement: (_cx) => div() },
  { name: "Table", renderElement: (_cx) => div() },
  { name: "Border", renderElement: (_cx) => div() },
  { name: "Padding", renderElement: (_cx) => div() },
  { name: "Margin", renderElement: (_cx) => div() },
  { name: "Groups", renderElement: (_cx) => div() },
  { name: "Scrollbars", renderElement: (_cx) => div() },
  { name: "Virtual Scrolling", renderElement: (_cx) => div() },
  { name: "Clipboard", renderElement: (_cx) => div() },
  { name: "WebGPU", renderElement: (_cx) => div() },
  { name: "Images", renderElement: (_cx) => div() },
  { name: "Deferred", renderElement: (_cx) => div() },
  { name: "Icon", renderElement: (_cx) => div() },
  { name: "Link", renderElement: (_cx) => div() },
  { name: "Button", renderElement: (_cx) => div() },
  { name: "Tab", renderElement: (_cx) => div() },
  { name: "Radio", renderElement: (_cx) => div() },
  { name: "Switch", renderElement: (_cx) => div() },
  { name: "Checkbox", renderElement: (_cx) => div() },
  { name: "Popover", renderElement: (_cx) => div() },
  { name: "Dropdown", renderElement: (_cx) => div() },
  { name: "Right-Click Menu", renderElement: (_cx) => div() },
  { name: "Debug Mode", renderElement: (_cx) => div() },
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
          .w(220)
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
          .flex1()
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
      .flex1()
      .overflowScroll()
      .scrollbarAlways()
      .trackScroll(this.contentScrollHandle!)
      .children(
        div().child(h1(this.selectedDemoName).font("Inter").color(theme.text)),
        this.selectedDemo.renderElement(cx)
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
