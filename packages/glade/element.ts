/**
 * Element base classes and View trait for Glade.
 *
 * Elements are lightweight, declarative descriptions of UI.
 * They're created fresh each render and converted to GPU primitives.
 *
 * Three-phase lifecycle (inspired by GPUI):
 * 1. requestLayout() - Create layout nodes, return LayoutId + RequestLayoutState
 * 2. prepaint() - Run after layout computation, return PrepaintState
 * 3. paint() - Emit GPU primitives using PrepaintState
 */

import { type Color, type ColorObject, rgb, toColorObject } from "@glade/utils";

import type { Bounds } from "./bounds.ts";
import type { GladeContext, GladeViewContext } from "./context.ts";
// Note: PopoverRegistration and DialogRegistration imports removed
// These are no longer needed as overlays render via deferred children
import type { DeferredDrawEntry, DeferredLayoutEntry } from "./deferred.ts";
import type { EventHandlers, HitTestNode } from "./dispatch.ts";
import type { FocusHandle, ScrollHandle } from "./entity.ts";
import type { Hitbox, HitboxId } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";
import type { DecodedImage, ImageTile } from "./image.ts";
import type { LayoutId } from "./layout.ts";
import type { PathBuilder } from "./path.ts";
import type { GladeScene } from "./scene.ts";
import type { ScrollOffset } from "./scroll.ts";
import type { CursorStyle, ObjectFit, Styles, WhitespaceMode } from "./styles.ts";
import type { TabStopConfig } from "./tab.ts";
import { type CachedTextLayout, createCachedTextLayout, normalizeWhitespace } from "./text.ts";
import type { Theme } from "./theme.ts";
import type { TooltipConfig } from "./tooltip.ts";
import type { ContentMask, FocusId, TransformationMatrix } from "./types.ts";
import type { GladeWindow as _GladeWindow } from "./window.ts";

/**
 * Debug information attached to elements for inspector mode.
 */
export interface ElementDebugMeta {
  /** Optional source location (file:line) for debugging */
  sourceLocation?: string;
  /** Optional custom debug label */
  debugLabel?: string;
}

declare const __globalElementIdBrand: unique symbol;
export type GlobalElementId = number & { [__globalElementIdBrand]: true };

declare const __dispatchNodeIdBrand: unique symbol;
export type DispatchNodeId = number & { [__dispatchNodeIdBrand]: true };

/**
 * Marker type for elements that don't need state between phases.
 */
export type NoState = void;

export type UnderlineStyle = "solid" | "wavy";

/**
 * Result of the requestLayout phase.
 */
export interface RequestLayoutResult<R> {
  layoutId: LayoutId;
  requestState: R;
}

// ============ View Traits ============

/**
 * A view is an entity that can render a tree of elements.
 * Analogous to a React component or GPUI View.
 */
export interface GladeView {
  render(cx: GladeViewContext<this>): AnyGladeElement;
}

/**
 * Marker for stateless components that are consumed on render.
 * Similar to GPUI's RenderOnce.
 */
export interface GladeRenderOnce {
  render(cx: GladeViewContext<never>): AnyGladeElement;
}

// ============ Phase Contexts ============

/**
 * Context for the requestLayout phase.
 * Creates layout nodes in the Taffy tree.
 */
export interface RequestLayoutContext {
  /**
   * Stable identity for the current element in this frame.
   */
  readonly elementId: GlobalElementId;

  /**
   * Request layout for an element with the given styles and children.
   * Returns a layout ID that can be used to get computed bounds.
   */
  requestLayout(styles: Partial<Styles>, childLayoutIds: LayoutId[]): LayoutId;

  /**
   * Request layout for a measurable element (e.g., text).
   * The measureId is used during layout to call back for measurement.
   */
  requestMeasurableLayout(styles: Partial<Styles>, measureId: number): LayoutId;

  /**
   * Register text for measurement during layout.
   * Returns a measure ID that will be used in the callback.
   */
  registerTextMeasure(data: {
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: number;
    fontStyle: "normal" | "italic" | "oblique";
    lineHeight: number;
    noWrap: boolean;
    maxWidth: number | null;
    underlineSpace?: number;
  }): number;

  /**
   * Measure text with the given options.
   */
  measureText(
    text: string,
    options: {
      fontSize: number;
      fontFamily: string;
      fontWeight: number;
      lineHeight?: number;
      maxWidth?: number;
    }
  ): { width: number; height: number };

  /**
   * Get persistent state cached across frames for this element.
   */
  getPersistentState<T = unknown>(): T | undefined;

  /**
   * Set persistent state to cache across frames for this element.
   */
  setPersistentState<T = unknown>(state: T): void;

  /**
   * Allocate a new element ID for a child element.
   */
  allocateChildId(): GlobalElementId;

  /**
   * Get the current scroll offset for a scroll handle.
   * Allows virtual lists to know scroll position during layout.
   */
  getScrollOffset(handle: ScrollHandle): ScrollOffset;

