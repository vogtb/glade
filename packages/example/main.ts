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
import { FOCUS_DEMO } from "./focus_demo";
import { FLEXBOX_DEMO } from "./flexbox_demo";

const DEMOS: Demo[] = [
  TEXT_DEMO,
  DIV_DEMO,
  HEADING_DEMO,
  FONTS_DEMO,
  CODE_DEMO,
  UNDERLINE_DEMO,
  EMOJI_DEMO,
  INPUTS_DEMO,
  FOCUS_DEMO,
  FLEXBOX_DEMO,
  { name: "Canvas", renderElement: (_cx, _state) => [] },
  { name: "Simple Selection", renderElement: (_cx, _state) => [] },
  { name: "X-Element Selection", renderElement: (_cx, _state) => [] },
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

  private focusPrimaryHandle: FocusHandle | null = null;
  private focusSecondaryHandle: FocusHandle | null = null;
  private focusDangerHandle: FocusHandle | null = null;
  private toolbarHandles: FocusHandle[] = [];
  private toolbarContainerHandle: FocusHandle | null = null;
  private modalTriggerHandle: FocusHandle | null = null;
  private modalPrimaryHandle: FocusHandle | null = null;
  private modalCloseHandle: FocusHandle | null = null;
  private focusLog = "Click or Tab through the controls.";
  private focusModalOpen = false;
  private focusActionsRegistered = false;

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

    if (!this.focusPrimaryHandle) {
      this.focusPrimaryHandle = cx.newFocusHandle(cx.windowId);
    }
    if (!this.focusSecondaryHandle) {
      this.focusSecondaryHandle = cx.newFocusHandle(cx.windowId);
    }
    if (!this.focusDangerHandle) {
      this.focusDangerHandle = cx.newFocusHandle(cx.windowId);
    }
    if (this.toolbarHandles.length === 0) {
      this.toolbarHandles = [
        cx.newFocusHandle(cx.windowId),
        cx.newFocusHandle(cx.windowId),
        cx.newFocusHandle(cx.windowId),
      ];
    }
    if (!this.toolbarContainerHandle) {
      this.toolbarContainerHandle = cx.newFocusHandle(cx.windowId);
    }
    if (!this.modalTriggerHandle) {
      this.modalTriggerHandle = cx.newFocusHandle(cx.windowId);
    }
    if (!this.modalPrimaryHandle) {
      this.modalPrimaryHandle = cx.newFocusHandle(cx.windowId);
    }
    if (!this.modalCloseHandle) {
      this.modalCloseHandle = cx.newFocusHandle(cx.windowId);
    }

    this.registerFocusDemoActions(cx);

    return {
      textInputHandle: this.textInputHandle,
      textInputController: this.textInputController,
      textInputStatus: this.textInputStatus,
      setTextInputStatus: (status: string) => {
        this.textInputStatus = status;
      },

      focusPrimaryHandle: this.focusPrimaryHandle,
      focusSecondaryHandle: this.focusSecondaryHandle,
      focusDangerHandle: this.focusDangerHandle,
      toolbarHandles: this.toolbarHandles,
      toolbarContainerHandle: this.toolbarContainerHandle,
      modalTriggerHandle: this.modalTriggerHandle,
      modalPrimaryHandle: this.modalPrimaryHandle,
      modalCloseHandle: this.modalCloseHandle,
      focusLog: this.focusLog,
      focusModalOpen: this.focusModalOpen,
      setFocusLog: (log: string) => {
        this.focusLog = log;
      },
      setFocusModalOpen: (open: boolean) => {
        this.focusModalOpen = open;
      },
    };
  }

  private registerFocusDemoActions(cx: FlashViewContext<this>): void {
    if (this.focusActionsRegistered) {
      return;
    }

    const actions = cx.window.getActionRegistry();
    const keymap = cx.window.getKeymap();

    actions.register({
      name: "focus-demo:activate",
      handler: (actionCx, window) => {
        const chain = window.getKeyContextChain();
        this.focusLog = chain.length > 0 ? `Enter in ${chain.join(" > ")}` : "Enter pressed";
        actionCx.markWindowDirty(window.id);
      },
    });

    actions.register({
      name: "focus-demo:toolbar-next",
      handler: (actionCx, window) => {
        const active = this.toolbarHandles.find((handle) => actionCx.isFocused(handle));
        if (active) {
          active.focusNextSibling(actionCx);
          this.focusLog = "Toolbar advanced with Right arrow";
          actionCx.markWindowDirty(window.id);
        }
      },
    });

    actions.register({
      name: "focus-demo:toolbar-first",
      handler: (actionCx, window) => {
        if (this.toolbarContainerHandle) {
          this.toolbarContainerHandle.focusFirstChild(actionCx);
          this.focusLog = "Jumped to first toolbar item";
          actionCx.markWindowDirty(window.id);
        }
      },
    });

    actions.register({
      name: "focus-demo:close-modal",
      handler: (actionCx, window) => {
        if (!this.focusModalOpen) {
          return;
        }
        this.focusModalOpen = false;
        this.modalTriggerHandle?.restoreFocus(actionCx);
        this.focusLog = "Modal closed with Escape";
        actionCx.markWindowDirty(window.id);
      },
    });

    keymap.bind("enter", "focus-demo:activate", "focus-demo");
    keymap.bind("right", "focus-demo:toolbar-next", "focus-demo.toolbar");
    keymap.bind("home", "focus-demo:toolbar-first", "focus-demo.toolbar");
    keymap.bind("escape", "focus-demo:close-modal", "focus-demo.modal");

    this.focusActionsRegistered = true;
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
