import {
  createListState,
  div,
  h1,
  text,
  TextInputController,
  type GladeView,
  type GladeViewContext,
  type FocusHandle,
  type ImageTile,
  type ListState,
  type ScrollHandle,
  type Theme,
} from "@glade/glade";
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
import { GRID_DEMO } from "./grid_demo";
import { TABLE_DEMO } from "./table_demo";
import { CANVAS_DEMO } from "./canvas_demo";
import { TEXT_SELECTION_DEMO } from "./text_selection_demo";
import { MULTI_SELECTION_DEMO } from "./multi_selection";
import { BORDER_DEMO } from "./border_demo";
import { PADDING_DEMO } from "./padding_demo";
import { MARGIN_DEMO } from "./margin_demo";
import { GROUPS_DEMO } from "./groups_demo";
import { SCROLLBAR_DEMO } from "./scrollbar_demo";
import { VIRTUAL_SCROLLING_DEMO } from "./virtual_scrolling_demo";
import { CLIPBOARD_DEMO } from "./clipboard_demo";
import { WEBGPU_DEMO } from "./webgpu_demo";
import { IMAGES_DEMO } from "./images_demo";
import { ICON_DEMO } from "./icon_demo";
import { LINK_DEMO } from "./link_demo";
import { BUTTON_DEMO } from "./button_demo";
import { RADIO_INPUT_DEMO } from "./radio_demo";
import { SWITCH_DEMO } from "./switch_demo";
import { CHECKBOX_DEMO } from "./checkbox_demo";
import { DEBUG_MODE_DEMO } from "./debug_mode_demo";
import { DROPDOWN_DEMO } from "./dropdown_demo";
import { THEME_DEMO } from "./theme_demo";
import { HOTKEYS_DEMO } from "./hotkeys_demo";

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
  GRID_DEMO,
  TABLE_DEMO,
  TEXT_SELECTION_DEMO,
  MULTI_SELECTION_DEMO,
  BORDER_DEMO,
  PADDING_DEMO,
  MARGIN_DEMO,
  GROUPS_DEMO,
  SCROLLBAR_DEMO,
  VIRTUAL_SCROLLING_DEMO,
  CLIPBOARD_DEMO,
  DEBUG_MODE_DEMO,
  WEBGPU_DEMO,
  CANVAS_DEMO,
  IMAGES_DEMO,
  ICON_DEMO,
  LINK_DEMO,
  BUTTON_DEMO,
  RADIO_INPUT_DEMO,
  SWITCH_DEMO,
  CHECKBOX_DEMO,
  DROPDOWN_DEMO,
  THEME_DEMO,
  HOTKEYS_DEMO,
];

export class MainView implements GladeView {
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

  private scrollbarHandle1: ScrollHandle | null = null;
  private scrollbarHandle2: ScrollHandle | null = null;
  private scrollbarHandle3: ScrollHandle | null = null;

  private uniformListScrollHandle: ScrollHandle | null = null;
  private variableListScrollHandle: ScrollHandle | null = null;
  private variableListState: ListState | null = null;

  private clipboardLastText: string | null = null;
  private clipboardStatus = "Click Copy or Paste to interact with the clipboard.";
  private clipboardSample = "Hello from Glade clipboard demo!";

  private selectedWebGPUDemo:
    | "hexagon"
    | "metaball"
    | "particle"
    | "raymarch"
    | "terrain"
    | "galaxy" = "hexagon";

  private pngImageTile: ImageTile | null = null;
  private jpgImageTile: ImageTile | null = null;

  private checkboxChecked = false;
  private checkboxIndeterminate = false;

  private radioValue = "option1";
  private switchEnabled = false;
  private notificationsEnabled = true;
  private darkModeEnabled = false;

  private dropdownOpen = false;
  private dropdown2Open = false;
  private dropdown3Open = false;
  private dropdown4Open = false;
  private dropdownLastAction = "None";

  private useSystemTheme = true;
  private preferDarkMode = true;

  private fpsEnabled = false;

  constructor() {
    this.selectedDemoName = this.demos[0]?.name ?? "Demo";
    this.selectedDemo = this.demos[0]!;
  }

  setImageTiles(pngTile: ImageTile, jpgTile: ImageTile): void {
    this.pngImageTile = pngTile;
    this.jpgImageTile = jpgTile;
  }