  /**
   * Get the active theme.
   */
  getTheme(): Theme;

  /**
   * Get the window size.
   */
  getWindowSize(): { width: number; height: number };
}

/**
 * Context for the prepaint phase.
 * Runs after layout computation, before painting.
 */
export interface PrepaintContext {
  /**
   * Stable identity for the current element.
   */
  readonly elementId: GlobalElementId;

  /**
   * Get the window instance.
   */
  getWindow(): _GladeWindow;

  /**
   * Get the computed bounds for a layout ID.
   */
  getBounds(layoutId: LayoutId): Bounds;

  /**
   * Get the computed bounds for child layout IDs.
   */
  getChildLayouts(parentBounds: Bounds, childLayoutIds: LayoutId[]): Bounds[];

  /**
   * Get persistent state cached across frames for this element.
   */
  getPersistentState<T = unknown>(): T | undefined;

  /**
   * Set persistent state to cache across frames for this element.
   */
  setPersistentState<T = unknown>(state: T): void;

  /**
   * Create a child context with a specific element ID.
   */
  withElementId(elementId: GlobalElementId): PrepaintContext;

  /**
   * Insert a hitbox for the current frame.
   * Returns the hitbox for later hover/active checking.
   */
  insertHitbox(bounds: Bounds, behavior?: HitboxBehavior, cursor?: CursorStyle): Hitbox;

  /**
   * Add a hitbox to a group for coordinated hover/active effects.
   */
  addGroupHitbox(groupName: string, hitboxId: HitboxId): void;

  /**
   * Register a drop target for drag and drop.
   * Called during prepaint for elements with onDrop handlers.
   */
  registerDropTarget(hitboxId: HitboxId, canDrop: boolean): void;

  /**
   * Register a tooltip for an element.
   */
  registerTooltip(
    hitboxId: HitboxId,
    bounds: Bounds,

    builder: (cx: GladeContext) => AnyGladeElement,
    config: TooltipConfig
  ): void;

  // Note: registerPopover and registerDialog removed
  // Overlays now render via deferred children in their respective elements

  /**
   * Update the content and viewport size for a scroll handle.
   * This allows proper scroll offset clamping.
   */
  updateScrollContentSize(
    handle: ScrollHandle,
    contentSize: { width: number; height: number },
    viewportSize: { width: number; height: number },
    viewportOrigin: { x: number; y: number }
  ): void;

  /**
   * Get the current scroll offset for a scroll handle.
   */
  getScrollOffset(handle: ScrollHandle): ScrollOffset;

  /**
   * Register a deferred draw entry.
   * The element will be painted after all normal elements in priority order.
   */
  registerDeferredDraw?(entry: DeferredDrawEntry): void;

  /**
   * Register an element for deferred layout processing.
   * The element will get a separate layout pass with window dimensions after the main tree prepaint.
   * This allows overlay content (menus, dialogs) to be laid out with full window space.
   */
  registerDeferredLayout?(entry: DeferredLayoutEntry): void;

  /**
   * Get the window size for overflow calculations (e.g., anchored elements).
   */
  getWindowSize?(): { width: number; height: number };

  /**
   * Register a tab stop for keyboard navigation.
   */
  registerTabStop?(focusId: FocusId, bounds: Bounds, config: TabStopConfig): void;

  /**
   * Get the computed wrap width for a text element.
   * Returns the effectiveMaxWidth that was used during measurement.
   * This ensures prepaint uses the exact same wrap constraint as measurement.
   */
  getComputedWrapWidth?(measureId: number): number | undefined;

  /**
   * Compute layout for a floating element (like a submenu) that is not part of the main layout tree.
   * This runs a separate layout computation for the given layout ID.
   * Returns the computed bounds.
   */
  computeFloatingLayout?(
    layoutId: LayoutId,
    availableWidth: number,
    availableHeight: number
  ): Bounds;

  /**
   * Get an image tile from the cache, uploading if necessary.
   * Content-addressable: identical images share the same tile.
   */
  getImageTile(image: DecodedImage): ImageTile;
}

/**
 * Context for the paint phase.
 * Provides access to scene graph and state queries.
 */
export interface PaintContext {
  /** The scene to paint primitives into. */
  scene: GladeScene;

  /** The device pixel ratio. */
  devicePixelRatio: number;

  /** Stable identity for the current element. */
  readonly elementId: GlobalElementId;

  /**
   * Check if the given bounds are currently hovered.
   */
  isHovered(bounds: Bounds): boolean;

  /**
   * Check if the given bounds are currently active (mouse down).
   */
  isActive(bounds: Bounds): boolean;

  /**
   * Check if the given focus handle is focused.
   */
  isFocused(handle: FocusHandle): boolean;

  /**
   * Get the current scroll offset for a scroll handle.
   */
  getScrollOffset(handle: ScrollHandle): ScrollOffset;

