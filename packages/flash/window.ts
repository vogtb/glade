/**
 * FlashWindow - manages a rendering surface and event handling.
 *
 * Windows own a render target, handle input events, and coordinate
 * the three-phase render cycle for their root view:
 * 1. requestLayout - build layout tree
 * 2. prepaint - post-layout processing
 * 3. paint - emit GPU primitives
 */

import type {
  WindowId,
  EntityId,
  FocusId,
  Point,
  Bounds,
  ContentMask,
  TransformationMatrix,
  ScrollHandleId,
  ScrollOffset,
  ScrollState,
} from "./types.ts";
import { createScrollState, clampScrollOffset } from "./types.ts";
import type { ScrollbarDragState } from "./scrollbar.ts";
import { calculateDragScrollOffset } from "./scrollbar.ts";
import { CursorStyle } from "@glade/core/events.ts";
import type { Theme } from "./theme.ts";
import type { Clipboard, CharEvent, CompositionEvent, TextInputEvent } from "@glade/core";
import type { FlashViewHandle, ScrollHandle } from "./entity.ts";
import { FocusHandle } from "./entity.ts";
import type {
  FlashView,
  RequestLayoutContext,
  PrepaintContext,
  PaintContext,
  GlobalElementId,
} from "./element.ts";
import type { FlashContext } from "./context.ts";
import type {
  HitTestNode,
  FlashMouseEvent,
  FlashClickEvent,
  FlashScrollEvent,
  FlashTextInputEvent,
  Modifiers,
} from "./dispatch.ts";
import {
  hitTest,
  dispatchMouseEvent,
  dispatchClickEvent,
  dispatchScrollEvent,
  dispatchKeyEvent,
  dispatchTextInputEvent,
  dispatchCompositionEvent,
  buildKeyContextChain,
  getFocusedPath,
  type FlashKeyEvent,
} from "./dispatch.ts";
import type { KeyEvent } from "@glade/core";
import { ActionRegistry, Keymap, KeyDispatcher } from "./actions.ts";
import { coreModsToFlashMods, Key } from "./keyboard.ts";
import { FlashScene } from "./scene.ts";
import type { Styles, Cursor } from "./styles.ts";
import { SHADOW_DEFINITIONS, cursorToCursorStyle } from "./styles.ts";
import { FlashLayoutEngine, type LayoutId } from "./layout.ts";
import type { Hitbox, HitboxId, HitTest, HitboxFrame } from "./hitbox.ts";
import {
  HitboxBehavior,
  createHitboxFrame,
  insertHitbox,
  performHitTest,
  isHitboxHovered,
  GroupHitboxes,
  createHitTest,
} from "./hitbox.ts";
import { DragTracker, type ActiveDrag, type DragPayload } from "./drag.ts";
import { TooltipManager, type TooltipBuilder, type TooltipConfig } from "./tooltip.ts";
import { PopoverManager, type PopoverRegistration } from "./popover.ts";
import { DialogManager, type DialogRegistration } from "./dialog.ts";
import { FlashDiv } from "./div.ts";
import { AnchoredElement } from "./anchored.ts";
import { DeferredElement } from "./deferred.ts";
import {
  TabStopRegistry,
  FocusContextManager,
  FocusRestoration,
  type TabStopConfig,
} from "./tab.ts";
import { FlashRenderer } from "./renderer.ts";
import { RectPipeline } from "./rect.ts";
import { ShadowPipeline } from "./shadow.ts";
import { TextSystem, TextPipeline } from "./text.ts";
import { PathPipeline } from "./path.ts";
import { UnderlinePipeline } from "./underline.ts";
import { ImageAtlas, ImagePipeline, type ImageTile, type DecodedImage } from "./image.ts";
import { HostTexturePipeline } from "./host.ts";
import type { WebGPUHost, WebGPUHostInput } from "./host.ts";
import { Inspector, type ElementDebugInfo, type InspectorState } from "./inspector.ts";
import { CrossElementSelectionManager } from "./select.ts";
import { toColorObject, type Color } from "@glade/utils";

function normalizeMouseButton(button: number, mods: Modifiers): number {
  if (button === 0 && mods.ctrl) {
    return 1; // Treat ctrl+click as right click on macOS-style platforms
  }
  return button;
}

/**
 * Options for creating a window.
 */
export interface WindowOptions {
  title?: string;
  width: number;
  height: number;
}

/**
 * Decoded image data ready for GPU upload.
 */
export interface DecodedImageData {
  width: number;
  height: number;
  data: Uint8Array;
}

/**
 * Platform interface for window operations.
 * This abstracts browser vs native differences.
 */
export interface FlashPlatform {
  readonly runtime: "browser" | "darwin";
  readonly clipboard: Clipboard;

  requestAdapter(): Promise<GPUAdapter | null>;
  requestDevice(): Promise<GPUDevice>;
  getPreferredCanvasFormat(): GPUTextureFormat;

  createRenderTarget(options: { width: number; height: number; title?: string }): FlashRenderTarget;

  now(): number;
  requestAnimationFrame(callback: (time: number) => void): number;
  cancelAnimationFrame(id: number): void;

  decodeImage(data: Uint8Array): Promise<DecodedImageData>;

  openUrl(url: string): void;
}

/**
 * Platform-specific render target.
 */
export interface FlashRenderTarget {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;

  configure(device: GPUDevice, format: GPUTextureFormat): void;
  getCurrentTexture(): GPUTexture;
  present(): void;

  resize(width: number, height: number): void;
  destroy(): void;

  onMouseDown?(
    callback: (x: number, y: number, button: number, mods: Modifiers) => void
  ): () => void;
  onMouseUp?(callback: (x: number, y: number, button: number, mods: Modifiers) => void): () => void;
  onMouseMove?(callback: (x: number, y: number) => void): () => void;
  onClick?(
    callback: (x: number, y: number, clickCount: number, mods: Modifiers) => void
  ): () => void;
  onScroll?(
    callback: (x: number, y: number, deltaX: number, deltaY: number, mods: Modifiers) => void
  ): () => void;
  onResize?(callback: (width: number, height: number) => void): () => void;
  onKey?(callback: (event: import("@glade/core").KeyEvent) => void): () => void;
  onChar?(callback: (event: import("@glade/core").CharEvent) => void): () => void;
  onCompositionStart?(
    callback: (event: import("@glade/core").CompositionEvent) => void
  ): () => void;
  onCompositionUpdate?(
    callback: (event: import("@glade/core").CompositionEvent) => void
  ): () => void;
  onCompositionEnd?(callback: (event: import("@glade/core").CompositionEvent) => void): () => void;
  onTextInput?(callback: (event: import("@glade/core").TextInputEvent) => void): () => void;

  setCursor?(style: CursorStyle): void;

  onClose?(callback: () => void): () => void;
  onFocus?(callback: (focused: boolean) => void): () => void;
  onCursorEnter?(callback: (entered: boolean) => void): () => void;
  onRefresh?(callback: () => void): () => void;
}

/**
 * A Flash window.
 */
export class FlashWindow {
  private scene: FlashScene;
  private layoutEngine: FlashLayoutEngine;
  private hitTestTree: HitTestNode[] = [];
  private focusStack: FocusId[] = [];
  private mousePosition: Point = { x: 0, y: 0 };
  private mouseDown = false;
  private lastHoverPath: HitTestNode[] = []; // Track previous hover path for enter/leave events
  private windowFocused = true;
  private cursorInside = true;
  private closed = false;
  private eventCleanups: Array<() => void> = [];

  private elementState = new Map<GlobalElementId, unknown>();
  private visitedElementIds = new Set<GlobalElementId>();
  private nextElementId = 1;

  private scrollStates = new Map<ScrollHandleId, ScrollState>();
  private nextScrollHandleId = 1;
  private scrollbarDragState: ScrollbarDragState | null = null;

  // Hitbox tracking
  private hitboxFrame: HitboxFrame = createHitboxFrame();
  private mouseHitTest: HitTest = { ids: [], hoverHitboxCount: 0, cursor: undefined };
  private groupHitboxes = new GroupHitboxes();
  private currentContentMask: ContentMask | null = null;
  private currentCursor: CursorStyle = CursorStyle.Default;

  // Drag and drop
  private dragTracker = new DragTracker();
  private dropTargetHitboxes = new Map<HitboxId, { canDrop: boolean }>();
  private pendingDragStart: {
    hitboxId: HitboxId;
    position: Point;
    handler: (event: FlashMouseEvent, window: FlashWindow, cx: FlashContext) => DragPayload | null;
  } | null = null;

  // Tooltips
  private tooltipManager = new TooltipManager();

  // Popovers (dropdowns, context menus, etc.)
  private popoverManager = new PopoverManager();

  // Dialogs (modal windows)
  private dialogManager = new DialogManager();

  // Tab stops and focus
  private tabStopRegistry = new TabStopRegistry();
  private focusContextManager = new FocusContextManager();
  private focusRestoration = new FocusRestoration();

  // Key dispatch
  private actionRegistry = new ActionRegistry();
  private keymap = new Keymap();
  private keyDispatcher: KeyDispatcher;

  // Renderer
  private renderer: FlashRenderer;
  private textSystem: TextSystem;
  private imageAtlas: ImageAtlas;
  private hostTexturePipeline: HostTexturePipeline;
  private didRenderThisFrame = false;

  // WebGPU host rendering
  private pendingHostRenders: Array<{ host: WebGPUHost; input: WebGPUHostInput }> = [];
  private lastFrameTime = 0;

  // Inspector/Debug Mode
  private inspector: Inspector;

  // Deferred drawing
  private deferredDrawQueue: import("./deferred.ts").DeferredDrawEntry[] = [];

  // FPS tracking
  private fpsFrameCount = 0;
  private fpsLastTime = 0;
  private fpsEnabled = true;

  // Cross-element text selection
  private crossElementSelection: CrossElementSelectionManager | null = null;

  // Text measure registry for layout callbacks
  private measureRegistry = new Map<
    number,
    {
      text: string;
      fontSize: number;
      fontFamily: string;
      fontWeight: number;
      lineHeight: number;
      noWrap: boolean;
      maxWidth: number | null;
      underlineSpace?: number;
      // Computed during measurement, retrieved during paint
      computedWrapWidth?: number;
    }
  >();
  private nextMeasureId = 1;

