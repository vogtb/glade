/**
 * Flash App Demo
 *
 * Demonstrates the full FlashApp framework with proper View architecture.
 *
 * Run with: bun run run:flash:native
 */

import {
  createWebGPUContext,
  runWebGPURenderLoop,
  createFlashPlatform,
  createColorSchemeProvider,
} from "@glade/platform";
import {
  FlashApp,
  type FlashView,
  type FlashViewContext,
  div,
  divider,
  icon,
  link,
  text,
  path,
  img,
  svg,
  SvgIcons,
  type FlashDiv,
  type FlashTableRow,
  type FocusHandle,
  type ScrollHandle,
  type ImageTile,
  FlashElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type Bounds,
  canvas,
  type TessellatedPath,
  uniformList,
  list,
  createListState,
  type ListState,
  deferred,
  anchored,
  type Point,
  textInput,
  TextInputController,
  webgpuHost,
  type WebGPUHost,
  checkbox,
  radioGroup,
  radioItem,
  switchToggle,
  tabs,
  tab,
  dropdown,
  dropdownItem,
  dropdownSeparator,
  dropdownLabel,
  dropdownSub,
  dialog,
  dialogContent,
  dialogHeader,
  dialogFooter,
  rightClickMenu,
  rightClickItem,
  rightClickSeparator,
  rightClickLabel,
  rightClickSub,
  code,
  pre,
  table,
  thead,
  tbody,
  tfoot,
  tr,
  th,
  td,
  type PopoverCorner,
} from "@glade/flash";
import { createGalaxyHost } from "./galaxy.ts";
import { createHexagonHost } from "./hexagon.ts";
import { createMetaballHost } from "./metaball.ts";
import { createParticleHost } from "./particle.ts";
import { createRaymarchHost } from "./raymarch.ts";
import { createTerrainHost } from "./terrain.ts";
import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };
import { base64ToBytes, rgb } from "@glade/utils";

// Embed fonts as base64 at build time via Bun macro
const interFontBase64 = COMPTIME_embedAsBase64(
  "../../assets/InterVariable.ttf"
) as unknown as string;
const notoColorEmojiBase64 = COMPTIME_embedAsBase64(
  "../../assets/NotoColorEmoji-Regular.ttf"
) as unknown as string;
const jetBrainsMonoRegularBase64 = COMPTIME_embedAsBase64(
  "../../assets/JetBrainsMono-Regular.ttf"
) as unknown as string;
const jetBrainsMonoSemiBoldBase64 = COMPTIME_embedAsBase64(
  "../../assets/JetBrainsMono-SemiBold.ttf"
) as unknown as string;

const emojiFontFamily = "Noto Color Emoji";

// Embed images as base64 at build time
const demoPngBase64 = COMPTIME_embedAsBase64("../../assets/image.png");
const flowerJpgBase64 = COMPTIME_embedAsBase64("../../assets/flower.jpg");

// Embed SVG as base64 at build time
const gearSvgBase64 = COMPTIME_embedAsBase64("../../assets/gear.svg");

// Global image tiles - set after window is created
let demoImageTile: ImageTile | null = null;
let flowerImageTile: ImageTile | null = null;

/**
 * Demo section identifiers.
 */
type DemoSection =
  | "shapes"
  | "canvas"
  | "svg-icons"
  | "vector-paths"
  | "inter-text"
  | "wrapping"
  | "text-input"
  | "monospaced"
  | "underlined-text"
  | "text-selection"
  | "emoji-text"
  | "flexbox"
  | "grid-layout"
  | "div-demo"
  | "border-styles"
  | "divider"
  | "padding"
  | "margin"
  | "focus"
  | "group-styles"
  | "scrollbars"
  | "virtual-scrolling"
  | "clipboard"
  | "webgpu-demos"
  | "images"
  | "deferred-anchored"
  | "icon"
  | "link"
  | "button-placeholder"
  | "tabs"
  | "controls"
  | "dropdown"
  | "right-click"
  | "table";

/**
 * Demo button configuration.
 */
interface DemoButton {
  id: DemoSection;
  label: string;
}

interface DemoGroup {
  title: string;
  buttons: DemoButton[];
}

const DEMO_GROUPS: DemoGroup[] = [
  {
    title: "Canvas",
    buttons: [
      { id: "shapes", label: "Shapes" },
      { id: "canvas", label: "Canvas" },
      { id: "svg-icons", label: "SVG" },
      { id: "vector-paths", label: "Paths" },
    ],
  },
  {
    title: "Text",
    buttons: [
      { id: "inter-text", label: "Simple Text" },
      { id: "wrapping", label: "Wrapping" },
      { id: "text-input", label: "Input" },
      { id: "monospaced", label: "Monospaced" },
      { id: "underlined-text", label: "Underlined" },
      { id: "text-selection", label: "Selection" },
      { id: "emoji-text", label: "Emoji" },
    ],
  },
  {
    title: "Layouts",
    buttons: [
      { id: "flexbox", label: "Flexbox" },
      { id: "grid-layout", label: "Grid" },
    ],
  },
  {
    title: "Utilities",
    buttons: [
      { id: "div-demo", label: "Div" },
      { id: "border-styles", label: "Border" },
      { id: "divider", label: "Divider" },
      { id: "padding", label: "Padding" },
      { id: "margin", label: "Margin" },
      { id: "focus", label: "Focus" },
      { id: "group-styles", label: "Groups" },
      { id: "scrollbars", label: "Scrollbars" },
      { id: "virtual-scrolling", label: "Virtual Scrolling" },
    ],
  },
  {
    title: "Special",
    buttons: [
      { id: "clipboard", label: "Clipboard" },
      { id: "webgpu-demos", label: "WebGPU" },
      { id: "images", label: "Images" },
      { id: "deferred-anchored", label: "Deferred" },
    ],
  },
  {
    title: "Components",
    buttons: [
      { id: "icon", label: "Icon" },
      { id: "link", label: "Link" },
      { id: "button-placeholder", label: "Button" },
      { id: "tabs", label: "Tabs" },
      { id: "controls", label: "Controls" },
      { id: "dropdown", label: "Dropdown" },
      { id: "right-click", label: "Right-Click Menu" },
      { id: "table", label: "Table" },
    ],
  },
];

/**
 * Decode base64 to string (for SVG files)
 * TODO: put in utils
 */
function base64ToString(base64: string): string {
  const bytes = base64ToBytes(base64);
  return new TextDecoder().decode(bytes);
}

// Decode the embedded gear SVG
const gearSvgContent = base64ToString(gearSvgBase64);

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

type CanvasWaveState = {
  values: number[];
  padding: number;
  startX: number;
  endX: number;
  baseY: number;
  amplitude: number;
  wave: TessellatedPath;
};

/**
 * Helper to create a button that participates in a group hover/active.
 */
function groupButton(
  label: string,
  groupName: string,
  baseColor: number,
  hoverColor: number,
  activeColor: number
): FlashDiv {
  return div()
    .w(80)
    .h(44)
    .bg(rgb(baseColor))
    .rounded(8)
    .border(2)
    .borderColor({ r: 0.4, g: 0.4, b: 0.5, a: 1 })
    .cursorPointer()
    .group(groupName)
    .groupHover(groupName, (s) => s.bg(rgb(hoverColor)).borderColor(rgb(0x6366f1)))
    .groupActive(groupName, (s) => s.bg(rgb(activeColor)).borderColor(rgb(0xa5b4fc)))
    .hover((s) => s.bg(rgb(hoverColor)).borderColor(rgb(0x818cf8)).shadow("md"))
    .active((s) => s.bg(rgb(activeColor)).borderColor(rgb(0xc7d2fe)))
    .flex()
    .itemsCenter()
    .justifyCenter()
    .child(text(label).font("Inter").size(13).color({ r: 1, g: 1, b: 1, a: 1 }));
}

/**
 * Main demo view - the root view of the application.
 */
class DemoRootView implements FlashView {
  private rightScrollHandle: ScrollHandle | null = null;
  private leftNavScrollHandle: ScrollHandle | null = null;
  private uniformListScrollHandle: ScrollHandle | null = null;
  private variableListScrollHandle: ScrollHandle | null = null;
  private scrollbarDemoHandle1: ScrollHandle | null = null;
  private scrollbarDemoHandle2: ScrollHandle | null = null;
  private scrollbarDemoHandle3: ScrollHandle | null = null;
  private variableListState: ListState | null = null;
  private selectedDemo: DemoSection = "inter-text";
  private popupVisible = false;
  private popupPosition: Point = { x: 200, y: 200 };
  private popupAnchorCorner: PopoverCorner = "top-left";
  private focusPrimaryHandle: FocusHandle | null = null;
  private focusSecondaryHandle: FocusHandle | null = null;
  private focusDangerHandle: FocusHandle | null = null;
  private toolbarHandles: FocusHandle[] = [];
  private toolbarContainerHandle: FocusHandle | null = null;
  private modalTriggerHandle: FocusHandle | null = null;
  private modalPrimaryHandle: FocusHandle | null = null;
  private modalCloseHandle: FocusHandle | null = null;
  private focusLog = "Click or Tab through the controls.";
  private focusActionsRegistered = false;
  private focusModalOpen = false;
  private clipboardSample = "Flash clipboard sample text";
  private clipboardStatus = "Clipboard ready.";
  private clipboardLastText: string | null = null;
  private textInputHandle: FocusHandle | null = null;
  private textInputController = new TextInputController({ multiline: true });
  private textInputStatus = "Click the field to focus, then type to insert characters.";

  // WebGPU host demos
  private galaxyHost: WebGPUHost | null = null;
  private hexagonHost: WebGPUHost | null = null;
  private metaballHost: WebGPUHost | null = null;
  private particleHost: WebGPUHost | null = null;
  private raymarchHost: WebGPUHost | null = null;
  private terrainHost: WebGPUHost | null = null;
  private selectedWebGPUDemo:
    | "hexagon"
    | "metaball"
    | "particle"
    | "raymarch"
    | "terrain"
    | "galaxy" = "hexagon";

  // Toggle controls demo state
  private checkboxChecked = false;
  private checkboxIndeterminate = false;
  private radioValue = "option1";
  private switchEnabled = false;
  private notificationsEnabled = true;
  private darkModeEnabled = false;

  // Tabs demo state
  private selectedTab = "account";

  // Dropdown demo state
  private dropdownOpen = false;
  private dropdown2Open = false;
  private dropdown3Open = false;
  private dropdown4Open = false; // Nested submenu demo
  private dropdownLastAction = "";

  // Right click menu state
  private rightClickMenuOpen = false;
  private rightClickMenuPosition: Point = { x: 0, y: 0 };

  // Dialog state
  private dialogOpen = false;
  private dialog2Open = false;
  private dialog3Open = false;
  private dialogLastAction = "";

  render(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();

    if (!this.rightScrollHandle) {
      this.rightScrollHandle = cx.newScrollHandle(cx.windowId);
    }
    if (!this.leftNavScrollHandle) {
      this.leftNavScrollHandle = cx.newScrollHandle(cx.windowId);
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
    if (!demoImageTile) {
      throw new Error("demo image should have loaded before render");
    }

    return div()
      .flex()
      .flexRow()
      .w(cx.window.width)
      .h(cx.window.height)
      .bg(theme.background)
      .gap(12)
      .p(16)
      .children(this.renderNavigation(cx), this.renderContent(cx));
  }

  private renderNavigation(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();
    const navItems: FlashDiv[] = [];

    for (const group of DEMO_GROUPS) {
      navItems.push(
        div()
          .pt(10)
          .pb(4)
          .child(text(group.title.toUpperCase()).font("Inter").size(11).color(theme.textMuted))
      );
      navItems.push(...group.buttons.map((btn) => this.renderNavButton(cx, btn)));
    }

    return div()
      .flex()
      .flexCol()
      .w(220)
      .h(Math.max(200, cx.window.height - 32))
      .flexShrink0()
      .bg(theme.surface)
      .rounded(12)
      .overflowHidden()
      .children(
        div()
          .px(12)
          .pt(12)
          .pb(6)
          .flexShrink0()
          .children(
            text("Flash Demos").font("Inter").size(18).color(theme.text),
            div()
              .h(1)
              .mt(6)
              .bg({ ...theme.border, a: theme.border.a * 0.6 })
          ),
        div()
          .flex()
          .flexCol()
          .gap(6)
          .px(12)
          .pb(12)
          .flexGrow()
          .hMax(cx.window.height - 120)
          .overflowScroll()
          .scrollbarAlways()
          .trackScroll(this.leftNavScrollHandle!)
          .children(...navItems)
      );
  }

  private renderNavButton(cx: FlashViewContext<this>, btn: DemoButton): FlashDiv {
    const theme = cx.getTheme();
    const isSelected = this.selectedDemo === btn.id;
    const baseBg = isSelected ? theme.primary : theme.surfaceMuted;
    const hoverBg = isSelected ? theme.primary : theme.surface;
    const textColor = isSelected ? theme.primaryForeground : theme.text;

    return div()
      .h(22)
      .wFull()
      .flexShrink0()
      .bg(baseBg)
      .rounded(4)
      .cursorPointer()
      .border(2)
      .borderColor({ ...theme.border, a: isSelected ? theme.border.a : 0 })
      .hover((s) => s.bg(hoverBg).shadow("md"))
      .active((s) => s.bg(hoverBg))
      .flex()
      .flexRow()
      .itemsCenter()
      .justifyStart()
      .px(10)
      .onClick(
        cx.listener((view, _event, _window, ecx) => {
          view.selectedDemo = btn.id;
          ecx.notify();
        })
      )
      .child(text(btn.label).font("Inter").size(12).lineHeight(22).color(textColor));
  }

  private renderContent(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();
    return div()
      .flexGrow()
      .bg(theme.surface)
      .rounded(12)
      .p(16)
      .flex()
      .flexCol()
      .gap(12)
      .overflowHidden()
      .trackScroll(this.rightScrollHandle!)
      .child(this.renderDemoContent(cx));
  }

  private renderDemoContent(cx: FlashViewContext<this>): FlashDiv {
    switch (this.selectedDemo) {
      case "shapes":
        return this.renderShapesDemo();
      case "canvas":
        return this.renderCanvasDemo();
      case "svg-icons":
        return this.renderSvgIconsDemo();
      case "vector-paths":
        return this.renderVectorPathsDemo();
      case "inter-text":
        return this.renderInterTextDemo(cx);
      case "wrapping":
        return this.renderWrappedTextDemo(cx);
      case "text-input":
        return this.renderTextInputDemo(cx);
      case "monospaced":
        return this.renderMonospacedDemo();
      case "underlined-text":
        return this.renderUnderlinedTextDemo(cx);
      case "text-selection":
        return this.renderTextSelectionDemo(cx);
      case "emoji-text":
        return this.renderEmojiTextDemo(cx);
      case "flexbox":
        return this.renderFlexboxDemo();
      case "grid-layout":
        return this.renderGridLayoutDemo();
      case "div-demo":
        return this.renderDivDemo(cx);
      case "border-styles":
        return this.renderBorderStylesDemo(cx);
      case "divider":
        return this.renderDividerDemo();
      case "padding":
        return this.renderPaddingDemo(cx);
      case "margin":
        return this.renderMarginDemo(cx);
      case "focus":
        return this.renderFocusDemo(cx);
      case "group-styles":
        return this.renderGroupStylesDemo();
      case "scrollbars":
        return this.renderScrollbarsDemo(cx);
      case "virtual-scrolling":
        return this.renderVirtualScrollingDemo(cx);
      case "clipboard":
        return this.renderClipboardDemo(cx);
      case "deferred-anchored":
        return this.renderDeferredAnchoredDemo(cx);
      case "webgpu-demos":
        return this.renderWebGPUDemosSection(cx);
      case "images":
        return this.renderImagesDemo();
      case "icon":
        return this.renderIconDemo();
      case "link":
        return this.renderLinkDemo();
      case "button-placeholder":
        return this.renderButtonDemo();
      case "tabs":
        return this.renderTabsDemo(cx);
      case "controls":
        return this.renderControlsAndOverlaysDemo(cx);
      case "dropdown":
        return this.renderDropdownDemo(cx);
      case "right-click":
        return this.renderRightClickDemo(cx);
      case "table":
        return this.renderTableDemo();
      default:
        return div();
    }
  }

  private renderInterTextDemo(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Inter Variable Font").font("Inter").size(32).color(theme.text),
        text("GPU-accelerated text rendering with cosmic-text shaping").font("Inter").size(16),
        text(
          "Wrapped text automatically breaks across lines to fit the available width without clipping or overflow."
        )
          .font("Inter")
          .size(14)
          .maxWidth(520),
        div().h(1).bg(theme.border),
        text("The quick brown fox jumps over the lazy dog.").font("Inter").size(14),
        text("ABCDEFGHIJKLMNOPQRSTUVWXYZ").font("Inter").size(14),
        text("abcdefghijklmnopqrstuvwxyz").font("Inter").size(14),
        text("0123456789 !@#$%^&*()_+-=[]{}|;':\",./<>?").font("Inter").size(14),
        div().h(1).bg(theme.border),
        text("Font Sizes").font("Inter").size(18),
        text("10px: The quick brown fox").font("Inter").size(10),
        text("12px: The quick brown fox").font("Inter").size(12),
        text("14px: The quick brown fox").font("Inter").size(14),
        text("18px: The quick brown fox").font("Inter").size(18),
        text("24px: The quick brown fox").font("Inter").size(24),
        text("32px: The quick brown fox").font("Inter").size(32),
        div().h(1).bg(theme.border),
        text("Selectable Text").font("Inter").size(18),
        text(
          "Click and drag to select this text. Try double-click for word, triple-click for line."
        )
          .font("Inter")
          .size(14)
          .selectable(),
        text(
          "This paragraph is selectable. You can use Cmd+A to select all, Cmd+C to copy, and arrow keys to move the cursor. The selection highlight will appear when you drag across the text."
        )
          .font("Inter")
          .size(14)
          .maxWidth(520)
          .selectable(),
        text("Custom selection color example")
          .font("Inter")
          .size(14)
          .selectable()
          .selectionColor({ r: 0.2, g: 0.6, b: 0.3, a: 0.4 }),
        text("This text is NOT selectable (default behavior)").font("Inter").size(14)
      );
  }

