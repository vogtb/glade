/**
 * Flash App Demo
 *
 * Demonstrates the full FlashApp framework with proper View architecture.
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
  text,
  path,
  img,
  svg,
  SvgIcons,
  type FlashDiv,
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
  Key,
} from "@glade/flash";
import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };

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
const demoPngBase64 = COMPTIME_embedAsBase64("../../assets/image.png") as unknown as string;
const flowerJpgBase64 = COMPTIME_embedAsBase64("../../assets/flower.jpg") as unknown as string;

// Embed SVG as base64 at build time
const gearSvgBase64 = COMPTIME_embedAsBase64("../../assets/gear.svg") as unknown as string;

// Global image tiles - set after window is created
let demoImageTile: ImageTile | null = null;
let flowerImageTile: ImageTile | null = null;

/**
 * Demo section identifiers.
 */
type DemoSection =
  | "inter-text"
  | "wrapped-text"
  | "text-input"
  | "emoji-text"
  | "mono-text"
  | "mono-semibold"
  | "underlined-text"
  | "group-styles"
  | "canvas"
  | "vector-paths"
  | "border-styles"
  | "png-images"
  | "jpg-images"
  | "virtual-scrolling"
  | "deferred-anchored"
  | "svg-icons"
  | "focus-navigation"
  | "clipboard";

/**
 * Demo button configuration.
 */
interface DemoButton {
  id: DemoSection;
  label: string;
  color: number;
  hoverColor: number;
}

const DEMO_BUTTONS: DemoButton[] = [
  { id: "inter-text", label: "Inter Text", color: 0x3b82f6, hoverColor: 0x2563eb },
  { id: "wrapped-text", label: "Wrapped Text", color: 0x7c7cff, hoverColor: 0x6b6bf5 },
  { id: "text-input", label: "Text Input", color: 0x9f7aea, hoverColor: 0x7c3aed },
  { id: "emoji-text", label: "Emoji Text", color: 0xf472b6, hoverColor: 0xec4899 },
  { id: "mono-text", label: "Monospace Text", color: 0x10b981, hoverColor: 0x059669 },
  { id: "mono-semibold", label: "Mono SemiBold", color: 0xf59e0b, hoverColor: 0xd97706 },
  { id: "underlined-text", label: "Underlined Text", color: 0xef4444, hoverColor: 0xdc2626 },
  { id: "group-styles", label: "Group Styles", color: 0x8b5cf6, hoverColor: 0x7c3aed },
  { id: "canvas", label: "Canvas", color: 0x22c55e, hoverColor: 0x16a34a },
  { id: "vector-paths", label: "Vector Paths", color: 0xec4899, hoverColor: 0xdb2777 },
  { id: "border-styles", label: "Border Styles", color: 0x06b6d4, hoverColor: 0x0891b2 },
  { id: "png-images", label: "PNG Images", color: 0x84cc16, hoverColor: 0x65a30d },
  { id: "jpg-images", label: "JPG Images", color: 0xf97316, hoverColor: 0xea580c },
  { id: "virtual-scrolling", label: "Virtual Scrolling", color: 0x6366f1, hoverColor: 0x4f46e5 },
  { id: "deferred-anchored", label: "Deferred/Anchored", color: 0xa855f7, hoverColor: 0x9333ea },
  { id: "svg-icons", label: "SVG Icons", color: 0x14b8a6, hoverColor: 0x0d9488 },
  { id: "focus-navigation", label: "Focus Nav", color: 0xec7063, hoverColor: 0xc0392b },
  { id: "clipboard", label: "Clipboard", color: 0x22c55e, hoverColor: 0x16a34a },
];

/**
 * Decode base64 to Uint8Array (works in both browser and Node/Bun)
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decode base64 to string (for SVG files)
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

/**
 * Custom element that renders text with an underline.
 */
class UnderlinedTextElement extends FlashElement<{ textWidth: number; textHeight: number }, void> {
  private textContent: string;
  private underlineStyle: "solid" | "wavy";
  private textColor: { r: number; g: number; b: number; a: number };
  private underlineColor: { r: number; g: number; b: number; a: number };
  private fontSize: number;
  private fontFamily: string;
  private thickness: number;
  private wavelength?: number;
  private amplitude?: number;

  constructor(
    text: string,
    options: {
      style: "solid" | "wavy";
      textColor: { r: number; g: number; b: number; a: number };
      underlineColor?: { r: number; g: number; b: number; a: number };
      fontSize?: number;
      fontFamily?: string;
      thickness?: number;
      wavelength?: number;
      amplitude?: number;
    }
  ) {
    super();
    this.textContent = text;
    this.underlineStyle = options.style;
    this.textColor = options.textColor;
    this.underlineColor = options.underlineColor ?? options.textColor;
    this.fontSize = options.fontSize ?? 14;
    this.fontFamily = options.fontFamily ?? "Inter";
    this.thickness = options.thickness ?? 1;
    this.wavelength = options.wavelength;
    this.amplitude = options.amplitude;
  }

  requestLayout(
    cx: RequestLayoutContext
  ): RequestLayoutResult<{ textWidth: number; textHeight: number }> {
    const metrics = cx.measureText(this.textContent, {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: 400,
    });
    const underlineSpace =
      this.underlineStyle === "wavy"
        ? this.thickness + (this.amplitude ?? 1) * 2 + 2
        : this.thickness + 2;
    const layoutId = cx.requestLayout(
      { width: metrics.width, height: metrics.height + underlineSpace },
      []
    );
    return { layoutId, requestState: { textWidth: metrics.width, textHeight: metrics.height } };
  }

  prepaint(
    _cx: PrepaintContext,
    _bounds: Bounds,
    _requestState: { textWidth: number; textHeight: number }
  ): void {}