  /**
   * Get the computed bounds for child layout IDs.
   */
  getChildLayouts(parentBounds: Bounds, childLayoutIds: LayoutId[]): Bounds[];

  /**
   * Measure text with the given options.
   */
  measureText(
    text: string,
    options: {
      fontSize: number;
      fontFamily: string;
      fontWeight: number;
      lineHeight?: number;
      maxWidth?: number;
    }
  ): { width: number; height: number };

  /**
   * Paint a rectangle primitive.
   */
  paintRect(bounds: Bounds, styles: Partial<Styles>): void;

  /**
   * Paint a shadow primitive.
   */
  paintShadow(bounds: Bounds, styles: Partial<Styles>): void;

  /**
   * Paint a border primitive.
   */
  paintBorder(bounds: Bounds, styles: Partial<Styles>): void;

  /**
   * Paint text glyphs.
   */
  paintGlyphs(
    text: string,
    bounds: Bounds,
    color: Color,
    options: {
      fontSize: number;
      fontFamily: string;
      fontWeight: number;
      fontStyle?: "normal" | "italic" | "oblique";
      lineHeight?: number;
      maxWidth?: number;
    }
  ): void;

  /**
   * Paint a path primitive.
   */
  paintPath(path: PathBuilder, color: Color): void;

  /**
   * Paint a cached path (pre-tessellated vertices and indices).
   * Vertices include optional edgeDist for antialiasing (0.0 = edge, 1.0 = interior).
   */
  paintCachedPath(
    vertices: Array<{ x: number; y: number; edgeDist?: number }>,
    indices: number[],
    bounds: Bounds,
    color: Color
  ): void;

  /**
   * Paint an underline primitive.
   */
  paintUnderline(
    x: number,
    y: number,
    width: number,
    thickness: number,
    color: Color,
    style: UnderlineStyle,
    options?: { wavelength?: number; amplitude?: number }
  ): void;

  /**
   * Paint an image primitive.
   */
  paintImage(
    tile: ImageTile,
    bounds: Bounds,
    options?: {
      cornerRadius?: number;
      opacity?: number;
      grayscale?: boolean;
    }
  ): void;

  /**
   * Paint a host texture primitive (WebGPU host content).
   */
  paintHostTexture(
    textureView: GPUTextureView,
    bounds: Bounds,
    options?: {
      cornerRadius?: number;
      opacity?: number;
    }
  ): void;

  /**
   * Get persistent state cached across frames for this element.
   */
  getPersistentState<T = unknown>(): T | undefined;

  /**
   * Set persistent state to cache across frames for this element.
   */
  setPersistentState<T = unknown>(state: T): void;

  /**
   * Create a child context with a specific element ID.
   */
  withElementId(elementId: GlobalElementId): PaintContext;

  /**
   * Execute a callback with content clipped to the given mask.
   * Content painted inside the callback will be clipped to the mask bounds.
   */
  withContentMask(mask: ContentMask, callback: () => void): void;

  /**
   * Execute a callback with a transform applied.
   * Primitives painted inside the callback will have the transform applied.
   * Transforms are composed (multiplied) with any existing transform.
   */
  withTransform(transform: TransformationMatrix, callback: () => void): void;

  /**
   * Check if a hitbox is currently hovered.
   */
  isHitboxHovered(hitbox: Hitbox): boolean;

  /**
   * Check if a group is hovered.
   */
  isGroupHovered(groupName: string): boolean;

  /**
   * Check if a group is active (hovered with mouse down).
   */
  isGroupActive(groupName: string): boolean;

  /**
   * Check if there's an active drag operation.
   */
  isDragging(): boolean;

  /**
   * Check if this element (by hitbox) is being dragged over.
   */
  isDragOver(hitbox: Hitbox): boolean;

  /**
   * Check if the current drag can be dropped on this element.
   */
  canDropOnHitbox(hitbox: Hitbox): boolean;

  /**
   * Execute a callback within a stacking context.
   * Stacking contexts are created for elements with z-index, transforms, or opacity < 1.
   * All primitives painted inside the callback use the stacking context for z-ordering.
   *
   * @param bounds - The bounds of the stacking context
   * @param zIndex - The z-index for this stacking context
   * @param callback - The paint callback to execute within the stacking context
   */
  withStackingContext(bounds: Bounds, zIndex: number, callback: () => void): void;

  /**
   * Get the computed wrap width for a text element by its measure ID.
   * Returns the effectiveMaxWidth that was used during measurement.
   * This ensures paint uses the exact same wrap constraint as measurement.
   */
  getComputedWrapWidth(measureId: number): number | undefined;

  /**
   * Get the window instance.
   */
  getWindow(): _GladeWindow;

  /**
   * Get an image tile from the cache, uploading if necessary.
   * Content-addressable: identical images share the same tile.
   */
  getImageTile(image: DecodedImage): ImageTile;
}

// ============ Element Base Classes ============