  constructor(
    readonly id: WindowId,
    private platform: FlashPlatform,
    private device: GPUDevice,
    private format: GPUTextureFormat,
    private renderTarget: FlashRenderTarget,
    private rootView: FlashViewHandle<FlashView>,
    private getContext: () => FlashContext,
    private readView: <V extends FlashView>(handle: FlashViewHandle<V>) => V,
    private onClosed?: () => void
  ) {
    this.scene = new FlashScene();
    this.layoutEngine = new FlashLayoutEngine();
    // Layout engine operates in logical coordinates; rendering stage handles device pixel scaling
    this.layoutEngine.setScaleFactor(1);
    this.renderTarget.configure(device, format);

    // Initialize renderer with pipelines (4x MSAA for smooth edges)
    const theme = this.getContext().getTheme();
    this.renderer = new FlashRenderer(device, format, {
      clearColor: theme.background,
      msaaSampleCount: 4,
    });
    const sampleCount = this.renderer.getSampleCount();

    const rectPipeline = new RectPipeline(
      device,
      format,
      this.renderer.getUniformBindGroupLayout(),
      10000,
      sampleCount
    );
    const shadowPipeline = new ShadowPipeline(
      device,
      format,
      this.renderer.getUniformBindGroupLayout(),
      1000,
      sampleCount
    );
    this.renderer.setRectPipeline(rectPipeline);
    this.renderer.setShadowPipeline(shadowPipeline);

    // Initialize text system
    this.textSystem = new TextSystem(device);
    this.textSystem.setDevicePixelRatio(renderTarget.devicePixelRatio);
    const textPipeline = new TextPipeline(device, format, this.textSystem, 50000, sampleCount);
    this.renderer.setTextPipeline(textPipeline, this.textSystem);

    // Initialize path pipeline
    const pathPipeline = new PathPipeline(
      device,
      format,
      this.renderer.getUniformBindGroupLayout(),
      100000,
      300000,
      sampleCount
    );
    this.renderer.setPathPipeline(pathPipeline);

    // Initialize underline pipeline
    const underlinePipeline = new UnderlinePipeline(
      device,
      format,
      this.renderer.getUniformBindGroupLayout(),
      10000,
      sampleCount
    );
    this.renderer.setUnderlinePipeline(underlinePipeline);

    // Initialize image atlas and pipeline
    this.imageAtlas = new ImageAtlas(device);
    const imagePipeline = new ImagePipeline(device, format, this.imageAtlas, 10000, sampleCount);
    this.renderer.setImagePipeline(imagePipeline);

    // Initialize host texture pipeline at startup (not lazily) to ensure GPU validation completes
    this.hostTexturePipeline = new HostTexturePipeline(device, format, 100, sampleCount);
    this.renderer.setHostTexturePipeline(this.hostTexturePipeline);

    // Initialize key dispatcher
    this.keyDispatcher = new KeyDispatcher(this.keymap, this.actionRegistry);

    // Initialize inspector
    this.inspector = new Inspector();

    // Initialize FPS tracking time
    this.fpsLastTime = performance.now();

    this.setupEventListeners();
  }

  /**
   * Get the window width.
   */
  get width(): number {
    return this.renderTarget.width;
  }

  /**
   * Get the window height.
   */
  get height(): number {
    return this.renderTarget.height;
  }

  /**
   * Check if window has been closed by the platform.
   */
  isClosed(): boolean {
    return this.closed;
  }

  /**
   * Access the platform clipboard.
   */
  getClipboard(): Clipboard {
    return this.platform.clipboard;
  }

  /**
   * Open a URL in the default browser.
   */
  openUrl(url: string): void {
    this.platform.openUrl(url);
  }

  /**
   * Register a font for text rendering.
   */
  registerFont(name: string, data: Uint8Array): void {
    this.textSystem.registerFont(name, data);
  }

  /**
   * Upload an image to the atlas and return its tile for rendering.
   */
  uploadImage(image: DecodedImage): ImageTile {
    return this.imageAtlas.uploadImage(image);
  }

  /**
   * Get the image atlas for direct access.
   */
  getImageAtlas(): ImageAtlas {
    return this.imageAtlas;
  }

  /**
   * Get the text system for advanced text operations.
   */
  getTextSystem(): TextSystem {
    return this.textSystem;
  }

  // ============ WebGPU Host Support ============

  /**
   * Get the GPU device for WebGPU host creation.
   */
  getDevice(): GPUDevice {
    return this.device;
  }

  /**
   * Get the texture format for WebGPU host creation.
   */
  getFormat(): GPUTextureFormat {
    return this.format;
  }

  /**
   * Get the current mouse position.
   */
  getMousePosition(): Point {
    return this.mousePosition;
  }

  /**
   * Check if any mouse button is currently pressed.
   */
  isMouseDown(): boolean {
    return this.mouseDown;
  }

  /**
   * Schedule a WebGPU host to be rendered this frame.
   * Called by WebGPUHostElement during prepaint.
   */
  scheduleHostRender(host: WebGPUHost, input: WebGPUHostInput): void {
    this.pendingHostRenders.push({ host, input });
  }

  /**
   * Clear the host texture bind group cache.
   * Call this when host textures are recreated (e.g., on resize).
   */
  clearHostTextureCache(): void {
    this.hostTexturePipeline.clearBindGroupCache();
  }

  /**
   * Register text for measurement during layout.
   * Returns a measure ID that will be used in the callback.
   */
  registerTextMeasure(data: {
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: number;
    lineHeight: number;
    noWrap: boolean;
    maxWidth: number | null;
    underlineSpace?: number;
  }): number {
    const id = this.nextMeasureId++;
    this.measureRegistry.set(id, data);
    return id;
  }

  /**
   * Measure callback invoked by Taffy during layout.
   */
  private measureTextCallback(
    measureId: number,
    knownWidth: number,
    _knownHeight: number,
    availableWidth: number,
    _availableHeight: number
  ): { width: number; height: number } {
    const data = this.measureRegistry.get(measureId);
    if (!data) {
      return { width: 0, height: 0 };
    }

    // Determine effective max width for text wrapping.
    //
    // Priority:
    // 1. noWrap: true -> never wrap
    // 2. explicit maxWidth -> use that width
    // 3. explicit knownWidth from parent -> use that width
    // 4. finite availableWidth AND text exceeds it -> wrap to fit
    // 5. Otherwise -> measure at natural width (no wrapping)
    //
    // Note: Taffy passes Infinity for availableWidth during MinContent/MaxContent
    // sizing passes. We only wrap when availableWidth is finite AND the text's
    // natural width exceeds it.
    let effectiveMaxWidth: number | undefined;
    const fontStyle = { family: data.fontFamily, weight: data.fontWeight };

    if (data.noWrap) {
      // No wrapping - use infinite width
      effectiveMaxWidth = undefined;
    } else if (data.maxWidth !== null) {
      // Explicit .maxWidth() takes precedence
      effectiveMaxWidth = data.maxWidth;
    } else if (!Number.isNaN(knownWidth) && knownWidth > 0) {
      // Parent set explicit width on text node - use it for wrapping
      effectiveMaxWidth = knownWidth;
    } else if (Number.isFinite(availableWidth) && availableWidth > 0) {
      // Parent has definite available width - only wrap if text exceeds it
      const naturalWidth = this.textSystem.measureText(
        data.text,
        data.fontSize,
        data.lineHeight,
        undefined,
        fontStyle
      ).width;
      if (naturalWidth > availableWidth) {
        effectiveMaxWidth = availableWidth;
      } else {
        effectiveMaxWidth = undefined;
      }
    } else {
      // No constraint (infinite available space) - measure at natural width
      effectiveMaxWidth = undefined;
    }

    // Store the computed wrap width for retrieval during paint
    // This ensures paint uses the exact same constraint as measurement
    data.computedWrapWidth = effectiveMaxWidth;

    // Measure text with computed constraints
    const rawResult = this.textSystem.measureText(
      data.text,
      data.fontSize,
      data.lineHeight,
      effectiveMaxWidth,
      fontStyle
    );

    // The shaper's measureText returns height = line_y + line_height, where line_y
    // includes the baseline offset (ascent). For proper layout, we need to normalize
    // this to use lineHeight-based height that matches our rendering.
    // For single-line text, height should be lineHeight.
    // For multi-line, estimate lines from measured height and use lineHeight * numLines.
    // The shaper's line_y offset is approximately 0.8 * fontSize (ascent).
    const ascentOffset = data.fontSize * 0.8;
    const estimatedLines = Math.max(
      1,
      Math.round((rawResult.height - ascentOffset) / data.lineHeight)
    );
    const normalizedHeight = estimatedLines * data.lineHeight + (data.underlineSpace ?? 0);

    return { width: rawResult.width, height: normalizedHeight };
  }

  /**
   * Get the computed wrap width for a text element.
   * Returns the effectiveMaxWidth that was used during measurement.
   */
  getComputedWrapWidth(measureId: number): number | undefined {
    const data = this.measureRegistry.get(measureId);
    return data?.computedWrapWidth;
  }

  /**
   * Check if this window contains the given entity.
   */
  containsView(entityId: EntityId): boolean {
    return this.rootView.id === entityId;
  }

  /**
   * Set focus to a focus handle.
   */
  setFocus(focusId: FocusId): void {
    this.focusStack = [focusId];
    this.getContext().markWindowDirty(this.id);
  }

  /**
   * Clear focus from a focus handle.
   */
  clearFocus(focusId: FocusId): void {
    const index = this.focusStack.indexOf(focusId);
    if (index >= 0) {
      this.focusStack.splice(index, 1);
      this.getContext().markWindowDirty(this.id);
    }
  }

  /**
   * Check if a focus handle is focused.
   */
  isFocused(focusId: FocusId): boolean {
    return this.getCurrentFocusId() === focusId;
  }

  /**
   * Get the current focused handle ID (top of stack).
   */
  private getCurrentFocusId(): FocusId | null {
    if (this.focusStack.length === 0) {
      return null;
    }
    return this.focusStack[this.focusStack.length - 1]!;
  }

  // ============ Key Context & Actions ============

  /**
   * Get the action registry for registering actions.
   */
  getActionRegistry(): ActionRegistry {
    return this.actionRegistry;
  }

  /**
   * Get the keymap for binding keys to actions.
   */
  getKeymap(): Keymap {
    return this.keymap;
  }

  /**
   * Dispatch an action by name.
   */
  dispatchAction(name: string): boolean {
    return this.actionRegistry.dispatch(name, this.getContext(), this);
  }