  private ensureDemoState(cx: GladeViewContext<this>): DemoState {
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

    if (!this.scrollbarHandle1) {
      this.scrollbarHandle1 = cx.newScrollHandle(cx.windowId);
    }
    if (!this.scrollbarHandle2) {
      this.scrollbarHandle2 = cx.newScrollHandle(cx.windowId);
    }
    if (!this.scrollbarHandle3) {
      this.scrollbarHandle3 = cx.newScrollHandle(cx.windowId);
    }

    if (!this.uniformListScrollHandle) {
      this.uniformListScrollHandle = cx.newScrollHandle(cx.windowId);
    }
    if (!this.variableListScrollHandle) {
      this.variableListScrollHandle = cx.newScrollHandle(cx.windowId);
    }
    if (!this.variableListState) {
      this.variableListState = createListState();
      this.variableListState.setScrollHandle(this.variableListScrollHandle!);
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

      scrollbarHandle1: this.scrollbarHandle1,
      scrollbarHandle2: this.scrollbarHandle2,
      scrollbarHandle3: this.scrollbarHandle3,

      uniformListScrollHandle: this.uniformListScrollHandle,
      variableListScrollHandle: this.variableListScrollHandle,
      variableListState: this.variableListState,

      clipboardLastText: this.clipboardLastText,
      clipboardStatus: this.clipboardStatus,
      clipboardSample: this.clipboardSample,
      setClipboardLastText: (text: string | null) => {
        this.clipboardLastText = text;
      },
      setClipboardStatus: (status: string) => {
        this.clipboardStatus = status;
      },

      selectedWebGPUDemo: this.selectedWebGPUDemo,
      setSelectedWebGPUDemo: (
        demo: "hexagon" | "metaball" | "particle" | "raymarch" | "terrain" | "galaxy"
      ) => {
        this.selectedWebGPUDemo = demo;
      },

      pngImageTile: this.pngImageTile,
      jpgImageTile: this.jpgImageTile,

      checkboxChecked: this.checkboxChecked,
      checkboxIndeterminate: this.checkboxIndeterminate,
      setCheckboxChecked: (checked: boolean) => {
        this.checkboxChecked = checked;
      },
      setCheckboxIndeterminate: (indeterminate: boolean) => {
        this.checkboxIndeterminate = indeterminate;
      },

      radioValue: this.radioValue,
      setRadioValue: (value: string) => {
        this.radioValue = value;
      },

      switchEnabled: this.switchEnabled,
      notificationsEnabled: this.notificationsEnabled,
      darkModeEnabled: this.darkModeEnabled,
      setSwitchEnabled: (enabled: boolean) => {
        this.switchEnabled = enabled;
      },
      setNotificationsEnabled: (enabled: boolean) => {
        this.notificationsEnabled = enabled;
      },
      setDarkModeEnabled: (enabled: boolean) => {
        this.darkModeEnabled = enabled;
      },

      dropdownOpen: this.dropdownOpen,
      dropdown2Open: this.dropdown2Open,
      dropdown3Open: this.dropdown3Open,
      dropdown4Open: this.dropdown4Open,
      dropdownLastAction: this.dropdownLastAction,
      setDropdownOpen: (open: boolean) => {
        this.dropdownOpen = open;
      },
      setDropdown2Open: (open: boolean) => {
        this.dropdown2Open = open;
      },
      setDropdown3Open: (open: boolean) => {
        this.dropdown3Open = open;
      },
      setDropdown4Open: (open: boolean) => {
        this.dropdown4Open = open;
      },
      setDropdownLastAction: (action: string) => {
        this.dropdownLastAction = action;
      },

      useSystemTheme: this.useSystemTheme,
      preferDarkMode: this.preferDarkMode,
      setUseSystemTheme: (use: boolean) => {
        this.useSystemTheme = use;
      },
      setPreferDarkMode: (dark: boolean) => {
        this.preferDarkMode = dark;
      },
    };
  }

  private registerFocusDemoActions(cx: GladeViewContext<this>): void {
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

  render(cx: GladeViewContext<this>) {
    const theme = cx.getTheme();

    if (!this.navScrollHandle) {
      this.navScrollHandle = cx.newScrollHandle(cx.windowId);
    }
    if (!this.contentScrollHandle) {
      this.contentScrollHandle = cx.newScrollHandle(cx.windowId);
    }

    // Enable FPS overlay once
    if (!this.fpsEnabled) {
      cx.window.showFps();
      this.fpsEnabled = true;
    }

    return div()
      .flex()
      .flexRow()
      .w(cx.window.width)
      .h(cx.window.height)
      .bg(theme.semantic.surface.default)
      .children(
        div()
          .flex()
          .flexCol()
          .w(220)
          .hFull()
          .flexShrink0()
          .bg(theme.semantic.surface.muted)
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
        div().flex().flexCol().flexShrink().w(10).bg(theme.semantic.window.background),
        div()
          .flex()
          .flexCol()
          .flex1()
          .bg(theme.semantic.window.background)
          .overflowHidden()
          .child(this.renderActiveDemo(cx, theme))
      );
  }

  private renderActiveDemo(cx: GladeViewContext<this>, theme: Theme) {
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
      .children(
        div().child(h1(this.selectedDemoName).color(theme.semantic.text.default)),
        ...items
      );
  }

  private renderDemoButton(cx: GladeViewContext<this>, theme: Theme, demo: Demo) {
    const isSelected = demo.name === this.selectedDemoName;
    const accent = theme.components.dialog.primaryButton;
    const baseBg = isSelected ? accent.background : theme.semantic.window.background;
    const hoverBg = isSelected ? accent.hover.background : theme.semantic.surface.hover;
    const textColor = isSelected ? accent.foreground : theme.semantic.text.default;

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
      .child(text(demo.name).size(12).lineHeight(20).color(textColor));
  }
}