/**
 * Base class for all Glade elements.
 * Elements are lightweight, declarative descriptions of UI.
 * They're created fresh each render and converted to GPU primitives.
 *
 * Three-phase lifecycle:
 * 1. requestLayout() - Create layout nodes, return state for prepaint
 * 2. prepaint() - Post-layout processing, return state for paint
 * 3. paint() - Emit GPU primitives
 *
 * @typeParam RequestLayoutState - State returned from requestLayout, passed to prepaint
 * @typeParam PrepaintState - State returned from prepaint, passed to paint
 */
export abstract class GladeElement<RequestLayoutState = NoState, PrepaintState = NoState> {
  /** Debug metadata for inspector mode */
  protected debugMeta: ElementDebugMeta = {};

  /**
   * Set debug source location (for inspector).
   */
  debugSource(location: string): this {
    this.debugMeta.sourceLocation = location;
    return this;
  }

  /**
   * Set debug label (for inspector).
   */
  debugLabel(label: string): this {
    this.debugMeta.debugLabel = label;
    return this;
  }

  /**
   * Get debug metadata.
   */
  getDebugMeta(): Readonly<ElementDebugMeta> {
    return this.debugMeta;
  }

  /**
   * Get the element type name for debugging.
   */
  getTypeName(): string {
    return this.constructor.name;
  }
  /**
   * Phase 1: Request layout.
   *
   * Create Taffy nodes for this element and its children.
   * Returns a LayoutId plus any state needed for prepaint.
   */
  abstract requestLayout(cx: RequestLayoutContext): RequestLayoutResult<RequestLayoutState>;

  /**
   * Phase 2: Prepaint - runs after layout is computed.
   *
   * @param cx - The prepaint context
   * @param bounds - The computed bounds for this element
   * @param requestState - The state returned from requestLayout
   * @returns State needed for the paint phase
   */
  abstract prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: RequestLayoutState
  ): PrepaintState;

  /**
   * Phase 3: Paint - emit GPU primitives.
   *
   * @param cx - The paint context
   * @param bounds - The computed bounds for this element
   * @param prepaintState - The state returned from prepaint
   */
  abstract paint(cx: PaintContext, bounds: Bounds, prepaintState: PrepaintState): void;

  /**
   * Build hit test tree for event dispatch.
   */
  abstract hitTest(bounds: Bounds, childBounds: Bounds[]): HitTestNode | null;
}

/**
 * Many uses of GladeElement don't depend on state, so we don't need to keep
 * specifying types everywhere.
 */
export type AnyGladeElement = GladeElement<any, any>;

/**
 * An element that can contain children.
 */
export abstract class GladeContainerElement<
  RequestLayoutState = NoState,
  PrepaintState = NoState,
> extends GladeElement<RequestLayoutState, PrepaintState> {
  // TODO: we should definitely be able to type the children

  protected _children: AnyGladeElement[] = [];
  protected childLayoutIds: LayoutId[] = [];

  /**
   * Add a child element.
   */

  child(element: AnyGladeElement | string | number): this {
    if (typeof element === "string" || typeof element === "number") {
      this._children.push(new GladeTextElement(String(element)));
    } else {
      this._children.push(element);
    }
    return this;
  }

  /**
   * Add multiple children.
   */

  children(...elements: Array<AnyGladeElement | string | number | null | undefined>): this {
    for (const el of elements) {
      if (el != null) {
        this.child(el);
      }
    }
    return this;
  }

  /**
   * Add multiple children (nullable-friendly).
   */

  children_(...elements: Array<AnyGladeElement | string | number | null | undefined>): this {
    for (const el of elements) {
      if (el != null) {
        this.child(el);
      }
    }
    return this;
  }

  /**
   * Get the child elements.
   */

  getChildren(): readonly AnyGladeElement[] {
    return this._children;
  }
}

// ============ Text Element ============

/**
 * Request layout state for text element - carries measureId from layout to prepaint.
 */
interface TextRequestLayoutState {
  measureId: number;
  fontFamily: string;
}

/**
 * Prepaint state for text element - carries measureId from prepaint to paint.
 */
interface TextPrepaintState {
  bounds: Bounds;
  hitbox: Hitbox | null;
  handlers: EventHandlers;
  hitTestNode?: HitTestNode;
  measureId: number;
  textColor: ColorObject;
  fontFamily: string;
}

/**
 * Simple text element with optional selection support.
 *
 * By default, text is not selectable. Call `.selectable()` to enable selection.
 * By default, text wraps to fit its parent container. Call `.noWrap()` to disable.
 */
export class GladeTextElement extends GladeElement<TextRequestLayoutState, TextPrepaintState> {
  private textColor: ColorObject = { r: 1, g: 1, b: 1, a: 1 };
  private hasCustomTextColor = false;
  private fontSize = 14;
  private fontFamily: string | null = null;
  private resolvedFontFamily: string | null = null;
  private fontWeight = 400;
  private fontStyle: "normal" | "italic" | "oblique" = "normal";
  private lineHeightValue: number | null = null;
  private maxWidthValue: number | null = null;
  private noWrapValue = false;
  private whitespaceMode: WhitespaceMode = "normal";

