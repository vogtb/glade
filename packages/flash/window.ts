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
  Color,
  ContentMask,
  TransformationMatrix,
  ScrollHandleId,
  ScrollOffset,
  ScrollState,
} from "./types.ts";
import { createScrollState, clampScrollOffset } from "./types.ts";
import { CursorStyle } from "@glade/core/events.ts";
import type { FlashViewHandle, FocusHandle, ScrollHandle } from "./entity.ts";
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
  Modifiers,
} from "./dispatch.ts";
import {
  hitTest,
  dispatchMouseEvent,
  dispatchClickEvent,
  dispatchScrollEvent,
  dispatchKeyEvent,
  buildKeyContextChain,
  getFocusedPath,
  type FlashKeyEvent,
} from "./dispatch.ts";
import type { KeyEvent } from "@glade/core";
import { ActionRegistry, Keymap, KeyDispatcher } from "./actions.ts";
import { coreModsToFlashMods } from "./keyboard.ts";
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
} from "./hitbox.ts";
import { DragTracker, type ActiveDrag, type DragPayload } from "./drag.ts";
import { TooltipManager, type TooltipBuilder, type TooltipConfig } from "./tooltip.ts";
import { FlashRenderer } from "./renderer.ts";
import { RectPipeline } from "./rect.ts";
import { ShadowPipeline } from "./shadow.ts";
import { TextSystem, TextPipeline } from "./text.ts";
import { PathPipeline } from "./path.ts";
import { UnderlinePipeline } from "./underline.ts";
import { ImageAtlas, ImagePipeline, type ImageTile, type DecodedImage } from "./image.ts";
import { Inspector, type ElementDebugInfo, type InspectorState } from "./inspector.ts";

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

  requestAdapter(): Promise<GPUAdapter | null>;
  requestDevice(): Promise<GPUDevice>;
  getPreferredCanvasFormat(): GPUTextureFormat;

  createRenderTarget(options: { width: number; height: number; title?: string }): FlashRenderTarget;

  now(): number;
  requestAnimationFrame(callback: (time: number) => void): number;
  cancelAnimationFrame(id: number): void;

  decodeImage(data: Uint8Array): Promise<DecodedImageData>;
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

  setCursor?(style: CursorStyle): void;
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
  private eventCleanups: Array<() => void> = [];

  private elementState = new Map<GlobalElementId, unknown>();
  private visitedElementIds = new Set<GlobalElementId>();
  private nextElementId = 1;

  private scrollStates = new Map<ScrollHandleId, ScrollState>();
  private nextScrollHandleId = 1;

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

  // Key dispatch
  private actionRegistry = new ActionRegistry();
  private keymap = new Keymap();
  private keyDispatcher: KeyDispatcher;

  // Renderer
  private renderer: FlashRenderer;
  private textSystem: TextSystem;
  private imageAtlas: ImageAtlas;
  private didRenderThisFrame = false;

  // Inspector/Debug Mode
  private inspector: Inspector;

  // Deferred drawing
  private deferredDrawQueue: import("./deferred.ts").DeferredDrawEntry[] = [];

  constructor(
    readonly id: WindowId,
    private platform: FlashPlatform,
    private device: GPUDevice,
    private format: GPUTextureFormat,
    private renderTarget: FlashRenderTarget,
    private rootView: FlashViewHandle<FlashView>,
    private getContext: () => FlashContext,
    private readView: <V extends FlashView>(handle: FlashViewHandle<V>) => V
  ) {
    this.scene = new FlashScene();
    this.layoutEngine = new FlashLayoutEngine();
    // Layout engine works in logical coordinates, no scaling needed
    this.layoutEngine.setScaleFactor(1);
    this.renderTarget.configure(device, format);

    // Initialize renderer with pipelines
    this.renderer = new FlashRenderer(device, format, {
      clearColor: { r: 0.08, g: 0.08, b: 0.1, a: 1 },
    });
    const rectPipeline = new RectPipeline(
      device,
      format,
      this.renderer.getUniformBindGroupLayout()
    );
    const shadowPipeline = new ShadowPipeline(
      device,
      format,
      this.renderer.getUniformBindGroupLayout()
    );
    this.renderer.setRectPipeline(rectPipeline);
    this.renderer.setShadowPipeline(shadowPipeline);

    // Initialize text system
    this.textSystem = new TextSystem(device);
    this.textSystem.setDevicePixelRatio(renderTarget.devicePixelRatio);
    const textPipeline = new TextPipeline(device, format, this.textSystem);
    this.renderer.setTextPipeline(textPipeline, this.textSystem);

    // Initialize path pipeline
    const pathPipeline = new PathPipeline(
      device,
      format,
      this.renderer.getUniformBindGroupLayout()
    );
    this.renderer.setPathPipeline(pathPipeline);

    // Initialize underline pipeline
    const underlinePipeline = new UnderlinePipeline(
      device,
      format,
      this.renderer.getUniformBindGroupLayout()
    );
    this.renderer.setUnderlinePipeline(underlinePipeline);

    // Initialize image atlas and pipeline
    this.imageAtlas = new ImageAtlas(device);
    const imagePipeline = new ImagePipeline(device, format, this.imageAtlas);
    this.renderer.setImagePipeline(imagePipeline);

    // Initialize key dispatcher
    this.keyDispatcher = new KeyDispatcher(this.keymap, this.actionRegistry);

    // Initialize inspector
    this.inspector = new Inspector();

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
    if (!this.focusStack.includes(focusId)) {
      this.focusStack.push(focusId);
    }
  }

  /**
   * Clear focus from a focus handle.
   */
  clearFocus(focusId: FocusId): void {
    const index = this.focusStack.indexOf(focusId);
    if (index >= 0) {
      this.focusStack.splice(index, 1);
    }
  }

  /**
   * Check if a focus handle is focused.
   */
  isFocused(focusId: FocusId): boolean {
    return this.focusStack.includes(focusId);
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
    let path = getFocusedPath(this.hitTestTree);
    if (path.length === 0) {
      path = hitTest(this.hitTestTree, this.mousePosition);
    }
    return buildKeyContextChain(path);
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
    viewportSize: { width: number; height: number }
  ): void {
    let state = this.scrollStates.get(scrollId);
    if (!state) {
      state = createScrollState();
      this.scrollStates.set(scrollId, state);
    }
    state.contentSize = contentSize;
    state.viewportSize = viewportSize;
    const clamped = clampScrollOffset(state);
    state.offset = clamped;
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

  /**
   * Get the current content mask.
   */
  getCurrentContentMask(): ContentMask | null {
    return this.currentContentMask;
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

    this.layoutEngine.computeLayout(rootLayoutId, this.width, this.height);

    const rootBounds = this.layoutEngine.layoutBounds(rootLayoutId);
    const prepaintCx = this.createPrepaintContext(rootElementId);
    const rootPrepaintState = element.prepaint(prepaintCx, rootBounds, rootRequestState);

    const paintCx = this.createPaintContext(rootElementId);
    element.paint(paintCx, rootBounds, rootPrepaintState);

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
    }
  }

  /**
   * Destroy the window and release resources.
   */
  destroy(): void {
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
    // Clear deferred draw queue from previous frame
    this.deferredDrawQueue = [];
  }

  private paintDeferredElements(): void {
    if (this.deferredDrawQueue.length === 0) {
      return;
    }

    this.deferredDrawQueue.sort((a, b) => a.priority - b.priority);

    for (const entry of this.deferredDrawQueue) {
      const paintCx = this.createPaintContext(entry.childElementId);
      entry.child.paint(paintCx, entry.bounds, entry.childPrepaintState);
    }
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

    // Update tooltip state based on current hover
    const hoveredHitboxId =
      this.mouseHitTest.hoverHitboxCount > 0 ? (this.mouseHitTest.ids[0] ?? null) : null;
    this.tooltipManager.update(hoveredHitboxId, this.platform.now(), this.getContext());
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
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onMouseDown) {
      const cleanup = target.onMouseDown((x, y, button, mods) => {
        this.mouseDown = true;
        const event: FlashMouseEvent = { x, y, button, modifiers: mods };
        const path = hitTest(this.hitTestTree, { x, y });

        // Check for drag start handlers on hit path
        for (let i = path.length - 1; i >= 0; i--) {
          const node = path[i]!;
          if (node.handlers.dragStart && button === 0) {
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

        dispatchMouseEvent("mouseDown", event, path, this, this.getContext());
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onMouseUp) {
      const cleanup = target.onMouseUp((x, y, button, mods) => {
        this.mouseDown = false;
        const event: FlashMouseEvent = { x, y, button, modifiers: mods };
        const path = hitTest(this.hitTestTree, { x, y });

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
        dispatchClickEvent(event, path, this, this.getContext());
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onScroll) {
      const cleanup = target.onScroll((x, y, deltaX, deltaY, mods) => {
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
  }

  private handleKeyEvent(event: KeyEvent): void {
    const cx = this.getContext();

    // Get the path from focused element (or use mouse position as fallback)
    let path = getFocusedPath(this.hitTestTree);
    if (path.length === 0) {
      path = hitTest(this.hitTestTree, this.mousePosition);
    }

    // Build context chain from the path
    const contextChain = buildKeyContextChain(path);

    // Try action dispatch first
    const result = this.keyDispatcher.dispatch(event, contextChain, cx, this);
    if (result.handled) {
      return;
    }

    // If action dispatch didn't handle it, dispatch as regular key event
    const mods = coreModsToFlashMods(event.mods);
    const flashEvent: FlashKeyEvent = {
      key: String.fromCharCode(event.key),
      code: event.scancode.toString(),
      modifiers: mods,
      repeat: event.action === 2,
    };

    const type = event.action === 0 ? "keyUp" : "keyDown";
    dispatchKeyEvent(type, flashEvent, path, this, cx);
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

      measureText: (
        text: string,
        options: { fontSize: number; fontFamily: string; fontWeight: number }
      ): { width: number; height: number } => {
        const lineHeight = options.fontSize * 1.2;
        return this.textSystem.measureText(text, options.fontSize, lineHeight, undefined, {
          family: options.fontFamily,
          weight: options.fontWeight,
        });
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

    return {
      elementId,

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

      updateScrollContentSize: (
        handle: ScrollHandle,
        contentSize: { width: number; height: number },
        viewportSize: { width: number; height: number }
      ): void => {
        this.updateScrollContentSize(handle.id, contentSize, viewportSize);
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
        options: { fontSize: number; fontFamily: string; fontWeight: number }
      ): void => {
        const lineHeight = options.fontSize * 1.2;
        const glyphs = this.textSystem.prepareGlyphInstances(
          text,
          bounds.x,
          bounds.y,
          options.fontSize,
          lineHeight,
          color,
          options.fontFamily,
          { family: options.fontFamily, weight: options.fontWeight }
        );
        for (const glyph of glyphs) {
          scene.addGlyph(glyph);
        }
      },

      paintPath: (pathBuilder: import("./path.ts").PathBuilder, color: Color): void => {
        const pathPrimitive = pathBuilder.build(color);
        scene.addPath(pathPrimitive);
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
          color,
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
    };
  }
}
