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
} from "./dispatch.ts";
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

/**
 * Options for creating a window.
 */
export interface WindowOptions {
  title?: string;
  width: number;
  height: number;
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

  // Renderer
  private renderer: FlashRenderer;
  private didRenderThisFrame = false;

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
    const clamped = clampScrollOffset(state);
    state.offset = clamped;

    // Mark window dirty if scroll offset changed
    if (clamped.x !== oldOffset.x || clamped.y !== oldOffset.y) {
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
   * Push a group hitbox.
   */
  pushGroupHitbox(groupName: string, hitboxId: HitboxId): void {
    this.groupHitboxes.push(groupName, hitboxId);
  }

  /**
   * Pop a group hitbox.
   */
  popGroupHitbox(groupName: string): void {
    this.groupHitboxes.pop(groupName);
  }

  /**
   * Get the topmost hitbox ID for a group.
   */
  getGroupHitbox(groupName: string): HitboxId | null {
    return this.groupHitboxes.get(groupName);
  }

  /**
   * Check if a group is hovered.
   */
  isGroupHovered(groupName: string): boolean {
    const hitboxId = this.groupHitboxes.get(groupName);
    if (hitboxId === null) return false;
    return isHitboxHovered(this.mouseHitTest, hitboxId);
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
    if (!this.dragTracker.isDragging()) return false;
    const target = this.dropTargetHitboxes.get(hitboxId);
    if (!target) return false;
    if (!this.isHitboxIdHovered(hitboxId)) return false;
    return target.canDrop;
  }

  /**
   * Check if a hitbox is being dragged over.
   */
  isDragOver(hitboxId: HitboxId): boolean {
    if (!this.dragTracker.isDragging()) return false;
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

    this.hitTestTree = [];
    const childBounds = this.layoutEngine.layoutBounds(rootLayoutId);
    const hitNode = element.hitTest(rootBounds, [childBounds]);
    if (hitNode) {
      this.hitTestTree.push(hitNode);
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
        const charWidth = options.fontSize * 0.6;
        return {
          width: text.length * charWidth,
          height: options.fontSize * 1.2,
        };
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
    };
  }

  private createPrepaintContext(elementId: GlobalElementId): PrepaintContext {
    const layoutEngine = this.layoutEngine;
    const elementState = this.elementState;
    const createPrepaintContext = this.createPrepaintContext.bind(this);
    const insertHitboxFn = this.insertHitbox.bind(this);
    const pushGroupHitboxFn = this.pushGroupHitbox.bind(this);
    const popGroupHitboxFn = this.popGroupHitbox.bind(this);
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

      pushGroupHitbox: (groupName: string, hitboxId: HitboxId): void => {
        pushGroupHitboxFn(groupName, hitboxId);
      },

      popGroupHitbox: (groupName: string): void => {
        popGroupHitboxFn(groupName);
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
    };
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
        if (!getMouseDown()) return false;
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
        if (!styles.backgroundColor) return;
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
        if (!styles.shadow || styles.shadow === "none") return;
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
        if (!styles.borderWidth || !styles.borderColor) return;
        scene.addRect({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          color: { r: 0, g: 0, b: 0, a: 0 },
          cornerRadius: styles.borderRadius ?? 0,
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
        });
      },

      paintGlyphs: (
        text: string,
        bounds: Bounds,
        color: Color,
        options: { fontSize: number; fontFamily: string; fontWeight: number }
      ): void => {
        const charWidth = options.fontSize * 0.6;
        let x = bounds.x;
        for (let i = 0; i < text.length; i++) {
          scene.addGlyph({
            x,
            y: bounds.y,
            width: charWidth,
            height: options.fontSize,
            atlasX: 0,
            atlasY: 0,
            atlasWidth: charWidth,
            atlasHeight: options.fontSize,
            color,
          });
          x += charWidth;
        }
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

      isDragging: (): boolean => {
        return this.isDragging();
      },

      isDragOver: (hitbox: Hitbox): boolean => {
        return this.isDragOver(hitbox.id);
      },

      canDropOnHitbox: (hitbox: Hitbox): boolean => {
        return this.canDropOnHitbox(hitbox.id);
      },
    };
  }
}