  // Selection support
  private isSelectable = false;
  private selectionColorValue: ColorObject = { ...rgb(0x3b82f6), a: 0.35 };

  // Underline support
  private underlineEnabled = false;
  private underlineStyle: UnderlineStyle = "solid";
  private underlineColorOverride: ColorObject | null = null;
  private underlineThickness = 1;
  private underlineWavelength?: number;
  private underlineAmplitude?: number;

  // Cached layout for hit testing and selection rendering
  private cachedLayout: CachedTextLayout | null = null;
  private cachedLayoutKey = "";

  constructor(private textContent: string) {
    super();
  }

  color(c: Color): this {
    this.textColor = toColorObject(c);
    this.hasCustomTextColor = true;
    return this;
  }

  size(v: number): this {
    this.fontSize = v;
    return this;
  }

  font(family: string): this {
    this.fontFamily = family;
    return this;
  }

  weight(v: number): this {
    this.fontWeight = v;
    return this;
  }

  /**
   * Set the font to italic style.
   */
  italic(): this {
    this.fontStyle = "italic";
    return this;
  }

  /**
   * Set the font to oblique style.
   */
  oblique(): this {
    this.fontStyle = "oblique";
    return this;
  }

  /**
   * Set font style explicitly.
   */
  style(s: "normal" | "italic" | "oblique"): this {
    this.fontStyle = s;
    return this;
  }

  lineHeight(v: number): this {
    this.lineHeightValue = v;
    return this;
  }

  maxWidth(width: number): this {
    this.maxWidthValue = width;
    return this;
  }

  /**
   * Disable text wrapping. Text will extend to its natural width.
   * Also sets whitespace mode to "nowrap" which collapses newlines.
   */
  noWrap(): this {
    this.noWrapValue = true;
    // noWrap implies whitespace: nowrap (collapse newlines)
    if (this.whitespaceMode === "normal") {
      this.whitespaceMode = "nowrap";
    }
    return this;
  }

  /**
   * Set whitespace handling mode (CSS white-space equivalent).
   * - "normal" (default): Collapse whitespace (including newlines), wrap text
   * - "nowrap": Collapse whitespace, no wrapping
   * - "pre": Preserve all whitespace, no wrapping
   * - "pre-wrap": Preserve all whitespace, wrap text
   * - "pre-line": Preserve newlines, collapse other whitespace, wrap text
   */
  whitespace(mode: WhitespaceMode): this {
    this.whitespaceMode = mode;
    return this;
  }

  /**
   * Expand to fill the parent's available width (flex-grow 1 with auto basis).
   */
  block(): this {
    // Using flexGrow/basis lets this participate in flex layouts without forcing flexDirection.
    // This mirrors a block-level feel in row contexts.
    // We avoid flexShrink override to keep default shrink behavior.
    this.maxWidthValue = this.maxWidthValue ?? 1_000_000;
    return this;
  }

  /**
   * Preserve all whitespace, no wrapping (like HTML <pre>).
   */
  pre(): this {
    return this.whitespace("pre");
  }

  /**
   * Preserve newlines, collapse other whitespace, wrap text.
   */
  preLine(): this {
    return this.whitespace("pre-line");
  }

  /**
   * Preserve all whitespace, wrap text.
   */
  preWrap(): this {
    return this.whitespace("pre-wrap");
  }

  /**
   * Enable text selection for this element.
   * When enabled, users can select text with mouse and copy with Cmd+C.
   */
  selectable(): this {
    this.isSelectable = true;
    return this;
  }

  /**
   * Set the selection highlight color.
   */
  selectionColor(c: Color): this {
    this.selectionColorValue = toColorObject(c);
    return this;
  }

  underlined(options?: {
    style?: UnderlineStyle;
    color?: Color;
    thickness?: number;
    wavelength?: number;
    amplitude?: number;
  }): this {
    this.underlineEnabled = true;
    if (options?.style) {
      this.underlineStyle = options.style;
    }
    if (options?.color) {
      this.underlineColorOverride = toColorObject(options.color);
    }
    if (options?.thickness !== undefined) {
      this.underlineThickness = options.thickness;
    }
    if (options?.wavelength !== undefined) {
      this.underlineWavelength = options.wavelength;
    }
    if (options?.amplitude !== undefined) {
      this.underlineAmplitude = options.amplitude;
    }
    return this;
  }

  private getLineHeight(): number {
    return this.lineHeightValue ?? this.fontSize * 1.2;
  }

  private getUnderlineSpace(): number {
    if (!this.underlineEnabled) {
      return 0;
    }
    const amplitude = this.underlineAmplitude ?? 1;
    if (this.underlineStyle === "wavy") {
      return this.underlineThickness + amplitude * 2 + 2;
    }
    return this.underlineThickness + 2;
  }

