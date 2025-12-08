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
} from "./types.ts";
import type { FlashViewHandle, FocusHandle } from "./entity.ts";
import type {
  FlashView,
  RequestLayoutContext,
  PrepaintContext,
  PaintContext,
  GlobalElementId,
} from "./element.ts";
import type { FlashContext } from "./context.ts";
import type { HitTestNode, FlashMouseEvent, FlashClickEvent, Modifiers } from "./dispatch.ts";
import { hitTest, dispatchMouseEvent, dispatchClickEvent } from "./dispatch.ts";
import { FlashScene } from "./scene.ts";
import type { Styles } from "./styles.ts";
import { SHADOW_DEFINITIONS } from "./styles.ts";
import { FlashLayoutEngine, type LayoutId } from "./layout.ts";

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
    this.layoutEngine.setScaleFactor(renderTarget.devicePixelRatio);
    this.renderTarget.configure(device, format);
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
    this.beginFrame();

    this.scene.clear();
    this.layoutEngine.clear();
    this.layoutEngine.setScaleFactor(this.renderTarget.devicePixelRatio);

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
  }

  /**
   * Present the rendered frame.
   */
  present(): void {
    this.renderTarget.present();
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
  }

  private endFrame(): void {
    for (const id of this.elementState.keys()) {
      if (!this.visitedElementIds.has(id)) {
        this.elementState.delete(id);
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
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onMouseDown) {
      const cleanup = target.onMouseDown((x, y, button, mods) => {
        this.mouseDown = true;
        const event: FlashMouseEvent = { x, y, button, modifiers: mods };
        const path = hitTest(this.hitTestTree, { x, y });
        dispatchMouseEvent("mouseDown", event, path, this, this.getContext());
      });
      this.eventCleanups.push(cleanup);
    }

    if (target.onMouseUp) {
      const cleanup = target.onMouseUp((x, y, button, mods) => {
        this.mouseDown = false;
        const event: FlashMouseEvent = { x, y, button, modifiers: mods };
        const path = hitTest(this.hitTestTree, { x, y });
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
    };
  }

  private createPaintContext(elementId: GlobalElementId): PaintContext {
    const scene = this.scene;
    const layoutEngine = this.layoutEngine;
    const elementState = this.elementState;
    const mousePosition = this.mousePosition;
    const isFocused = this.isFocused.bind(this);
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
        scene.pushContentMask(mask);
        try {
          callback();
        } finally {
          scene.popContentMask();
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
    };
  }
}
