import { ALL_DEMOS, type Demo, type DemoState } from "@glade/demos/library";
import {
  createWebGPUContext,
  createGladePlatform,
  createColorSchemeProvider,
  runWebGPURenderLoop,
  type BrowserWebGPUContext,
} from "@glade/platform";
import {
  GladeApp,
  div,
  createListState,
  TextInputController,
  type GladeView,
  type GladeViewContext,
  type FocusHandle,
  type ImageTile,
  type ListState,
  type ScrollHandle,
  type GladeWindow,
  type WindowId,
} from "@glade/glade";

class DemoView implements GladeView {
  private activeDemo: Demo;
  private scrollHandle: ScrollHandle | null = null;

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

  constructor(initialDemo: Demo) {
    this.activeDemo = initialDemo;
  }

  setDemo(demo: Demo): void {
    this.activeDemo = demo;
  }

  setImageTiles(png: ImageTile, jpg: ImageTile): void {
    this.pngImageTile = png;
    this.jpgImageTile = jpg;
  }

  render(cx: GladeViewContext<this>) {
    const theme = cx.getTheme();
    const state = this.ensureState(cx);
    const items = this.activeDemo.renderElement(cx, state);

    if (!this.scrollHandle) {
      this.scrollHandle = cx.newScrollHandle(cx.windowId);
    }

    return div()
      .flex()
      .flexCol()
      .w(cx.window.width)
      .h(cx.window.height)
      .p(12)
      .gap(8)
      .bg(theme.semantic.window.background)
      .overflowScroll()
      .scrollbarAlways()
      .trackScroll(this.scrollHandle)
      .children(...items);
  }

  private ensureState(cx: GladeViewContext<this>): DemoState {
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
}

export class DemoRenderer {
  private app: GladeApp;
  private view: DemoView;
  private ctx: BrowserWebGPUContext;
  private gladeWindow: GladeWindow;
  private windowId: WindowId;

  static async create(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): Promise<DemoRenderer> {
    const ctx = await createWebGPUContext({ canvas, width, height });
    const platform = createGladePlatform(ctx);
    const colorSchemeProvider = createColorSchemeProvider();

    const app = new GladeApp({ platform, colorSchemeProvider });
    await app.initialize();

    const initialDemo = ALL_DEMOS[0];
    if (!initialDemo) {
      throw new Error("No demos available");
    }

    const view = new DemoView(initialDemo);

    const gladeWindow = await app.openWindow({ width, height, title: "Demo" }, (cx) =>
      cx.newView(() => view)
    );

    app.run();

    const tick = Reflect.get(platform, "tick");
    if (typeof tick === "function") {
      runWebGPURenderLoop(ctx, (time: number) => {
        Reflect.apply(tick, platform, [time * 1000]);
      });
    }

    return new DemoRenderer(app, view, ctx, gladeWindow);
  }

  private constructor(
    app: GladeApp,
    view: DemoView,
    ctx: BrowserWebGPUContext,
    gladeWindow: GladeWindow
  ) {
    this.app = app;
    this.view = view;
    this.ctx = ctx;
    this.gladeWindow = gladeWindow;
    this.windowId = gladeWindow.id;
  }

  showDemo(name: string): void {
    const demo = ALL_DEMOS.find((d) => d.name === name);
    if (demo) {
      this.view.setDemo(demo);
      this.app.markWindowDirty(this.windowId);
    }
  }

  getAvailableDemos(): string[] {
    return ALL_DEMOS.map((d) => d.name);
  }

  destroy(): void {
    this.app.stop();
    this.ctx.destroy();
  }
}