  private getLayoutWithWrapWidth(
    wrapWidth: number | undefined,
    fontFamily: string
  ): CachedTextLayout {
    const lineHeight = this.getLineHeight();
    const normalizedText = normalizeWhitespace(this.textContent, this.whitespaceMode);
    const key = `${normalizedText}|${this.fontSize}|${lineHeight}|${fontFamily}|${wrapWidth ?? ""}|${this.whitespaceMode}`;

    if (this.cachedLayout && this.cachedLayoutKey === key) {
      return this.cachedLayout;
    }

    this.cachedLayout = createCachedTextLayout(
      normalizedText,
      this.fontSize,
      lineHeight,
      fontFamily,
      wrapWidth
    );
    this.cachedLayoutKey = key;
    return this.cachedLayout;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<TextRequestLayoutState> {
    const theme = cx.getTheme();
    const fontFamily = this.fontFamily ?? theme.fonts.sans.name;
    this.resolvedFontFamily = fontFamily;
    const lineHeight = this.getLineHeight();

    // Normalize whitespace before measurement
    const normalizedText = normalizeWhitespace(this.textContent, this.whitespaceMode);

    // Determine if wrapping is allowed based on whitespace mode
    // pre and nowrap modes disable wrapping
    const allowWrap = this.whitespaceMode !== "nowrap" && this.whitespaceMode !== "pre";
    const effectiveNoWrap = this.noWrapValue || !allowWrap;

    // Register with window for measure callback during layout
    const measureId = cx.registerTextMeasure({
      text: normalizedText,
      fontSize: this.fontSize,
      fontFamily,
      fontWeight: this.fontWeight,
      fontStyle: this.fontStyle,
      lineHeight,
      noWrap: effectiveNoWrap,
      maxWidth: this.maxWidthValue,
      underlineSpace: this.getUnderlineSpace(),
    });

    // Create a measurable leaf node - Taffy will call back during layout
    // to get the actual size based on available space from parent
    const layoutId = cx.requestMeasurableLayout(
      {
        // If maxWidth is set, use it as a max constraint
        maxWidth: this.maxWidthValue ?? undefined,
      },
      measureId
    );

    // Pass measureId through state so paint can retrieve the computed wrap width
    return { layoutId, requestState: { measureId, fontFamily } };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: TextRequestLayoutState
  ): TextPrepaintState {
    const theme = cx.getWindow().getTheme();
    const fontFamily = requestState.fontFamily ?? this.resolvedFontFamily ?? theme.fonts.sans.name;
    const resolvedTextColor = this.hasCustomTextColor
      ? this.textColor
      : theme.components.text.foreground;
    let hitbox: Hitbox | null = null;

    // Register with cross-element selection manager if selectable
    if (this.isSelectable) {
      // Get the computed wrap width to ensure layout matches actual rendering
      let wrapWidth: number | undefined;
      if (this.noWrapValue || this.whitespaceMode === "nowrap" || this.whitespaceMode === "pre") {
        wrapWidth = undefined;
      } else {
        wrapWidth = cx.getComputedWrapWidth?.(requestState.measureId);
      }
      const layout = this.getLayoutWithWrapWidth(wrapWidth, fontFamily);
      const window = cx.getWindow();
      const manager = window.getCrossElementSelection();
      const key = manager.computeKeyForRegistration(this.textContent, bounds);
      manager.registerElement(key, this.textContent, bounds, layout, true);

      // Create hitbox with text cursor for selectable text
      hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal, "text");
    }

    return {
      bounds,
      hitbox,
      handlers: {},
      hitTestNode: undefined,
      measureId: requestState.measureId,
      textColor: resolvedTextColor,
      fontFamily,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: TextPrepaintState): void {
    const lineHeight = this.getLineHeight();
    const fontFamily = prepaintState.fontFamily;

    // Normalize whitespace before rendering
    const normalizedText = normalizeWhitespace(this.textContent, this.whitespaceMode);

    // Retrieve the wrap width that was computed during measurement.
    // This ensures paint uses the EXACT same constraint as measurement.
    let wrapWidth: number | undefined;
    if (this.noWrapValue || this.whitespaceMode === "nowrap" || this.whitespaceMode === "pre") {
      // Explicitly disabled wrapping
      wrapWidth = undefined;
    } else {
      // Get the wrap width that was actually used during measurement
      wrapWidth = cx.getComputedWrapWidth(prepaintState.measureId);
    }

    // Selection rendering is handled by CrossElementSelectionManager
    // Just render the text glyphs
    cx.paintGlyphs(normalizedText, bounds, prepaintState.textColor, {
      fontSize: this.fontSize,
      fontFamily,
      fontWeight: this.fontWeight,
      fontStyle: this.fontStyle,
      lineHeight,
      maxWidth: wrapWidth,
    });

    if (this.underlineEnabled) {
      const layout = this.getLayoutWithWrapWidth(wrapWidth, fontFamily);
      const lastLine = layout.lines[layout.lines.length - 1];
      if (lastLine) {
        const underlineY = bounds.y + lastLine.y + this.fontSize * 1.1;
        const underlineWidth = Math.min(bounds.width, lastLine.width);
        const underlineColor = this.underlineColorOverride ?? prepaintState.textColor;
        cx.paintUnderline(
          bounds.x,
          underlineY,
          underlineWidth,
          this.underlineThickness,
          underlineColor,
          this.underlineStyle,
          { wavelength: this.underlineWavelength, amplitude: this.underlineAmplitude }
        );
      }
    }
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    // Selection is now handled by CrossElementSelectionManager
    return null;
  }
}

/**
 * Factory function to create a text element.
 */
export function text(content: string): GladeTextElement {
  return new GladeTextElement(content);
}

// ============ Image Element ============

/**
 * Image element for rendering decoded images.
 * Images are automatically cached and deduplicated by content.
 *
 * Provides a Tailwind-like sizing API consistent with GladeDiv:
 * - .w(), .wFull(), .wMin(), .wMax() for width control
 * - .h(), .hFull(), .hMin(), .hMax() for height control
 * - .size() for setting both dimensions
 *
 * Supports object-fit modes for controlling how images fill their bounds:
 * - scale-down (default): Shrink to fit, never enlarge, preserve aspect ratio
 * - contain: Scale to fit within bounds, preserve aspect ratio
 * - cover: Scale to cover bounds, crop edges, preserve aspect ratio
 * - fill: Stretch to fill bounds, may distort aspect ratio
 * - none: Display at natural size
 *
 * Uses Taffy's native aspect-ratio support for efficient layout computation.
 */
export class GladeImageElement extends GladeElement<NoState, NoState> {
  private styles: Partial<Styles> = {};
  private objectFitValue: ObjectFit = "scale-down";
  private cornerRadiusValue = 0;
  private opacityValue = 1;
  private grayscaleValue = false;
  private readonly aspectRatio: number;

