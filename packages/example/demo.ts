import {
  div,
  FlashElement,
  h1,
  text,
  type FlashView,
  type FlashViewContext,
  type ScrollHandle,
  type Theme,
} from "@glade/flash";

export type Demo<T extends FlashElement<unknown, unknown> = FlashElement<unknown, unknown>> = {
  name: string;
  element: T;
};

export class MainView implements FlashView {
  private readonly demos: Demo[];
  private selectedDemoName: string;
  private navScrollHandle: ScrollHandle | null = null;

  constructor(demos: Demo[]) {
    this.demos =
      demos.length > 0
        ? demos
        : [
            { name: "Text", element: div() },
            { name: "Divs", element: div() },
            { name: "Fonts", element: div() },
            { name: "Monospaced", element: div() },
            { name: "Code/Pre", element: div() },
            { name: "Emoji", element: div() },
            { name: "Underlined", element: div() },
            { name: "Input", element: div() },
            { name: "Focus", element: div() },
            { name: "Headers", element: div() },
            { name: "Canvas", element: div() },
            { name: "Simple Selection", element: div() },
            { name: "X-Element Selection", element: div() },
            { name: "Flexbox", element: div() },
            { name: "Grid", element: div() },
            { name: "Table", element: div() },
            { name: "Border", element: div() },
            { name: "Padding", element: div() },
            { name: "Margin", element: div() },
            { name: "Focus", element: div() },
            { name: "Groups", element: div() },
            { name: "Scrollbars", element: div() },
            { name: "Virtual Scrolling", element: div() },
            { name: "Clipboard", element: div() },
            { name: "WebGPU", element: div() },
            { name: "Images", element: div() },
            { name: "Deferred", element: div() },
            { name: "Icon", element: div() },
            { name: "Link", element: div() },
            { name: "Button", element: div() },
            { name: "Tab", element: div() },
            { name: "Radio", element: div() },
            { name: "Switch", element: div() },
            { name: "Checkbox", element: div() },
            { name: "Popover", element: div() },
            { name: "Dropdown", element: div() },
            { name: "Right-Click Menu", element: div() },
          ];
    this.selectedDemoName = this.demos[0]?.name ?? "Demo";
  }

  render(cx: FlashViewContext<this>) {
    const theme = cx.getTheme();
    const navWidth = Math.min(320, Math.max(220, Math.floor(cx.window.width * 0.28)));

    if (!this.navScrollHandle) {
      this.navScrollHandle = cx.newScrollHandle(cx.windowId);
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
        div().flex().flexCol().flexGrow().child(this.renderActiveDemo(cx, theme))
      );
  }

  private renderActiveDemo(cx: FlashViewContext<this>, theme: Theme) {
    return div().p(4).children(h1(this.selectedDemoName).font("Inter").color(theme.text));
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
          entityCx.notify();
        })
      )
      .child(text(demo.name).font("Inter").size(12).lineHeight(20).color(textColor));
  }
}