  paint(cx: PaintContext, bounds: Bounds, _prepaintState: void): void {
    cx.paintGlyphs(this.textContent, bounds, this.textColor, {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: 400,
    });

    const underlineY = bounds.y + this.fontSize * 1.1;
    cx.paintUnderline(
      bounds.x,
      underlineY,
      bounds.width,
      this.thickness,
      this.underlineColor,
      this.underlineStyle,
      { wavelength: this.wavelength, amplitude: this.amplitude }
    );
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): null {
    return null;
  }
}

function underlinedText(
  textContent: string,
  options: {
    style: "solid" | "wavy";
    textColor: { r: number; g: number; b: number; a: number };
    underlineColor?: { r: number; g: number; b: number; a: number };
    fontSize?: number;
    fontFamily?: string;
    thickness?: number;
    wavelength?: number;
    amplitude?: number;
  }
): UnderlinedTextElement {
  return new UnderlinedTextElement(textContent, options);
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
  private variableListState: ListState | null = null;
  private selectedDemo: DemoSection = "inter-text";
  private popupVisible = false;
  private popupPosition: Point = { x: 200, y: 200 };
  private popupAnchorCorner: "top-left" | "top-right" | "bottom-left" | "bottom-right" = "top-left";
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
  private textInputValue = "";
  private textInputStatus = "Click the field to focus, then type to insert characters.";

  render(cx: FlashViewContext<this>): FlashDiv {
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
      .bg(rgb(0x14141a))
      .gap(20)
      .p(20)
      .children_(this.renderNavigation(cx), this.renderContent(cx));
  }

  private renderNavigation(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .w(220)
      .h(Math.max(200, cx.window.height - 40))
      .flexShrink0()
      .bg(rgb(0x1f1f28))
      .rounded(12)
      .overflowHidden()
      .children_(
        div()
          .px(16)
          .pt(16)
          .pb(8)
          .flexShrink0()
          .children_(
            text("Flash Demos").font("Inter").size(18).color({ r: 1, g: 1, b: 1, a: 1 }),
            div().h(1).mt(8).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 })
          ),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .px(16)
          .pb(16)
          .flexGrow()
          .hMax(cx.window.height - 120)
          .overflowAuto()
          .trackScroll(this.leftNavScrollHandle!)
          .children_(...DEMO_BUTTONS.map((btn) => this.renderNavButton(cx, btn)))
      );
  }

  private renderNavButton(cx: FlashViewContext<this>, btn: DemoButton): FlashDiv {
    const isSelected = this.selectedDemo === btn.id;
    const baseColor = isSelected ? btn.hoverColor : btn.color;

    return div()
      .h(40)
      .flexShrink0()
      .bg(rgb(baseColor))
      .rounded(8)
      .cursorPointer()
      .border(isSelected ? 2 : 0)
      .borderColor({ r: 1, g: 1, b: 1, a: 0.3 })
      .hover((s) => s.bg(rgb(btn.hoverColor)).shadow("md"))
      .active((s) => s.bg(rgb(btn.hoverColor)))
      .flex()
      .itemsCenter()
      .px(12)
      .onClick(
        cx.listener((view, _event, _window, ecx) => {
          view.selectedDemo = btn.id;
          ecx.notify();
        })
      )
      .child(text(btn.label).font("Inter").size(14).color({ r: 1, g: 1, b: 1, a: 1 }));
  }

  private renderContent(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flexGrow()
      .bg(rgb(0x2a2a35))
      .rounded(12)
      .p(24)
      .flex()
      .flexCol()
      .gap(16)
      .overflowHidden()
      .trackScroll(this.rightScrollHandle!)
      .child(this.renderDemoContent(cx));
  }

  private renderDemoContent(cx: FlashViewContext<this>): FlashDiv {
    switch (this.selectedDemo) {
      case "inter-text":
        return this.renderInterTextDemo();
      case "wrapped-text":
        return this.renderWrappedTextDemo();
      case "text-input":
        return this.renderTextInputDemo(cx);
      case "emoji-text":
        return this.renderEmojiTextDemo();
      case "mono-text":
        return this.renderMonoTextDemo();
      case "mono-semibold":
        return this.renderMonoSemiBoldDemo();
      case "underlined-text":
        return this.renderUnderlinedTextDemo();
      case "group-styles":
        return this.renderGroupStylesDemo();
      case "canvas":
        return this.renderCanvasDemo();
      case "vector-paths":
        return this.renderVectorPathsDemo();
      case "border-styles":
        return this.renderBorderStylesDemo();
      case "png-images":
        return this.renderPngImagesDemo();
      case "jpg-images":
        return this.renderJpgImagesDemo();
      case "virtual-scrolling":
        return this.renderVirtualScrollingDemo(cx);
      case "deferred-anchored":
        return this.renderDeferredAnchoredDemo(cx);
      case "svg-icons":
        return this.renderSvgIconsDemo();
      case "focus-navigation":
        return this.renderFocusNavigationDemo(cx);
      case "clipboard":
        return this.renderClipboardDemo(cx);
      default:
        return div();
    }
  }

  private renderInterTextDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("Inter Variable Font").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("GPU-accelerated text rendering with cosmic-text shaping")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        text(
          "Wrapped text automatically breaks across lines to fit the available width without clipping or overflow."
        )
          .font("Inter")
          .size(14)
          .color({ r: 0.8, g: 0.8, b: 0.95, a: 1 })
          .maxWidth(520),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("The quick brown fox jumps over the lazy dog.")
          .font("Inter")
          .size(14)
          .color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        text("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
          .font("Inter")
          .size(14)
          .color({ r: 0.8, g: 0.8, b: 0.9, a: 1 }),
        text("abcdefghijklmnopqrstuvwxyz")
          .font("Inter")
          .size(14)
          .color({ r: 0.8, g: 0.8, b: 0.9, a: 1 }),
        text("0123456789 !@#$%^&*()_+-=[]{}|;':\",./<>?")
          .font("Inter")
          .size(14)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Font Sizes").font("Inter").size(18).color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        text("10px: The quick brown fox")
          .font("Inter")
          .size(10)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        text("12px: The quick brown fox")
          .font("Inter")
          .size(12)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        text("14px: The quick brown fox")
          .font("Inter")
          .size(14)
          .color({ r: 0.8, g: 0.8, b: 0.9, a: 1 }),
        text("18px: The quick brown fox")
          .font("Inter")
          .size(18)
          .color({ r: 0.8, g: 0.8, b: 0.9, a: 1 }),
        text("24px: The quick brown fox")
          .font("Inter")
          .size(24)
          .color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        text("32px: The quick brown fox").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 })
      );
  }

  private renderWrappedTextDemo(): FlashDiv {
    const sample =
      "Wrapped text will break across lines when a maxWidth is provided. Without it, the text stays on one line if there is space.";

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("Text Wrapping").font("Inter").size(28).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Side-by-side comparison of wrapped vs. unwrapped text.")
          .font("Inter")
          .size(16)
          .color({ r: 0.75, g: 0.8, b: 0.9, a: 1 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .children_(
            div()
              .flex()
              .flexCol()
              .gap(8)
              .w(320)
              .p(12)
              .rounded(12)
              .bg({ r: 0.16, g: 0.18, b: 0.22, a: 1 })
              .children_(
                text("Wrapped (maxWidth 300)")
                  .font("Inter")
                  .size(16)
                  .color({ r: 1, g: 1, b: 1, a: 1 }),
                text(sample)
                  .font("Inter")
                  .size(14)
                  .color({ r: 0.85, g: 0.88, b: 0.95, a: 1 })
                  .maxWidth(300)
              ),
            div()
              .flex()
              .flexCol()
              .gap(8)
              .w(320)
              .p(12)
              .rounded(12)
              .bg({ r: 0.14, g: 0.16, b: 0.2, a: 1 })
              .children_(
                text("Unwrapped (no maxWidth)")
                  .font("Inter")
                  .size(16)
                  .color({ r: 1, g: 1, b: 1, a: 1 }),
                text(sample).font("Inter").size(14).color({ r: 0.85, g: 0.88, b: 0.95, a: 1 })
              )
          ),
        div().h(1).bg({ r: 0.35, g: 0.4, b: 0.5, a: 0.5 }),
        text("Single column wrap demo").font("Inter").size(16).color({ r: 1, g: 1, b: 1, a: 1 }),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .w(520)
          .children_(
            text(
              "This paragraph uses maxWidth to demonstrate natural wrapping in a single column layout."
            )
              .font("Inter")
              .size(14)
              .color({ r: 0.9, g: 0.9, b: 1, a: 1 })
              .maxWidth(520),
            text(
              "Adjusting the container width should reflow the lines consistently with cosmic-text wrapping."
            )
              .font("Inter")
              .size(14)
              .color({ r: 0.8, g: 0.85, b: 0.95, a: 1 })
              .maxWidth(520)
          )
      );
  }

  private renderTextInputDemo(cx: FlashViewContext<this>): FlashDiv {
    const inputHandle = this.ensureTextInputHandle(cx);
    const focused = cx.isFocused(inputHandle);
    const lines =
      this.textInputValue.length > 0 ? this.textInputValue.split("\n") : ["Start typing..."];

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("Text Input").font("Inter").size(28).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Demonstrates text input events, focus handling, and simple editing.")
          .font("Inter")
          .size(16)
          .color({ r: 0.75, g: 0.8, b: 0.9, a: 1 }),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .children_(
            text("Click the field and type. Backspace deletes, Enter inserts a new line.")
              .font("Inter")
              .size(14)
              .color({ r: 0.8, g: 0.8, b: 0.9, a: 1 }),
            div()
              .bg({ r: 0.12, g: 0.13, b: 0.17, a: 1 })
              .border(2)
              .borderColor(focused ? rgb(0x6366f1) : { r: 0.25, g: 0.28, b: 0.35, a: 1 })
              .rounded(12)
              .p(12)
              .trackFocus(inputHandle)
              .tabStop({ index: 1 })
              .onTextInput(
                cx.listener((view, event, _window, ecx) => {
                  view.textInputValue = `${view.textInputValue}${event.text}`;
                  view.textInputStatus = `Inserted "${event.text}"`;
                  ecx.notify();
                })
              )
              .onKeyDown(
                cx.listener((view, event, _window, ecx) => {
                  const scancode = Number(event.code);
                  if (scancode === Key.Backspace) {
                    if (view.textInputValue.length > 0) {
                      view.textInputValue = view.textInputValue.slice(0, -1);
                      view.textInputStatus = "Backspace";
                      ecx.notify();
                    }
                    return { stopPropagation: true };
                  }
                  if (scancode === Key.Enter) {
                    view.textInputValue = `${view.textInputValue}\n`;
                    view.textInputStatus = "Inserted newline";
                    ecx.notify();
                    return { stopPropagation: true };
                  }
                  return undefined;
                })
              )
              .children_(
                div()
                  .flex()
                  .flexCol()
                  .gap(6)
                  .children_(
                    ...lines.map((line) =>
                      text(line)
                        .font("Inter")
                        .size(16)
                        .color(
                          this.textInputValue.length === 0
                            ? { r: 0.6, g: 0.65, b: 0.75, a: 1 }
                            : { r: 0.92, g: 0.94, b: 0.98, a: 1 }
                        )
                    )
                  )
              ),
            div()
              .flex()
              .flexRow()
              .gap(12)
              .children_(
                text(`Focused: ${focused ? "yes" : "no"}`)
                  .font("Inter")
                  .size(14)
                  .color({ r: 0.7, g: 0.85, b: 0.9, a: 1 }),
                text(`Length: ${this.textInputValue.length}`)
                  .font("Inter")
                  .size(14)
                  .color({ r: 0.7, g: 0.85, b: 0.9, a: 1 })
              ),
            text(`Status: ${this.textInputStatus}`)
              .font("Inter")
              .size(14)
              .color({ r: 0.7, g: 0.78, b: 0.9, a: 1 })
          )
      );
  }

  private renderEmojiTextDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text(emojiFontFamily).font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Color emoji rendering with full glyph coverage")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("Faces & Mood: 😀 😁 😂 🤣 🤩 😎 😇 😴")
          .font(emojiFontFamily)
          .size(28)
          .color({ r: 1, g: 1, b: 1, a: 1 }),
        text("People & Professions: 👩‍💻 👨‍🚒 🧑🏽‍🚀 🧑‍🍳 🧑‍🔧 🧑🏻‍🏫")
          .font(emojiFontFamily)
          .size(28)
          .color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Travel & Places: 🏔️ 🏖️ 🌋 🏛️ 🏙️ 🚄 ✈️ 🚀")
          .font(emojiFontFamily)
          .size(28)
          .color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Activities & Objects: 🎸 🎧 🎮 🛠️ 🧪 🧭 ⚽️ 🏀")
          .font(emojiFontFamily)
          .size(28)
          .color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Flags & Symbols: 🏳️‍🌈 🏴‍☠️ 🇯🇵 🇺🇳 🇨🇦 ❤️‍🔥 ✨ ✅")
          .font(emojiFontFamily)
          .size(28)
          .color({ r: 1, g: 1, b: 1, a: 1 }),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Inline text with emoji: Launch 🚀 Celebrate 🎉 Ship it ✅")
          .font("Inter")
          .size(18)
          .color({ r: 0.9, g: 0.9, b: 1, a: 1 })
      );
  }

  private renderMonoTextDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("JetBrains Mono Regular")
          .font("JetBrains Mono")
          .size(32)
          .color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Monospaced font for code editing")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("const greeting = 'Hello, World!';")
          .font("JetBrains Mono")
          .size(14)
          .color({ r: 0.6, g: 0.9, b: 0.6, a: 1 }),
        text("function fibonacci(n: number): number {")
          .font("JetBrains Mono")
          .size(14)
          .color({ r: 0.9, g: 0.7, b: 0.5, a: 1 }),
        text("  return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);")
          .font("JetBrains Mono")
          .size(14)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        text("}").font("JetBrains Mono").size(14).color({ r: 0.9, g: 0.7, b: 0.5, a: 1 }),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Character Disambiguation")
          .font("Inter")
          .size(18)
          .color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        text("0O 1lI |! {} [] () <> => != === // /* */")
          .font("JetBrains Mono")
          .size(16)
          .color({ r: 0.5, g: 0.8, b: 1, a: 1 }),
        text("ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789")
          .font("JetBrains Mono")
          .size(14)
          .color({ r: 0.8, g: 0.6, b: 0.9, a: 1 })
      );
  }

  private renderMonoSemiBoldDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("JetBrains Mono SemiBold")
          .font("JetBrains Mono SemiBold")
          .size(32)
          .color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Heavier weight for emphasis and headers")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("const PI = 3.14159265359;")
          .font("JetBrains Mono SemiBold")
          .size(16)
          .color({ r: 0.6, g: 0.9, b: 0.6, a: 1 }),
        text("export class FlashElement {")
          .font("JetBrains Mono SemiBold")
          .size(16)
          .color({ r: 0.9, g: 0.7, b: 0.5, a: 1 }),
        text("  abstract render(): void;")
          .font("JetBrains Mono SemiBold")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        text("}").font("JetBrains Mono SemiBold").size(16).color({ r: 0.9, g: 0.7, b: 0.5, a: 1 }),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("0O 1lI |! {} [] () <> => != === // /* */")
          .font("JetBrains Mono SemiBold")
          .size(16)
          .color({ r: 0.5, g: 0.8, b: 1, a: 1 }),
        text("ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789")
          .font("JetBrains Mono SemiBold")
          .size(14)
          .color({ r: 0.8, g: 0.6, b: 0.9, a: 1 })
      );
  }

  private renderUnderlinedTextDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("Text Underlines").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Solid and wavy underlines for text decoration")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        div()
          .flex()
          .flexRow()
          .gap(24)
          .flexWrap()
          .itemsEnd()
          .children_(
            underlinedText("Hyperlink", {
              style: "solid",
              textColor: { r: 0.3, g: 0.7, b: 1, a: 1 },
              fontSize: 16,
              thickness: 1,
            }),
            underlinedText("Important", {
              style: "solid",
              textColor: { r: 0.5, g: 1, b: 0.5, a: 1 },
              fontSize: 16,
              thickness: 2,
            }),
            underlinedText("Speling Error", {
              style: "wavy",
              textColor: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
              underlineColor: { r: 1, g: 0.3, b: 0.3, a: 1 },
              fontSize: 16,
              thickness: 1.5,
              wavelength: 4,
              amplitude: 1.5,
            }),
            underlinedText("Grammer Issue", {
              style: "wavy",
              textColor: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
              underlineColor: { r: 0.3, g: 0.6, b: 1, a: 1 },
              fontSize: 16,
              thickness: 1.5,
              wavelength: 5,
              amplitude: 1.5,
            })
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Larger Text").font("Inter").size(18).color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        div()
          .flex()
          .flexRow()
          .gap(32)
          .flexWrap()
          .itemsEnd()
          .children_(
            underlinedText("Title Text", {
              style: "solid",
              textColor: { r: 1, g: 0.8, b: 0.3, a: 1 },
              fontSize: 24,
              thickness: 2,
            }),
            underlinedText("Code Identifier", {
              style: "wavy",
              textColor: { r: 0.6, g: 0.9, b: 0.6, a: 1 },
              underlineColor: { r: 1, g: 0.6, b: 0.2, a: 1 },
              fontFamily: "JetBrains Mono",
              fontSize: 18,
              thickness: 2,
              wavelength: 6,
              amplitude: 2,
            })
          )
      );
  }

  private renderGroupStylesDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("Group Styles").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Coordinated hover and active effects across related elements")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("Hover or click any button in a group to see coordinated effects")
          .font("Inter")
          .size(14)
          .color({ r: 0.6, g: 0.6, b: 0.7, a: 1 }),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children_(
            text("Group A:").font("Inter").size(13).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 }),
            groupButton("One", "group-a", 0x3730a3, 0x4338ca, 0x6366f1),
            groupButton("Two", "group-a", 0x3730a3, 0x4338ca, 0x6366f1),
            groupButton("Three", "group-a", 0x3730a3, 0x4338ca, 0x6366f1)
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children_(
            text("Group B:").font("Inter").size(13).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 }),
            groupButton("Alpha", "group-b", 0x166534, 0x15803d, 0x22c55e),
            groupButton("Beta", "group-b", 0x166534, 0x15803d, 0x22c55e),
            groupButton("Gamma", "group-b", 0x166534, 0x15803d, 0x22c55e)
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children_(
            text("Group C:").font("Inter").size(13).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 }),
            groupButton("Red", "group-c", 0x991b1b, 0xb91c1c, 0xef4444),
            groupButton("Green", "group-c", 0x166534, 0x15803d, 0x22c55e),
            groupButton("Blue", "group-c", 0x1e40af, 0x1d4ed8, 0x3b82f6)
          )
      );
  }

  private renderCanvasDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("Canvas Element").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Direct access to low-level paint APIs without defining a custom element.")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("Waveform + Bars via canvas()")
          .font("Inter")
          .size(18)
          .color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
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
          .color({ r: 0.65, g: 0.75, b: 0.9, a: 1 })
      );
  }

  private renderVectorPathsDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("Vector Path Rendering").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("GPU-accelerated vector graphics with tessellation")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("Large Shapes (64px)").font("Inter").size(18).color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .flexWrap()
          .children_(
            pathShape("star", { r: 1, g: 0.8, b: 0.2, a: 1 }, 64),
            pathShape("polygon", { r: 0.3, g: 0.8, b: 1, a: 1 }, 64),
            pathShape("circle", { r: 0.9, g: 0.3, b: 0.5, a: 1 }, 64),
            pathShape("heart", { r: 1, g: 0.3, b: 0.4, a: 1 }, 64),
            pathShape("arrow", { r: 0.4, g: 0.9, b: 0.5, a: 1 }, 64)
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Small Shapes (32px)").font("Inter").size(18).color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        div()
          .flex()
          .flexRow()
          .gap(8)
          .flexWrap()
          .children_(
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

  private renderBorderStylesDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("Border Styles").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Solid and dashed border rendering")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .flexWrap()
          .children_(
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
              .child(text("Solid").font("Inter").size(12).color({ r: 0.7, g: 0.7, b: 0.8, a: 1 })),
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
              .child(text("Dashed").font("Inter").size(12).color({ r: 0.7, g: 0.7, b: 0.8, a: 1 })),
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
              .child(text("Custom").font("Inter").size(12).color({ r: 0.7, g: 0.7, b: 0.8, a: 1 })),
            div()
              .w(60)
              .h(60)
              .border(2)
              .borderColor({ r: 0.5, g: 1, b: 0.5, a: 1 })
              .borderSolid()
              .flex()
              .itemsCenter()
              .justifyCenter()
              .child(text("■").font("Inter").size(16).color({ r: 0.5, g: 1, b: 0.5, a: 1 })),
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
              .child(text("▢").font("Inter").size(16).color({ r: 1, g: 0.8, b: 0.2, a: 1 }))
          )
      );
  }

  private renderPngImagesDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("PNG Image Rendering").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("PNG decoding with GPU-accelerated rendering and effects")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .flexWrap()
          .children_(
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                img(demoImageTile!).size(150, 100),
                text("Original").font("Inter").size(11).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                img(demoImageTile!).size(150, 100).rounded(16),
                text("Rounded").font("Inter").size(11).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                img(demoImageTile!).size(150, 100).grayscale(),
                text("Grayscale").font("Inter").size(11).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                img(demoImageTile!).size(150, 100).opacity(0.5),
                text("50% Opacity").font("Inter").size(11).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                img(demoImageTile!).size(100, 100).rounded(50),
                text("Circle").font("Inter").size(11).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              )
          )
      );
  }

  private renderJpgImagesDemo(): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("JPEG Image Rendering").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("JPEG decoding with GPU-accelerated rendering and effects")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .flexWrap()
          .children_(
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                img(flowerImageTile!).size(150, 100),
                text("Original").font("Inter").size(11).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                img(flowerImageTile!).size(150, 100).rounded(16),
                text("Rounded").font("Inter").size(11).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                img(flowerImageTile!).size(150, 100).grayscale(),
                text("Grayscale").font("Inter").size(11).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                img(flowerImageTile!).size(100, 100).rounded(50),
                text("Circle").font("Inter").size(11).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              )
          )
      );
  }

  private renderVirtualScrollingDemo(cx: FlashViewContext<this>): FlashDiv {
    return div()
      .flex()
      .flexCol()
      .gap(16)
      .children_(
        text("Virtual Scrolling").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Efficient rendering of large lists with fixed and variable height items")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .h(400)
          .children_(
            div()
              .flex()
              .flexCol()
              .flex1()
              .gap(8)
              .children_(
                text("UniformList (1000 items, 40px each)")
                  .font("Inter")
                  .size(13)
                  .color({ r: 0.6, g: 0.8, b: 1, a: 1 }),
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
                    .children_(
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
              .children_(
                text("List (500 items, variable height)")
                  .font("Inter")
                  .size(13)
                  .color({ r: 0.6, g: 1, b: 0.8, a: 1 }),
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
                      .children_(
                        div()
                          .flex()
                          .flexRow()
                          .justifyBetween()
                          .children_(
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

  private renderDeferredAnchoredDemo(cx: FlashViewContext<this>): FlashDiv {
    const corners: Array<"top-left" | "top-right" | "bottom-left" | "bottom-right"> = [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ];

    const popupContent = div()
      .w(200)
      .bg({ r: 0.15, g: 0.15, b: 0.22, a: 0.98 })
      .rounded(8)
      .border(1)
      .borderColor({ r: 0.4, g: 0.4, b: 0.6, a: 1 })
      .shadowLg()
      .p(12)
      .flex()
      .flexCol()
      .gap(8)
      .children_(
        text("Popup Menu").font("Inter").size(14).weight(600).color({ r: 1, g: 1, b: 1, a: 1 }),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        div()
          .h(32)
          .px(8)
          .bg({ r: 0.2, g: 0.2, b: 0.28, a: 1 })
          .rounded(4)
          .cursorPointer()
          .hover((s) => s.bg({ r: 0.3, g: 0.3, b: 0.4, a: 1 }))
          .flex()
          .itemsCenter()
          .child(text("Option 1").font("Inter").size(13).color({ r: 0.9, g: 0.9, b: 1, a: 1 })),
        div()
          .h(32)
          .px(8)
          .bg({ r: 0.2, g: 0.2, b: 0.28, a: 1 })
          .rounded(4)
          .cursorPointer()
          .hover((s) => s.bg({ r: 0.3, g: 0.3, b: 0.4, a: 1 }))
          .flex()
          .itemsCenter()
          .child(text("Option 2").font("Inter").size(13).color({ r: 0.9, g: 0.9, b: 1, a: 1 })),
        div()
          .h(32)
          .px(8)
          .bg({ r: 0.2, g: 0.2, b: 0.28, a: 1 })
          .rounded(4)
          .cursorPointer()
          .hover((s) => s.bg({ r: 0.3, g: 0.3, b: 0.4, a: 1 }))
          .flex()
          .itemsCenter()
          .onClick(
            cx.listener((view, _event, _window, ecx) => {
              view.popupVisible = false;
              ecx.notify();
            })
          )
          .child(text("Close Menu").font("Inter").size(13).color({ r: 1, g: 0.6, b: 0.6, a: 1 }))
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
      .children_(
        text("Deferred & Anchored Elements")
          .font("Inter")
          .size(32)
          .color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Floating overlays with intelligent positioning")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .children_(
            text("Anchor Corner Selection")
              .font("Inter")
              .size(14)
              .color({ r: 0.8, g: 0.8, b: 0.9, a: 1 }),
            div()
              .flex()
              .flexRow()
              .gap(8)
              .flexWrap()
              .children_(
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
                    .child(text(corner).font("Inter").size(12).color({ r: 1, g: 1, b: 1, a: 1 }))
                )
              )
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .children_(
            text("Click area to position popup")
              .font("Inter")
              .size(14)
              .color({ r: 0.8, g: 0.8, b: 0.9, a: 1 }),
            div()
              .h(300)
              .bg({ r: 0.12, g: 0.12, b: 0.16, a: 1 })
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
                      .color({ r: 0.5, g: 0.5, b: 0.6, a: 1 })
                  : text("Click anywhere to show anchored popup")
                      .font("Inter")
                      .size(14)
                      .color({ r: 0.5, g: 0.5, b: 0.6, a: 1 })
              )
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .children_(
            text("Features:").font("Inter").size(14).color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
            text("• Deferred elements paint after normal content (always on top)")
              .font("Inter")
              .size(12)
              .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
            text("• Anchored elements position relative to a point")
              .font("Inter")
              .size(12)
              .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
            text("• Smart overflow handling: switch anchor or snap to edges")
              .font("Inter")
              .size(12)
              .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
            text("• Perfect for menus, tooltips, dropdowns, autocomplete")
              .font("Inter")
              .size(12)
              .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 })
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
      .children_(
        text("SVG Icon Rendering").font("Inter").size(32).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Material Design icons with color tinting and sizing")
          .font("Inter")
          .size(16)
          .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
        div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
        text("Built-in Icons (24x24)").font("Inter").size(18).color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .flexWrap()
          .children_(
            ...iconEntries.slice(0, 12).map(([name, pathData]) =>
              div()
                .flex()
                .flexCol()
                .gap(4)
                .itemsCenter()
                .children_(
                  div()
                    .w(48)
                    .h(48)
                    .rounded(8)
                    .bg({ r: 0.2, g: 0.2, b: 0.28, a: 1 })
                    .flex()
                    .itemsCenter()
                    .justifyCenter()
                    .child(svg(pathData).color({ r: 0.9, g: 0.9, b: 1, a: 1 }).size(24, 24)),
                  text(name).font("Inter").size(10).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
                )
            )
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Color Tinting").font("Inter").size(18).color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .flexWrap()
          .children_(
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
        text("Size Variations").font("Inter").size(18).color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .itemsEnd()
          .children_(
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                svg(SvgIcons.home).color({ r: 0.9, g: 0.9, b: 1, a: 1 }).size(16, 16),
                text("16px").font("Inter").size(10).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                svg(SvgIcons.home).color({ r: 0.9, g: 0.9, b: 1, a: 1 }).size(24, 24),
                text("24px").font("Inter").size(10).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                svg(SvgIcons.home).color({ r: 0.9, g: 0.9, b: 1, a: 1 }).size(32, 32),
                text("32px").font("Inter").size(10).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                svg(SvgIcons.home).color({ r: 0.9, g: 0.9, b: 1, a: 1 }).size(48, 48),
                text("48px").font("Inter").size(10).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                svg(SvgIcons.home).color({ r: 0.9, g: 0.9, b: 1, a: 1 }).size(64, 64),
                text("64px").font("Inter").size(10).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              )
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Embedded SVG File (gear.svg)")
          .font("Inter")
          .size(18)
          .color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .itemsCenter()
          .children_(
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                svg(gearSvgContent).color({ r: 0.9, g: 0.9, b: 1, a: 1 }).size(32, 32),
                text("32px").font("Inter").size(10).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                svg(gearSvgContent).color({ r: 1, g: 0.6, b: 0.2, a: 1 }).size(48, 48),
                text("48px Orange").font("Inter").size(10).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                svg(gearSvgContent).color({ r: 0.4, g: 0.8, b: 1, a: 1 }).size(64, 64),
                text("64px Blue").font("Inter").size(10).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              )
          ),
        div().h(1).bg({ r: 0.3, g: 0.3, b: 0.4, a: 0.5 }),
        text("Custom SVG Content").font("Inter").size(18).color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
        div()
          .flex()
          .flexRow()
          .gap(16)
          .itemsCenter()
          .children_(
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                svg(customSvg).color({ r: 0.4, g: 0.8, b: 1, a: 1 }).size(48, 48),
                text("Custom").font("Inter").size(10).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              ),
            div()
              .flex()
              .flexCol()
              .gap(4)
              .itemsCenter()
              .children_(
                svg(complexSvg).color({ r: 1, g: 0.7, b: 0.2, a: 1 }).size(48, 48),
                text("Star Path").font("Inter").size(10).color({ r: 0.6, g: 0.6, b: 0.7, a: 1 })
              )
          ),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .mt(8)
          .children_(
            text("Features:").font("Inter").size(14).color({ r: 0.9, g: 0.9, b: 1, a: 1 }),
            text("• Parse SVG path d attribute commands (M, L, C, Q, A, Z, etc.)")
              .font("Inter")
              .size(12)
              .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
            text("• Convert to Flash PathBuilder for GPU rendering")
              .font("Inter")
              .size(12)
              .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
            text("• Support relative and absolute coordinates")
              .font("Inter")
              .size(12)
              .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
            text("• Parse basic SVG elements: path, circle, rect, polygon")
              .font("Inter")
              .size(12)
              .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 }),
            text("• Color tinting and arbitrary sizing")
              .font("Inter")
              .size(12)
              .color({ r: 0.7, g: 0.7, b: 0.8, a: 1 })
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
      .children_(
        text("Clipboard").font("Inter").size(26).color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Cross-platform copy/paste powered by platform clipboards.")
          .font("Inter")
          .size(14)
          .color({ r: 0.78, g: 0.82, b: 0.94, a: 1 }),
        div()
          .flex()
          .flexCol()
          .gap(6)
          .bg(rgb(0x1f2937))
          .rounded(10)
          .border(1)
          .borderColor({ r: 0.25, g: 0.28, b: 0.38, a: 1 })
          .p(12)
          .children_(
            text("Capabilities").font("Inter").size(13).color({ r: 0.82, g: 0.86, b: 0.96, a: 1 }),
            text(capabilityText).font("Inter").size(12).color({ r: 0.7, g: 0.74, b: 0.82, a: 1 })
          ),
        div()
          .flex()
          .flexCol()
          .gap(6)
          .bg(rgb(0x111827))
          .rounded(12)
          .p(14)
          .border(1)
          .borderColor({ r: 0.23, g: 0.25, b: 0.34, a: 1 })
          .children_(
            text("Sample to copy")
              .font("Inter")
              .size(13)
              .color({ r: 0.86, g: 0.88, b: 0.96, a: 1 }),
            text(this.clipboardSample)
              .font("Inter")
              .size(16)
              .color({ r: 0.95, g: 0.96, b: 1, a: 1 })
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .children_(
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
          .bg(rgb(0x0b1220))
          .rounded(12)
          .p(14)
          .border(1)
          .borderColor({ r: 0.2, g: 0.22, b: 0.32, a: 1 })
          .children_(
            text("Last clipboard text")
              .font("Inter")
              .size(13)
              .color({ r: 0.82, g: 0.86, b: 0.96, a: 1 }),
            text(lastText).font("Inter").size(15).color({ r: 0.92, g: 0.94, b: 1, a: 1 })
          ),
        text(this.clipboardStatus).font("Inter").size(13).color({ r: 0.72, g: 0.76, b: 0.86, a: 1 })
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
      return button.child(text(label).font("Inter").size(13).color({ r: 1, g: 1, b: 1, a: 1 }));
    };

    const modalOverlay = this.focusModalOpen ? this.renderFocusModal(cx) : null;

    return div()
      .flex()
      .flexCol()
      .gap(16)
      .keyContext("focus-demo")
      .children_(
        text("Enhanced Focus & Tab Navigation")
          .font("Inter")
          .size(32)
          .color({ r: 1, g: 1, b: 1, a: 1 }),
        text("Tab stops, focus groups, context-aware keybindings, and focus restoration.")
          .font("Inter")
          .size(16)
          .color({ r: 0.75, g: 0.78, b: 0.88, a: 1 }),
        div().h(1).bg({ r: 0.3, g: 0.32, b: 0.38, a: 0.6 }),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .children_(
            text("• Tab/Shift+Tab respects custom tab indexes and focus groups.")
              .font("Inter")
              .size(13)
              .color({ r: 0.8, g: 0.82, b: 0.92, a: 1 }),
            text(
              "• Right arrow in the toolbar uses focusNextSibling(); Home jumps to the first child."
            )
              .font("Inter")
              .size(13)
              .color({ r: 0.8, g: 0.82, b: 0.92, a: 1 }),
            text(
              "• Enter logs the current key context chain; Escape closes the modal and restores focus."
            )
              .font("Inter")
              .size(13)
              .color({ r: 0.8, g: 0.82, b: 0.92, a: 1 }),
            text("• The red button focuses on mouse down via focusOnPress().")
              .font("Inter")
              .size(13)
              .color({ r: 0.8, g: 0.82, b: 0.92, a: 1 })
          ),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .keyContext("focus-demo.controls")
          .children_(
            text("Tab Stops").font("Inter").size(18).color({ r: 0.94, g: 0.95, b: 1, a: 1 }),
            div()
              .flex()
              .flexRow()
              .gap(12)
              .children_(
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
          .children_(
            text("Focus Group (Toolbar)")
              .font("Inter")
              .size(18)
              .color({ r: 0.94, g: 0.95, b: 1, a: 1 }),
            text(
              "Tab stays in the group first, Right arrow advances with focusNextSibling(), Home jumps to the first child."
            )
              .font("Inter")
              .size(13)
              .color({ r: 0.8, g: 0.82, b: 0.92, a: 1 }),
            div()
              .flex()
              .flexRow()
              .gap(10)
              .trackFocus(this.toolbarContainerHandle)
              .children_(
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
          .children_(
            text("Focus Restoration")
              .font("Inter")
              .size(18)
              .color({ r: 0.94, g: 0.95, b: 1, a: 1 }),
            text(
              "Open the modal to push focus; Escape or Close restores the previous focused control."
            )
              .font("Inter")
              .size(13)
              .color({ r: 0.8, g: 0.82, b: 0.92, a: 1 }),
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
          .bg({ r: 0.16, g: 0.17, b: 0.22, a: 1 })
          .rounded(10)
          .p(12)
          .children_(
            text(`Current Focus: ${focusedLabel}`)
              .font("Inter")
              .size(14)
              .color({ r: 0.9, g: 0.92, b: 1, a: 1 }),
            text(`Key Context Chain: ${contextLabel}`)
              .font("Inter")
              .size(14)
              .color({ r: 0.75, g: 0.78, b: 0.88, a: 1 }),
            text(`Focus Log: ${this.focusLog}`)
              .font("Inter")
              .size(14)
              .color({ r: 0.8, g: 0.82, b: 0.92, a: 1 })
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

    return div()
      .bg({ r: 0.12, g: 0.13, b: 0.17, a: 0.95 })
      .border(1)
      .borderColor({ r: 1, g: 1, b: 1, a: 0.08 })
      .rounded(12)
      .p(12)
      .gap(8)
      .flex()
      .flexCol()
      .keyContext("focus-demo.modal")
      .children_(
        text("Modal Focus").font("Inter").size(16).color({ r: 0.95, g: 0.96, b: 1, a: 1 }),
        text("Tab between modal buttons; Escape or Close restores focus.")
          .font("Inter")
          .size(13)
          .color({ r: 0.8, g: 0.82, b: 0.92, a: 1 }),
        div().h(1).bg({ r: 0.24, g: 0.26, b: 0.32, a: 1 }),
        div()
          .flex()
          .flexRow()
          .gap(10)
          .children_(
            div()
              .h(40)
              .px(14)
              .rounded(8)
              .bg(rgb(0x10b981))
              .border(2)
              .borderColor({ r: 1, g: 1, b: 1, a: 0.12 })
              .cursorPointer()
              .hover((s) => s.bg(rgb(0x059669)).shadow("md"))
              .focused((s) => s.borderColor(rgb(0xfcd34d)).shadow("lg"))
              .trackFocus(this.modalPrimaryHandle)
              .tabStop({ index: 8 })
              .onClick(
                cx.listener((view, _event, _window, ecx) => {
                  view.focusLog = "Modal confirm";
                  ecx.notify();
                })
              )
              .child(text("Confirm").font("Inter").size(13).color({ r: 1, g: 1, b: 1, a: 1 })),
            div()
              .h(40)
              .px(14)
              .rounded(8)
              .bg(rgb(0xef4444))
              .border(2)
              .borderColor({ r: 1, g: 1, b: 1, a: 0.12 })
              .cursorPointer()
              .hover((s) => s.bg(rgb(0xdc2626)).shadow("md"))
              .focused((s) => s.borderColor(rgb(0xfcd34d)).shadow("lg"))
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
              .child(text("Close").font("Inter").size(13).color({ r: 1, g: 1, b: 1, a: 1 }))
          )
      );
  }
}

async function main() {
  console.log("Initializing Flash App Demo...");

  const ctx = await createWebGPUContext({
    width: 1200,
    height: 900,
    title: "Flash App Demo",
  });

  const platform = createFlashPlatform(ctx);

  const app = new FlashApp({ platform });
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

  const platformAny = platform as { tick?: (time: number) => void };
  runWebGPURenderLoop(ctx, (time, _deltaTime) => {
    if (platformAny.tick) {
      platformAny.tick(time * 1000);
    }
  });
}

main().catch(console.error);