  constructor(private image: DecodedImage) {
    super();
    this.aspectRatio = image.width / image.height;
  }

  // ============ Sizing Methods (Tailwind-like, consistent with GladeDiv) ============

  /** Set width */
  w(v: number | string): this {
    this.styles.width = v;
    return this;
  }

  /** Set width to 100% */
  wFull(): this {
    this.styles.width = "100%";
    return this;
  }

  /** Set minimum width */
  wMin(v: number): this {
    this.styles.minWidth = v;
    return this;
  }

  /** Set maximum width */
  wMax(v: number): this {
    this.styles.maxWidth = v;
    return this;
  }

  /** Set height */
  h(v: number | string): this {
    this.styles.height = v;
    return this;
  }

  /** Set height to 100% */
  hFull(): this {
    this.styles.height = "100%";
    return this;
  }

  /** Set minimum height */
  hMin(v: number): this {
    this.styles.minHeight = v;
    return this;
  }

  /** Set maximum height */
  hMax(v: number): this {
    this.styles.maxHeight = v;
    return this;
  }

  /** Set both width and height */
  size(w: number, h: number): this {
    this.styles.width = w;
    this.styles.height = h;
    return this;
  }

  // ============ Object Fit ============

  /** Set object-fit behavior */
  objectFit(fit: ObjectFit): this {
    this.objectFitValue = fit;
    return this;
  }

  /** Shorthand for objectFit("contain") */
  contain(): this {
    this.objectFitValue = "contain";
    return this;
  }

  /** Shorthand for objectFit("cover") */
  cover(): this {
    this.objectFitValue = "cover";
    return this;
  }

  /** Shorthand for objectFit("fill") */
  fill(): this {
    this.objectFitValue = "fill";
    return this;
  }

  // ============ Visual Effects ============

  /** Set the corner radius for rounded image corners */
  rounded(radius: number): this {
    this.cornerRadiusValue = radius;
    return this;
  }

  /** Set the opacity (0-1) */
  opacity(value: number): this {
    this.opacityValue = value;
    return this;
  }

  /** Enable grayscale rendering */
  grayscale(enabled = true): this {
    this.grayscaleValue = enabled;
    return this;
  }

  // ============ Lifecycle ============

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<NoState> {
    const hasExplicitWidth = this.styles.width !== undefined;
    const hasExplicitHeight = this.styles.height !== undefined;

    const layoutStyles: Partial<Styles> = {
      ...this.styles,
      // Default maxWidth: 100% unless explicitly set - prevents overflow
      maxWidth: this.styles.maxWidth ?? "100%",
    };

    // Only use aspectRatio when we need Taffy to calculate a missing dimension
    // If both dimensions are set, we want the exact box size (object-fit handles rendering)
    if (hasExplicitWidth && hasExplicitHeight) {
      // Both dimensions set - use exact box, no aspect ratio
    } else if (hasExplicitWidth || hasExplicitHeight) {
      // One dimension set - use aspect ratio to calculate the other
      layoutStyles.aspectRatio = this.aspectRatio;
    } else {
      // Neither dimension set - use natural width with aspect ratio
      layoutStyles.width = this.image.width;
      layoutStyles.aspectRatio = this.aspectRatio;
    }

    return {
      layoutId: cx.requestLayout(layoutStyles, []),
      requestState: undefined,
    };
  }

