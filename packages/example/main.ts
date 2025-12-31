import {
  div,
  h1,
  text,
  TextInputController,
  type FlashView,
  type FlashViewContext,
  type FocusHandle,
  type ScrollHandle,
  type Theme,
} from "@glade/flash";
import type { Demo, DemoState } from "./demo";
import { TEXT_DEMO } from "./text_demo";
import { DIV_DEMO } from "./div_demo";
import { HEADING_DEMO } from "./heading_demo";
import { FONTS_DEMO } from "./fonts_demo";

import { CODE_DEMO } from "./code_pre_demo";
import { UNDERLINE_DEMO } from "./underline_demo";
import { EMOJI_DEMO } from "./emoji_demo";
import { INPUTS_DEMO } from "./input_demo";

const DEMOS: Demo[] = [
  TEXT_DEMO,
  DIV_DEMO,
  HEADING_DEMO,
  FONTS_DEMO,
  CODE_DEMO,
  UNDERLINE_DEMO,
  EMOJI_DEMO,
  INPUTS_DEMO,
  { name: "Focus", renderElement: (_cx, _state) => [] },
  { name: "Canvas", renderElement: (_cx, _state) => [] },
  { name: "Simple Selection", renderElement: (_cx, _state) => [] },
  { name: "X-Element Selection", renderElement: (_cx, _state) => [] },
  { name: "Flexbox", renderElement: (_cx, _state) => [] },
  { name: "Grid", renderElement: (_cx, _state) => [] },
  { name: "Table", renderElement: (_cx, _state) => [] },
  { name: "Border", renderElement: (_cx, _state) => [] },
  { name: "Padding", renderElement: (_cx, _state) => [] },
  { name: "Margin", renderElement: (_cx, _state) => [] },
  { name: "Groups", renderElement: (_cx, _state) => [] },
  { name: "Scrollbars", renderElement: (_cx, _state) => [] },
  { name: "Virtual Scrolling", renderElement: (_cx, _state) => [] },
  { name: "Clipboard", renderElement: (_cx, _state) => [] },
  { name: "WebGPU", renderElement: (_cx, _state) => [] },
  { name: "Images", renderElement: (_cx, _state) => [] },
  { name: "Deferred", renderElement: (_cx, _state) => [] },
  { name: "Icon", renderElement: (_cx, _state) => [] },
  { name: "Link", renderElement: (_cx, _state) => [] },
  { name: "Button", renderElement: (_cx, _state) => [] },
  { name: "Tab", renderElement: (_cx, _state) => [] },
  { name: "Radio", renderElement: (_cx, _state) => [] },
  { name: "Switch", renderElement: (_cx, _state) => [] },
  { name: "Checkbox", renderElement: (_cx, _state) => [] },
  { name: "Popover", renderElement: (_cx, _state) => [] },
  { name: "Dropdown", renderElement: (_cx, _state) => [] },
  { name: "Right-Click Menu", renderElement: (_cx, _state) => [] },
  { name: "Debug Mode", renderElement: (_cx, _state) => [] },
];

export class MainView implements FlashView {
  private readonly demos: Demo[] = DEMOS;
  private selectedDemo: Demo;
  private selectedDemoName: string;
  private navScrollHandle: ScrollHandle | null = null;
  private contentScrollHandle: ScrollHandle | null = null;
  private textInputHandle: FocusHandle | null = null;
  private textInputController: TextInputController | null = null;
  private textInputStatus = "Click the field to focus, then type to insert characters.";

  constructor() {
    this.selectedDemoName = this.demos[0]?.name ?? "Demo";
    this.selectedDemo = this.demos[0]!;
  }

  private ensureDemoState(cx: FlashViewContext<this>): DemoState {
    if (!this.textInputHandle) {
      this.textInputHandle = cx.focusHandle();
    }
    if (!this.textInputController) {
      this.textInputController = new TextInputController({ multiline: true });
    }
    return {
      textInputHandle: this.textInputHandle,
      textInputController: this.textInputController,
      textInputStatus: this.textInputStatus,
      setTextInputStatus: (status: string) => {
        this.textInputStatus = status;
      },
    };
  }

  setTextInputStatus(status: string) {
    this.textInputStatus = status;
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
        div().flex().flexCol().flexShrink().w(10).bg(theme.background),
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
    const state = this.ensureDemoState(cx);
    const items = this.selectedDemo.renderElement(cx, state);

    return div()
      .flex()
      .flexCol()
      .flex1()
      .p(12)
      .gap(8)
      .overflowScroll()
      .scrollbarAlways()
      .trackScroll(this.contentScrollHandle!)
      .children(div().child(h1(this.selectedDemoName).font("Inter").color(theme.text)), ...items);
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