  /**
   * Get the current key context chain based on focus.
   */
  getKeyContextChain(): string[] {
    const currentFocusId = this.getCurrentFocusId();
    if (currentFocusId !== null) {
      const cached = this.focusContextManager.getContextChain(currentFocusId);
      if (cached.length > 0) {
        return cached;
      }

      const focusPath = getFocusedPath(this.hitTestTree, currentFocusId);
      if (focusPath.length > 0) {
        const chain = buildKeyContextChain(focusPath);
        this.focusContextManager.setContextChain(currentFocusId, chain);
        return chain;
      }
    }

    const fallbackPath = hitTest(this.hitTestTree, this.mousePosition);
    return buildKeyContextChain(fallbackPath);
  }

  // ============ Scroll State Management ============

  /**
   * Allocate a new scroll handle ID.
   */
  allocateScrollHandleId(): ScrollHandleId {
    return this.nextScrollHandleId++ as ScrollHandleId;
  }

  /**
   * Get the scroll offset for a scroll handle.
   */
  getScrollOffset(scrollId: ScrollHandleId): ScrollOffset {
    const state = this.scrollStates.get(scrollId);
    return state?.offset ?? { x: 0, y: 0 };
  }

  getScrollViewport(scrollId: ScrollHandleId): Bounds {
    const state = this.scrollStates.get(scrollId);
    if (!state) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return {
      x: state.viewportOrigin.x,
      y: state.viewportOrigin.y,
      width: state.viewportSize.width,
      height: state.viewportSize.height,
    };
  }

  /**
   * Set the scroll offset for a scroll handle.
   */
  setScrollOffset(scrollId: ScrollHandleId, offset: ScrollOffset): void {
    let state = this.scrollStates.get(scrollId);
    if (!state) {
      state = createScrollState();
      this.scrollStates.set(scrollId, state);
    }
    state.offset = offset;
    const clamped = clampScrollOffset(state);
    state.offset = clamped;
  }

  /**
   * Scroll by a delta amount.
   */
  scrollBy(scrollId: ScrollHandleId, deltaX: number, deltaY: number): void {
    let state = this.scrollStates.get(scrollId);
    if (!state) {
      state = createScrollState();
      this.scrollStates.set(scrollId, state);
    }
    const oldOffset = { ...state.offset };
    state.offset = {
      x: state.offset.x + deltaX,
      y: state.offset.y + deltaY,
    };

    // Only clamp if content sizes are known (non-zero).
    // Virtual lists set content size during prepaint, so if we clamp before that
    // with zero sizes, scroll would be incorrectly limited.
    if (state.contentSize.width > 0 || state.contentSize.height > 0) {
      const clamped = clampScrollOffset(state);
      state.offset = clamped;
    }

    // Mark window dirty if scroll offset changed
    if (state.offset.x !== oldOffset.x || state.offset.y !== oldOffset.y) {
      this.getContext().markWindowDirty(this.id);
    }
  }

  /**
   * Update content and viewport sizes for a scroll handle.
   */
  updateScrollContentSize(
    scrollId: ScrollHandleId,
    contentSize: { width: number; height: number },
    viewportSize: { width: number; height: number },
    viewportOrigin: { x: number; y: number }
  ): void {
    let state = this.scrollStates.get(scrollId);
    if (!state) {
      state = createScrollState();
      this.scrollStates.set(scrollId, state);
    }
    state.contentSize = contentSize;
    state.viewportSize = viewportSize;
    state.viewportOrigin = viewportOrigin;
    const clamped = clampScrollOffset(state);
    state.offset = clamped;
  }

  /**
   * Get the scroll state for a scroll handle.
   * Returns null if the scroll handle has not been initialized.
   */
  getScrollState(scrollId: ScrollHandleId): ScrollState | null {
    return this.scrollStates.get(scrollId) ?? null;
  }

  // ============ Scrollbar Drag Management ============

  /**
   * Start a scrollbar thumb drag operation.
   */
  startScrollbarDrag(state: ScrollbarDragState): void {
    this.scrollbarDragState = state;
  }

  /**
   * Update scroll position during scrollbar drag.
   */
  updateScrollbarDrag(currentMousePos: number): void {
    if (!this.scrollbarDragState) return;

    const newOffset = calculateDragScrollOffset(this.scrollbarDragState, currentMousePos);
    const scrollState = this.scrollStates.get(this.scrollbarDragState.scrollHandleId);
    if (!scrollState) return;

    if (this.scrollbarDragState.axis === "y") {
      this.setScrollOffset(this.scrollbarDragState.scrollHandleId, {
        x: scrollState.offset.x,
        y: newOffset,
      });
    } else {
      this.setScrollOffset(this.scrollbarDragState.scrollHandleId, {
        x: newOffset,
        y: scrollState.offset.y,
      });
    }

    this.getContext().markWindowDirty(this.id);
  }

  /**
   * End scrollbar drag operation.
   */
  endScrollbarDrag(): void {
    this.scrollbarDragState = null;
  }

  /**
   * Check if a scrollbar is currently being dragged.
   */
  isScrollbarDragging(): boolean {
    return this.scrollbarDragState !== null;
  }

  /**
   * Get the current scrollbar drag state.
   */
  getScrollbarDragState(): ScrollbarDragState | null {
    return this.scrollbarDragState;
  }

  // ============ Hitbox Management ============

  /**
   * Insert a hitbox for the current frame.
   * Should only be called during prepaint phase.
   */
  insertHitbox(
    bounds: Bounds,
    behavior: HitboxBehavior = HitboxBehavior.Normal,
    cursor?: Cursor
  ): Hitbox {
    return insertHitbox(this.hitboxFrame, bounds, this.currentContentMask, behavior, cursor);
  }

  /**
   * Check if a hitbox is currently hovered.
   */
  isHitboxHovered(hitbox: Hitbox): boolean {
    return isHitboxHovered(this.mouseHitTest, hitbox.id);
  }

  /**
   * Check if a hitbox ID is currently hovered.
   */
  isHitboxIdHovered(id: HitboxId): boolean {
    return isHitboxHovered(this.mouseHitTest, id);
  }

  /**
   * Get the current hit test result.
   */
  getMouseHitTest(): HitTest {
    return this.mouseHitTest;
  }

  /**
   * Add a hitbox to a group.
   */
  addGroupHitbox(groupName: string, hitboxId: HitboxId): void {
    this.groupHitboxes.add(groupName, hitboxId);
  }