  prepaint(_cx: PrepaintContext, _bounds: Bounds, _requestState: NoState): NoState {
    return undefined;
  }

  paint(cx: PaintContext, bounds: Bounds, _prepaintState: NoState): void {
    const tile = cx.getImageTile(this.image);

    // Calculate render bounds based on objectFit
    const renderBounds = this.calculateObjectFitBounds(bounds, this.image.width, this.image.height);

    // For cover mode (or any mode where render bounds exceed element bounds),
    // we need to clip to the element bounds with corner radius
    const needsClipping =
      this.objectFitValue === "cover" ||
      renderBounds.width > bounds.width ||
      renderBounds.height > bounds.height;

    if (needsClipping && this.cornerRadiusValue > 0) {
      // Clip to element bounds with corner radius, then paint image without corner radius
      cx.withContentMask({ bounds, cornerRadius: this.cornerRadiusValue }, () => {
        cx.paintImage(tile, renderBounds, {
          cornerRadius: 0,
          opacity: this.opacityValue,
          grayscale: this.grayscaleValue,
        });
      });
    } else {
      // No clipping needed - apply corner radius directly to image
      cx.paintImage(tile, renderBounds, {
        cornerRadius: this.cornerRadiusValue,
        opacity: this.opacityValue,
        grayscale: this.grayscaleValue,
      });
    }
  }

  private calculateObjectFitBounds(
    elementBounds: Bounds,
    imageWidth: number,
    imageHeight: number
  ): Bounds {
    const { x, y, width: boxWidth, height: boxHeight } = elementBounds;
    const imageAspect = imageWidth / imageHeight;
    const boxAspect = boxWidth / boxHeight;

    switch (this.objectFitValue) {
      case "fill":
        // Stretch to fill, may distort
        return elementBounds;

      case "none":
        // Natural size, centered
        return {
          x: x + (boxWidth - imageWidth) / 2,
          y: y + (boxHeight - imageHeight) / 2,
          width: imageWidth,
          height: imageHeight,
        };

      case "contain": {
        // Fit within bounds, preserve aspect ratio
        let renderWidth: number;
        let renderHeight: number;
        if (imageAspect > boxAspect) {
          // Image is wider than box
          renderWidth = boxWidth;
          renderHeight = boxWidth / imageAspect;
        } else {
          // Image is taller than box
          renderHeight = boxHeight;
          renderWidth = boxHeight * imageAspect;
        }
        return {
          x: x + (boxWidth - renderWidth) / 2,
          y: y + (boxHeight - renderHeight) / 2,
          width: renderWidth,
          height: renderHeight,
        };
      }

      case "cover": {
        // Cover bounds, preserve aspect ratio, crop edges
        let renderWidth: number;
        let renderHeight: number;
        if (imageAspect > boxAspect) {
          // Image is wider than box - fit height, crop width
          renderHeight = boxHeight;
          renderWidth = boxHeight * imageAspect;
        } else {
          // Image is taller than box - fit width, crop height
          renderWidth = boxWidth;
          renderHeight = boxWidth / imageAspect;
        }
        return {
          x: x + (boxWidth - renderWidth) / 2,
          y: y + (boxHeight - renderHeight) / 2,
          width: renderWidth,
          height: renderHeight,
        };
      }

      case "scale-down":
      default: {
        // Like contain, but never scale up
        if (imageWidth <= boxWidth && imageHeight <= boxHeight) {
          // Image fits naturally, center it
          return {
            x: x + (boxWidth - imageWidth) / 2,
            y: y + (boxHeight - imageHeight) / 2,
            width: imageWidth,
            height: imageHeight,
          };
        }
        // Scale down like contain
        let renderWidth: number;
        let renderHeight: number;
        if (imageAspect > boxAspect) {
          renderWidth = boxWidth;
          renderHeight = boxWidth / imageAspect;
        } else {
          renderHeight = boxHeight;
          renderWidth = boxHeight * imageAspect;
        }
        return {
          x: x + (boxWidth - renderWidth) / 2,
          y: y + (boxHeight - renderHeight) / 2,
          width: renderWidth,
          height: renderHeight,
        };
      }
    }
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

/**
 * Factory function to create an image element from decoded image data.
 * The image is automatically cached and deduplicated by content.
 */
export function img(image: DecodedImage): GladeImageElement {
  return new GladeImageElement(image);
}
