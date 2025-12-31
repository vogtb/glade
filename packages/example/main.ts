import {
  createListState,
  div,
  h1,
  list,
  text,
  type FlashView,
  type FlashViewContext,
  type ListState,
  type ScrollHandle,
  type Theme,
} from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { TEXT_DEMO } from "./text_demo";
import { DIV_DEMO } from "./div_demo";

const DEMOS: Demo[] = [
  TEXT_DEMO,
  DIV_DEMO,
  { name: "Headers", renderElement: (_cx) => [] },
  { name: "Fonts", renderElement: (_cx) => [] },
  { name: "Monospaced", renderElement: (_cx) => [] },
  { name: "Code/Pre", renderElement: (_cx) => [] },
  { name: "Emoji", renderElement: (_cx) => [] },
  { name: "Underlined", renderElement: (_cx) => [] },
  { name: "Input", renderElement: (_cx) => [] },
  { name: "Focus", renderElement: (_cx) => [] },
  { name: "Canvas", renderElement: (_cx) => [] },
  { name: "Simple Selection", renderElement: (_cx) => [] },
  { name: "X-Element Selection", renderElement: (_cx) => [] },
  { name: "Flexbox", renderElement: (_cx) => [] },
  { name: "Grid", renderElement: (_cx) => [] },
  { name: "Table", renderElement: (_cx) => [] },
  { name: "Border", renderElement: (_cx) => [] },
  { name: "Padding", renderElement: (_cx) => [] },
  { name: "Margin", renderElement: (_cx) => [] },
  { name: "Groups", renderElement: (_cx) => [] },
  { name: "Scrollbars", renderElement: (_cx) => [] },
  { name: "Virtual Scrolling", renderElement: (_cx) => [] },
  { name: "Clipboard", renderElement: (_cx) => [] },
  { name: "WebGPU", renderElement: (_cx) => [] },
  { name: "Images", renderElement: (_cx) => [] },
  { name: "Deferred", renderElement: (_cx) => [] },
  { name: "Icon", renderElement: (_cx) => [] },
  { name: "Link", renderElement: (_cx) => [] },
  { name: "Button", renderElement: (_cx) => [] },
  { name: "Tab", renderElement: (_cx) => [] },
  { name: "Radio", renderElement: (_cx) => [] },
  { name: "Switch", renderElement: (_cx) => [] },
  { name: "Checkbox", renderElement: (_cx) => [] },
  { name: "Popover", renderElement: (_cx) => [] },
  { name: "Dropdown", renderElement: (_cx) => [] },
  { name: "Right-Click Menu", renderElement: (_cx) => [] },
  { name: "Debug Mode", renderElement: (_cx) => [] },
];

export class MainView implements FlashView {
  private readonly demos: Demo[] = DEMOS;
  private selectedDemo: Demo;
  private selectedDemoName: string;
  private navScrollHandle: ScrollHandle | null = null;
  private contentScrollHandle: ScrollHandle | null = null;
  private contentListState: ListState | null = null;

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
    if (!this.contentListState) {
      this.contentListState = createListState();
      this.contentListState.setScrollHandle(this.contentScrollHandle!);
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
    const items = this.selectedDemo.renderElement(cx);

    return div()
      .flex()
      .flexCol()
      .flex1()
      .children(
        list<DemoItem>((item, _props, _itemCx) => item, this.contentListState!)
          .p(12)
          .data([div().child(h1(this.selectedDemoName).font("Inter").color(theme.text)), ...items])
          .estimatedItemHeight(36)
          .setOverdraw(3)
          .trackScroll(this.contentScrollHandle!)
          .setContext(cx)
          .scrollbarAlways()
          .flex1()
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