  /**
   * Check if a group is hovered (any hitbox in the group is hovered).
   */
  isGroupHovered(groupName: string): boolean {
    const hitboxIds = this.groupHitboxes.getAll(groupName);
    for (const hitboxId of hitboxIds) {
      if (isHitboxHovered(this.mouseHitTest, hitboxId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a group is active (any hitbox in the group is hovered with mouse down).
   */
  isGroupActive(groupName: string): boolean {
    if (!this.mouseDown) {
      return false;
    }
    const hitboxIds = this.groupHitboxes.getAll(groupName);
    for (const hitboxId of hitboxIds) {
      if (isHitboxHovered(this.mouseHitTest, hitboxId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Set the current content mask (for hitbox clipping).
   */
  setCurrentContentMask(mask: ContentMask | null): void {
    this.currentContentMask = mask;
  }

  /**
   * Get the active theme.
   */
  getTheme(): Theme {
    return this.getContext().getTheme();
  }

  // ============ Drag and Drop ============

  /**
   * Get the drag tracker for this window.
   */
  getDragTracker(): DragTracker {
    return this.dragTracker;
  }

  /**
   * Check if there's an active drag.
   */
  isDragging(): boolean {
    return this.dragTracker.isDragging();
  }

  /**
   * Get the active drag state.
   */
  getActiveDrag<T = unknown>(): ActiveDrag<T> | null {
    return this.dragTracker.getActiveDrag<T>();
  }

  /**
   * Register a drop target for this frame.
   */
  registerDropTarget(hitboxId: HitboxId, canDrop: boolean): void {
    this.dropTargetHitboxes.set(hitboxId, { canDrop });
  }

  /**
   * Register a tab stop for keyboard navigation.
   */
  registerTabStop(focusId: FocusId, bounds: Bounds, config: TabStopConfig): void {
    this.tabStopRegistry.register(focusId, bounds, config);
  }

  /**
   * Get the next focusable element for Tab navigation.
   */
  getNextFocus(currentFocusId: FocusId | null): FocusId | null {
    const currentGroup =
      currentFocusId !== null ? this.tabStopRegistry.getGroup(currentFocusId) : null;
    return this.tabStopRegistry.getNextFocus(currentFocusId, currentGroup);
  }

  /**
   * Get the previous focusable element for Shift+Tab navigation.
   */
  getPrevFocus(currentFocusId: FocusId | null): FocusId | null {
    const currentGroup =
      currentFocusId !== null ? this.tabStopRegistry.getGroup(currentFocusId) : null;
    return this.tabStopRegistry.getPrevFocus(currentFocusId, currentGroup);
  }

  /**
   * Check if a hitbox is a valid drop target for the current drag.
   */
  canDropOnHitbox(hitboxId: HitboxId): boolean {
    if (!this.dragTracker.isDragging()) {
      return false;
    }
    const target = this.dropTargetHitboxes.get(hitboxId);
    if (!target) {
      return false;
    }
    if (!this.isHitboxIdHovered(hitboxId)) {
      return false;
    }
    return target.canDrop;
  }

  /**
   * Check if a hitbox is being dragged over.
   */
  isDragOver(hitboxId: HitboxId): boolean {
    if (!this.dragTracker.isDragging()) {
      return false;
    }
    return this.isHitboxIdHovered(hitboxId);
  }

  // ============ Tooltips ============

  /**
   * Get the tooltip manager.
   */
  getTooltipManager(): TooltipManager {
    return this.tooltipManager;
  }

  /**
   * Register a tooltip for an element.
   */
  registerTooltip(
    hitboxId: HitboxId,
    bounds: Bounds,
    builder: TooltipBuilder,
    config: TooltipConfig
  ): void {
    this.tooltipManager.register({
      hitboxId,
      targetBounds: bounds,
      builder,
      config,
    });
  }

  // ============ Popovers ============

  /**
   * Get the popover manager.
   */
  getPopoverManager(): PopoverManager {
    return this.popoverManager;
  }

  /**
   * Register a popover for an element.
   */
  registerPopover(registration: PopoverRegistration): void {
    this.popoverManager.register(registration);
  }

  // ============ Dialogs ============

  /**
   * Get the dialog manager.
   */
  getDialogManager(): DialogManager {
    return this.dialogManager;
  }

  /**
   * Register a dialog for an element.
   */
  registerDialog(registration: DialogRegistration): void {
    this.dialogManager.register(registration);
  }

  /**
   * Get the current content mask.
   */
  getCurrentContentMask(): ContentMask | null {
    return this.currentContentMask;
  }

  // ============ Cross-Element Text Selection ============

  /**
   * Get the cross-element selection manager.
   */
  getCrossElementSelection(): CrossElementSelectionManager {
    if (!this.crossElementSelection) {
      this.crossElementSelection = new CrossElementSelectionManager(this);
    }
    return this.crossElementSelection;
  }

  /**
   * Get persistent element state map.
   * Used by CrossElementSelectionManager to store state.
   */
  getElementState(): Map<GlobalElementId, unknown> {
    return this.elementState;
  }

  // ============ Inspector/Debug Mode ============

  /**
   * Get the inspector instance.
   */
  getInspector(): Inspector {
    return this.inspector;
  }

  /**
   * Toggle inspector mode on/off.
   */
  toggleInspector(): void {
    this.inspector.toggle();
    this.getContext().markWindowDirty(this.id);
  }

  /**
   * Check if inspector is enabled.
   */
  isInspectorEnabled(): boolean {
    return this.inspector.isEnabled();
  }

  /**
   * Set inspector enabled state.
   */
  setInspectorEnabled(enabled: boolean): void {
    this.inspector.setEnabled(enabled);
    this.getContext().markWindowDirty(this.id);
  }

  /**
   * Get inspector state for UI display.
   */
  getInspectorState(): Readonly<InspectorState> {
    return this.inspector.getState();
  }

  /**
   * Update inspector options.
   */
  updateInspectorOptions(options: Partial<InspectorState>): void {
    this.inspector.updateOptions(options);
    this.getContext().markWindowDirty(this.id);
  }

  /**
   * Get info about the currently selected element in inspector.
   */
  getSelectedElementInfo(): ElementDebugInfo | null {
    return this.inspector.getSelectedElement();
  }

  /**
   * Log selected element info to console (for debugging).
   */
  logSelectedElement(): void {
    this.inspector.logSelectedElement();
  }

  /**
   * Render the window using the three-phase lifecycle.
   */
  render(
    createViewContext: <V extends FlashView>(
      entityId: EntityId,
      windowId: WindowId,
      window: FlashWindow
    ) => import("./context.ts").FlashViewContext<V>
  ): void {
    this.didRenderThisFrame = false;
    this.beginFrame();

    const theme = this.getTheme();
    this.renderer.setClearColor(theme.background);

    this.scene.clear();
    this.layoutEngine.clear();
    this.layoutEngine.setScaleFactor(1);

    const view = this.readView(this.rootView);
    const cx = createViewContext(this.rootView.id, this.id, this);
    const element = view.render(cx);

    const rootElementId = this.allocateElementId();
    const requestLayoutCx = this.createRequestLayoutContext(rootElementId);
    const { layoutId: rootLayoutId, requestState: rootRequestState } =
      element.requestLayout(requestLayoutCx);

    this.layoutEngine.computeLayoutWithMeasure(
      rootLayoutId,
      this.width,
      this.height,
      this.measureTextCallback.bind(this)
    );

    const rootBounds = this.layoutEngine.layoutBounds(rootLayoutId);
    const prepaintCx = this.createPrepaintContext(rootElementId);
    const rootPrepaintState = element.prepaint(prepaintCx, rootBounds, rootRequestState);

    const paintCx = this.createPaintContext(rootElementId);
    element.paint(paintCx, rootBounds, rootPrepaintState);

    // Update tooltip state before rendering tooltips
    // This allows tooltips registered in prepaint to be rendered this frame
    const currentHitTest = performHitTest(
      this.hitboxFrame,
      this.mousePosition.x,
      this.mousePosition.y
    );
    const hoveredHitboxId =
      currentHitTest.hoverHitboxCount > 0 ? (currentHitTest.ids[0] ?? null) : null;
    this.tooltipManager.update(hoveredHitboxId, this.platform.now(), this.getContext());

    // Render active dialog (separate layout/prepaint/paint cycle)
    const dialogHitTestNode = this.renderActiveDialog();

    // Render active popover (separate layout/prepaint/paint cycle)
    const popoverHitTestNode = this.renderActivePopover();

    // Render active tooltip (separate layout/prepaint/paint cycle)
    const tooltipHitTestNode = this.renderActiveTooltip();

    // Paint deferred elements in priority order (higher priority on top)
    this.paintDeferredElements();

    // Extract hit test tree from prepaint state (built with scroll-adjusted bounds)
    this.hitTestTree = [];
    const prepaintStateWithHitTest = rootPrepaintState as { hitTestNode?: HitTestNode };
    if (prepaintStateWithHitTest?.hitTestNode) {
      this.hitTestTree.push(prepaintStateWithHitTest.hitTestNode);
    }

    // Also add deferred element hit test nodes
    for (const entry of this.deferredDrawQueue) {
      if (entry.hitTestNode) {
        this.hitTestTree.push(entry.hitTestNode);
      }
    }

    // Add dialog hit test node (modal, should be on top of most things)
    if (dialogHitTestNode) {
      this.hitTestTree.push(dialogHitTestNode);
    }

    // Add popover hit test node (should be on top)
    if (popoverHitTestNode) {
      this.hitTestTree.push(popoverHitTestNode);
    }

    // Add tooltip hit test node
    if (tooltipHitTestNode) {
      this.hitTestTree.push(tooltipHitTestNode);
    }

    this.updateFocusContexts();

    // Paint cross-element selection highlights (after elements, before inspector)
    if (this.crossElementSelection) {
      // Compute visual order before painting (needed for getSelectionRanges)
      this.crossElementSelection.computeVisualOrder();
      const selectionColor = this.getTheme().selectionBackground;
      this.crossElementSelection.paintSelectionHighlights(this.scene, selectionColor);
    }

    // Build inspector debug info from hit test tree if inspector is enabled
    if (this.inspector.isEnabled()) {
      this.inspector.warmUpGlyphs(this.textSystem);
      this.inspector.beginFrame();
      this.inspectorNextId = 0;
      this.buildInspectorFromHitTestTree(this.hitTestTree, 0);
      this.inspector.handleMouseMove(this.mousePosition);
      this.inspector.renderOverlay(this.scene, this.width, this.height, this.textSystem);
    }

    this.endFrame();

    // Render WebGPU hosts before main Flash pass
    this.renderHosts();

    // Get texture and render scene to GPU
    const texture = this.renderTarget.getCurrentTexture();
    const textureView = texture.createView();

    // Use actual texture dimensions to avoid mismatch with depth buffer
    const fbWidth = texture.width;
    const fbHeight = texture.height;

    // Calculate logical dimensions from actual texture size
    const dpr = this.renderTarget.devicePixelRatio;
    const logicalWidth = fbWidth / dpr;
    const logicalHeight = fbHeight / dpr;

    this.renderer.render(this.scene, textureView, logicalWidth, logicalHeight, fbWidth, fbHeight);
    this.didRenderThisFrame = true;
  }

  private inspectorNextId = 0;

  /**
   * Build inspector debug info recursively from hit test tree.
   * The hit test tree has correctly computed bounds from the layout phase.
   */
  private buildInspectorFromHitTestTree(nodes: HitTestNode[], depth: number): void {
    for (const node of nodes) {
      // Derive type name from node properties
      let typeName = "Div";
      if (node.scrollHandle) {
        typeName = "ScrollContainer";
      } else if (node.focusHandle) {
        typeName = "Focusable";
      } else if (node.handlers.click || node.handlers.mouseDown) {
        typeName = "Interactive";
      } else if (node.keyContext) {
        typeName = `Div (${node.keyContext})`;
      }

      const info: ElementDebugInfo = {
        elementId: this.inspectorNextId++ as GlobalElementId,
        bounds: node.bounds,
        styles: {},
        typeName,
        sourceLocation: undefined,
        children: [],
        depth,
      };

      this.inspector.registerElement(info);

      // Recursively process children
      if (node.children.length > 0) {
        this.buildInspectorFromHitTestTree(node.children, depth + 1);
      }
    }
  }

  /**
   * Present the rendered frame.
   * Only presents if getCurrentTexture was called this frame.
   */
  present(): void {
    if (this.didRenderThisFrame) {
      this.renderTarget.present();
      this.trackFps();
    }
  }

  /**
   * Enable FPS tracking. Logs FPS to console every second.
   */
  enableFpsTracking(): void {
    this.fpsEnabled = true;
    this.fpsFrameCount = 0;
    this.fpsLastTime = performance.now();
  }

  /**
   * Disable FPS tracking.
   */
  disableFpsTracking(): void {
    this.fpsEnabled = false;
  }

  /**
   * Check if FPS tracking is enabled.
   */
  isFpsTrackingEnabled(): boolean {
    return this.fpsEnabled;
  }

  private trackFps(): void {
    if (!this.fpsEnabled) {
      return;
    }

    this.fpsFrameCount++;
    const now = performance.now();
    const elapsed = now - this.fpsLastTime;

    if (elapsed >= 1000) {
      const fps = (this.fpsFrameCount / elapsed) * 1000;
      console.log(`FPS: ${fps.toFixed(1)}`);
      this.fpsFrameCount = 0;
      this.fpsLastTime = now;
    }
  }

  /**
   * Destroy the window and release resources.
   */
  destroy(): void {
    this.closed = true;
    for (const cleanup of this.eventCleanups) {
      cleanup();
    }
    this.eventCleanups = [];
    this.renderTarget.destroy();
  }

  /**
   * Get the layout engine for querying bounds.
   */
  getLayoutEngine(): FlashLayoutEngine {
    return this.layoutEngine;
  }

  private beginFrame(): void {
    this.visitedElementIds.clear();
    this.nextElementId = 1;
    // Reset hitbox frame for new frame
    this.hitboxFrame = createHitboxFrame();
    this.groupHitboxes.clear();
    // Clear drop targets from previous frame
    this.dropTargetHitboxes.clear();
    // Clear tooltip registrations from previous frame
    this.tooltipManager.clearRegistrations();
    // Clear popover registrations from previous frame
    this.popoverManager.clearRegistrations();
    // Clear dialog registrations from previous frame
    this.dialogManager.clearRegistrations();
    // Clear tab stops from previous frame
    this.tabStopRegistry.clear();
    // Clear focus contexts from previous frame
    this.focusContextManager.clear();
    // Clear deferred draw queue from previous frame
    this.deferredDrawQueue = [];
    // Clear cross-element selection registry
    this.crossElementSelection?.beginFrame();
    // Clear measure registry for new frame
    this.measureRegistry.clear();
    this.nextMeasureId = 1;
  }

  private paintDeferredElements(): void {
    if (this.deferredDrawQueue.length === 0) {
      return;
    }

    this.deferredDrawQueue.sort((a, b) => a.priority - b.priority);

    for (const entry of this.deferredDrawQueue) {
      // Use overlay mode to ensure deferred elements render on top of all normal content
      // Priority determines ordering between overlay types (tooltips: 0, menus: 1, modals: 2)
      this.scene.beginOverlay(entry.priority);

      const paintCx = this.createPaintContext(entry.childElementId);
      entry.child.paint(paintCx, entry.bounds, entry.childPrepaintState);

      this.scene.endOverlay();
    }
  }

  /**
   * Render the active popover if one exists.
   * This runs its own layout/prepaint/paint cycle separate from the main tree.
   */
  private renderActivePopover(): HitTestNode | null {
    const activePopover = this.popoverManager.getActivePopover();
    if (!activePopover) {
      return null;
    }

    // Build the popover element
    this.popoverManager.buildActivePopover(this.getContext(), {
      width: this.width,
      height: this.height,
    });

    const popoverElement = activePopover.element;
    if (!popoverElement) {
      return null;
    }

    // Create anchored wrapper for positioning
    const anchoredElement = new AnchoredElement();
    anchoredElement.anchor(activePopover.anchorCorner);
    anchoredElement.position(activePopover.anchorPosition);
    anchoredElement.setWindowSize({ width: this.width, height: this.height });
    anchoredElement.snapToWindowWithMargin(activePopover.registration.config.windowMargin);
    anchoredElement.child(popoverElement);

    const deferredWrapper = new DeferredElement(anchoredElement);
    deferredWrapper.priority(1); // Menus render above tooltips

    // Run layout for popover
    const popoverElementId = this.allocateElementId();
    const requestLayoutCx = this.createRequestLayoutContext(popoverElementId);
    const { layoutId: popoverLayoutId, requestState: popoverRequestState } =
      deferredWrapper.requestLayout(requestLayoutCx);

    this.layoutEngine.computeLayoutWithMeasure(
      popoverLayoutId,
      this.width,
      this.height,
      this.measureTextCallback.bind(this)
    );

    const popoverBounds = this.layoutEngine.layoutBounds(popoverLayoutId);
    const prepaintCx = this.createPrepaintContext(popoverElementId);
    const popoverPrepaintState = deferredWrapper.prepaint(
      prepaintCx,
      popoverBounds,
      popoverRequestState
    );

    // Paint is handled by deferred system (deferredWrapper registers itself)
    const paintCx = this.createPaintContext(popoverElementId);
    deferredWrapper.paint(paintCx, popoverBounds, popoverPrepaintState);

    // Return hit test node for the popover
    return (popoverPrepaintState as { hitTestNode?: HitTestNode })?.hitTestNode ?? null;
  }

  /**
   * Render the active dialog if one exists.
   * This runs its own layout/prepaint/paint cycle separate from the main tree.
   * Dialogs are modal and render with a backdrop overlay.
   * Uses the deferred rendering system for proper z-ordering.
   */
  private renderActiveDialog(): HitTestNode | null {
    const activeDialog = this.dialogManager.getActiveDialog();
    if (!activeDialog) {
      return null;
    }

    // Build the dialog element
    this.dialogManager.buildActiveDialog(this.getContext(), {
      width: this.width,
      height: this.height,
    });

    const dialogElement = activeDialog.element;
    if (!dialogElement) {
      return null;
    }

    const backdropColor = activeDialog.registration.config.backdropColor;
    const onOpenChange = activeDialog.registration.onClose;
    const closeOnBackdrop = activeDialog.registration.config.closeOnBackdropClick;

    // Create a backdrop div that covers the full window and centers the dialog
    const backdropDiv = new FlashDiv();
    backdropDiv
      .w(this.width)
      .h(this.height)
      .bg(backdropColor)
      .flex()
      .itemsCenter()
      .justifyCenter()
      .occludeMouse() // Block hover/click events from reaching elements behind
      .child(dialogElement);

    // Add click handler to backdrop for dismissal
    if (closeOnBackdrop && onOpenChange) {
      backdropDiv.onClick(() => {
        onOpenChange();
      });
    }

    // Wrap in DeferredElement for proper z-ordering (priority 2 = above popovers)
    const deferredWrapper = new DeferredElement(backdropDiv);
    deferredWrapper.priority(2);

    // Run layout for the wrapper
    const dialogElementId = this.allocateElementId();
    const requestLayoutCx = this.createRequestLayoutContext(dialogElementId);
    const { layoutId: dialogLayoutId, requestState: dialogRequestState } =
      deferredWrapper.requestLayout(requestLayoutCx);

    this.layoutEngine.computeLayoutWithMeasure(
      dialogLayoutId,
      this.width,
      this.height,
      this.measureTextCallback.bind(this)
    );

    const dialogBounds = this.layoutEngine.layoutBounds(dialogLayoutId);

    // Store bounds for reference
    activeDialog.bounds = dialogBounds;

    // Prepaint - this registers with deferred draw system
    const prepaintCx = this.createPrepaintContext(dialogElementId);
    const dialogPrepaintState = deferredWrapper.prepaint(
      prepaintCx,
      dialogBounds,
      dialogRequestState
    );

    // Paint is handled by deferred system (deferredWrapper registers itself)
    const paintCx = this.createPaintContext(dialogElementId);
    deferredWrapper.paint(paintCx, dialogBounds, dialogPrepaintState);

    // Return hit test node for the dialog, marked as blocking pointer events
    const hitTestNode = (dialogPrepaintState as { hitTestNode?: HitTestNode })?.hitTestNode ?? null;
    if (hitTestNode) {
      hitTestNode.blocksPointerEvents = true;
    }
    return hitTestNode;
  }

  /**
   * Render the active tooltip if one exists.
   * This runs its own layout/prepaint/paint cycle separate from the main tree.
   */
  private renderActiveTooltip(): HitTestNode | null {
    const activeTooltip = this.tooltipManager.getActiveTooltip();
    if (!activeTooltip || !activeTooltip.element) {
      return null;
    }

    const tooltipElement = activeTooltip.element;
    const targetBounds = activeTooltip.registration.targetBounds;
    const config = activeTooltip.registration.config;

    // First, do a layout pass just to get the tooltip size
    // We use a temporary layout that won't be used for rendering
    const tempElementId = this.allocateElementId();
    const tempLayoutCx = this.createRequestLayoutContext(tempElementId);
    const { layoutId: tempLayoutId } = tooltipElement.requestLayout(tempLayoutCx);

    this.layoutEngine.computeLayoutWithMeasure(
      tempLayoutId,
      this.width,
      this.height,
      this.measureTextCallback.bind(this)
    );

    const tooltipSize = this.layoutEngine.layoutBounds(tempLayoutId);

    // Compute tooltip position based on target bounds and config
    const tooltipBounds = this.tooltipManager.computeTooltipBounds(
      targetBounds,
      { width: tooltipSize.width, height: tooltipSize.height },
      { width: this.width, height: this.height },
      config,
      this.mousePosition
    );

    // Recreate the tooltip element for actual rendering
    // This is needed because elements can only go through layout once
    const freshTooltipElement = activeTooltip.registration.builder(this.getContext());

    // Create anchored wrapper for positioning
    const anchoredElement = new AnchoredElement();
    anchoredElement.anchor("top-left");
    anchoredElement.position({ x: tooltipBounds.x, y: tooltipBounds.y });
    anchoredElement.setWindowSize({ width: this.width, height: this.height });
    anchoredElement.child(freshTooltipElement);

    const deferredWrapper = new DeferredElement(anchoredElement);
    deferredWrapper.priority(0); // Tooltips render below menus

    // Run layout for deferred wrapper
    const wrappedElementId = this.allocateElementId();
    const wrappedRequestLayoutCx = this.createRequestLayoutContext(wrappedElementId);
    const { layoutId: wrappedLayoutId, requestState: wrappedRequestState } =
      deferredWrapper.requestLayout(wrappedRequestLayoutCx);

    this.layoutEngine.computeLayoutWithMeasure(
      wrappedLayoutId,
      this.width,
      this.height,
      this.measureTextCallback.bind(this)
    );

    const wrappedBounds = this.layoutEngine.layoutBounds(wrappedLayoutId);
    const prepaintCx = this.createPrepaintContext(wrappedElementId);
    const wrappedPrepaintState = deferredWrapper.prepaint(
      prepaintCx,
      wrappedBounds,
      wrappedRequestState
    );

    // Paint is handled by deferred system (deferredWrapper registers itself)
    const paintCx = this.createPaintContext(wrappedElementId);
    deferredWrapper.paint(paintCx, wrappedBounds, wrappedPrepaintState);

    // Return hit test node for the tooltip
    return (wrappedPrepaintState as { hitTestNode?: HitTestNode })?.hitTestNode ?? null;
  }

  private endFrame(): void {
    for (const id of this.elementState.keys()) {
      if (!this.visitedElementIds.has(id)) {
        this.elementState.delete(id);
      }
    }
    // Update hit test with current mouse position
    this.mouseHitTest = performHitTest(
      this.hitboxFrame,
      this.mousePosition.x,
      this.mousePosition.y
    );

    // Update platform cursor based on hovered element
    this.updateCursor();

    // Compute visual order and validate cross-element selection
    this.crossElementSelection?.endFrame();
  }

  /**
   * Render all scheduled WebGPU hosts.
   * Called before the main Flash render pass.
   */
  private renderHosts(): void {
    if (this.pendingHostRenders.length === 0) {
      return;
    }

    const encoder = this.device.createCommandEncoder();
    for (const { host, input } of this.pendingHostRenders) {
      host.render(input, encoder);
    }
    this.device.queue.submit([encoder.finish()]);

    // Clear for next frame
    this.pendingHostRenders = [];
  }

  private updateCursor(): void {
    const newCursor = this.mouseHitTest.cursor
      ? cursorToCursorStyle(this.mouseHitTest.cursor)
      : CursorStyle.Default;

    if (newCursor !== this.currentCursor) {
      this.currentCursor = newCursor;
      if (this.renderTarget.setCursor) {
        this.renderTarget.setCursor(newCursor);
      }
    }
  }

  private updateFocusContexts(): void {
    this.focusContextManager.clear();
    const focusIdsInTree = new Set<FocusId>();

    const traverse = (node: HitTestNode, chain: string[]): void => {
      const nextChain = node.keyContext ? [...chain, node.keyContext] : chain;
      if (node.focusHandle) {
        focusIdsInTree.add(node.focusHandle.id);
        this.focusContextManager.setContextChain(node.focusHandle.id, nextChain);
      }
      for (const child of node.children) {
        traverse(child, nextChain);
      }
    };

    for (const root of this.hitTestTree) {
      traverse(root, []);
    }

    const previousLength = this.focusStack.length;
    this.focusStack = this.focusStack.filter((id) => focusIdsInTree.has(id));
    if (this.focusStack.length !== previousLength) {
      this.getContext().markWindowDirty(this.id);
    }
  }

  private findFirstFocusable(nodes: HitTestNode[]): FocusId | null {
    for (const node of nodes) {
      if (node.focusHandle) {
        return node.focusHandle.id;
      }
      const childFocus = this.findFirstFocusable(node.children);
      if (childFocus !== null) {
        return childFocus;
      }
    }
    return null;
  }

  focusFirstChild(focusId: FocusId): FocusId | null {
    const path = getFocusedPath(this.hitTestTree, focusId);
    if (path.length === 0) {
      return null;
    }
    const currentNode = path[path.length - 1]!;
    const childFocus = this.findFirstFocusable(currentNode.children);
    if (childFocus !== null) {
      this.setFocus(childFocus);
      return childFocus;
    }
    return null;
  }

  focusNextSibling(focusId: FocusId): FocusId | null {
    const path = getFocusedPath(this.hitTestTree, focusId);
    if (path.length < 2) {
      return null;
    }
    const currentNode = path[path.length - 1]!;
    const parentNode = path[path.length - 2]!;
    const siblingIndex = parentNode.children.indexOf(currentNode);
    for (let i = siblingIndex + 1; i < parentNode.children.length; i++) {
      const sibling = parentNode.children[i]!;
      const focusable = this.findFirstFocusable([sibling]);
      if (focusable !== null) {
        this.setFocus(focusable);
        return focusable;
      }
    }
    return null;
  }

  saveFocus(): void {
    this.focusRestoration.saveFocus(this.getCurrentFocusId());
  }

  restoreFocus(): FocusId | null {
    const restored = this.focusRestoration.restoreFocus();
    if (restored !== null) {
      this.setFocus(restored);
      return restored;
    }
    return null;
  }

  private focusFromPath(path: HitTestNode[], reason: "mouseDown" | "click"): void {
    for (let i = path.length - 1; i >= 0; i--) {
      const node = path[i];
      if (!node?.focusHandle) {
        continue;
      }
      const handle = node.focusHandle;
      const tabStop = this.tabStopRegistry.getTabStop(handle.id);
      if (reason === "mouseDown") {
        if (tabStop?.config.focusOnPress === true) {
          this.getContext().focus(handle);
          return;
        }
        continue;
      }
      this.getContext().focus(handle);
      return;
    }
  }

  private allocateElementId(): GlobalElementId {
    const id = this.nextElementId++ as GlobalElementId;
    this.visitedElementIds.add(id);
    return id;
  }

  private setupEventListeners(): void {
    const target = this.renderTarget;

    if (target.onMouseMove) {
      const cleanup = target.onMouseMove((x, y) => {
        this.mousePosition = { x, y };
        // Mark window dirty to trigger re-render for hover effects
        this.getContext().markWindowDirty(this.id);

        // Handle scrollbar drag if active
        if (this.scrollbarDragState) {
          const pos = this.scrollbarDragState.axis === "y" ? y : x;
          this.updateScrollbarDrag(pos);
          return; // Don't dispatch other events during scrollbar drag
        }

        // Update drag position if active
        if (this.pendingDragStart || this.dragTracker.getActiveDrag()) {
          const isDragging = this.dragTracker.updatePosition({ x, y });
          if (this.pendingDragStart && isDragging) {
            // Start the actual drag now that threshold is exceeded
            const cx = this.getContext();
            const event: FlashMouseEvent = {
              x: this.pendingDragStart.position.x,
              y: this.pendingDragStart.position.y,
              button: 0,
              modifiers: { shift: false, ctrl: false, alt: false, meta: false },
            };
            const payload = this.pendingDragStart.handler(event, this, cx);
            if (payload) {
              this.dragTracker.startPotentialDrag(
                this.pendingDragStart.position,
                this.id,
                payload,
                this.pendingDragStart.hitboxId
              );
              this.dragTracker.updatePosition({ x, y });
            }
            this.pendingDragStart = null;
          }
        }

        const event: FlashMouseEvent = {
          x,
          y,
          button: 0,
          modifiers: { shift: false, ctrl: false, alt: false, meta: false },
        };

        // Intercept for cross-element selection if mouse is down
        if (this.mouseDown) {
          const manager = this.getCrossElementSelection();
          if (manager.hasSelectableElements()) {
            const result = manager.handleMouseMove(event, this, this.getContext());
            if (result?.stopPropagation) {
              return; // Manager handled it
            }
          }
        }

        let path = hitTest(this.hitTestTree, { x, y });
        // When mouse is down, always route to the focused element.
        // This ensures drag-to-select works even when cursor leaves the text input bounds.
        // Without this, hitTest returns the path to whatever element is under the cursor,
        // and the focused text input never receives mouseMove events during drag.
        if (this.mouseDown) {
          const focusId = this.getCurrentFocusId();
          if (focusId !== null) {
            const focusedPath = getFocusedPath(this.hitTestTree, focusId);
            if (focusedPath.length > 0) {
              path = focusedPath;
            }
          }
        }

        // Dispatch mouseEnter/mouseLeave events based on path changes
        const lastPath = this.lastHoverPath;
        const currentPathSet = new Set(path);
        const lastPathSet = new Set(lastPath);

        // Dispatch mouseLeave for nodes that left the path (in reverse order, deepest first)
        for (let i = lastPath.length - 1; i >= 0; i--) {
          const node = lastPath[i]!;
          if (!currentPathSet.has(node) && node.handlers.mouseLeave) {
            node.handlers.mouseLeave(event, this, this.getContext());
          }
        }

        // Dispatch mouseEnter for nodes that entered the path (in order, root first)
        for (let i = 0; i < path.length; i++) {
          const node = path[i]!;
          if (!lastPathSet.has(node) && node.handlers.mouseEnter) {
            node.handlers.mouseEnter(event, this, this.getContext());
          }
        }

        // Update last hover path
        this.lastHoverPath = path;

        dispatchMouseEvent("mouseMove", event, path, this, this.getContext());
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onMouseDown) {
      const cleanup = target.onMouseDown((x, y, button, mods) => {
        const normalizedButton = normalizeMouseButton(button, mods);

        // Check for popover click-outside dismissal
        const activePopover = this.popoverManager.getActivePopover();
        if (activePopover && normalizedButton === 0) {
          // Get popover bounds from hit test tree (last entry if popover is active)
          const popoverHitNode = this.hitTestTree.find((node) => {
            // Check if this node is from the popover by checking bounds overlap
            const triggerBounds = activePopover.registration.triggerBounds;
            const isClickOnTrigger =
              x >= triggerBounds.x &&
              x <= triggerBounds.x + triggerBounds.width &&
              y >= triggerBounds.y &&
              y <= triggerBounds.y + triggerBounds.height;
            if (isClickOnTrigger) return false;

            // Check if click is inside this node's bounds
            return (
              x >= node.bounds.x &&
              x <= node.bounds.x + node.bounds.width &&
              y >= node.bounds.y &&
              y <= node.bounds.y + node.bounds.height
            );
          });

          // If click is not on popover or trigger, dismiss
          const triggerBounds = activePopover.registration.triggerBounds;
          const isClickOnTrigger =
            x >= triggerBounds.x &&
            x <= triggerBounds.x + triggerBounds.width &&
            y >= triggerBounds.y &&
            y <= triggerBounds.y + triggerBounds.height;

          if (!popoverHitNode && !isClickOnTrigger) {
            const onClose = activePopover.registration.onClose;
            if (onClose) {
              onClose();
              this.getContext().markWindowDirty(this.id);
            }
          }
        }

        // Intercept for cross-element selection FIRST
        const manager = this.getCrossElementSelection();
        if (manager.hasSelectableElements() && normalizedButton === 0) {
          const result = manager.handleMouseDown(
            { x, y, button: normalizedButton, modifiers: mods },
            this,
            this.getContext()
          );
          if (result?.stopPropagation) {
            this.mouseDown = true;
            return; // Manager handled it
          }
        }

        this.mouseDown = true;
        const event: FlashMouseEvent = { x, y, button: normalizedButton, modifiers: mods };
        const path = hitTest(this.hitTestTree, { x, y });

        // Check for drag start handlers on hit path
        for (let i = path.length - 1; i >= 0; i--) {
          const node = path[i]!;
          if (node.handlers.dragStart && normalizedButton === 0) {
            // Store pending drag - we'll start actual drag when threshold is exceeded
            this.pendingDragStart = {
              hitboxId: 0 as HitboxId,
              position: { x, y },
              handler: node.handlers.dragStart,
            };
            // Also start tracking with the tracker
            this.dragTracker.startPotentialDrag({ x, y }, this.id, { data: null }, null);
            break;
          }
        }

        if (normalizedButton === 0) {
          this.focusFromPath(path, "mouseDown");
        }
        dispatchMouseEvent("mouseDown", event, path, this, this.getContext());
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onMouseUp) {
      const cleanup = target.onMouseUp((x, y, button, mods) => {
        const normalizedButton = normalizeMouseButton(button, mods);

        // Intercept for cross-element selection
        const manager = this.getCrossElementSelection();
        if (manager.hasSelectableElements() && normalizedButton === 0) {
          const result = manager.handleMouseUp(
            { x, y, button: normalizedButton, modifiers: mods },
            this,
            this.getContext()
          );
          if (result?.stopPropagation) {
            this.mouseDown = false;
            return; // Manager handled it
          }
        }

        const wasMouseDown = this.mouseDown;
        this.mouseDown = false;

        // End scrollbar drag if active
        if (this.scrollbarDragState) {
          this.endScrollbarDrag();
          this.getContext().markWindowDirty(this.id);
          return;
        }

        const event: FlashMouseEvent = { x, y, button: normalizedButton, modifiers: mods };
        let path = hitTest(this.hitTestTree, { x, y });

        // When mouse was down, also route mouseUp to the focused element
        // This ensures drag-to-select works even when cursor leaves the text bounds
        if (wasMouseDown) {
          const focusId = this.getCurrentFocusId();
          if (focusId !== null) {
            const focusedPath = getFocusedPath(this.hitTestTree, focusId);
            if (focusedPath.length > 0) {
              path = focusedPath;
            }
          }
        }

        // Handle drop if dragging
        if (this.dragTracker.isDragging()) {
          const drag = this.dragTracker.getActiveDrag();
          if (drag) {
            // Find drop target in path
            for (let i = path.length - 1; i >= 0; i--) {
              const node = path[i]!;
              if (node.handlers.drop) {
                const cx = this.getContext();
                const canDrop = node.handlers.canDrop
                  ? node.handlers.canDrop(drag.payload.data, cx)
                  : true;
                if (canDrop) {
                  node.handlers.drop(drag.payload.data, { x, y }, this, cx);
                  break;
                }
              }
            }
          }
          this.dragTracker.endDrag();
        }
        this.pendingDragStart = null;

        dispatchMouseEvent("mouseUp", event, path, this, this.getContext());
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onClick) {
      const cleanup = target.onClick((x, y, clickCount, mods) => {
        // If inspector is enabled, handle click for element selection
        if (this.inspector.isEnabled()) {
          const handled = this.inspector.handleClick({ x, y });
          if (handled) {
            this.inspector.logSelectedElement();
            this.getContext().markWindowDirty(this.id);
            return;
          }
        }

        const event: FlashClickEvent = { x, y, clickCount, modifiers: mods };
        const path = hitTest(this.hitTestTree, { x, y });
        this.focusFromPath(path, "click");
        dispatchClickEvent(event, path, this, this.getContext());
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onScroll) {
      const cleanup = target.onScroll((x, y, deltaX, deltaY, mods) => {
        // Close any open popovers when scrolling occurs
        if (this.popoverManager.isActive()) {
          this.popoverManager.hide();
        }

        const event: FlashScrollEvent = { x, y, deltaX, deltaY, modifiers: mods };
        const path = hitTest(this.hitTestTree, { x, y });
        dispatchScrollEvent(event, path, this, this.getContext());
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onResize) {
      const cleanup = target.onResize((_width, _height) => {
        // Mark window dirty to trigger re-render with new dimensions
        this.getContext().markWindowDirty(this.id);
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onKey) {
      const cleanup = target.onKey((event: KeyEvent) => {
        this.handleKeyEvent(event);
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onTextInput) {
      const cleanup = target.onTextInput((event: TextInputEvent) => {
        this.handleTextInputEvent(event);
      });
      this.eventCleanups.push(cleanup);
    } else {
      if (target.onChar) {
        const cleanup = target.onChar((event: CharEvent) => {
          this.handleCharEvent(event);
        });
        this.eventCleanups.push(cleanup);
      }
    }

    if (target.onCompositionStart) {
      const cleanup = target.onCompositionStart((event: CompositionEvent) => {
        this.handleCompositionEvent("compositionStart", event);
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onCompositionUpdate) {
      const cleanup = target.onCompositionUpdate((event: CompositionEvent) => {
        this.handleCompositionEvent("compositionUpdate", event);
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onCompositionEnd) {
      const cleanup = target.onCompositionEnd((event: CompositionEvent) => {
        this.handleCompositionEvent("compositionEnd", event);
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onFocus) {
      const cleanup = target.onFocus((focused) => {
        this.windowFocused = focused;
        if (!focused) {
          this.focusStack = [];
        }
        this.getContext().markWindowDirty(this.id);
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onCursorEnter) {
      const cleanup = target.onCursorEnter((entered) => {
        this.cursorInside = entered;
        if (!entered) {
          this.mouseHitTest = createHitTest();
          this.updateCursor();
        }
        this.getContext().markWindowDirty(this.id);
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onRefresh) {
      const cleanup = target.onRefresh(() => {
        this.getContext().markWindowDirty(this.id);
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onClose) {
      const cleanup = target.onClose(() => {
        this.closed = true;
        this.destroy();
        this.getContext().markWindowDirty(this.id);
        if (this.onClosed) {
          this.onClosed();
        }
      });
      this.eventCleanups.push(cleanup);
    }
  }

  private handleKeyEvent(event: KeyEvent): void {
    const cx = this.getContext();

    // Handle Tab navigation
    if (event.action === 1) {
      // KeyAction.Press
      const tabKey = event.key === Key.Tab || event.key === 9;
      if (tabKey) {
        const shiftPressed = (event.mods & 0x01) !== 0;
        const currentFocusId = this.getCurrentFocusId();
        const nextFocusId = shiftPressed
          ? this.getPrevFocus(currentFocusId)
          : this.getNextFocus(currentFocusId);

        if (nextFocusId !== null && nextFocusId !== undefined) {
          // Queue focus change via context
          cx.focus(new FocusHandle(nextFocusId, this.id));
          return;
        }
      }
    }

    const currentFocusId = this.getCurrentFocusId();
    let path = getFocusedPath(this.hitTestTree, currentFocusId);
    if (path.length === 0) {
      path = hitTest(this.hitTestTree, this.mousePosition);
    }

    // Build context chain from the path
    const contextChain = this.getKeyContextChain();

    // Try action dispatch first
    const result = this.keyDispatcher.dispatch(event, contextChain, cx, this);
    if (result.handled) {
      return;
    }

    // Try cross-element selection manager for keyboard commands
    const mods = coreModsToFlashMods(event.mods);
    const flashEvent: FlashKeyEvent = {
      key: String.fromCharCode(event.key),
      code: event.key.toString(),
      modifiers: mods,
      repeat: event.action === 2,
    };

    const manager = this.getCrossElementSelection();
    if (manager.hasSelectableElements() && event.action === 1) {
      const selectionResult = manager.handleKeyDown(flashEvent, this, cx);
      if (selectionResult?.stopPropagation) {
        return;
      }
    }

    // If action dispatch didn't handle it, dispatch as regular key event
    const type = event.action === 0 ? "keyUp" : "keyDown";
    dispatchKeyEvent(type, flashEvent, path, this, cx);
  }

  private handleCharEvent(event: CharEvent): void {
    this.handleTextInputEvent({
      text: event.char,
      isComposing: false,
    });
  }

  private handleTextInputEvent(event: TextInputEvent): void {
    const cx = this.getContext();
    const currentFocusId = this.getCurrentFocusId();
    let path = getFocusedPath(this.hitTestTree, currentFocusId);
    if (path.length === 0) {
      path = hitTest(this.hitTestTree, this.mousePosition);
    }

    const textEvent: FlashTextInputEvent = {
      text: event.text,
      isComposing: event.isComposing,
    };

    dispatchTextInputEvent(textEvent, path, this, cx);
  }

  private handleCompositionEvent(
    type: "compositionStart" | "compositionUpdate" | "compositionEnd",
    event: CompositionEvent
  ): void {
    const cx = this.getContext();
    const currentFocusId = this.getCurrentFocusId();
    let path = getFocusedPath(this.hitTestTree, currentFocusId);
    if (path.length === 0) {
      path = hitTest(this.hitTestTree, this.mousePosition);
    }

    const flashEvent = {
      text: event.text,
      selectionStart: event.selectionStart,
      selectionEnd: event.selectionEnd,
    };

    dispatchCompositionEvent(type, flashEvent, path, this, cx);
  }

  private createRequestLayoutContext(elementId: GlobalElementId): RequestLayoutContext {
    const layoutEngine = this.layoutEngine;
    const elementState = this.elementState;
    const allocateElementId = this.allocateElementId.bind(this);

    return {
      elementId,

      requestLayout: (styles: Partial<Styles>, childLayoutIds: LayoutId[]): LayoutId => {
        return layoutEngine.requestLayout(styles, childLayoutIds);
      },

      requestMeasurableLayout: (styles: Partial<Styles>, measureId: number): LayoutId => {
        return layoutEngine.requestMeasurableLayout(styles, measureId);
      },

      registerTextMeasure: (data: {
        text: string;
        fontSize: number;
        fontFamily: string;
        fontWeight: number;
        lineHeight: number;
        noWrap: boolean;
        maxWidth: number | null;
      }): number => {
        return this.registerTextMeasure(data);
      },

      measureText: (
        text: string,
        options: {
          fontSize: number;
          fontFamily: string;
          fontWeight: number;
          lineHeight?: number;
          maxWidth?: number;
        }
      ): { width: number; height: number } => {
        const lineHeight = options.lineHeight ?? options.fontSize * 1.2;
        return this.textSystem.measureText(
          text,
          options.fontSize,
          lineHeight,
          options.maxWidth ?? undefined,
          {
            family: options.fontFamily,
            weight: options.fontWeight,
          }
        );
      },

      getPersistentState: <T = unknown>(): T | undefined => {
        return elementState.get(elementId) as T | undefined;
      },

      setPersistentState: <T = unknown>(state: T): void => {
        elementState.set(elementId, state);
      },

      allocateChildId: (): GlobalElementId => {
        return allocateElementId();
      },

      getScrollOffset: (handle: ScrollHandle): ScrollOffset => {
        return this.getScrollOffset(handle.id);
      },
    };
  }

  private createPrepaintContext(elementId: GlobalElementId): PrepaintContext {
    const layoutEngine = this.layoutEngine;
    const elementState = this.elementState;
    const createPrepaintContext = this.createPrepaintContext.bind(this);
    const insertHitboxFn = this.insertHitbox.bind(this);
    const addGroupHitboxFn = this.addGroupHitbox.bind(this);
    const registerDropTargetFn = this.registerDropTarget.bind(this);
    const registerTooltipFn = this.registerTooltip.bind(this);
    const registerTabStopFn = this.registerTabStop.bind(this);

    return {
      elementId,

      getWindow: (): FlashWindow => {
        return this;
      },

      getBounds: (layoutId: LayoutId): Bounds => {
        return layoutEngine.layoutBounds(layoutId);
      },

      getChildLayouts: (_parentBounds: Bounds, childLayoutIds: LayoutId[]): Bounds[] => {
        return childLayoutIds.map((id) => layoutEngine.layoutBounds(id));
      },

      getPersistentState: <T = unknown>(): T | undefined => {
        return elementState.get(elementId) as T | undefined;
      },

      setPersistentState: <T = unknown>(state: T): void => {
        elementState.set(elementId, state);
      },

      withElementId: (newElementId: GlobalElementId): PrepaintContext => {
        return createPrepaintContext(newElementId);
      },

      insertHitbox: (bounds: Bounds, behavior?: HitboxBehavior, cursor?: Cursor): Hitbox => {
        return insertHitboxFn(bounds, behavior ?? HitboxBehavior.Normal, cursor);
      },

      addGroupHitbox: (groupName: string, hitboxId: HitboxId): void => {
        addGroupHitboxFn(groupName, hitboxId);
      },

      registerDropTarget: (hitboxId: HitboxId, canDrop: boolean): void => {
        registerDropTargetFn(hitboxId, canDrop);
      },

      registerTooltip: (
        hitboxId: HitboxId,
        bounds: Bounds,
        builder: TooltipBuilder,
        config: TooltipConfig
      ): void => {
        registerTooltipFn(hitboxId, bounds, builder, config);
      },

      registerPopover: (registration: PopoverRegistration): void => {
        this.registerPopover(registration);
      },

      registerDialog: (registration: DialogRegistration): void => {
        this.registerDialog(registration);
      },

      updateScrollContentSize: (
        handle: ScrollHandle,
        contentSize: { width: number; height: number },
        viewportSize: { width: number; height: number },
        viewportOrigin: { x: number; y: number }
      ): void => {
        this.updateScrollContentSize(handle.id, contentSize, viewportSize, viewportOrigin);
      },

      getScrollOffset: (handle: ScrollHandle): ScrollOffset => {
        return this.getScrollOffset(handle.id);
      },

      registerDeferredDraw: (entry: import("./deferred.ts").DeferredDrawEntry): void => {
        this.registerDeferredDraw(entry);
      },

      getWindowSize: (): { width: number; height: number } => {
        return { width: this.width, height: this.height };
      },

      registerTabStop: (focusId: FocusId, bounds: Bounds, config: TabStopConfig): void => {
        registerTabStopFn(focusId, bounds, config);
      },

      getComputedWrapWidth: (measureId: number): number | undefined => {
        return this.getComputedWrapWidth(measureId);
      },

      computeFloatingLayout: (
        floatingLayoutId: LayoutId,
        availableWidth: number,
        availableHeight: number
      ): Bounds => {
        layoutEngine.computeLayoutWithMeasure(
          floatingLayoutId,
          availableWidth,
          availableHeight,
          this.measureTextCallback.bind(this)
        );
        return layoutEngine.layoutBounds(floatingLayoutId);
      },
    };
  }

  private registerDeferredDraw(entry: import("./deferred.ts").DeferredDrawEntry): void {
    this.deferredDrawQueue.push(entry);
  }

  private createPaintContext(elementId: GlobalElementId): PaintContext {
    const scene = this.scene;
    const layoutEngine = this.layoutEngine;
    const elementState = this.elementState;
    const mousePosition = this.mousePosition;
    const isFocused = this.isFocused.bind(this);
    const getScrollOffset = this.getScrollOffset.bind(this);
    const createPaintContext = this.createPaintContext.bind(this);
    const getMouseDown = () => this.mouseDown;

    return {
      scene,
      devicePixelRatio: this.renderTarget.devicePixelRatio,
      elementId,

      isHovered: (bounds: Bounds): boolean => {
        const { x, y } = mousePosition;
        return (
          x >= bounds.x &&
          x < bounds.x + bounds.width &&
          y >= bounds.y &&
          y < bounds.y + bounds.height
        );
      },

      isActive: (bounds: Bounds): boolean => {
        if (!getMouseDown()) {
          return false;
        }
        const { x, y } = mousePosition;
        return (
          x >= bounds.x &&
          x < bounds.x + bounds.width &&
          y >= bounds.y &&
          y < bounds.y + bounds.height
        );
      },

      isFocused: (handle: FocusHandle): boolean => {
        return isFocused(handle.id);
      },

      getScrollOffset: (handle: ScrollHandle): ScrollOffset => {
        return getScrollOffset(handle.id);
      },

      getChildLayouts: (_parentBounds: Bounds, childLayoutIds: LayoutId[]): Bounds[] => {
        return childLayoutIds.map((id) => layoutEngine.layoutBounds(id));
      },

      paintRect: (bounds: Bounds, styles: Partial<Styles>): void => {
        if (!styles.backgroundColor) {
          return;
        }
        scene.addRect({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          color: styles.backgroundColor,
          cornerRadius: styles.borderRadius ?? 0,
          borderWidth: 0,
          borderColor: { r: 0, g: 0, b: 0, a: 0 },
        });
      },

      paintShadow: (bounds: Bounds, styles: Partial<Styles>): void => {
        if (!styles.shadow || styles.shadow === "none") {
          return;
        }
        const def = SHADOW_DEFINITIONS[styles.shadow];
        scene.addShadow({
          x: bounds.x,
          y: bounds.y + def.offsetY,
          width: bounds.width,
          height: bounds.height,
          cornerRadius: styles.borderRadius ?? 0,
          color: { r: 0, g: 0, b: 0, a: def.opacity },
          blur: def.blur,
          offsetX: 0,
          offsetY: def.offsetY,
        });
      },

      paintBorder: (bounds: Bounds, styles: Partial<Styles>): void => {
        if (!styles.borderWidth || !styles.borderColor) {
          return;
        }
        scene.addRect({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          color: { r: 0, g: 0, b: 0, a: 0 },
          cornerRadius: styles.borderRadius ?? 0,
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          borderDashed: styles.borderStyle === "dashed" ? 1 : 0,
          borderDashLength: styles.borderDashLength,
          borderGapLength: styles.borderGapLength,
        });
      },

      paintGlyphs: (
        text: string,
        bounds: Bounds,
        color: Color,
        options: {
          fontSize: number;
          fontFamily: string;
          fontWeight: number;
          lineHeight?: number;
          maxWidth?: number;
        }
      ): void => {
        const lineHeight = options.lineHeight ?? options.fontSize * 1.2;
        const maxWidth = options.maxWidth ?? undefined;
        const glyphs = this.textSystem.prepareGlyphInstances(
          text,
          bounds.x,
          bounds.y,
          options.fontSize,
          lineHeight,
          color,
          options.fontFamily,
          { family: options.fontFamily, weight: options.fontWeight },
          maxWidth
        );
        for (const glyph of glyphs) {
          scene.addGlyph(glyph);
        }
      },

      paintPath: (pathBuilder: import("./path.ts").PathBuilder, color: Color): void => {
        const pathPrimitive = pathBuilder.build(color);
        scene.addPath(pathPrimitive);
      },

      paintCachedPath: (
        vertices: Array<{ x: number; y: number; edgeDist?: number }>,
        indices: number[],
        bounds: Bounds,
        color: Color
      ): void => {
        scene.addPath({
          vertices,
          indices,
          bounds,
          color: toColorObject(color),
        });
      },

      paintUnderline: (
        x: number,
        y: number,
        width: number,
        thickness: number,
        color: Color,
        style: "solid" | "wavy",
        options?: { wavelength?: number; amplitude?: number }
      ): void => {
        scene.addUnderline({
          x,
          y,
          width,
          thickness,
          color: toColorObject(color),
          style,
          wavelength: options?.wavelength,
          amplitude: options?.amplitude,
        });
      },

      paintImage: (
        tile: ImageTile,
        bounds: Bounds,
        options?: {
          cornerRadius?: number;
          opacity?: number;
          grayscale?: boolean;
        }
      ): void => {
        const atlasSize = this.imageAtlas.getSize();
        scene.addImage({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          atlasX: tile.atlasX / atlasSize.width,
          atlasY: tile.atlasY / atlasSize.height,
          atlasWidth: tile.width / atlasSize.width,
          atlasHeight: tile.height / atlasSize.height,
          cornerRadius: options?.cornerRadius ?? 0,
          opacity: options?.opacity ?? 1,
          grayscale: options?.grayscale ? 1 : 0,
        });
      },

      paintHostTexture: (
        textureView: GPUTextureView,
        bounds: Bounds,
        options?: {
          cornerRadius?: number;
          opacity?: number;
        }
      ): void => {
        scene.addHostTexture({
          textureView,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          cornerRadius: options?.cornerRadius ?? 0,
          opacity: options?.opacity ?? 1,
        });
      },

      getPersistentState: <T = unknown>(): T | undefined => {
        return elementState.get(elementId) as T | undefined;
      },

      setPersistentState: <T = unknown>(state: T): void => {
        elementState.set(elementId, state);
      },

      withElementId: (newElementId: GlobalElementId): PaintContext => {
        return createPaintContext(newElementId);
      },

      withContentMask: (mask: ContentMask, callback: () => void): void => {
        const previousMask = this.currentContentMask;
        this.currentContentMask = mask;
        scene.pushContentMask(mask);
        try {
          callback();
        } finally {
          scene.popContentMask();
          this.currentContentMask = previousMask;
        }
      },

      withTransform: (transform: TransformationMatrix, callback: () => void): void => {
        scene.pushTransform(transform);
        try {
          callback();
        } finally {
          scene.popTransform();
        }
      },

      isHitboxHovered: (hitbox: Hitbox): boolean => {
        return isHitboxHovered(this.mouseHitTest, hitbox.id);
      },

      isGroupHovered: (groupName: string): boolean => {
        return this.isGroupHovered(groupName);
      },

      isGroupActive: (groupName: string): boolean => {
        return this.isGroupActive(groupName);
      },

      isDragging: (): boolean => {
        return this.isDragging();
      },

      isDragOver: (hitbox: Hitbox): boolean => {
        return this.isDragOver(hitbox.id);
      },

      canDropOnHitbox: (hitbox: Hitbox): boolean => {
        return this.canDropOnHitbox(hitbox.id);
      },

      withStackingContext: (bounds: Bounds, zIndex: number, callback: () => void): void => {
        scene.pushStackingContext(bounds, zIndex);
        try {
          callback();
        } finally {
          scene.popStackingContext();
        }
      },

      getComputedWrapWidth: (measureId: number): number | undefined => {
        return this.getComputedWrapWidth(measureId);
      },

      getWindow: (): FlashWindow => {
        return this;
      },
    };
  }
}