  private renderWrappedTextDemo(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();
    const sample =
      "Wrapped text will break across lines when a maxWidth is provided. Without it, the text stays on one line if there is space.";

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Text Wrapping").font("Inter").size(28),
        text("Side-by-side comparison of wrapped vs. unwrapped text.").font("Inter").size(16),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .children(
            div()
              .flex()
              .flexCol()
              .gap(8)
              .w(320)
              .p(12)
              .rounded(12)
              .bg(theme.surfaceMuted)
              .children(
                text("Wrapped (maxWidth 300)").font("Inter").size(16),
                text(sample).font("Inter").size(14).maxWidth(300)
              ),
            div()
              .flex()
              .flexCol()
              .gap(8)
              .w(320)
              .p(12)
              .rounded(12)
              .bg(theme.surfaceMuted)
              .children(
                text("Unwrapped (no maxWidth)").font("Inter").size(16),
                text(sample).font("Inter").size(14)
              )
          ),
        div().h(1).bg(theme.border),
        text("Single column wrap demo").font("Inter").size(16),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .w(520)
          .children(
            text(
              "This paragraph uses maxWidth to demonstrate natural wrapping in a single column layout."
            )
              .font("Inter")
              .size(14)
              .maxWidth(520),
            text(
              "Adjusting the container width should reflow the lines consistently with cosmic-text wrapping."
            )
              .font("Inter")
              .size(14)
              .maxWidth(520)
          )
      );
  }

  private renderTextInputDemo(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();
    const inputHandle = this.ensureTextInputHandle(cx);
    const controller = this.textInputController;
    const state = controller.state;
    const focused = cx.isFocused(inputHandle);
    const selectionLength = Math.abs(state.selection.end - state.selection.start);
    const compositionText = state.composition?.text ?? "";

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Text Input").font("Inter").size(28),
        text("Demonstrates IME composition, selection, clipboard, and caret rendering.")
          .font("Inter")
          .size(16),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .children(
            text(
              "Click to focus, type with IME, use Cmd/Ctrl+C/V/X for clipboard, and drag-select (double click for words, triple for lines)."
            )
              .font("Inter")
              .size(14),
            div()
              .border(1)
              .borderColor(theme.border)
              .rounded(4)
              .child(
                textInput("", {
                  controller,
                  focusHandle: inputHandle,
                  placeholder: "Type multi-line text...",
                  multiline: true,
                  selectionColor: { ...rgb(0x6366f1), a: 0.35 },
                  compositionColor: rgb(0x22c55e),
                  onChange: (_: string) => {
                    this.textInputStatus = "Editing…";
                    cx.notify();
                  },
                  onSubmit: (value: string) => {
                    this.textInputStatus = `Submit (${value.length} chars)`;
                    cx.notify();
                  },
                  onCancel: () => {
                    this.textInputStatus = "Canceled";
                    cx.notify();
                  },
                })
                  .font("Inter")
                  .size(16)
                  .pad(4)
                  .caretBlink(0.7)
              ),
            div()
              .flex()
              .flexRow()
              .gap(12)
              .children(
                text(`Focused: ${focused ? "yes" : "no"}`)
                  .font("Inter")
                  .size(14),
                text(`Length: ${state.value.length}`).font("Inter").size(14),
                text(`Selection: ${selectionLength} chars`).font("Inter").size(14)
              ),
            text(
              compositionText.length > 0
                ? `Composing: "${compositionText}" (${compositionText.length} chars)`
                : "Composition: none"
            )
              .font("Inter")
              .size(14),
            text(`Status: ${this.textInputStatus}`).font("Inter").size(14)
          )
      );
  }

  private renderEmojiTextDemo(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text(emojiFontFamily).font("Inter").size(32),
        text("Color emoji rendering with full glyph coverage").font("Inter").size(16),
        div().h(1).bg(theme.border),
        text("Faces & Mood: 😀 😁 😂 🤣 🤩 😎 😇 😴").font(emojiFontFamily).size(28),
        text("People & Professions: 👩‍💻 👨‍🚒 🧑🏽‍🚀 🧑‍🍳 🧑‍🔧 🧑🏻‍🏫").font(emojiFontFamily).size(28),
        text("Travel & Places: 🏔️ 🏖️ 🌋 🏛️ 🏙️ 🚄 ✈️ 🚀").font(emojiFontFamily).size(28),
        text("Activities & Objects: 🎸 🎧 🎮 🛠️ 🧪 🧭 ⚽️ 🏀").font(emojiFontFamily).size(28),
        text("Flags & Symbols: 🏳️‍🌈 🏴‍☠️ 🇯🇵 🇺🇳 🇨🇦 ❤️‍🔥 ✨ ✅").font(emojiFontFamily).size(28),
        div().h(1).bg(theme.border),
        text("Inline text with emoji: Launch 🚀 Celebrate 🎉 Ship it ✅")
          .font(emojiFontFamily)
          .size(18)
      );
  }

  private renderMonoTextDemo(): FlashDiv {
    const inlineSample =
      'const value    = input ?? defaultUser;\n\treturn value?.profile?.email ?? "missing";';
    const preSample = [
      "function renderRows(items: Array<{ name: string; value?: number }>) {",
      "\tconst rows = items.map((item, index) => ({",
      '\t\tlabel: `${index}: ${item.name}`.padEnd(18, " "),',
      '\t\tvalue: item.value ?? "n/a",',
      "\t}));",
      "\treturn rows;",
      "}",
      "",
      "// Tabs expand to 8-column stops; newlines are preserved.",
    ].join("\n");
    const wrappedPreSample =
      "GET /api/search?q=monospace%20demo&limit=25&cursor=eyJvZmZzZXQiOjE0NH0=&user-agent=glade-demo/1.0";

    return div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Monospace helpers (code + pre)").font("Inter").size(24),
        text("Inline code collapses whitespace; preformatted blocks preserve whitespace and tabs.")
          .font("Inter")
          .size(15),
        div()
          .flex()
          .flexWrap()
          .itemsCenter()
          .gap(10)
          .children(
            text("Inline sample:").font("Inter").size(14),
            code(inlineSample).size(14),
            text("→ whitespace collapses and wraps").font("Inter").size(13)
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Preformatted block (no wrap, scrollable)").font("Inter").size(16),
        pre(preSample).padding(12).rounded(8).wrap(false).scrollable(true),
        text("Wrapped preformatted text (tabSize: 4)").font("Inter").size(16),
        pre(wrappedPreSample).wrap(true).tabSize(4).padding(12).rounded(8),
        text("Custom font override (JetBrains Mono SemiBold)").font("Inter").size(16),
        div()
          .flex()
          .flexCol()
          .gap(6)
          .children(
            code("const ready = true;").font("JetBrains Mono SemiBold").size(14),
            code("export type FlashTask = () => void;").font("JetBrains Mono SemiBold").size(14)
          )
      );
  }

  private renderMonoSemiBoldDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("JetBrains Mono SemiBold").font("JetBrains Mono SemiBold").size(32),
        text("Heavier weight for emphasis and headers").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("const PI = 3.14159265359;").font("JetBrains Mono SemiBold").size(16),
        text("export class FlashElement {").font("JetBrains Mono SemiBold").size(16),
        text("  abstract render(): void;").font("JetBrains Mono SemiBold").size(16),
        text("}").font("JetBrains Mono SemiBold").size(16),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("0O 1lI |! {} [] () <> => != === // /* */").font("JetBrains Mono SemiBold").size(16),
        text("ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789").font("JetBrains Mono SemiBold").size(14)
      );
  }

  private renderMonospacedDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Monospaced").font("Inter").size(30),
        text("Code, inline snippets, and a heavier weight variant.").font("Inter").size(16),
        this.renderMonoTextDemo(),
        div().h(1).bg({ r: 0.3, g: 0.32, b: 0.4, a: 0.5 }),
        this.renderMonoSemiBoldDemo()
      );
  }

  private renderUnderlinedTextDemo(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Text Underlines").font("Inter").size(32),
        text("Solid and wavy underlines for text decoration").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        div()
          .flex()
          .flexRow()
          .gap(24)
          .flexWrap()
          .itemsEnd()
          .children(
            text("Hyperlink")
              .font("Inter")
              .size(16)
              .color(theme.text)
              .underlined({ style: "solid", color: theme.primary, thickness: 1 }),
            text("Important")
              .font("Inter")
              .size(16)
              .color(theme.text)
              .underlined({ style: "solid", color: theme.success, thickness: 2 }),
            text("Speling Error").font("Inter").size(16).color(theme.text).underlined({
              style: "wavy",
              color: theme.danger,
              thickness: 1.5,
              wavelength: 4,
              amplitude: 1.5,
            }),
            text("Grammer Issue").font("Inter").size(16).color(theme.text).underlined({
              style: "wavy",
              color: theme.primary,
              thickness: 1.5,
              wavelength: 5,
              amplitude: 1.5,
            })
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Larger Text").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(32)
          .flexWrap()
          .itemsEnd()
          .children(
            text("Title Text")
              .font("Inter")
              .size(24)
              .color(theme.text)
              .underlined({ style: "solid", color: theme.primary, thickness: 2 }),
            text("Code Identifier").font("JetBrains Mono").size(18).color(theme.text).underlined({
              style: "wavy",
              color: theme.warning,
              thickness: 2,
              wavelength: 6,
              amplitude: 2,
            })
          )
      );
  }

  private renderDivDemo(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();

    return div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Div").font("Inter").size(32),
        text("Base container with background, rounding, border, and shadows.")
          .font("Inter")
          .size(16),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .flexWrap()
          .children(
            div()
              .w(260)
              .p(14)
              .rounded(12)
              .border(1)
              .borderColor(theme.border)
              .shadow()
              .children(
                text("Card with border + shadow").font("Inter").size(15),
                div()
                  .mt(6)
                  .child(
                    text("Mix radius, borders, and shadows to compose reusable shells.")
                      .font("Inter")
                      .size(13)
                  )
              ),
            div()
              .w(260)
              .p(14)
              .rounded(8)
              .border(1)
              .borderColor(theme.border)
              .children(
                text("Outlined container").font("Inter").size(15),
                div()
                  .mt(6)
                  .child(
                    text("Border without shadow for low-elevation surfaces.").font("Inter").size(13)
                  )
              ),
            div()
              .w(260)
              .p(14)
              .rounded(12)
              .shadow()
              .children(
                text("Plain background").font("Inter").size(15),
                div()
                  .mt(6)
                  .child(
                    text("Only bg + radius; useful for inset groupings.").font("Inter").size(13)
                  )
              )
          )
      );
  }

  private renderGroupStylesDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Group Styles").font("Inter").size(32),
        text("Coordinated hover and active effects across related elements").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("Hover or click any button in a group to see coordinated effects")
          .font("Inter")
          .size(14),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            text("Group A:").font("Inter").size(13),
            groupButton("One", "group-a", 0x3730a3, 0x4338ca, 0x6366f1),
            groupButton("Two", "group-a", 0x3730a3, 0x4338ca, 0x6366f1),
            groupButton("Three", "group-a", 0x3730a3, 0x4338ca, 0x6366f1)
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            text("Group B:").font("Inter").size(13),
            groupButton("Alpha", "group-b", 0x166534, 0x15803d, 0x22c55e),
            groupButton("Beta", "group-b", 0x166534, 0x15803d, 0x22c55e),
            groupButton("Gamma", "group-b", 0x166534, 0x15803d, 0x22c55e)
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            text("Group C:").font("Inter").size(13),
            groupButton("Red", "group-c", 0x991b1b, 0xb91c1c, 0xef4444),
            groupButton("Green", "group-c", 0x166534, 0x15803d, 0x22c55e),
            groupButton("Blue", "group-c", 0x1e40af, 0x1d4ed8, 0x3b82f6)
          )
      );
  }

  private renderDividerDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Divider").font("Inter").size(32),
        text("Visual separators for content sections").font("Inter").size(16),
        divider().color({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),

        // Horizontal divider examples
        text("Horizontal Dividers").font("Inter").size(18),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .p(16)
          .rounded(8)
          .children(
            text("Section One").font("Inter").size(14),
            text("Content for the first section goes here.").font("Inter").size(13),
            divider().color({ r: 0.3, g: 0.3, b: 0.4, a: 1 }).margin(4),
            text("Section Two").font("Inter").size(14),
            text("Content for the second section goes here.").font("Inter").size(13),
            divider().color({ r: 0.3, g: 0.3, b: 0.4, a: 1 }).margin(4),
            text("Section Three").font("Inter").size(14),
            text("Content for the third section goes here.").font("Inter").size(13)
          ),

        // Vertical divider examples
        text("Vertical Dividers").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .p(16)
          .h(80)
          .itemsCenter()
          .rounded(8)
          .children(
            text("Blog").font("Inter").size(14),
            divider().vertical().color({ r: 0.3, g: 0.3, b: 0.4, a: 1 }).margin(8),
            text("Docs").font("Inter").size(14),
            divider().vertical().color({ r: 0.3, g: 0.3, b: 0.4, a: 1 }).margin(8),
            text("Source").font("Inter").size(14),
            divider().vertical().color({ r: 0.3, g: 0.3, b: 0.4, a: 1 }).margin(8),
            text("API").font("Inter").size(14)
          ),

        // Styled dividers
        text("Styled Dividers").font("Inter").size(18),
        div()
          .flex()
          .flexCol()
          .gap(16)
          .p(16)
          .rounded(8)
          .children(
            div()
              .flex()
              .flexRow()
              .gap(8)
              .itemsCenter()
              .children(
                text("Default (1px):").font("Inter").size(13),
                div()
                  .flex1()
                  .child(divider().color({ r: 0.5, g: 0.5, b: 0.6, a: 1 }))
              ),
            div()
              .flex()
              .flexRow()
              .gap(8)
              .itemsCenter()
              .children(
                text("Thick (2px):").font("Inter").size(13),
                div()
                  .flex1()
                  .child(divider().color({ r: 0.4, g: 0.6, b: 0.9, a: 1 }).thickness(2))
              ),
            div()
              .flex()
              .flexRow()
              .gap(8)
              .itemsCenter()
              .children(
                text("Extra thick (4px):").font("Inter").size(13),
                div()
                  .flex1()
                  .child(divider().color({ r: 0.9, g: 0.4, b: 0.4, a: 1 }).thickness(4))
              ),
            div()
              .flex()
              .flexRow()
              .gap(8)
              .itemsCenter()
              .children(
                text("Colored:").font("Inter").size(13),
                div()
                  .flex1()
                  .child(divider().color({ r: 0.4, g: 0.9, b: 0.5, a: 1 }).thickness(2))
              )
          )
      );
  }

  private renderPaddingDemo(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();
    const shell = theme.surfaceMuted;

    const paddedBlock = (padding: number, px?: number, py?: number) => {
      const label =
        px !== undefined || py !== undefined
          ? `px(${px ?? padding}) • py(${py ?? padding})`
          : `p(${padding})`;

      const block = div().w(200).bg(shell).rounded(10).border(1).borderColor(theme.border);

      if (px !== undefined || py !== undefined) {
        block.px(px ?? padding).py(py ?? padding);
      } else {
        block.p(padding);
      }

      return block.child(text(label).font("Inter").size(14));
    };

    return div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Padding").font("Inter").size(32),
        text("Control interior spacing with p(), px(), and py().").font("Inter").size(16),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .flexWrap()
          .children(paddedBlock(8), paddedBlock(16), paddedBlock(24)),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .flexWrap()
          .children(paddedBlock(10, 18, 10), paddedBlock(10, 10, 18))
      );
  }

  private renderMarginDemo(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();
    const base = theme.surfaceMuted;

    const marginRow = (label: string, marginTop: number) =>
      div()
        .bg(theme.surface)
        .rounded(8)
        .border(1)
        .borderColor(theme.border)
        .p(12)
        .mt(marginTop)
        .child(text(label).font("Inter").size(14));

    return div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Margin").font("Inter").size(32),
        text("Outer spacing with mt()/mb()/mx()/my() for precise offsets.").font("Inter").size(16),
        div()
          .flex()
          .flexCol()
          .bg(base)
          .rounded(12)
          .p(12)
          .border(1)
          .borderColor({ r: 0.28, g: 0.32, b: 0.42, a: 1 })
          .children(marginRow("mt(0)", 0), marginRow("mt(12)", 12), marginRow("mt(24)", 24)),
        text(
          "Tip: prefer gap() inside flex containers; reserve margins for fine-grain offsets or mixed layouts."
        )
          .font("Inter")
          .size(13)
      );
  }

  private renderIconDemo(): FlashDiv {
    const iconNames = [
      "check",
      "close",
      "menu",
      "arrowRight",
      "arrowLeft",
      "arrowUp",
      "arrowDown",
      "plus",
      "minus",
      "search",
      "settings",
      "home",
      "star",
      "starOutline",
      "heart",
      "edit",
      "trash",
      "copy",
      "folder",
      "file",
      "refresh",
      "download",
      "upload",
      "info",
      "warning",
      "error",
    ] as const;

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Icon").font("Inter").size(32),
        text("Simple icon component wrapping SVG icons").font("Inter").size(16),
        divider().color({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),

        // Icon grid
        text("Available Icons").font("Inter").size(18),
        div()
          .flex()
          .flexWrap()
          .gap(12)
          .p(16)
          .rounded(8)
          .children(
            ...iconNames.map((name) =>
              div()
                .flex()
                .flexCol()
                .gap(4)
                .itemsCenter()
                .p(8)
                .w(80)
                .rounded(6)
                .children(icon(name), text(name).font("Inter").size(10))
            )
          ),

        // Sizes
        text("Icon Sizes").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(24)
          .p(16)
          .itemsEnd()

          .rounded(8)
          .children(
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(icon("star", 16), text("16px").font("Inter").size(11)),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(icon("star", 24), text("24px").font("Inter").size(11)),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(icon("star", 32), text("32px").font("Inter").size(11)),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(icon("star", 48), text("48px").font("Inter").size(11))
          ),

        // Colors
        text("Icon Colors").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .p(16)
          .rounded(8)
          .children(
            icon("heart", 32).color({ r: 0.9, g: 0.3, b: 0.3, a: 1 }),
            icon("check", 32).color({ r: 0.3, g: 0.9, b: 0.4, a: 1 }),
            icon("info", 32).color({ r: 0.3, g: 0.6, b: 0.9, a: 1 }),
            icon("warning", 32).color({ r: 0.9, g: 0.7, b: 0.2, a: 1 }),
            icon("star", 32).color({ r: 0.9, g: 0.5, b: 0.9, a: 1 }),
            icon("settings", 32).color({ r: 0.5, g: 0.9, b: 0.9, a: 1 })
          ),

        // Usage in buttons
        text("Icons in Buttons").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .p(16)
          .rounded(8)
          .children(
            div()
              .flex()
              .flexRow()
              .gap(8)
              .itemsCenter()
              .px(16)
              .py(8)
              .bg({ r: 0.2, g: 0.4, b: 0.8, a: 1 })
              .rounded(6)
              .cursorPointer()
              .children(
                icon("download", 18).color({ r: 1, g: 1, b: 1, a: 1 }),
                text("Download").font("Inter").size(14).color({ r: 1, g: 1, b: 1, a: 1 })
              ),
            div()
              .flex()
              .flexRow()
              .gap(8)
              .itemsCenter()
              .px(16)
              .py(8)
              .bg({ r: 0.2, g: 0.6, b: 0.3, a: 1 })
              .rounded(6)
              .cursorPointer()
              .children(
                icon("check", 18).color({ r: 1, g: 1, b: 1, a: 1 }),
                text("Confirm").font("Inter").size(14).color({ r: 1, g: 1, b: 1, a: 1 })
              ),
            div()
              .flex()
              .flexRow()
              .gap(8)
              .itemsCenter()
              .px(16)
              .py(8)
              .bg({ r: 0.7, g: 0.2, b: 0.2, a: 1 })
              .rounded(6)
              .cursorPointer()
              .children(
                icon("trash", 18).color({ r: 1, g: 1, b: 1, a: 1 }),
                text("Delete").font("Inter").size(14).color({ r: 1, g: 1, b: 1, a: 1 })
              )
          )
      );
  }

  private renderLinkDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Link").font("Inter").size(32),
        text("Clickable text links that open URLs in the browser").font("Inter").size(16),
        divider().color({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),

        // Basic links
        text("Basic Links").font("Inter").size(18),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .p(16)

          .rounded(8)
          .children(
            link("Visit GitHub", "https://github.com").font("Inter"),
            link("Anthropic Homepage", "https://anthropic.com").font("Inter"),
            link("TypeScript Documentation", "https://www.typescriptlang.org/docs/").font("Inter")
          ),

        // Styled links
        text("Styled Links").font("Inter").size(18),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .p(16)
          .rounded(8)
          .children(
            link("Large Link (18px)", "https://example.com").font("Inter").size(18),
            link("Small Link (12px)", "https://example.com").font("Inter").size(12),
            link("Custom Color", "https://example.com")
              .font("Inter")
              .color({ r: 0.9, g: 0.5, b: 0.3, a: 1 })
              .hoverColor({ r: 1, g: 0.6, b: 0.4, a: 1 }),
            link("Green Link", "https://example.com")
              .font("Inter")
              .color({ r: 0.3, g: 0.8, b: 0.5, a: 1 })
              .hoverColor({ r: 0.4, g: 0.9, b: 0.6, a: 1 })
          ),

        // Underline variants
        text("Underline Variants").font("Inter").size(18),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .p(16)
          .rounded(8)
          .children(
            div()
              .flex()
              .flexRow()
              .gap(8)
              .itemsCenter()
              .children(
                text("Default (underline on hover):").font("Inter").size(13),
                link("Hover me", "https://example.com").font("Inter")
              ),
            div()
              .flex()
              .flexRow()
              .gap(8)
              .itemsCenter()
              .children(
                text("Always underlined:").font("Inter").size(13),
                link("Always underlined", "https://example.com").font("Inter").underline()
              ),
            div()
              .flex()
              .flexRow()
              .gap(8)
              .itemsCenter()
              .children(
                text("Never underlined:").font("Inter").size(13),
                link("No underline", "https://example.com").font("Inter").noUnderline()
              )
          ),

        // Inline links
        text("Inline Links").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .flexWrap()
          .gap(4)
          .p(16)
          .rounded(8)
          .itemsBaseline()
          .children(
            text("Check out the").font("Inter").size(14),
            link("documentation", "https://docs.example.com").font("Inter").size(14),
            text("for more information, or visit our").font("Inter").size(14),
            link("GitHub repository", "https://github.com").font("Inter").size(14),
            text("to contribute.").font("Inter").size(14)
          )
      );
  }

  private renderButtonDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(12)
      .children(
        text("Button").font("Inter").size(32),
        text("Reserved for a dedicated button showcase.").font("Inter").size(16),
        div()
          .p(14)

          .rounded(10)
          .border(1)
          .borderColor({ r: 0.28, g: 0.32, b: 0.42, a: 1 })
          .children(
            text("Coming soon")
              .font("Inter")
              .size(14)

              .weight(600),
            div()
              .mt(6)
              .child(
                text("This slot will host button variants, states, and icon buttons.")
                  .font("Inter")
                  .size(13)
              )
          )
      );
  }

  private renderControlsDemo(cx: FlashViewContext<this>): FlashDiv {
    const greenBg = { r: 0.2, g: 0.8, b: 0.4, a: 1 };

    return div()
      .flex()
      .flexCol()
      .gap(24)
      .children(
        // Header
        text("Controls").font("Inter").size(32),
        text("Checkbox, Radio Group, and Switch components").font("Inter").size(16),

        // Checkbox Section
        text("Checkbox").font("Inter").size(20),
        text("A control that allows toggling between checked and unchecked states")
          .font("Inter")
          .size(14),
        div()
          .flex()
          .flexCol()
          .gap(16)
          .p(16)
          .rounded(8)
          .children(
            // Basic checkbox
            div()
              .flex()
              .flexRow()
              .gap(12)
              .itemsCenter()
              .children(
                checkbox()
                  .checked(this.checkboxChecked)
                  .onCheckedChange((checked) => {
                    this.checkboxChecked = checked;
                    cx.notify();
                  }),
                text("Accept terms and conditions").font("Inter").size(14)
              ),
            // Indeterminate checkbox
            div()
              .flex()
              .flexRow()
              .gap(12)
              .itemsCenter()
              .children(
                checkbox()
                  .indeterminate(this.checkboxIndeterminate)
                  .checked(!this.checkboxIndeterminate && this.checkboxChecked)
                  .onCheckedChange(() => {
                    if (this.checkboxIndeterminate) {
                      this.checkboxIndeterminate = false;
                      this.checkboxChecked = true;
                    } else {
                      this.checkboxChecked = !this.checkboxChecked;
                    }
                    cx.notify();
                  }),
                text("Select all items (indeterminate when partial)").font("Inter").size(14)
              ),
            div()
              .flex()
              .flexRow()
              .gap(8)
              .children(
                div()
                  .cursorPointer()
                  .onClick(() => {
                    this.checkboxIndeterminate = true;
                    cx.notify();
                    return { stopPropagation: true };
                  })
                  .child(text("Set Indeterminate").font("Inter").size(12)),
                div()
                  .cursorPointer()
                  .onClick(() => {
                    this.checkboxIndeterminate = false;
                    this.checkboxChecked = false;
                    cx.notify();
                    return { stopPropagation: true };
                  })
                  .child(text("Reset").font("Inter").size(12))
              ),
            // Disabled checkbox
            div()
              .flex()
              .flexRow()
              .gap(12)
              .itemsCenter()
              .children(
                checkbox().checked(true).disabled(true),
                text("Disabled (checked)").font("Inter").size(14)
              ),
            // Custom styled checkbox
            div()
              .flex()
              .flexRow()
              .gap(12)
              .itemsCenter()
              .children(
                checkbox()
                  .size(24)
                  .checked(this.checkboxChecked)
                  .checkedBg(greenBg)
                  .rounded(6)
                  .onCheckedChange((checked) => {
                    this.checkboxChecked = checked;
                    cx.notify();
                  }),
                text("Custom styled (green, larger)").font("Inter").size(14)
              )
          ),

        // Radio Group Section
        text("Radio Group").font("Inter").size(20),
        text("A set of checkable buttons where only one can be checked at a time")
          .font("Inter")
          .size(14),
        div()
          .flex()
          .flexCol()
          .gap(16)
          .p(16)
          .rounded(8)
          .children(
            // Vertical radio group
            div()
              .flex()
              .flexRow()
              .gap(32)
              .children(
                div()
                  .flex()
                  .flexCol()
                  .gap(8)
                  .children(
                    text("Vertical Layout").font("Inter").size(13),
                    radioGroup()
                      .flexCol()
                      .gap(12)
                      .value(this.radioValue)
                      .onValueChange((value) => {
                        this.radioValue = value;
                        cx.notify();
                      })
                      .items(radioItem("option1"), radioItem("option2"), radioItem("option3")),
                    div()
                      .flex()
                      .flexCol()
                      .gap(4)
                      .ml(26)
                      .children(
                        text("Option 1 - Default").font("Inter").size(13),
                        text("Option 2 - Alternative").font("Inter").size(13),
                        text("Option 3 - Another choice").font("Inter").size(13)
                      )
                  ),
                div()
                  .flex()
                  .flexCol()
                  .gap(8)
                  .children(
                    text("Horizontal Layout").font("Inter").size(13),
                    radioGroup()
                      .flexRow()
                      .gap(16)
                      .value(this.radioValue)
                      .onValueChange((value) => {
                        this.radioValue = value;
                        cx.notify();
                      })
                      .items(radioItem("option1"), radioItem("option2"), radioItem("option3"))
                  )
              ),
            text(`Selected: ${this.radioValue}`).font("Inter").size(13),
            // Custom styled radio group
            div()
              .flex()
              .flexCol()
              .gap(8)
              .children(
                text("Custom Styled").font("Inter").size(13),
                radioGroup()
                  .flexRow()
                  .gap(16)
                  .itemSize(22)
                  .checkedBg(greenBg)
                  .indicatorColor({ r: 1, g: 1, b: 1, a: 1 })
                  .value(this.radioValue)
                  .onValueChange((value) => {
                    this.radioValue = value;
                    cx.notify();
                  })
                  .items(radioItem("option1"), radioItem("option2"), radioItem("option3"))
              ),
            // Disabled radio group
            div()
              .flex()
              .flexCol()
              .gap(8)
              .children(
                text("Disabled").font("Inter").size(13),
                radioGroup()
                  .flexRow()
                  .gap(16)
                  .disabled(true)
                  .value("option2")
                  .items(radioItem("option1"), radioItem("option2"), radioItem("option3"))
              )
          ),

        // Switch Section
        text("Switch").font("Inter").size(20),
        text("A toggle control for on/off states, commonly used for settings")
          .font("Inter")
          .size(14),
        div()
          .flex()
          .flexCol()
          .gap(16)
          .p(16)
          .rounded(8)
          .children(
            // Basic switch
            div()
              .flex()
              .flexRow()
              .gap(12)
              .itemsCenter()
              .justifyBetween()
              .w(300)
              .children(
                text("Enable feature").font("Inter").size(14),
                switchToggle()
                  .checked(this.switchEnabled)
                  .onCheckedChange((checked) => {
                    this.switchEnabled = checked;
                    cx.notify();
                  })
              ),
            // Settings-style switches
            div()
              .flex()
              .flexCol()
              .gap(12)
              .p(12)
              .w(320)
              .children(
                div()
                  .flex()
                  .flexRow()
                  .itemsCenter()
                  .justifyBetween()
                  .children(
                    div()
                      .flex()
                      .flexCol()
                      .gap(2)
                      .children(
                        text("Notifications").font("Inter").size(14),
                        text("Receive push notifications").font("Inter").size(12)
                      ),
                    switchToggle()
                      .checked(this.notificationsEnabled)
                      .checkedTrack(greenBg)
                      .onCheckedChange((checked) => {
                        this.notificationsEnabled = checked;
                        cx.notify();
                      })
                  ),
                div()
                  .flex()
                  .flexRow()
                  .itemsCenter()
                  .justifyBetween()
                  .children(
                    div()
                      .flex()
                      .flexCol()
                      .gap(2)
                      .children(
                        text("Dark Mode").font("Inter").size(14),
                        text("Use dark color scheme").font("Inter").size(12)
                      ),
                    switchToggle()
                      .checked(this.darkModeEnabled)
                      .onCheckedChange((checked) => {
                        this.darkModeEnabled = checked;
                        cx.notify();
                      })
                  )
              ),
            // Disabled switch
            div()
              .flex()
              .flexRow()
              .gap(12)
              .itemsCenter()
              .children(
                switchToggle().checked(true).disabled(true),
                text("Disabled (on)").font("Inter").size(14)
              ),
            // Custom sized switches
            div()
              .flex()
              .flexCol()
              .gap(8)
              .children(
                text("Size Variations").font("Inter").size(13),
                div()
                  .flex()
                  .flexRow()
                  .gap(16)
                  .itemsCenter()
                  .children(
                    switchToggle()
                      .size(36, 20)
                      .checked(this.switchEnabled)
                      .onCheckedChange((checked) => {
                        this.switchEnabled = checked;
                        cx.notify();
                      }),
                    text("Small").font("Inter").size(12),
                    switchToggle()
                      .size(44, 24)
                      .checked(this.switchEnabled)
                      .onCheckedChange((checked) => {
                        this.switchEnabled = checked;
                        cx.notify();
                      }),
                    text("Default").font("Inter").size(12),
                    switchToggle()
                      .size(56, 30)
                      .checked(this.switchEnabled)
                      .onCheckedChange((checked) => {
                        this.switchEnabled = checked;
                        cx.notify();
                      }),
                    text("Large").font("Inter").size(12)
                  )
              )
          )
      );
  }

  private renderControlsAndOverlaysDemo(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        this.renderControlsDemo(cx),
        div().h(1).bg({ r: 0.35, g: 0.37, b: 0.45, a: 0.5 }),
        this.renderTooltipDemo(),
        this.renderPopoverDemo(cx),
        this.renderDialogDemo(cx)
      );
  }

  private renderTabsDemo(cx: FlashViewContext<this>): FlashDiv {
    const labelColor = { r: 0.3, g: 0.3, b: 0.3, a: 1 };
    const dimColor = { r: 0.4, g: 0.4, b: 0.4, a: 1 };
    const accentColor = { r: 0.4, g: 0.6, b: 1, a: 1 };

    return div()
      .flex()
      .flexCol()
      .gap(24)
      .children(
        // Header
        text("Tabs").font("Inter").size(32),
        text("Layered content sections with tab-based navigation").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),

        // Basic Tabs Example
        text("Basic Tabs").font("Inter").size(20).color(labelColor),
        text("Click on a tab to switch between content panels")
          .font("Inter")
          .size(14)
          .color(dimColor),
        div()
          .flex()
          .flexCol()
          .p(16)

          .rounded(8)
          .children(
            tabs()
              .wFull()
              .value(this.selectedTab)
              .onValueChange((value) => {
                this.selectedTab = value;
                cx.notify();
              })
              .items(
                tab("account", "Account").content(
                  div()
                    .flex()
                    .flexCol()
                    .gap(12)
                    .children(
                      text("Account Settings").font("Inter").size(18).weight(600).color(labelColor),
                      text("Manage your account preferences and personal information.")
                        .font("Inter")
                        .size(14)
                        .color(dimColor),
                      div()
                        .flex()
                        .flexRow()
                        .gap(8)
                        .itemsCenter()
                        .children(
                          icon("settings", 16).color(accentColor),
                          text("Profile").font("Inter").size(14).color(labelColor)
                        ),
                      div()
                        .flex()
                        .flexRow()
                        .gap(8)
                        .itemsCenter()
                        .children(
                          icon("info", 16).color(accentColor),
                          text("Email Notifications").font("Inter").size(14).color(labelColor)
                        )
                    )
                ),
                tab("security", "Security").content(
                  div()
                    .flex()
                    .flexCol()
                    .gap(12)
                    .children(
                      text("Security Settings")
                        .font("Inter")
                        .size(18)
                        .weight(600)
                        .color(labelColor),
                      text("Configure your security options and password.")
                        .font("Inter")
                        .size(14)
                        .color(dimColor),
                      div()
                        .flex()
                        .flexRow()
                        .gap(8)
                        .itemsCenter()
                        .children(
                          icon("heart", 16).color(accentColor),
                          text("Change Password").font("Inter").size(14).color(labelColor)
                        ),
                      div()
                        .flex()
                        .flexRow()
                        .gap(8)
                        .itemsCenter()
                        .children(
                          icon("check", 16).color(accentColor),
                          text("Two-Factor Authentication").font("Inter").size(14).color(labelColor)
                        )
                    )
                ),
                tab("notifications", "Notifications").content(
                  div()
                    .flex()
                    .flexCol()
                    .gap(12)
                    .children(
                      text("Notification Preferences")
                        .font("Inter")
                        .size(18)
                        .weight(600)
                        .color(labelColor),
                      text("Choose how you want to be notified.")
                        .font("Inter")
                        .size(14)
                        .color(dimColor),
                      div()
                        .flex()
                        .flexRow()
                        .gap(8)
                        .itemsCenter()
                        .children(
                          icon("star", 16).color(accentColor),
                          text("Push Notifications").font("Inter").size(14).color(labelColor)
                        ),
                      div()
                        .flex()
                        .flexRow()
                        .gap(8)
                        .itemsCenter()
                        .children(
                          icon("info", 16).color(accentColor),
                          text("Email Digests").font("Inter").size(14).color(labelColor)
                        )
                    )
                )
              )
          ),

        // Disabled Tab Example
        text("Disabled Tab").font("Inter").size(20).color(labelColor),
        text("Individual tabs can be disabled").font("Inter").size(14).color(dimColor),
        div()
          .flex()
          .flexCol()
          .p(16)
          .bg({ r: 0.12, g: 0.12, b: 0.15, a: 1 })
          .rounded(8)
          .children(
            tabs()
              .wFull()
              .value("enabled")
              .items(
                tab("enabled", "Enabled").content(
                  div()
                    .flex()
                    .flexCol()
                    .gap(8)
                    .children(
                      text("This tab is enabled").font("Inter").size(14).color(labelColor),
                      text("You can click on it and see this content.")
                        .font("Inter")
                        .size(14)
                        .color(dimColor)
                    )
                ),
                tab("premium", "Premium")
                  .disabled(true)
                  .content(
                    div().child(text("Premium content").font("Inter").size(14).color(labelColor))
                  ),
                tab("coming-soon", "Coming Soon")
                  .disabled(true)
                  .content(
                    div().child(text("Coming soon...").font("Inter").size(14).color(labelColor))
                  )
              )
          ),

        // API Info
        text("API").font("Inter").size(20).color(labelColor),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .p(16)
          .bg({ r: 0.08, g: 0.08, b: 0.1, a: 1 })
          .rounded(8)
          .children(
            text("tabs()").font("JetBrains Mono").size(14).color(accentColor),
            text("  .value(selectedValue)       // Current selected tab value")
              .font("JetBrains Mono")
              .size(12)
              .color(dimColor),
            text("  .onValueChange(handler)     // Called when tab changes")
              .font("JetBrains Mono")
              .size(12)
              .color(dimColor),
            text("  .items(tab1, tab2, ...)     // Add tab items")
              .font("JetBrains Mono")
              .size(12)
              .color(dimColor),
            text("").size(8),
            text("tab(value, label)").font("JetBrains Mono").size(14).color(accentColor),
            text("  .content(element)           // Content to show when selected")
              .font("JetBrains Mono")
              .size(12)
              .color(dimColor),
            text("  .disabled(true)             // Disable this tab")
              .font("JetBrains Mono")
              .size(12)
              .color(dimColor)
          )
      );
  }

  private renderDropdownDemo(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(24)
      .children(
        // Header
        text("Dropdown Menu").font("Inter").size(32),
        text("Displays a menu triggered by a button with items, separators, and labels")
          .font("Inter")
          .size(16),

        // Status display
        div()
          .flex()
          .flexRow()
          .gap(8)
          .itemsCenter()
          .children(
            text("Last Action:").font("Inter").size(14),
            text(this.dropdownLastAction).font("Inter").size(14).weight(600)
          ),

        // Basic Dropdown Example
        text("Basic Dropdown").font("Inter").size(20),
        text("Click the button to open a simple dropdown menu").font("Inter").size(14),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .p(16)
          .rounded(8)
          .children(
            dropdown()
              .open(this.dropdownOpen)
              .onOpenChange((open) => {
                this.dropdownOpen = open;
                cx.notify();
              })
              .trigger(
                div()
                  .flex()
                  .flexRow()
                  .gap(8)
                  .itemsCenter()
                  .px(16)
                  .py(10)
                  .rounded(6)
                  .cursorPointer()
                  .children(text("Open Menu").font("Inter").size(14), icon("arrowDown", 14))
              )
              .items(
                dropdownItem("New File").onSelect(() => {
                  this.dropdownLastAction = "New File";
                  cx.notify();
                }),
                dropdownItem("Open...").onSelect(() => {
                  this.dropdownLastAction = "Open...";
                  cx.notify();
                }),
                dropdownItem("Save").onSelect(() => {
                  this.dropdownLastAction = "Save";
                  cx.notify();
                }),
                dropdownSeparator(),
                dropdownItem("Exit").onSelect(() => {
                  this.dropdownLastAction = "Exit";
                  cx.notify();
                })
              )
          ),

        // Dropdown with Labels Example
        text("Dropdown with Labels").font("Inter").size(20),
        text("Group items with section labels").font("Inter").size(14),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .p(16)
          .rounded(8)
          .children(
            dropdown()
              .open(this.dropdown2Open)
              .onOpenChange((open) => {
                this.dropdown2Open = open;
                cx.notify();
              })
              .trigger(
                div()
                  .flex()
                  .flexRow()
                  .gap(8)
                  .itemsCenter()
                  .px(16)
                  .py(10)
                  .rounded(6)
                  .cursorPointer()
                  .children(text("Actions").font("Inter").size(14), icon("arrowDown", 14))
              )
              .items(
                dropdownLabel("Edit"),
                dropdownItem("Cut").onSelect(() => {
                  this.dropdownLastAction = "Cut";
                  cx.notify();
                }),
                dropdownItem("Copy").onSelect(() => {
                  this.dropdownLastAction = "Copy";
                  cx.notify();
                }),
                dropdownItem("Paste").onSelect(() => {
                  this.dropdownLastAction = "Paste";
                  cx.notify();
                }),
                dropdownSeparator(),
                dropdownLabel("View"),
                dropdownItem("Zoom In").onSelect(() => {
                  this.dropdownLastAction = "Zoom In";
                  cx.notify();
                }),
                dropdownItem("Zoom Out").onSelect(() => {
                  this.dropdownLastAction = "Zoom Out";
                  cx.notify();
                }),
                dropdownItem("Reset Zoom").onSelect(() => {
                  this.dropdownLastAction = "Reset Zoom";
                  cx.notify();
                })
              )
          ),

        // Dropdown with Destructive Actions
        text("Destructive Actions").font("Inter").size(20),
        text("Items with destructive styling for dangerous actions").font("Inter").size(14),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .p(16)
          .rounded(8)
          .children(
            dropdown()
              .open(this.dropdown3Open)
              .onOpenChange((open) => {
                this.dropdown3Open = open;
                cx.notify();
              })
              .trigger(
                div()
                  .flex()
                  .flexRow()
                  .gap(8)
                  .itemsCenter()
                  .px(16)
                  .py(10)
                  .rounded(6)
                  .cursorPointer()
                  .children(
                    icon("settings", 16),
                    text("Settings").font("Inter").size(14),
                    icon("arrowDown", 14)
                  )
              )
              .items(
                dropdownItem("Profile").onSelect(() => {
                  this.dropdownLastAction = "Profile";
                  cx.notify();
                }),
                dropdownItem("Preferences").onSelect(() => {
                  this.dropdownLastAction = "Preferences";
                  cx.notify();
                }),
                dropdownSeparator(),
                dropdownItem("Log Out").onSelect(() => {
                  this.dropdownLastAction = "Log Out";
                  cx.notify();
                }),
                dropdownItem("Delete Account")
                  .destructive(true)
                  .onSelect(() => {
                    this.dropdownLastAction = "Delete Account (destructive)";
                    cx.notify();
                  })
              )
          ),

        // Nested Submenus Example
        text("Nested Submenus").font("Inter").size(20),
        text("Hover over submenu items to reveal nested menus. Supports diagonal mouse movement.")
          .font("Inter")
          .size(14),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .p(16)
          .rounded(8)
          .children(
            dropdown()
              .id("file-menu-dropdown")
              .open(this.dropdown4Open)
              .onOpenChange((open) => {
                this.dropdown4Open = open;
                cx.notify();
              })
              .trigger(
                div()
                  .flex()
                  .flexRow()
                  .gap(8)
                  .itemsCenter()
                  .px(16)
                  .py(10)
                  .rounded(6)
                  .cursorPointer()
                  .children(text("File Menu").font("Inter").size(14), icon("arrowDown", 14))
              )
              .items(
                dropdownItem("New").onSelect(() => {
                  this.dropdownLastAction = "New";
                  cx.notify();
                }),
                dropdownSub("Open Recent").items(
                  dropdownItem("project-alpha.ts").onSelect(() => {
                    this.dropdownLastAction = "Open: project-alpha.ts";
                    cx.notify();
                  }),
                  dropdownItem("config.json").onSelect(() => {
                    this.dropdownLastAction = "Open: config.json";
                    cx.notify();
                  }),
                  dropdownItem("README.md").onSelect(() => {
                    this.dropdownLastAction = "Open: README.md";
                    cx.notify();
                  }),
                  dropdownSeparator(),
                  dropdownSub("More Files").items(
                    dropdownItem("old-backup.zip").onSelect(() => {
                      this.dropdownLastAction = "Open: old-backup.zip";
                      cx.notify();
                    }),
                    dropdownItem("notes.txt").onSelect(() => {
                      this.dropdownLastAction = "Open: notes.txt";
                      cx.notify();
                    })
                  )
                ),
                dropdownSeparator(),
                dropdownSub("Export As").items(
                  dropdownItem("PDF").onSelect(() => {
                    this.dropdownLastAction = "Export as PDF";
                    cx.notify();
                  }),
                  dropdownItem("HTML").onSelect(() => {
                    this.dropdownLastAction = "Export as HTML";
                    cx.notify();
                  }),
                  dropdownSub("Image").items(
                    dropdownItem("PNG").onSelect(() => {
                      this.dropdownLastAction = "Export as PNG";
                      cx.notify();
                    }),
                    dropdownItem("JPEG").onSelect(() => {
                      this.dropdownLastAction = "Export as JPEG";
                      cx.notify();
                    }),
                    dropdownItem("WebP").onSelect(() => {
                      this.dropdownLastAction = "Export as WebP";
                      cx.notify();
                    })
                  )
                ),
                dropdownSeparator(),
                dropdownItem("Save").onSelect(() => {
                  this.dropdownLastAction = "Save";
                  cx.notify();
                }),
                dropdownItem("Close").onSelect(() => {
                  this.dropdownLastAction = "Close";
                  cx.notify();
                })
              )
          )
      );
  }

  private renderRightClickDemo(cx: FlashViewContext<this>): FlashDiv {
    const menu = rightClickMenu()
      .id("right-click-menu-demo")
      .open(this.rightClickMenuOpen)
      .position(this.rightClickMenuPosition)
      .onOpenChange((open) => {
        this.rightClickMenuOpen = open;
        cx.notify();
      })
      .items(
        rightClickLabel("Quick Actions"),
        rightClickItem("New File"),
        rightClickItem("Rename"),
        rightClickSeparator(),
        rightClickSub("Sort By").items(
          rightClickItem("Name"),
          rightClickItem("Date Modified"),
          rightClickItem("Size"),
          rightClickSeparator(),
          rightClickSub("Group By").items(
            rightClickItem("Type"),
            rightClickItem("Date Created"),
            rightClickSub("More...").items(
              rightClickItem("Owner"),
              rightClickItem("Tag"),
              rightClickItem("Custom Field")
            )
          )
        ),
        rightClickSeparator(),
        rightClickItem("Delete").destructive(true)
      );

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Right Click Menu").font("Inter").size(28),
        text("Right-click (or ctrl+click) the panel below to open nested context menus.")
          .font("Inter")
          .size(14),
        menu,
        div()
          .flex()
          .flexCol()
          .p(24)
          .h(320)
          .rounded(12)
          .onMouseDown((event, _window, _handlerCx) => {
            const isContextClick =
              event.button === 1 ||
              event.button === 2 ||
              (event.button === 0 && event.modifiers.ctrl);
            if (isContextClick) {
              this.rightClickMenuPosition = { x: event.x, y: event.y };
              this.rightClickMenuOpen = true;
              cx.notify();
              return { preventDefault: true };
            }
            if (event.button === 0 && this.rightClickMenuOpen) {
              this.rightClickMenuOpen = false;
              cx.notify();
            }
          })
      );
  }

  private renderTooltipDemo(): FlashDiv {
    const tooltipBg = { r: 0.15, g: 0.15, b: 0.18, a: 1 };
    const tooltipBorder = { r: 0.3, g: 0.3, b: 0.35, a: 1 };

    return div()
      .flex()
      .flexCol()
      .gap(24)
      .children(
        text("Tooltip Component").font("Inter").size(28).weight(700),
        text("Hover over elements to see tooltips with various configurations")
          .font("Inter")
          .size(14),

        div()
          .flex()
          .flexCol()
          .gap(16)
          .children(
            text("Basic Tooltips").font("Inter").size(18).weight(600),
            div()
              .flex()
              .flexRow()
              .gap(16)
              .children(
                div()
                  .flex()
                  .justifyCenter()
                  .itemsCenter()
                  .py(12)
                  .px(20)
                  .rounded(6)
                  .cursor("pointer")
                  .tooltip(() =>
                    div()
                      .py(8)
                      .px(12)
                      .bg(tooltipBg)
                      .border(1)
                      .borderColor(tooltipBorder)
                      .rounded(6)
                      .child(text("Default tooltip (top)").font("Inter").size(13))
                  )
                  .child(text("Hover me").font("Inter").size(14)),

                div()
                  .flex()
                  .justifyCenter()
                  .itemsCenter()
                  .py(12)
                  .px(20)
                  .rounded(6)
                  .cursor("pointer")
                  .tooltip(
                    () =>
                      div()
                        .py(8)
                        .px(12)
                        .bg(tooltipBg)
                        .border(1)
                        .borderColor(tooltipBorder)
                        .rounded(6)
                        .child(text("Bottom tooltip").font("Inter").size(13)),
                    (cfg) => cfg.position("bottom")
                  )
                  .child(text("Bottom").font("Inter").size(14)),

                div()
                  .flex()
                  .justifyCenter()
                  .itemsCenter()
                  .py(12)
                  .px(20)
                  .rounded(6)
                  .cursor("pointer")
                  .tooltip(
                    () =>
                      div()
                        .py(8)
                        .px(12)
                        .bg(tooltipBg)
                        .border(1)
                        .borderColor(tooltipBorder)
                        .rounded(6)
                        .child(text("Left tooltip").font("Inter").size(13)),
                    (cfg) => cfg.position("left")
                  )
                  .child(text("Left").font("Inter").size(14)),

                div()
                  .flex()
                  .justifyCenter()
                  .itemsCenter()
                  .py(12)
                  .px(20)
                  .rounded(6)
                  .cursor("pointer")
                  .tooltip(
                    () =>
                      div()
                        .py(8)
                        .px(12)
                        .bg(tooltipBg)
                        .border(1)
                        .borderColor(tooltipBorder)
                        .rounded(6)
                        .child(text("Right tooltip").font("Inter").size(13)),
                    (cfg) => cfg.position("right")
                  )
                  .child(text("Right").font("Inter").size(14))
              )
          ),

        div()
          .flex()
          .flexCol()
          .gap(16)
          .children(
            text("Tooltip Timing").font("Inter").size(18).weight(600),
            div()
              .flex()
              .flexRow()
              .gap(16)
              .children(
                div()
                  .flex()
                  .justifyCenter()
                  .itemsCenter()
                  .py(12)
                  .px(20)
                  .rounded(6)
                  .cursor("pointer")
                  .tooltip(
                    () =>
                      div()
                        .py(8)
                        .px(12)
                        .bg(tooltipBg)
                        .border(1)
                        .borderColor(tooltipBorder)
                        .rounded(6)
                        .child(text("Instant! (0ms delay)").font("Inter").size(13)),
                    (cfg) => cfg.delay(0)
                  )
                  .child(text("Instant").font("Inter").size(14)),

                div()
                  .flex()
                  .justifyCenter()
                  .itemsCenter()
                  .py(12)
                  .px(20)
                  .rounded(6)
                  .cursor("pointer")
                  .tooltip(
                    () =>
                      div()
                        .py(8)
                        .px(12)
                        .bg(tooltipBg)
                        .border(1)
                        .borderColor(tooltipBorder)
                        .rounded(6)
                        .child(text("Default delay (500ms)").font("Inter").size(13)),
                    (cfg) => cfg.delay(500)
                  )
                  .child(text("Default (500ms)").font("Inter").size(14)),

                div()
                  .flex()
                  .justifyCenter()
                  .itemsCenter()
                  .py(12)
                  .px(20)
                  .rounded(6)
                  .cursor("pointer")
                  .tooltip(
                    () =>
                      div()
                        .py(8)
                        .px(12)
                        .bg(tooltipBg)
                        .border(1)
                        .borderColor(tooltipBorder)
                        .rounded(6)
                        .child(text("Slow tooltip (1000ms)").font("Inter").size(13)),
                    (cfg) => cfg.delay(1000)
                  )
                  .child(text("Slow (1s)").font("Inter").size(14))
              )
          ),

        div()
          .flex()
          .flexCol()
          .gap(16)
          .children(
            text("Rich Tooltip Content").font("Inter").size(18).weight(600),
            div()
              .flex()
              .flexRow()
              .gap(16)
              .children(
                div()
                  .flex()
                  .justifyCenter()
                  .itemsCenter()
                  .py(12)
                  .px(20)
                  .rounded(6)
                  .cursor("pointer")
                  .tooltip(() =>
                    div()
                      .flex()
                      .flexCol()
                      .gap(8)
                      .p(12)
                      .bg(tooltipBg)
                      .border(1)
                      .borderColor(tooltipBorder)
                      .rounded(8)
                      .children(
                        text("Multi-line Tooltip").font("Inter").size(14).weight(600),
                        text("Tooltips can contain multiple lines of text and rich content.")
                          .font("Inter")
                          .size(12),
                        div()
                          .flex()
                          .flexRow()
                          .gap(4)
                          .itemsCenter()
                          .children(
                            text("Shortcut:").font("Inter").size(11),
                            div()
                              .py(2)
                              .px(6)
                              .rounded(4)
                              .child(text("Ctrl+S").font("JetBrains Mono").size(11))
                          )
                      )
                  )
                  .child(text("Rich Content").font("Inter").size(14))
              )
          ),

        div()
          .flex()
          .flexCol()
          .gap(8)
          .children(
            text("API Reference").font("Inter").size(16).weight(600),
            text(".tooltip(builder, config?) - Add tooltip to any element")
              .font("JetBrains Mono")
              .size(12),
            text("  builder: () => FlashElement - Function returning tooltip content")
              .font("JetBrains Mono")
              .size(12),
            text("  config.position('top'|'bottom'|'left'|'right'|'cursor')")
              .font("JetBrains Mono")
              .size(12),
            text("  config.delay(ms) - Delay before showing (default 500ms)")
              .font("JetBrains Mono")
              .size(12),
            text("  config.offset(px) - Distance from target (default 8px)")
              .font("JetBrains Mono")
              .size(12)
          )
      );
  }

  private popoverOpen = false;
  private popover2Open = false;
  private popover3Open = false;

  private renderDialogDemo(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(24)
      .children(
        text("Dialog Component").font("Inter").size(28).weight(700),
        text("Modal windows with backdrop overlay. Click outside or press Escape to dismiss.")
          .font("Inter")
          .size(14),

        div()
          .flex()
          .flexCol()
          .gap(16)
          .children(
            text("Basic Dialog").font("Inter").size(18).weight(600),
            text("A simple dialog with title, description, and action buttons")
              .font("Inter")
              .size(13),
            div()
              .flex()
              .flexRow()
              .gap(16)
              .children(
                dialog()
                  .open(this.dialogOpen)
                  .onOpenChange((open) => {
                    this.dialogOpen = open;
                    cx.notify();
                  })
                  .trigger(
                    div()
                      .flex()
                      .justifyCenter()
                      .itemsCenter()
                      .py(12)
                      .px(20)
                      .rounded(6)
                      .cursor("pointer")
                      .child(text("Open Dialog").font("Inter").size(14))
                  )
                  .content(
                    dialogContent()
                      .header(
                        dialogHeader()
                          .title("Are you sure?")
                          .description(
                            "This action cannot be undone. This will permanently delete your account and remove your data from our servers."
                          )
                      )
                      .footer(
                        dialogFooter()
                          .cancel("Cancel")
                          .confirm("Continue")
                          .onCancel(() => {
                            this.dialogOpen = false;
                            this.dialogLastAction = "Cancelled";
                            cx.notify();
                          })
                          .onConfirm(() => {
                            this.dialogOpen = false;
                            this.dialogLastAction = "Confirmed";
                            cx.notify();
                          })
                      )
                  )
              )
          ),

        div()
          .flex()
          .flexCol()
          .gap(16)
          .children(
            text("Destructive Dialog").font("Inter").size(18).weight(600),
            text("Dialog with a destructive (red) confirm button for dangerous actions")
              .font("Inter")
              .size(13),
            dialog()
              .open(this.dialog2Open)
              .onOpenChange((open) => {
                this.dialog2Open = open;
                cx.notify();
              })
              .trigger(
                div()
                  .flex()
                  .justifyCenter()
                  .itemsCenter()
                  .py(12)
                  .px(20)
                  .rounded(6)
                  .cursor("pointer")
                  .child(text("Delete Account").font("Inter").size(14))
              )
              .content(
                dialogContent()
                  .header(
                    dialogHeader()
                      .title("Delete Account")
                      .description(
                        "Are you absolutely sure? This will permanently delete your account and all associated data."
                      )
                  )
                  .footer(
                    dialogFooter()
                      .cancel("Cancel")
                      .confirm("Delete")
                      .isDestructive(true)
                      .onCancel(() => {
                        this.dialog2Open = false;
                        cx.notify();
                      })
                      .onConfirm(() => {
                        this.dialog2Open = false;
                        this.dialogLastAction = "Account deleted!";
                        cx.notify();
                      })
                  )
              )
          ),

        div()
          .flex()
          .flexCol()
          .gap(16)
          .children(
            text("Dialog with Custom Content").font("Inter").size(18).weight(600),
            text("Dialogs can contain any custom content in the body").font("Inter").size(13),
            dialog()
              .open(this.dialog3Open)
              .onOpenChange((open) => {
                this.dialog3Open = open;
                cx.notify();
              })
              .trigger(
                div()
                  .flex()
                  .justifyCenter()
                  .itemsCenter()
                  .py(12)
                  .px(20)
                  .rounded(6)
                  .cursor("pointer")
                  .child(text("Edit Profile").font("Inter").size(14))
              )
              .content(
                dialogContent()
                  .header(
                    dialogHeader()
                      .title("Edit Profile")
                      .description("Make changes to your profile here.")
                  )
                  .body(
                    div()
                      .flex()
                      .flexCol()
                      .gap(12)
                      .children(
                        div()
                          .flex()
                          .flexCol()
                          .gap(4)
                          .children(
                            text("Name").font("Inter").size(13).weight(500),
                            div().p(10).rounded(4).child(text("John Doe").font("Inter").size(14))
                          ),
                        div()
                          .flex()
                          .flexCol()
                          .gap(4)
                          .children(
                            text("Email").font("Inter").size(13).weight(500),
                            div()
                              .p(10)
                              .rounded(4)
                              .child(text("john@example.com").font("Inter").size(14))
                          )
                      )
                  )
                  .footer(
                    dialogFooter()
                      .cancel("Cancel")
                      .confirm("Save Changes")
                      .onCancel(() => {
                        this.dialog3Open = false;
                        cx.notify();
                      })
                      .onConfirm(() => {
                        this.dialog3Open = false;
                        this.dialogLastAction = "Profile saved!";
                        cx.notify();
                      })
                  )
              )
          ),

        this.dialogLastAction
          ? div()
              .p(12)
              .rounded(6)
              .child(text(`Last action: ${this.dialogLastAction}`).font("Inter").size(14))
          : div(),

        div()
          .flex()
          .flexCol()
          .gap(16)
          .children(
            text("Dialog vs Popover vs Modal").font("Inter").size(18).weight(600),
            div()
              .flex()
              .flexCol()
              .gap(8)
              .p(16)
              .children(
                div()
                  .flex()
                  .flexRow()
                  .gap(8)
                  .children(
                    text("Popover:").font("Inter").size(13).weight(600),
                    text("Positioned relative to trigger, click-outside dismisses")
                      .font("Inter")
                      .size(13)
                  ),
                div()
                  .flex()
                  .flexRow()
                  .gap(8)
                  .children(
                    text("Dialog:").font("Inter").size(13).weight(600),
                    text("Centered modal with backdrop, blocks background interaction")
                      .font("Inter")
                      .size(13)
                  ),
                div()
                  .flex()
                  .flexRow()
                  .gap(8)
                  .children(
                    text("Alert Dialog:").font("Inter").size(13).weight(600),
                    text("Dialog that requires explicit action (no backdrop dismiss)")
                      .font("Inter")
                      .size(13)
                  )
              )
          ),

        div()
          .flex()
          .flexCol()
          .gap(8)
          .children(
            text("API Reference").font("Inter").size(16).weight(600),
            text("dialog().open(boolean).onOpenChange(fn).trigger(element).content(dialogContent)")
              .font("JetBrains Mono")
              .size(12),
            text("dialogContent().header(dialogHeader).body(element).footer(dialogFooter)")
              .font("JetBrains Mono")
              .size(12),
            text("dialogHeader().title(string).description(string).showClose(boolean)")
              .font("JetBrains Mono")
              .size(12),
            text("dialogFooter().cancel(string).confirm(string).isDestructive(boolean)")
              .font("JetBrains Mono")
              .size(12)
          )
      );
  }

  private renderPopoverDemo(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(24)
      .children(
        text("Popover Component").font("Inter").size(28).weight(700),
        text("Click-triggered overlays for interactive content. Click outside to dismiss.")
          .font("Inter")
          .size(14),

        div()
          .flex()
          .flexCol()
          .gap(16)
          .children(
            text("Basic Popovers").font("Inter").size(18).weight(600),
            text("Popovers use the same infrastructure as dropdowns but with custom content")
              .font("Inter")
              .size(13),
            div()
              .flex()
              .flexRow()
              .gap(16)
              .children(
                dropdown()
                  .open(this.popoverOpen)
                  .onOpenChange((open) => {
                    this.popoverOpen = open;
                    cx.notify();
                  })
                  .trigger(
                    div()
                      .flex()
                      .justifyCenter()
                      .itemsCenter()
                      .py(12)
                      .px(20)
                      .rounded(6)
                      .cursor("pointer")
                      .child(text("Simple Popover").font("Inter").size(14))
                  )
                  .items(
                    dropdownLabel("Information"),
                    dropdownItem("This is a popover!"),
                    dropdownItem("It can contain any content"),
                    dropdownSeparator(),
                    dropdownItem("Click outside to close")
                  ),

                dropdown()
                  .open(this.popover2Open)
                  .onOpenChange((open) => {
                    this.popover2Open = open;
                    cx.notify();
                  })
                  .side("right")
                  .trigger(
                    div()
                      .flex()
                      .justifyCenter()
                      .itemsCenter()
                      .py(12)
                      .px(20)
                      .rounded(6)
                      .cursor("pointer")
                      .child(text("Right Side").font("Inter").size(14))
                  )
                  .items(
                    dropdownLabel("Right-aligned"),
                    dropdownItem("Opens to the right"),
                    dropdownItem("Great for sidebars")
                  ),

                dropdown()
                  .open(this.popover3Open)
                  .onOpenChange((open) => {
                    this.popover3Open = open;
                    cx.notify();
                  })
                  .side("top")
                  .trigger(
                    div()
                      .flex()
                      .justifyCenter()
                      .itemsCenter()
                      .py(12)
                      .px(20)
                      .rounded(6)
                      .cursor("pointer")
                      .child(text("Top Side").font("Inter").size(14))
                  )
                  .items(
                    dropdownLabel("Above trigger"),
                    dropdownItem("Opens above the button"),
                    dropdownItem("Useful for bottom toolbars")
                  )
              )
          ),

        div()
          .flex()
          .flexCol()
          .gap(16)
          .children(
            text("Popover vs Tooltip vs Dropdown").font("Inter").size(18).weight(600),
            div()
              .flex()
              .flexCol()
              .gap(8)
              .p(16)
              .children(
                div()
                  .flex()
                  .flexRow()
                  .gap(8)
                  .children(
                    text("Tooltip:").font("Inter").size(13).weight(600),
                    text("Hover-triggered, informational, auto-dismisses on mouse leave")
                      .font("Inter")
                      .size(13)
                  ),
                div()
                  .flex()
                  .flexRow()
                  .gap(8)
                  .children(
                    text("Popover:").font("Inter").size(13).weight(600),
                    text("Click-triggered, interactive content, click-outside to dismiss")
                      .font("Inter")
                      .size(13)
                  ),
                div()
                  .flex()
                  .flexRow()
                  .gap(8)
                  .children(
                    text("Dropdown:").font("Inter").size(13).weight(600),
                    text("Specialized popover with menu items, selection handling, keyboard nav")
                      .font("Inter")
                      .size(13)
                  )
              )
          ),

        div()
          .flex()
          .flexCol()
          .gap(8)
          .children(
            text("API Reference").font("Inter").size(16).weight(600),
            text("Popovers currently use the dropdown() component with custom items:")
              .font("JetBrains Mono")
              .size(12),
            text("  dropdown().open(boolean).onOpenChange(fn).trigger(element).items(...)")
              .font("JetBrains Mono")
              .size(12),
            text("  .side('top'|'bottom'|'left'|'right') - Preferred side")
              .font("JetBrains Mono")
              .size(12),
            text("  .align('start'|'center'|'end') - Alignment along side")
              .font("JetBrains Mono")
              .size(12),
            text("  .sideOffset(px) - Distance from trigger").font("JetBrains Mono").size(12)
          )
      );
  }

  private renderTableDemo(): FlashDiv {
    type Status = "Active" | "Idle" | "Offline";
    type Row = {
      name: string;
      role: string;
      status: Status;
      email: string;
      lastActive: string;
      note?: string;
      highlight?: boolean;
    };

    const headers = ["Name", "Role", "Status", "Email", "Last Active"];
    const rows: Row[] = [
      {
        name: "Ada Lovelace",
        role: "Graphics Engineer",
        status: "Active",
        email: "ada@glade.dev",
        lastActive: "2m ago",
        note: "Leads the WebGPU pipeline work.",
      },
      {
        name: "Grace Hopper",
        role: "Runtime Engineer",
        status: "Idle",
        email: "grace@glade.dev",
        lastActive: "12m ago",
      },
      {
        name: "Alan Turing",
        role: "Security Engineer",
        status: "Offline",
        email: "alan@glade.dev",
        lastActive: "1h ago",
        note: "Reviewing upcoming auth changes.",
      },
      {
        name: "Margaret Hamilton",
        role: "Engineering Manager",
        status: "Active",
        email: "margaret@glade.dev",
        lastActive: "5m ago",
        highlight: true,
      },
      {
        name: "Linus Torvalds",
        role: "Systems Engineer",
        status: "Idle",
        email: "linus@glade.dev",
        lastActive: "28m ago",
      },
    ];

    const bodyRows: FlashTableRow[] = [];

    rows.forEach((row, _index) => {
      bodyRows.push(
        tr().children(
          td().border(1).px(10).py(6).child(text(row.name).font("Inter").size(13).weight(600)),
          td().border(1).px(10).py(6).child(text(row.role).font("Inter").size(13)),
          td()
            .border(1)
            .child(
              div()
                .flex()
                .itemsCenter()
                .px(10)
                .py(6)
                .roundedFull()
                .bg(
                  row.status === "Active"
                    ? rgb(0x22c55e)
                    : row.status === "Idle"
                      ? rgb(0xf59e0b)
                      : rgb(0xef4444)
                )
                .child(text(row.status).font("Inter").size(12).weight(700))
            ),
          td().border(1).px(10).py(6).child(text(row.email).font("Inter").size(12)),
          td().border(1).px(10).py(6).child(text(row.lastActive).font("Inter").size(12))
        )
      );

      if (row.note) {
        bodyRows.push(
          tr().child(
            td()
              .colSpan(headers.length)
              .border(1)
              .px(10)
              .py(6)
              .child(text(row.note).font("Inter").size(12))
          )
        );
      }
    });

    return div()
      .flex()
      .flexCol()
      .gap(12)
      .children(
        text("Table Component").font("Inter").size(26).weight(700),
        text("HTML-like table built on Flash grid layout with table/thead/tr/th/td helpers.")
          .font("Inter")
          .size(13),
        table()
          .columnTemplate([180, 140, 120, "1fr", 120])
          .rowGap(0)
          .columnGap(0)
          .style({
            width: "100%",
            borderRadius: 10,
            borderWidth: 1,
            overflow: "hidden",
          })
          .child(
            thead().child(
              tr().children(
                ...headers.map((title) =>
                  th().border(1).px(10).py(6).child(text(title).font("Inter").size(12).weight(700))
                )
              )
            )
          )
          .child(tbody().children(...bodyRows))
          .child(
            tfoot().child(
              tr().child(
                td()
                  .colSpan(headers.length)
                  .border(1)
                  .px(10)
                  .py(6)
                  .child(text(`Showing ${rows.length} team members`).font("Inter").size(12))
              )
            )
          )
      );
  }

  private renderFlexboxDemo(): FlashDiv {
    const accent1 = { r: 0.35, g: 0.78, b: 0.98, a: 1 };
    const accent2 = { r: 0.62, g: 0.86, b: 0.44, a: 1 };
    const accent3 = { r: 0.98, g: 0.69, b: 0.27, a: 1 };
    const accent4 = { r: 0.84, g: 0.53, b: 0.98, a: 1 };
    const accent5 = { r: 0.32, g: 0.82, b: 0.8, a: 1 };

    return div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Flexbox").font("Inter").size(32),
        text("Row/column alignment, wrapping, and spacing helpers.").font("Inter").size(16),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .flexWrap()
          .children(
            div()
              .w(360)
              .flex()
              .flexCol()
              .gap(10)
              .rounded(10)
              .p(12)
              .border(1)
              .borderColor({ r: 0.28, g: 0.32, b: 0.42, a: 1 })
              .children(
                text("Row • justifyBetween • itemsCenter").font("Inter").size(13),
                div()
                  .flex()
                  .flexRow()
                  .itemsCenter()
                  .justifyBetween()
                  .mt(10)
                  .children(
                    div().w(40).h(40).rounded(6).bg(accent1),
                    div().w(60).h(60).rounded(6).bg(accent2),
                    div().w(40).h(40).rounded(6).bg(accent3)
                  )
              ),
            div()
              .w(360)
              .flex()
              .flexCol()
              .gap(10)
              .rounded(10)
              .p(12)
              .border(1)
              .borderColor({ r: 0.28, g: 0.32, b: 0.42, a: 1 })
              .children(
                text("Column • gap • align center").font("Inter").size(13),
                div()
                  .flex()
                  .flexCol()
                  .itemsCenter()
                  .gap(10)
                  .mt(10)
                  .children(
                    div().w(100).h(32).rounded(6).bg(accent1),
                    div().w(140).h(32).rounded(6).bg(accent2),
                    div().w(80).h(32).rounded(6).bg(accent3)
                  )
              ),
            div()
              .w(360)
              .flex()
              .flexCol()
              .gap(10)
              .rounded(10)
              .p(12)
              .border(1)
              .borderColor({ r: 0.28, g: 0.32, b: 0.42, a: 1 })
              .children(
                text("Wrap • gap • align start").font("Inter").size(13),
                div()
                  .flex()
                  .flexRow()
                  .flexWrap()
                  .gap(8)
                  .itemsStart()
                  .mt(10)
                  .children(
                    div()
                      .w(64)
                      .h(26)
                      .rounded(6)
                      .bg(accent1)
                      .flex()
                      .itemsCenter()
                      .justifyCenter()
                      .child(text("A").font("Inter").size(11)),
                    div()
                      .w(96)
                      .h(26)
                      .rounded(6)
                      .bg(accent2)
                      .flex()
                      .itemsCenter()
                      .justifyCenter()
                      .child(text("B").font("Inter").size(11)),
                    div()
                      .w(72)
                      .h(26)
                      .rounded(6)
                      .bg(accent3)
                      .flex()
                      .itemsCenter()
                      .justifyCenter()
                      .child(text("C").font("Inter").size(11)),
                    div()
                      .w(104)
                      .h(26)
                      .rounded(6)
                      .bg(accent4)
                      .flex()
                      .itemsCenter()
                      .justifyCenter()
                      .child(text("D").font("Inter").size(11)),
                    div()
                      .w(80)
                      .h(26)
                      .rounded(6)
                      .bg(accent5)
                      .flex()
                      .itemsCenter()
                      .justifyCenter()
                      .child(text("E").font("Inter").size(11))
                  )
              )
          )
      );
  }

  private renderGridLayoutDemo(): FlashDiv {
    // Colors for grid cells
    const red = { r: 0.9, g: 0.3, b: 0.3, a: 1 };
    const green = { r: 0.3, g: 0.8, b: 0.4, a: 1 };
    const blue = { r: 0.3, g: 0.5, b: 0.9, a: 1 };
    const purple = { r: 0.6, g: 0.3, b: 0.9, a: 1 };
    const orange = { r: 0.95, g: 0.6, b: 0.2, a: 1 };
    const teal = { r: 0.2, g: 0.7, b: 0.7, a: 1 };
    const pink = { r: 0.9, g: 0.4, b: 0.6, a: 1 };
    const yellow = { r: 0.9, g: 0.8, b: 0.2, a: 1 };

    return div()
      .flex()
      .flexCol()
      .gap(24)
      .children(
        // Header
        text("CSS Grid Layout").font("Inter").size(32),
        text("Taffy-powered CSS Grid with Tailwind-like API").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),

        // Example 1: Simple 3-column grid
        text("Simple 3-Column Grid").font("Inter").size(18),
        text(".grid().gridCols(3).gap(8)").font("JetBrains Mono").size(12),
        div()
          .grid()
          .gridCols(3)
          .gap(8)
          .children(
            div()
              .h(60)
              .rounded(8)
              .bg(red)
              .itemsCenter()
              .justifyCenter()
              .child(text("1").font("Inter").size(16)),
            div()
              .h(60)
              .rounded(8)
              .bg(green)
              .itemsCenter()
              .justifyCenter()
              .child(text("2").font("Inter").size(16)),
            div()
              .h(60)
              .rounded(8)
              .bg(blue)
              .itemsCenter()
              .justifyCenter()
              .child(text("3").font("Inter").size(16)),
            div()
              .h(60)
              .rounded(8)
              .bg(purple)
              .itemsCenter()
              .justifyCenter()
              .child(text("4").font("Inter").size(16)),
            div()
              .h(60)
              .rounded(8)
              .bg(orange)
              .itemsCenter()
              .justifyCenter()
              .child(text("5").font("Inter").size(16)),
            div()
              .h(60)
              .rounded(8)
              .bg(teal)
              .itemsCenter()
              .justifyCenter()
              .child(text("6").font("Inter").size(16))
          ),

        // Example 2: Column spans
        text("Column Spans").font("Inter").size(18),
        text(".colSpan(2) and .colSpanFull()").font("JetBrains Mono").size(12),
        div()
          .grid()
          .gridCols(3)
          .gap(8)
          .children(
            div()
              .colSpanFull()
              .h(50)
              .rounded(8)
              .bg(pink)
              .itemsCenter()
              .justifyCenter()
              .child(text("Full Width (colSpanFull)").font("Inter").size(14)),
            div()
              .colSpan(2)
              .h(50)
              .rounded(8)
              .bg(blue)
              .itemsCenter()
              .justifyCenter()
              .child(text("Span 2").font("Inter").size(14)),
            div()
              .h(50)
              .rounded(8)
              .bg(green)
              .itemsCenter()
              .justifyCenter()
              .child(text("1").font("Inter").size(14)),
            div()
              .h(50)
              .rounded(8)
              .bg(orange)
              .itemsCenter()
              .justifyCenter()
              .child(text("1").font("Inter").size(14)),
            div()
              .colSpan(2)
              .h(50)
              .rounded(8)
              .bg(purple)
              .itemsCenter()
              .justifyCenter()
              .child(text("Span 2").font("Inter").size(14))
          ),

        // Example 3: Dashboard layout
        text("Dashboard Layout").font("Inter").size(18),
        text(".gridColsTemplate([200, '1fr', '1fr']) with rowSpan").font("JetBrains Mono").size(12),
        div()
          .grid()
          .gridColsTemplate([180, "1fr", "1fr"])
          .gridRows(3)
          .gap(8)
          .h(200)
          .children(
            // Header spans all columns
            div()
              .colSpanFull()
              .rounded(8)
              .bg({ r: 0.2, g: 0.2, b: 0.3, a: 1 })
              .itemsCenter()
              .justifyCenter()
              .child(text("Header").font("Inter").color({ r: 1, g: 1, b: 1, a: 1 }).size(14)),
            // Sidebar spans 2 rows
            div()
              .rowSpan(2)
              .rounded(8)
              .bg({ r: 0.15, g: 0.2, b: 0.25, a: 1 })
              .itemsCenter()
              .justifyCenter()
              .child(text("Sidebar").font("Inter").color({ r: 1, g: 1, b: 1, a: 1 }).size(14)),
            // Main content
            div()
              .colSpan(2)
              .rounded(8)
              .bg({ r: 0.25, g: 0.25, b: 0.35, a: 1 })
              .itemsCenter()
              .justifyCenter()
              .child(text("Main Content").font("Inter").color({ r: 1, g: 1, b: 1, a: 1 }).size(14)),
            // Footer spans remaining columns
            div()
              .colSpan(2)
              .rounded(8)
              .bg({ r: 0.2, g: 0.2, b: 0.3, a: 1 })
              .itemsCenter()
              .justifyCenter()
              .child(text("Footer").font("Inter").color({ r: 1, g: 1, b: 1, a: 1 }).size(14))
          ),

        // Example 4: 4-column grid with varied content
        text("4-Column Responsive Grid").font("Inter").size(18),
        text(".gridCols(4).gap(12)").font("JetBrains Mono").size(12),
        div()
          .grid()
          .gridCols(4)
          .gap(12)
          .children(
            div()
              .h(80)
              .rounded(8)
              .bg(red)
              .itemsCenter()
              .justifyCenter()
              .child(text("A").font("Inter").size(20).weight(700)),
            div()
              .h(80)
              .rounded(8)
              .bg(green)
              .itemsCenter()
              .justifyCenter()
              .child(text("B").font("Inter").size(20).weight(700)),
            div()
              .h(80)
              .rounded(8)
              .bg(blue)
              .itemsCenter()
              .justifyCenter()
              .child(text("C").font("Inter").size(20).weight(700)),
            div()
              .h(80)
              .rounded(8)
              .bg(purple)
              .itemsCenter()
              .justifyCenter()
              .child(text("D").font("Inter").size(20).weight(700)),
            div()
              .h(80)
              .rounded(8)
              .bg(orange)
              .itemsCenter()
              .justifyCenter()
              .child(text("E").font("Inter").size(20).weight(700)),
            div()
              .h(80)
              .rounded(8)
              .bg(teal)
              .itemsCenter()
              .justifyCenter()
              .child(text("F").font("Inter").size(20).weight(700)),
            div()
              .h(80)
              .rounded(8)
              .bg(pink)
              .itemsCenter()
              .justifyCenter()
              .child(text("G").font("Inter").size(20).weight(700)),
            div()
              .h(80)
              .rounded(8)
              .bg(yellow)
              .itemsCenter()
              .justifyCenter()
              .child(text("H").font("Inter").size(20).weight(700))
          ),

        // Example 5: Grid area placement
        text("Explicit Grid Placement").font("Inter").size(18),
        text(".gridCell(col, row) and .gridArea()").font("JetBrains Mono").size(12),
        div()
          .grid()
          .gridCols(4)
          .gridRows(3)
          .gap(8)
          .h(180)
          .children(
            // Large feature area
            div()
              .gridArea(1, 1, 3, 3)
              .rounded(8)
              .bg(blue)
              .itemsCenter()
              .justifyCenter()
              .child(text("Feature (2x2)").font("Inter").size(14)),
            // Side items
            div()
              .gridCell(3, 1)
              .rounded(8)
              .bg(green)
              .itemsCenter()
              .justifyCenter()
              .child(text("A").font("Inter").size(14)),
            div()
              .gridCell(4, 1)
              .rounded(8)
              .bg(orange)
              .itemsCenter()
              .justifyCenter()
              .child(text("B").font("Inter").size(14)),
            div()
              .gridCell(3, 2)
              .rounded(8)
              .bg(purple)
              .itemsCenter()
              .justifyCenter()
              .child(text("C").font("Inter").size(14)),
            div()
              .gridCell(4, 2)
              .rounded(8)
              .bg(pink)
              .itemsCenter()
              .justifyCenter()
              .child(text("D").font("Inter").size(14)),
            // Bottom row
            div()
              .colSpanFull()
              .rounded(8)
              .bg({ r: 0.3, g: 0.3, b: 0.4, a: 1 })
              .itemsCenter()
              .justifyCenter()
              .child(text("Bottom Bar (row 3)").font("Inter").size(14))
          )
      );
  }

  private renderCanvasDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Canvas Element").font("Inter").size(32),
        text("Direct access to low-level paint APIs without defining a custom element.")
          .font("Inter")
          .size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("Waveform + Bars via canvas()").font("Inter").size(18),
        canvas<CanvasWaveState>({
          styles: { width: "100%", height: 260, borderRadius: 12 },
          prepaint: (bounds: Bounds, _cx: PrepaintContext): CanvasWaveState => {
            const padding = 16;
            const barCount = 28;
            const startX = bounds.x + padding;
            const endX = bounds.x + bounds.width - padding;
            const baseY = bounds.y + bounds.height - padding;
            const amplitude = bounds.height * 0.55;

            const values = Array.from({ length: barCount }, (_v, i) => {
              const t = i / Math.max(1, barCount - 1);
              const sin1 = Math.sin(t * Math.PI * 2);
              const sin2 = Math.sin(t * Math.PI * 4 + 0.6);
              const envelope = Math.sin(t * Math.PI);
              const v = 0.55 + 0.35 * sin1 * envelope + 0.2 * sin2 * envelope;
              return Math.max(0.05, Math.min(1, v));
            });

            const wavePath = path();
            wavePath.moveTo(startX, baseY);
            values.forEach((value, idx) => {
              const x = startX + ((endX - startX) / Math.max(1, barCount - 1)) * idx;
              const y = baseY - value * amplitude;
              wavePath.lineTo(x, y);
            });
            wavePath.lineTo(endX, baseY);
            wavePath.close();

            const wave = wavePath.tessellate();
            return { values, padding, startX, endX, baseY, amplitude, wave };
          },
          paint: (cx, bounds, state: CanvasWaveState) => {
            const scene = cx.scene;
            const { values, padding, startX, endX, baseY, amplitude, wave } = state;

            scene.addRect({
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
              color: { r: 0.14, g: 0.14, b: 0.18, a: 1 },
              cornerRadius: 12,
              borderWidth: 1,
              borderColor: { r: 0.22, g: 0.22, b: 0.28, a: 1 },
            });

            const gridCount = 4;
            for (let i = 1; i <= gridCount; i++) {
              const y = bounds.y + (bounds.height / (gridCount + 1)) * i;
              scene.addRect({
                x: bounds.x + padding / 2,
                y,
                width: bounds.width - padding,
                height: 1,
                color: { r: 0.2, g: 0.25, b: 0.35, a: 0.4 },
                cornerRadius: 0,
                borderWidth: 0,
                borderColor: { r: 0, g: 0, b: 0, a: 0 },
              });
            }

            const barGap = 6;
            const barCount = values.length;
            const usableWidth = Math.max(0, endX - startX - barGap * (barCount - 1));
            const barWidth = Math.max(3, usableWidth / Math.max(1, barCount));

            values.forEach((value: number, idx: number) => {
              const x = startX + idx * (barWidth + barGap);
              const height = Math.max(6, amplitude * value);
              scene.addRect({
                x,
                y: baseY - height,
                width: barWidth,
                height,
                color: { r: 0.3, g: 0.78, b: 0.55, a: 0.9 },
                cornerRadius: Math.min(6, barWidth / 2),
                borderWidth: 0,
                borderColor: { r: 0, g: 0, b: 0, a: 0 },
              });
            });

            scene.addPath({
              vertices: wave.vertices,
              indices: wave.indices,
              bounds: wave.bounds,
              color: { r: 0.25, g: 0.68, b: 1, a: 0.8 },
            });
          },
        }),
        text(
          "canvas() feeds prepaint → paint so you can push custom primitives directly into the scene."
        )
          .font("Inter")
          .size(14)
      );
  }

  private renderShapesDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Shapes").font("Inter").size(32),
        text("Star, polygon, circle, heart, and arrow primitives rendered through vector paths.")
          .font("Inter")
          .size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("Large shapes (64px)").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .flexWrap()
          .children(
            pathShape("star", { r: 1, g: 0.8, b: 0.2, a: 1 }, 64),
            pathShape("polygon", { r: 0.3, g: 0.8, b: 1, a: 1 }, 64),
            pathShape("circle", { r: 0.9, g: 0.3, b: 0.5, a: 1 }, 64),
            pathShape("heart", { r: 1, g: 0.3, b: 0.4, a: 1 }, 64),
            pathShape("arrow", { r: 0.4, g: 0.9, b: 0.5, a: 1 }, 64)
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Small shapes (32px)").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(10)
          .flexWrap()
          .children(
            pathShape("star", { r: 0.9, g: 0.5, b: 0.9, a: 1 }, 32),
            pathShape("polygon", { r: 0.5, g: 0.9, b: 0.7, a: 1 }, 32),
            pathShape("circle", { r: 0.9, g: 0.7, b: 0.3, a: 1 }, 32),
            pathShape("heart", { r: 0.7, g: 0.3, b: 0.9, a: 1 }, 32),
            pathShape("arrow", { r: 0.3, g: 0.7, b: 0.9, a: 1 }, 32),
            pathShape("star", { r: 0.9, g: 0.4, b: 0.4, a: 1 }, 32),
            pathShape("polygon", { r: 0.4, g: 0.9, b: 0.4, a: 1 }, 32)
          )
      );
  }

  private renderVectorPathsDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Vector Path Rendering").font("Inter").size(32),
        text("GPU-accelerated vector graphics with tessellation").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("Large Shapes (64px)").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .flexWrap()
          .children(
            pathShape("star", { r: 1, g: 0.8, b: 0.2, a: 1 }, 64),
            pathShape("polygon", { r: 0.3, g: 0.8, b: 1, a: 1 }, 64),
            pathShape("circle", { r: 0.9, g: 0.3, b: 0.5, a: 1 }, 64),
            pathShape("heart", { r: 1, g: 0.3, b: 0.4, a: 1 }, 64),
            pathShape("arrow", { r: 0.4, g: 0.9, b: 0.5, a: 1 }, 64)
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Small Shapes (32px)").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(8)
          .flexWrap()
          .children(
            pathShape("star", { r: 0.9, g: 0.5, b: 0.9, a: 1 }, 32),
            pathShape("polygon", { r: 0.5, g: 0.9, b: 0.7, a: 1 }, 32),
            pathShape("circle", { r: 0.9, g: 0.7, b: 0.3, a: 1 }, 32),
            pathShape("heart", { r: 0.7, g: 0.3, b: 0.9, a: 1 }, 32),
            pathShape("arrow", { r: 0.3, g: 0.7, b: 0.9, a: 1 }, 32),
            pathShape("star", { r: 0.9, g: 0.4, b: 0.4, a: 1 }, 32),
            pathShape("polygon", { r: 0.4, g: 0.9, b: 0.4, a: 1 }, 32)
          )
      );
  }

  private renderBorderStylesDemo(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Border Styles").font("Inter").size(32),
        text("Solid and dashed border rendering").font("Inter").size(16),
        div().h(1).bg(theme.border),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .flexWrap()
          .children(
            div()
              .w(80)
              .h(60)
              .rounded(8)
              .border(2)
              .borderColor({ r: 0.3, g: 0.8, b: 1, a: 1 })
              .borderSolid()
              .flex()
              .itemsCenter()
              .justifyCenter()
              .child(text("Solid").font("Inter").size(12)),
            div()
              .w(80)
              .h(60)
              .rounded(8)
              .border(2)
              .borderColor({ r: 1, g: 0.5, b: 0.3, a: 1 })
              .borderDashed()
              .flex()
              .itemsCenter()
              .justifyCenter()
              .child(text("Dashed").font("Inter").size(12)),
            div()
              .w(100)
              .h(60)
              .rounded(12)
              .border(3)
              .borderColor({ r: 0.9, g: 0.3, b: 0.6, a: 1 })
              .borderDashed()
              .borderDashLength(12)
              .borderGapLength(6)
              .flex()
              .itemsCenter()
              .justifyCenter()
              .child(text("Custom").font("Inter").size(12)),
            div()
              .w(60)
              .h(60)
              .border(2)
              .borderColor({ r: 0.5, g: 1, b: 0.5, a: 1 })
              .borderSolid()
              .flex()
              .itemsCenter()
              .justifyCenter()
              .child(text("■").font("Inter").size(16)),
            div()
              .w(60)
              .h(60)
              .border(2)
              .borderColor({ r: 1, g: 0.8, b: 0.2, a: 1 })
              .borderDashed()
              .borderDashLength(8)
              .borderGapLength(4)
              .flex()
              .itemsCenter()
              .justifyCenter()
              .child(text("▢").font("Inter").size(16))
          ),
        text("Thickness").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .flexWrap()
          .children(
            div()
              .w(80)
              .h(60)
              .rounded(8)
              .border(1)
              .borderColor({ r: 0.35, g: 0.75, b: 1, a: 1 })
              .flex()
              .itemsCenter()
              .justifyCenter()
              .child(text("1px").font("Inter").size(12)),
            div()
              .w(80)
              .h(60)
              .rounded(8)
              .border(2)
              .borderColor({ r: 0.62, g: 0.86, b: 0.44, a: 1 })
              .flex()
              .itemsCenter()
              .justifyCenter()
              .child(text("2px").font("Inter").size(12)),
            div()
              .w(80)
              .h(60)
              .rounded(8)
              .border(4)
              .borderColor({ r: 0.98, g: 0.69, b: 0.27, a: 1 })
              .flex()
              .itemsCenter()
              .justifyCenter()
              .child(text("4px").font("Inter").size(12))
          )
      );
  }

  private renderPngImagesDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("PNG Image Rendering").font("Inter").size(32),
        text("PNG decoding with GPU-accelerated rendering and effects").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .flexWrap()
          .children(
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                img(demoImageTile!).size(150, 100),
                text("Original").font("Inter").size(11)
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                img(demoImageTile!).size(150, 100).rounded(16),
                text("Rounded").font("Inter").size(11)
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                img(demoImageTile!).size(150, 100).grayscale(),
                text("Grayscale").font("Inter").size(11)
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                img(demoImageTile!).size(150, 100).opacity(0.5),
                text("50% Opacity").font("Inter").size(11)
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                img(demoImageTile!).size(100, 100).rounded(50),
                text("Circle").font("Inter").size(11)
              )
          )
      );
  }

  private renderJpgImagesDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("JPEG Image Rendering").font("Inter").size(32),
        text("JPEG decoding with GPU-accelerated rendering and effects").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .flexWrap()
          .children(
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                img(flowerImageTile!).size(150, 100),
                text("Original").font("Inter").size(11)
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                img(flowerImageTile!).size(150, 100).rounded(16),
                text("Rounded").font("Inter").size(11)
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                img(flowerImageTile!).size(150, 100).grayscale(),
                text("Grayscale").font("Inter").size(11)
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                img(flowerImageTile!).size(100, 100).rounded(50),
                text("Circle").font("Inter").size(11)
              )
          )
      );
  }

  private renderImagesDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Images").font("Inter").size(32),
        text("PNG + JPG decoding with GPU filters, rounding, and effects.").font("Inter").size(16),
        this.renderPngImagesDemo(),
        div().h(1).bg({ r: 0.34, g: 0.36, b: 0.44, a: 0.6 }),
        this.renderJpgImagesDemo()
      );
  }

  private renderVirtualScrollingDemo(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Virtual Scrolling").font("Inter").size(32),
        text("Efficient rendering of large lists with fixed and variable height items")
          .font("Inter")
          .size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .h(400)
          .children(
            div()
              .flex()
              .flexCol()
              .flex1()
              .gap(8)
              .children(
                text("UniformList (1000 items, 40px each)").font("Inter").size(13),
                uniformList<number>((item, props, _cx) =>
                  div()
                    .h(36)
                    .px(12)
                    .bg(
                      props.index % 2 === 0
                        ? { r: 0.15, g: 0.15, b: 0.2, a: 1 }
                        : { r: 0.12, g: 0.12, b: 0.16, a: 1 }
                    )
                    .rounded(4)
                    .flex()
                    .itemsCenter()
                    .justifyBetween()
                    .children(
                      text(`Item ${item}`)
                        .font("Inter")
                        .size(13)
                        .color({ r: 0.8, g: 0.8, b: 0.9, a: 1 }),
                      text(`#${props.index}`)
                        .font("JetBrains Mono")
                        .size(11)
                        .color({ r: 0.5, g: 0.5, b: 0.6, a: 1 })
                    )
                )
                  .data(Array.from({ length: 1000 }, (_, i) => i + 1))
                  .itemSize(40)
                  .setOverdraw(3)
                  .trackScroll(this.uniformListScrollHandle!)
                  .setContext(cx)
                  .flex1()
                  .bg({ r: 0.1, g: 0.1, b: 0.13, a: 1 })
                  .rounded(8)
                  .p(4)
              ),
            div()
              .flex()
              .flexCol()
              .flex1()
              .gap(8)
              .children(
                text("List (500 items, variable height)").font("Inter").size(13),
                list<{ id: number; lines: number }>(
                  (item, props, _cx) =>
                    div()
                      .hMin(30)
                      .px(12)
                      .py(8)
                      .bg(
                        props.index % 2 === 0
                          ? { r: 0.13, g: 0.17, b: 0.15, a: 1 }
                          : { r: 0.1, g: 0.14, b: 0.12, a: 1 }
                      )
                      .rounded(4)
                      .flex()
                      .flexCol()
                      .gap(4)
                      .children(
                        div()
                          .flex()
                          .flexRow()
                          .justifyBetween()
                          .children(
                            text(`Message ${item.id}`)
                              .font("Inter")
                              .size(13)
                              .color({ r: 0.8, g: 0.9, b: 0.8, a: 1 }),
                            text(`${item.lines} line${item.lines > 1 ? "s" : ""}`)
                              .font("JetBrains Mono")
                              .size(10)
                              .color({ r: 0.5, g: 0.6, b: 0.5, a: 1 })
                          ),
                        ...Array.from({ length: item.lines }, (_, i) =>
                          text(`Line ${i + 1} of content for message ${item.id}`)
                            .font("Inter")
                            .size(11)
                            .color({ r: 0.6, g: 0.7, b: 0.6, a: 1 })
                        )
                      ),
                  this.variableListState!
                )
                  .data(
                    Array.from({ length: 500 }, (_, i) => ({
                      id: i + 1,
                      lines: 1 + (i % 4),
                    }))
                  )
                  .estimatedItemHeight(60)
                  .setOverdraw(3)
                  .setContext(cx)
                  .flex1()
                  .bg({ r: 0.08, g: 0.11, b: 0.09, a: 1 })
                  .rounded(8)
                  .p(4)
              )
          )
      );
  }

  private renderScrollbarsDemo(cx: FlashViewContext<this>): FlashDiv {
    // Initialize scroll handles if needed
    if (!this.scrollbarDemoHandle1) {
      this.scrollbarDemoHandle1 = cx.newScrollHandle(cx.windowId);
    }
    if (!this.scrollbarDemoHandle2) {
      this.scrollbarDemoHandle2 = cx.newScrollHandle(cx.windowId);
    }
    if (!this.scrollbarDemoHandle3) {
      this.scrollbarDemoHandle3 = cx.newScrollHandle(cx.windowId);
    }

    // Generate sample content items for scrollable areas
    const sampleItems = Array.from({ length: 30 }, (_, i) => `Item ${i + 1}: Sample content line`);

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Scrollbars").font("Inter").size(32),
        text("Draggable scrollbars with visual scroll position indication").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),

        // Row with multiple scrollbar demos
        div()
          .flex()
          .flexRow()
          .gap(24)
          .children(
            // Default scrollbar (auto visibility)
            div()
              .flex()
              .flexCol()
              .gap(8)
              .children(
                text("Default (Auto)").font("Inter").size(14),
                text("Scrollbar appears when content overflows").font("Inter").size(12),
                div()
                  .w(220)
                  .h(200)
                  .bg({ r: 0.12, g: 0.12, b: 0.16, a: 1 })
                  .rounded(8)
                  .border(1)
                  .borderColor({ r: 0.25, g: 0.25, b: 0.3, a: 1 })
                  .overflowAuto()
                  .trackScroll(this.scrollbarDemoHandle1)
                  .p(8)
                  .flex()
                  .flexCol()
                  .gap(4)
                  .children(
                    ...sampleItems.map((item) =>
                      div()
                        .h(20)
                        .flexShrink0()
                        .child(
                          text(item).font("Inter").size(12).color({ r: 0.8, g: 0.8, b: 0.9, a: 1 })
                        )
                    )
                  )
              ),

            // Always visible scrollbar
            div()
              .flex()
              .flexCol()
              .gap(8)
              .children(
                text("Always Visible").font("Inter").size(14),
                text("Scrollbar is always shown").font("Inter").size(12),
                div()
                  .w(220)
                  .h(200)
                  .bg({ r: 0.12, g: 0.12, b: 0.16, a: 1 })
                  .rounded(8)
                  .border(1)
                  .borderColor({ r: 0.25, g: 0.25, b: 0.3, a: 1 })
                  .overflowScroll()
                  .trackScroll(this.scrollbarDemoHandle2)
                  .scrollbarAlways()
                  .p(8)
                  .flex()
                  .flexCol()
                  .gap(4)
                  .children(
                    ...sampleItems.map((item) =>
                      div()
                        .h(20)
                        .flexShrink0()
                        .child(
                          text(item).font("Inter").size(12).color({ r: 0.8, g: 0.8, b: 0.9, a: 1 })
                        )
                    )
                  )
              ),

            // Custom styled scrollbar
            div()
              .flex()
              .flexCol()
              .gap(8)
              .children(
                text("Custom Style").font("Inter").size(14),
                text("Custom colors and width").font("Inter").size(12),
                div()
                  .w(220)
                  .h(200)
                  .bg({ r: 0.12, g: 0.12, b: 0.16, a: 1 })
                  .rounded(8)
                  .border(1)
                  .borderColor({ r: 0.25, g: 0.25, b: 0.3, a: 1 })
                  .overflowAuto()
                  .trackScroll(this.scrollbarDemoHandle3)
                  .scrollbar({
                    width: 12,
                    thumbColor: { r: 0.4, g: 0.6, b: 0.9, a: 0.8 },
                    thumbHoverColor: { r: 0.5, g: 0.7, b: 1, a: 0.9 },
                    thumbActiveColor: { r: 0.6, g: 0.8, b: 1, a: 1 },
                    trackColor: { r: 0.15, g: 0.15, b: 0.2, a: 0.5 },
                  })
                  .scrollbarAlways()
                  .p(8)
                  .flex()
                  .flexCol()
                  .gap(4)
                  .children(
                    ...sampleItems.map((item) =>
                      div()
                        .h(20)
                        .flexShrink0()
                        .child(
                          text(item).font("Inter").size(12).color({ r: 0.8, g: 0.8, b: 0.9, a: 1 })
                        )
                    )
                  )
              )
          ),

        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),

        // Interaction instructions
        div()
          .flex()
          .flexCol()
          .gap(8)
          .children(
            text("Interactions:").font("Inter").size(14),
            text("• Scroll with mouse wheel or trackpad").font("Inter").size(12),
            text("• Drag the scrollbar thumb to scroll").font("Inter").size(12),
            text("• Click the track to jump to that position").font("Inter").size(12),
            text("• Hover over scrollbar for highlight effect").font("Inter").size(12)
          )
      );
  }

  private renderDeferredAnchoredDemo(cx: FlashViewContext<this>): FlashDiv {
    const corners: Array<"top-left" | "top-right" | "bottom-left" | "bottom-right"> = [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ];

    const popupContent = div()
      .w(200)
      .rounded(8)
      .bg({ r: 1, g: 1, b: 1, a: 1 })
      .border(1)
      .borderColor({ r: 0.4, g: 0.4, b: 0.6, a: 1 })
      .shadowLg()
      .p(12)
      .flex()
      .flexCol()
      .gap(8)
      .children(
        text("Popup Menu").font("Inter").size(14).weight(600),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        div()
          .h(32)
          .px(8)
          .rounded(4)
          .cursorPointer()
          .hover((s) => s.bg({ r: 0.9, g: 0.9, b: 0.9, a: 1 }))
          .flex()
          .itemsCenter()
          .child(text("Option 1").font("Inter").size(13)),
        div()
          .h(32)
          .px(8)
          .rounded(4)
          .cursorPointer()
          .hover((s) => s.bg({ r: 0.9, g: 0.9, b: 0.9, a: 1 }))
          .flex()
          .itemsCenter()
          .child(text("Option 2").font("Inter").size(13)),
        div()
          .h(32)
          .px(8)
          .rounded(4)
          .cursorPointer()
          .hover((s) => s.bg({ r: 0.9, g: 0.9, b: 0.9, a: 1 }))
          .flex()
          .itemsCenter()
          .onClick(
            cx.listener((view, _event, _window, ecx) => {
              view.popupVisible = false;
              ecx.notify();
            })
          )
          .child(text("Close Menu").font("Inter").size(13))
      );

    const deferredPopup = this.popupVisible
      ? deferred(
          anchored()
            .anchor(this.popupAnchorCorner)
            .position(this.popupPosition)
            .offset({ x: 8, y: 8 })
            .snapToWindowWithMargin(16)
            .setWindowSize({ width: cx.window.width, height: cx.window.height })
            .child(popupContent)
        ).priority(1)
      : null;

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("Deferred & Anchored Elements").font("Inter").size(32),
        text("Floating overlays with intelligent positioning").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .children(
            text("Anchor Corner Selection").font("Inter").size(14),
            div()
              .flex()
              .flexRow()
              .gap(8)
              .flexWrap()
              .children(
                ...corners.map((corner) =>
                  div()
                    .h(36)
                    .px(12)
                    .bg(
                      this.popupAnchorCorner === corner
                        ? rgb(0x6366f1)
                        : { r: 0.2, g: 0.2, b: 0.28, a: 1 }
                    )
                    .rounded(6)
                    .cursorPointer()
                    .hover((s) => s.bg(rgb(0x4f46e5)))
                    .flex()
                    .itemsCenter()
                    .onClick(
                      cx.listener((view, _event, _window, ecx) => {
                        view.popupAnchorCorner = corner;
                        ecx.notify();
                      })
                    )
                    .child(text(corner).font("Inter").size(12))
                )
              )
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .children(
            text("Click area to position popup").font("Inter").size(14),
            div()
              .h(300)
              .rounded(8)
              .border(2)
              .borderColor({ r: 0.3, g: 0.3, b: 0.4, a: 0.8 })
              .borderDashed()
              .cursorPointer()
              .flex()
              .itemsCenter()
              .justifyCenter()
              .onClick(
                cx.listener((view, event, _window, ecx) => {
                  view.popupPosition = { x: event.x, y: event.y };
                  view.popupVisible = true;
                  ecx.notify();
                })
              )
              .child(
                this.popupVisible
                  ? text(
                      `Popup anchored at (${Math.round(this.popupPosition.x)}, ${Math.round(this.popupPosition.y)})`
                    )
                      .font("Inter")
                      .size(14)
                  : text("Click anywhere to show anchored popup").font("Inter").size(14)
              )
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .children(
            text("Features:").font("Inter").size(14),
            text("• Deferred elements paint after normal content (always on top)")
              .font("Inter")
              .size(12),
            text("• Anchored elements position relative to a point").font("Inter").size(12),
            text("• Smart overflow handling: switch anchor or snap to edges")
              .font("Inter")
              .size(12),
            text("• Perfect for menus, tooltips, dropdowns, autocomplete").font("Inter").size(12)
          ),
        deferredPopup
      );
  }

  private renderSvgIconsDemo(): FlashDiv {
    const iconEntries = Object.entries(SvgIcons) as Array<[string, string]>;

    const customSvg = `
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="currentColor"/>
        <rect x="30" y="45" width="40" height="10" fill="currentColor"/>
        <rect x="45" y="30" width="10" height="40" fill="currentColor"/>
      </svg>
    `;

    const complexSvg = `
      <svg viewBox="0 0 24 24">
        <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
      </svg>
    `;

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children(
        text("SVG Icon Rendering").font("Inter").size(32),
        text("Material Design icons with color tinting and sizing").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("Built-in Icons (24x24)").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .flexWrap()
          .children(
            ...iconEntries.slice(0, 12).map(([name, pathData]) =>
              div()
                .flex()
                .flexCol()
                .gap(4)
                .itemsCenter()
                .children(
                  div()
                    .w(48)
                    .h(48)
                    .rounded(8)
                    .flex()
                    .itemsCenter()
                    .justifyCenter()
                    .child(svg(pathData).size(24, 24)),
                  text(name).font("Inter").size(10)
                )
            )
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Color Tinting").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .flexWrap()
          .children(
            svg(SvgIcons.star).color({ r: 1, g: 0.84, b: 0, a: 1 }).size(32, 32),
            svg(SvgIcons.heart).color({ r: 1, g: 0.3, b: 0.4, a: 1 }).size(32, 32),
            svg(SvgIcons.check).color({ r: 0.3, g: 0.9, b: 0.4, a: 1 }).size(32, 32),
            svg(SvgIcons.close).color({ r: 1, g: 0.4, b: 0.4, a: 1 }).size(32, 32),
            svg(SvgIcons.info).color({ r: 0.3, g: 0.7, b: 1, a: 1 }).size(32, 32),
            svg(SvgIcons.warning).color({ r: 1, g: 0.8, b: 0.2, a: 1 }).size(32, 32),
            svg(SvgIcons.error).color({ r: 1, g: 0.3, b: 0.3, a: 1 }).size(32, 32),
            svg(SvgIcons.settings).color({ r: 0.7, g: 0.5, b: 1, a: 1 }).size(32, 32)
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Size Variations").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .itemsEnd()
          .children(
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(svg(SvgIcons.home).size(16, 16), text("16px").font("Inter").size(10)),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(svg(SvgIcons.home).size(24, 24), text("24px").font("Inter").size(10)),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(svg(SvgIcons.home).size(32, 32), text("32px").font("Inter").size(10)),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(svg(SvgIcons.home).size(48, 48), text("48px").font("Inter").size(10)),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(svg(SvgIcons.home).size(64, 64), text("64px").font("Inter").size(10))
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Embedded SVG File (gear.svg)").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .itemsCenter()
          .children(
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                svg(gearSvgContent).color({ r: 0.9, g: 0.9, b: 1, a: 1 }).size(32, 32),
                text("32px").font("Inter").size(10)
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                svg(gearSvgContent).color({ r: 1, g: 0.6, b: 0.2, a: 1 }).size(48, 48),
                text("48px Orange").font("Inter").size(10)
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                svg(gearSvgContent).color({ r: 0.4, g: 0.8, b: 1, a: 1 }).size(64, 64),
                text("64px Blue").font("Inter").size(10)
              )
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Custom SVG Content").font("Inter").size(18),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .itemsCenter()
          .children(
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                svg(customSvg).color({ r: 0.4, g: 0.8, b: 1, a: 1 }).size(48, 48),
                text("Custom").font("Inter").size(10)
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children(
                svg(complexSvg).color({ r: 1, g: 0.7, b: 0.2, a: 1 }).size(48, 48),
                text("Star Path").font("Inter").size(10)
              )
          ),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .mt(8)
          .children(
            text("Features:").font("Inter").size(14),
            text("• Parse SVG path d attribute commands (M, L, C, Q, A, Z, etc.)")
              .font("Inter")
              .size(12),
            text("• Convert to Flash PathBuilder for GPU rendering").font("Inter").size(12),
            text("• Support relative and absolute coordinates").font("Inter").size(12),
            text("• Parse basic SVG elements: path, circle, rect, polygon").font("Inter").size(12),
            text("• Color tinting and arbitrary sizing").font("Inter").size(12)
          )
      );
  }

  private renderClipboardDemo(cx: FlashViewContext<this>): FlashDiv {
    const clipboard = cx.window.getClipboard();
    const capabilityText = clipboard.isSupported
      ? `Read ${clipboard.supportsReadText ? "enabled" : "blocked"} • Write ${clipboard.supportsWriteText ? "enabled" : "blocked"}`
      : "Clipboard unavailable in this runtime.";
    const lastText =
      this.clipboardLastText === null
        ? "No clipboard text captured yet."
        : this.clipboardLastText.length > 0
          ? this.clipboardLastText
          : "(empty clipboard)";

    const copyHandler = cx.listener((_view, _event, _window, ecx) => {
      if (!clipboard.supportsWriteText) {
        this.clipboardStatus = "Clipboard write is not available.";
        ecx.notify();
        return;
      }

      const sample = `${this.clipboardSample} (${new Date().toLocaleTimeString()})`;
      clipboard
        .writeText(sample)
        .then(() => {
          this.clipboardStatus = `Copied sample (${sample.length} chars) to the system clipboard.`;
          this.clipboardLastText = sample;
          ecx.notify();
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : "Clipboard write failed.";
          this.clipboardStatus = message;
          ecx.notify();
        });
    });

    const pasteHandler = cx.listener((_view, _event, _window, ecx) => {
      this.clipboardStatus = "Attempting to paste from system clipboard...";
      ecx.notify();

      let completed = false;
      const timeoutId = setTimeout(() => {
        if (completed) {
          return;
        }
        completed = true;
        this.clipboardStatus = "Paste timed out; no data received.";
        this.clipboardLastText = "";
        ecx.notify();
      }, 500);

      if (!clipboard.supportsReadText) {
        clearTimeout(timeoutId);
        this.clipboardStatus = "Clipboard read is not available.";
        ecx.notify();
        return;
      }

      clipboard
        .readText()
        .then((value) => {
          if (completed) {
            return;
          }
          completed = true;
          clearTimeout(timeoutId);
          this.clipboardStatus = `Read ${value.length} chars from the system clipboard.`;
          this.clipboardLastText = value;
          ecx.notify();
        })
        .catch((error) => {
          if (completed) {
            return;
          }
          completed = true;
          clearTimeout(timeoutId);
          const message = error instanceof Error ? error.message : "Clipboard read failed.";
          this.clipboardStatus = message;
          ecx.notify();
        });
    });

    return div()
      .flex()
      .flexCol()
      .gap(14)
      .keyContext("clipboard-demo")
      .children(
        text("Clipboard").font("Inter").size(26),
        text("Cross-platform copy/paste powered by platform clipboards.").font("Inter").size(14),
        div()
          .flex()
          .flexCol()
          .gap(6)
          .rounded(10)
          .border(1)
          .borderColor({ r: 0.25, g: 0.28, b: 0.38, a: 1 })
          .p(12)
          .children(
            text("Capabilities").font("Inter").size(13),
            text(capabilityText).font("Inter").size(12)
          ),
        div()
          .flex()
          .flexCol()
          .gap(6)
          .rounded(12)
          .p(14)
          .border(1)
          .borderColor({ r: 0.23, g: 0.25, b: 0.34, a: 1 })
          .children(
            text("Sample to copy").font("Inter").size(13),
            text(this.clipboardSample).font("Inter").size(16)
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .children(
            div()
              .flex()
              .itemsCenter()
              .justifyCenter()
              .bg(rgb(0x2563eb))
              .rounded(10)
              .h(44)
              .px(16)
              .cursorPointer()
              .hover((s) => s.bg(rgb(0x1d4ed8)))
              .active((s) => s.bg(rgb(0x1e40af)))
              .onClick(copyHandler)
              .child(text("Copy sample").font("Inter").size(14).color({ r: 1, g: 1, b: 1, a: 1 })),
            div()
              .flex()
              .itemsCenter()
              .justifyCenter()
              .bg(rgb(0x22c55e))
              .rounded(10)
              .h(44)
              .px(16)
              .cursorPointer()
              .hover((s) => s.bg(rgb(0x16a34a)))
              .active((s) => s.bg(rgb(0x15803d)))
              .onClick(pasteHandler)
              .child(
                text("Paste from system").font("Inter").size(14).color({ r: 1, g: 1, b: 1, a: 1 })
              )
          ),
        div()
          .flex()
          .flexCol()
          .gap(6)
          .rounded(12)
          .p(14)
          .border(1)
          .borderColor({ r: 0.2, g: 0.22, b: 0.32, a: 1 })
          .children(
            text("Last clipboard text").font("Inter").size(13),
            text(lastText).font("Inter").size(15)
          ),
        text(this.clipboardStatus).font("Inter").size(13)
      );
  }

  private renderTextSelectionDemo(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();

    return div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Selection").font("Inter").size(26),
        text("Standard selectable text and cross-element selection in one view.")
          .font("Inter")
          .size(14),
        div()
          .flex()
          .flexCol()
          .gap(10)
          .bg(theme.surface)
          .rounded(12)
          .p(14)
          .border(1)
          .borderColor(theme.border)
          .children(
            text("Single element selection").font("Inter").size(15).weight(600),
            text(
              "Click and drag to select inside this paragraph. Double-click selects words; triple-click selects the full line."
            )
              .font("Inter")
              .size(14)
              .lineHeight(22)
              .selectable(),
            text("Selection respects the same color + underline styles as text inputs.")
              .font("Inter")
              .size(13)
              .selectable()
          ),
        div().h(1).bg(theme.border),
        this.renderCrossElementSelectionDemo(cx)
      );
  }

  private renderCrossElementSelectionDemo(cx: FlashViewContext<this>): FlashDiv {
    const theme = cx.getTheme();

    return div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Cross-Element Text Selection").font("Inter").size(26),
        text("Select text across multiple paragraphs by clicking and dragging.")
          .font("Inter")
          .size(14),
        div()
          .flex()
          .flexCol()
          .gap(16)
          .bg(theme.surface)
          .rounded(12)
          .p(20)
          .border(1)
          .borderColor(theme.border)
          .children(
            text(
              "First paragraph: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
            )
              .font("Inter")
              .size(16)
              .lineHeight(24)
              .selectable(),
            text(
              "Second paragraph: Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
            )
              .font("Inter")
              .size(16)
              .lineHeight(24)
              .selectable(),
            text(
              "Third paragraph: Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."
            )
              .font("Inter")
              .size(16)
              .lineHeight(24)
              .selectable(),
            text("Non-selectable text (should be skipped in selection).")
              .font("Inter")
              .size(16)
              .lineHeight(24),
            text(
              "Fourth paragraph: Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
            )
              .font("Inter")
              .size(16)
              .lineHeight(24)
              .selectable(),
            text(
              "Fifth paragraph: Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores."
            )
              .font("Inter")
              .size(16)
              .lineHeight(24)
              .selectable()
          ),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .bg(theme.surfaceMuted)
          .rounded(10)
          .p(14)
          .border(1)
          .borderColor(theme.border)
          .children(
            text("Try:").font("Inter").size(14).weight(600),
            text("• Click and drag to select text across paragraphs").font("Inter").size(13),
            text("• Cmd+C to copy selected text to clipboard").font("Inter").size(13),
            text("• Cmd+A to select all text in all selectable elements").font("Inter").size(13),
            text("• Notice non-selectable text is skipped").font("Inter").size(13),
            text("• Selected text is joined with newlines when copied").font("Inter").size(13)
          )
      );
  }

  private renderWebGPUDemosSection(cx: FlashViewContext<this>): FlashDiv {
    const window = cx.window;
    const device = window.getDevice();
    const format = window.getFormat();

    // Lazy init all hosts
    if (!this.hexagonHost) {
      this.hexagonHost = createHexagonHost(device, format, 500, 400);
    }
    if (!this.metaballHost) {
      this.metaballHost = createMetaballHost(device, format, 500, 400);
    }
    if (!this.particleHost) {
      this.particleHost = createParticleHost(device, format, 500, 400);
    }
    if (!this.raymarchHost) {
      this.raymarchHost = createRaymarchHost(device, format, 500, 400);
    }
    if (!this.terrainHost) {
      this.terrainHost = createTerrainHost(device, format, 500, 400);
    }
    if (!this.galaxyHost) {
      this.galaxyHost = createGalaxyHost(device, format, 500, 400);
    }

    const labelColor = { r: 0.7, g: 0.75, b: 0.85, a: 1 };
    const dimColor = { r: 0.5, g: 0.55, b: 0.65, a: 1 };

    // Demo metadata
    const demos = [
      { id: "hexagon" as const, label: "Hexagon", desc: "Animated hexagon with mouse interaction" },
      { id: "metaball" as const, label: "Metaball", desc: "Organic blob simulation" },
      { id: "particle" as const, label: "Particle", desc: "Orbiting particle system" },
      { id: "raymarch" as const, label: "Raymarch", desc: "3D raymarched scene" },
      { id: "terrain" as const, label: "Terrain", desc: "Procedural terrain flyover" },
      { id: "galaxy" as const, label: "Galaxy", desc: "Particle physics with compute shaders" },
    ];

    // Get current host
    const currentHost = (() => {
      switch (this.selectedWebGPUDemo) {
        case "hexagon":
          return this.hexagonHost;
        case "metaball":
          return this.metaballHost;
        case "particle":
          return this.particleHost;
        case "raymarch":
          return this.raymarchHost;
        case "terrain":
          return this.terrainHost;
        case "galaxy":
          return this.galaxyHost;
      }
    })();

    const currentDemo = demos.find((d) => d.id === this.selectedWebGPUDemo);

    // Selector button builder
    const selectorButton = (demo: (typeof demos)[number]) => {
      const isSelected = this.selectedWebGPUDemo === demo.id;
      return div()
        .flex()
        .flexCol()
        .gap(4)
        .p(10)
        .bg(isSelected ? { r: 0.25, g: 0.3, b: 0.4, a: 1 } : { r: 0.12, g: 0.14, b: 0.18, a: 1 })
        .rounded(3)
        .border(2)
        .borderColor(
          isSelected ? { r: 0.4, g: 0.5, b: 0.7, a: 1 } : { r: 0.3, g: 0.3, b: 0.4, a: 0.5 }
        )
        .onMouseDown(() => {
          this.selectedWebGPUDemo = demo.id;
          cx.notify();
        })
        .children(
          text(demo.label)
            .font("Inter")
            .size(14)
            .weight(isSelected ? 600 : 400)
            .color({ r: 1, g: 1, b: 1, a: 1 }),
          text(demo.desc).font("Inter").size(11).color(dimColor)
        );
    };

    return div()
      .flex()
      .flexCol()
      .gap(24)
      .children(
        text("WebGPU Demos").font("Inter").size(28),
        text("Custom WebGPU rendering embedded within Flash UI layout").font("Inter").size(16),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        // Main content: demo view + selector grid
        div()
          .flex()
          .flexRow()
          .gap(24)
          .children(
            // Current demo display
            div()
              .flex()
              .flexCol()
              .gap(8)
              .children(
                webgpuHost(currentHost!, 500, 400).rounded(12),
                text(currentDemo?.label ?? "")
                  .font("Inter")
                  .size(16)
                  .weight(600),
                text(currentDemo?.desc ?? "")
                  .font("Inter")
                  .size(13)
                  .color(dimColor)
              ),
            // Selector grid
            div()
              .flex()
              .flexCol()
              .gap(12)
              .children(
                text("Select Demo").font("Inter").size(14).weight(600),
                div()
                  .grid()
                  .gridCols(2)
                  .gap(8)
                  .children(...demos.map(selectorButton))
              )
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .p(16)
          .bg({ r: 0.12, g: 0.14, b: 0.18, a: 1 })
          .rounded(8)
          .children(
            text("How it works")
              .font("Inter")
              .size(16)
              .weight(600)
              .color({ r: 1, g: 1, b: 1, a: 1 }),
            text("Each demo implements the WebGPUHost interface and renders to its own texture.")
              .font("Inter")
              .size(13)
              .color(labelColor),
            text("Flash samples these textures during its render pass, enabling full compositing.")
              .font("Inter")
              .size(13)
              .color(labelColor),
            text("Mouse coordinates are automatically transformed to local demo space.")
              .font("Inter")
              .size(13)
              .color(labelColor)
          )
      );
  }

  private renderFocusDemo(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Focus").font("Inter").size(30),
        text("Keyboard traversal across toolbars, groups, and modal dialogs.")
          .font("Inter")
          .size(16),
        this.renderFocusNavigationDemo(cx)
      );
  }

  private renderFocusNavigationDemo(cx: FlashViewContext<this>): FlashDiv {
    this.ensureFocusDemoHandles(cx);
    this.registerFocusDemoActions(cx);

    if (
      !this.focusPrimaryHandle ||
      !this.focusSecondaryHandle ||
      !this.focusDangerHandle ||
      this.toolbarHandles.length === 0 ||
      !this.toolbarContainerHandle ||
      !this.modalTriggerHandle ||
      !this.modalPrimaryHandle ||
      !this.modalCloseHandle
    ) {
      return div();
    }

    const [toolbarA, toolbarB, toolbarC] = this.toolbarHandles;
    if (!toolbarA || !toolbarB || !toolbarC) {
      return div();
    }

    const contextChain = cx.window.getKeyContextChain();
    const contextLabel = contextChain.length > 0 ? contextChain.join(" > ") : "None";

    const focusEntries: Array<{ handle: FocusHandle; label: string }> = [
      { handle: this.focusPrimaryHandle, label: "Primary" },
      { handle: this.focusSecondaryHandle, label: "Secondary" },
      { handle: this.focusDangerHandle, label: "Destructive" },
      { handle: toolbarA, label: "Toolbar 1" },
      { handle: toolbarB, label: "Toolbar 2" },
      { handle: toolbarC, label: "Toolbar 3" },
      { handle: this.modalTriggerHandle, label: "Modal Trigger" },
      { handle: this.modalPrimaryHandle, label: "Modal Confirm" },
      { handle: this.modalCloseHandle, label: "Modal Close" },
    ];
    const focusedLabel = focusEntries.find((entry) => cx.isFocused(entry.handle))?.label ?? "None";

    const focusButton = (
      label: string,
      handle: FocusHandle,
      color: number,
      hoverColor: number,
      tabIndex: number,
      options?: {
        group?: string;
        focusOnPress?: boolean;
        keyContext?: string;
        onClickMessage?: string;
      }
    ): FlashDiv => {
      let button = div()
        .h(44)
        .px(16)
        .rounded(10)
        .bg(rgb(color))
        .border(2)
        .borderColor({ r: 1, g: 1, b: 1, a: 0.1 })
        .cursorPointer()
        .hover((s) => s.bg(rgb(hoverColor)).shadow("md"))
        .active((s) => s.bg(rgb(color)))
        .focused((s) => s.borderColor(rgb(0xfcd34d)).shadow("lg"))
        .flex()
        .itemsCenter()
        .justifyCenter()
        .trackFocus(handle)
        .tabStop({ index: tabIndex });
      if (options?.group) {
        button = button.focusGroup(options.group);
      }
      if (options?.focusOnPress) {
        button = button.focusOnPress();
      }
      if (options?.keyContext) {
        button = button.keyContext(options.keyContext);
      }
      button = button.onClick(
        cx.listener((view, _event, _window, ecx) => {
          view.focusLog = options?.onClickMessage ?? `${label} activated`;
          ecx.notify();
        })
      );
      return button.child(text(label).font("Inter").size(13));
    };

    const modalOverlay = this.focusModalOpen ? this.renderFocusModal(cx) : null;

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .keyContext("focus-demo")
      .children(
        text("Enhanced Focus & Tab Navigation").font("Inter").size(32),
        text("Tab stops, focus groups, context-aware keybindings, and focus restoration.")
          .font("Inter")
          .size(16),
        div().h(1).bg({ r: 0.3, g: 0.32, b: 0.38, a: 0.6 }),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .children(
            text("• Tab/Shift+Tab respects custom tab indexes and focus groups.")
              .font("Inter")
              .size(13),
            text(
              "• Right arrow in the toolbar uses focusNextSibling(); Home jumps to the first child."
            )
              .font("Inter")
              .size(13),
            text(
              "• Enter logs the current key context chain; Escape closes the modal and restores focus."
            )
              .font("Inter")
              .size(13),
            text("• The red button focuses on mouse down via focusOnPress().")
              .font("Inter")
              .size(13)
          ),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .keyContext("focus-demo.controls")
          .children(
            text("Tab Stops").font("Inter").size(18),
            div()
              .flex()
              .flexRow()
              .gap(12)
              .children(
                focusButton("Primary Action", this.focusPrimaryHandle, 0x2563eb, 0x1d4ed8, 1, {
                  onClickMessage: "Primary activated",
                }),
                focusButton("Secondary", this.focusSecondaryHandle, 0x10b981, 0x059669, 2, {
                  onClickMessage: "Secondary activated",
                }),
                focusButton("Destructive", this.focusDangerHandle, 0xef4444, 0xdc2626, 3, {
                  focusOnPress: true,
                  onClickMessage: "Destructive pressed",
                })
              )
          ),
        div()
          .flex()
          .flexCol()
          .gap(10)
          .keyContext("focus-demo.toolbar")
          .children(
            text("Focus Group (Toolbar)").font("Inter").size(18),
            text(
              "Tab stays in the group first, Right arrow advances with focusNextSibling(), Home jumps to the first child."
            )
              .font("Inter")
              .size(13),
            div()
              .flex()
              .flexRow()
              .gap(10)
              .trackFocus(this.toolbarContainerHandle)
              .children(
                focusButton("Toolbar A", toolbarA, 0x4f46e5, 0x4338ca, 4, {
                  group: "toolbar",
                  onClickMessage: "Toolbar A focused",
                }),
                focusButton("Toolbar B", toolbarB, 0x22c55e, 0x16a34a, 5, {
                  group: "toolbar",
                  onClickMessage: "Toolbar B focused",
                }),
                focusButton("Toolbar C", toolbarC, 0xf59e0b, 0xd97706, 6, {
                  group: "toolbar",
                  onClickMessage: "Toolbar C focused",
                })
              )
          ),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .keyContext("focus-demo.modal-trigger")
          .children(
            text("Focus Restoration").font("Inter").size(18),
            text(
              "Open the modal to push focus; Escape or Close restores the previous focused control."
            )
              .font("Inter")
              .size(13),
            focusButton(
              this.focusModalOpen ? "Modal Open" : "Open Modal",
              this.modalTriggerHandle,
              0x0ea5e9,
              0x0284c7,
              7,
              { onClickMessage: "Modal opened" }
            ).onClick(
              cx.listener((view, _event, _window, ecx) => {
                view.modalTriggerHandle?.saveFocus(ecx);
                view.focusModalOpen = true;
                view.focusLog = "Modal opened and focus saved";
                view.modalPrimaryHandle?.focus(ecx);
                ecx.notify();
              })
            )
          ),
        div()
          .flex()
          .flexCol()
          .gap(6)
          .borderColor({ r: 0.16, g: 0.17, b: 0.22, a: 0.5 })
          .rounded(10)
          .p(12)
          .children(
            text(`Current Focus: ${focusedLabel}`).font("Inter").size(14),
            text(`Key Context Chain: ${contextLabel}`).font("Inter").size(14),
            text(`Focus Log: ${this.focusLog}`).font("Inter").size(14)
          ),
        modalOverlay
      );
  }

  private ensureFocusDemoHandles(cx: FlashViewContext<this>): void {
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
  }

  private ensureTextInputHandle(cx: FlashViewContext<this>): FocusHandle {
    if (!this.textInputHandle) {
      this.textInputHandle = cx.focusHandle();
    }
    return this.textInputHandle;
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

  private renderFocusModal(cx: FlashViewContext<this>): FlashDiv {
    if (!this.modalPrimaryHandle || !this.modalCloseHandle || !this.modalTriggerHandle) {
      return div();
    }

    const theme = cx.getTheme();
    const panelBg = { ...theme.surface, a: 0.95 };
    const borderColor = theme.border;
    const headingColor = theme.text;
    const bodyColor = theme.textMuted;
    const confirmBg = theme.primary;
    const confirmText = theme.primaryForeground;
    const dangerBg = theme.danger;
    const textColor = theme.primaryForeground;

    return div()
      .bg(panelBg)
      .border(1)
      .borderColor(borderColor)
      .rounded(12)
      .p(12)
      .gap(8)
      .flex()
      .flexCol()
      .keyContext("focus-demo.modal")
      .children(
        text("Modal Focus").font("Inter").size(16).color(headingColor),
        text("Tab between modal buttons; Escape or Close restores focus.")
          .font("Inter")
          .size(13)
          .color(bodyColor),
        div()
          .h(1)
          .bg({ ...borderColor, a: borderColor.a }),
        div()
          .flex()
          .flexRow()
          .gap(10)
          .children(
            div()
              .h(40)
              .px(14)
              .rounded(8)
              .bg(confirmBg)
              .border(2)
              .borderColor(borderColor)
              .cursorPointer()
              .hover((s) => s.bg(confirmBg).shadow("md"))
              .focused((s) => s.borderColor(theme.focusRing).shadow("lg"))
              .trackFocus(this.modalPrimaryHandle)
              .tabStop({ index: 8 })
              .onClick(
                cx.listener((view, _event, _window, ecx) => {
                  view.focusLog = "Modal confirm";
                  ecx.notify();
                })
              )
              .child(text("Confirm").font("Inter").size(13).color(confirmText)),
            div()
              .h(40)
              .px(14)
              .rounded(8)
              .bg(dangerBg)
              .border(2)
              .borderColor(borderColor)
              .cursorPointer()
              .hover((s) => s.bg(dangerBg).shadow("md"))
              .focused((s) => s.borderColor(theme.focusRing).shadow("lg"))
              .trackFocus(this.modalCloseHandle)
              .tabStop({ index: 9 })
              .onClick(
                cx.listener((view, _event, _window, ecx) => {
                  view.focusModalOpen = false;
                  view.modalTriggerHandle?.restoreFocus(ecx);
                  view.focusLog = "Modal closed and focus restored";
                  ecx.notify();
                })
              )
              .child(text("Close").font("Inter").size(13).color(textColor))
          )
      );
  }
}

async function main() {
  console.log("Initializing Flash App Demo...");

  const ctx = await createWebGPUContext({
    width: 1200,
    height: 780,
    title: "Flash App Demo",
  });

  const platform = createFlashPlatform(ctx);
  const colorSchemeProvider = createColorSchemeProvider();

  const app = new FlashApp({ platform, colorSchemeProvider });
  await app.initialize();

  const window = await app.openWindow({ width: 1200, height: 900, title: "Flash App Demo" }, (cx) =>
    cx.newView<DemoRootView>(() => new DemoRootView())
  );

  window.getActionRegistry().register({
    name: "inspector:toggle",
    label: "Toggle Inspector",
    handler: (_cx, win) => {
      win.toggleInspector();
      const enabled = win.isInspectorEnabled();
      console.log(`Inspector ${enabled ? "enabled" : "disabled"}`);
      if (enabled) {
        console.log("  - Click on any element to select it");
        console.log("  - Selected element info will be logged to console");
        console.log("  - Press 'I' again to disable");
      }
    },
  });

  window.getKeymap().bind("i", "inspector:toggle");
  console.log("Inspector: Press 'I' to toggle debug mode");

  window.registerFont("Inter", base64ToBytes(interFontBase64));
  window.registerFont(emojiFontFamily, base64ToBytes(notoColorEmojiBase64));
  window.registerFont("JetBrains Mono", base64ToBytes(jetBrainsMonoRegularBase64));
  window.registerFont("JetBrains Mono SemiBold", base64ToBytes(jetBrainsMonoSemiBoldBase64));
  console.log(`Loaded fonts: Inter, ${emojiFontFamily}, JetBrains Mono, JetBrains Mono SemiBold`);

  const pngData = base64ToBytes(demoPngBase64);
  const decodedPng = await platform.decodeImage(pngData);
  demoImageTile = window.uploadImage(decodedPng);
  console.log(`Loaded PNG: ${decodedPng.width}x${decodedPng.height}`);

  const jpgData = base64ToBytes(flowerJpgBase64);
  const decodedJpg = await platform.decodeImage(jpgData);
  flowerImageTile = window.uploadImage(decodedJpg);
  console.log(`Loaded JPEG: ${decodedJpg.width}x${decodedJpg.height}`);

  console.log("Flash App initialized, starting render loop...");

  app.run();

  // TODO: We should not need to do this. fix.
  const platformAny = platform as { tick?: (time: number) => void };
  runWebGPURenderLoop(ctx, (time, _deltaTime) => {
    if (platformAny.tick) {
      platformAny.tick(time * 1000);
    }
  });
}

main().catch(console.error);
