/**
 * FlashWindow - manages a rendering surface and event handling.
 *
 * Windows own a render target, handle input events, and coordinate
 * the render cycle for their root view.
 */

import type { WindowId, EntityId, FocusId, Point, Bounds } from "./types.ts";
import type { FlashViewHandle, FocusHandle } from "./entity.ts";
import type { FlashView, PrepaintContext, PaintContext } from "./element.ts";
import type { FlashContext } from "./context.ts";
import type { HitTestNode, FlashMouseEvent, FlashClickEvent, Modifiers } from "./dispatch.ts";
import { hitTest, dispatchMouseEvent, dispatchClickEvent } from "./dispatch.ts";
import { FlashScene } from "./scene.ts";
import type { Styles } from "./styles.ts";
import { SHADOW_DEFINITIONS } from "./styles.ts";
import type { LayoutId, Color } from "./types.ts";

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

  // Event handling
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
  private hitTestTree: HitTestNode[] = [];
  private focusStack: FocusId[] = [];
  private mousePosition: Point = { x: 0, y: 0 };
  private mouseDown = false;
  private eventCleanups: Array<() => void> = [];

  // Simple layout storage (will be replaced with Taffy later)
  private layoutCounter = 0;
  private layouts: Map<LayoutId, Bounds> = new Map();

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
    // For now, just check if it's the root view
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
   * Render the window.
   */
  render(
    createViewContext: <V extends FlashView>(
      entityId: EntityId,
      windowId: WindowId,
      window: FlashWindow
    ) => import("./context.ts").FlashViewContext<V>
  ): void {
    // Clear scene
    this.scene.clear();
    this.layouts.clear();
    this.layoutCounter = 0;

    // Get root view and render it
    const view = this.readView(this.rootView);
    const cx = createViewContext(this.rootView.id, this.id, this);
    const element = view.render(cx);

    // Prepaint phase - compute layout
    const prepaintCx = this.createPrepaintContext();
    const rootLayoutId = element.prepaint(prepaintCx);

    // Compute final layouts (simplified - just use requested sizes for now)
    this.computeLayout(rootLayoutId, {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
    });

    // Paint phase
    const rootBounds = this.layouts.get(rootLayoutId) ?? {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
    };
    const paintCx = this.createPaintContext();
    element.paint(paintCx, rootBounds, []);

    // Build hit test tree
    this.hitTestTree = [];
    const hitNode = element.hitTest(rootBounds, []);
    if (hitNode) {
      this.hitTestTree.push(hitNode);
    }

    // TODO: Submit scene to GPU renderer
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

  private createPrepaintContext(): PrepaintContext {
    return {
      requestLayout: (styles: Partial<Styles>, _childLayoutIds: LayoutId[]): LayoutId => {
        const id = this.layoutCounter++ as LayoutId;
        // Store styles for later layout computation
        // For now, use a simple box model
        const width = typeof styles.width === "number" ? styles.width : 0;
        const height = typeof styles.height === "number" ? styles.height : 0;
        this.layouts.set(id, { x: 0, y: 0, width, height });
        return id;
      },

      measureText: (
        text: string,
        options: { fontSize: number; fontFamily: string; fontWeight: number }
      ): { width: number; height: number } => {
        // Simplified text measurement - will be replaced with proper text shaping
        const charWidth = options.fontSize * 0.6;
        return {
          width: text.length * charWidth,
          height: options.fontSize * 1.2,
        };
      },
    };
  }

  private createPaintContext(): PaintContext {
    return {
      scene: this.scene,
      devicePixelRatio: this.renderTarget.devicePixelRatio,

      isHovered: (bounds: Bounds): boolean => {
        const { x, y } = this.mousePosition;
        return (
          x >= bounds.x &&
          x < bounds.x + bounds.width &&
          y >= bounds.y &&
          y < bounds.y + bounds.height
        );
      },

      isActive: (bounds: Bounds): boolean => {
        if (!this.mouseDown) return false;
        const { x, y } = this.mousePosition;
        return (
          x >= bounds.x &&
          x < bounds.x + bounds.width &&
          y >= bounds.y &&
          y < bounds.y + bounds.height
        );
      },

      isFocused: (handle: FocusHandle): boolean => {
        return this.isFocused(handle.id);
      },

      getChildLayouts: (parentBounds: Bounds, childLayoutIds: LayoutId[]): Bounds[] => {
        // Simplified - just return stored layouts offset by parent
        return childLayoutIds.map((id) => {
          const layout = this.layouts.get(id);
          if (!layout) {
            return { x: parentBounds.x, y: parentBounds.y, width: 0, height: 0 };
          }
          return {
            x: parentBounds.x + layout.x,
            y: parentBounds.y + layout.y,
            width: layout.width,
            height: layout.height,
          };
        });
      },

      paintRect: (bounds: Bounds, styles: Partial<Styles>): void => {
        if (!styles.backgroundColor) return;
        this.scene.addRect({
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
        this.scene.addShadow({
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
        this.scene.addRect({
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
        // Simplified glyph painting - will be replaced with proper text rendering
        // For now, just add placeholder glyphs
        const charWidth = options.fontSize * 0.6;
        let x = bounds.x;
        for (let i = 0; i < text.length; i++) {
          this.scene.addGlyph({
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
    };
  }

  private computeLayout(layoutId: LayoutId, availableSpace: Bounds): void {
    const layout = this.layouts.get(layoutId);
    if (layout) {
      // Update position
      layout.x = availableSpace.x;
      layout.y = availableSpace.y;
      // If no explicit size, use available space
      if (layout.width === 0) layout.width = availableSpace.width;
      if (layout.height === 0) layout.height = availableSpace.height;
    }
  }
}
