/**
 * FlashWindow - manages a rendering surface and event handling.
 *
 * Windows own a render target, handle input events, and coordinate
 * the render cycle for their root view.
 */

import type { WindowId, EntityId, FocusId, Point, Bounds, Color } from "./types.ts";
import type { FlashViewHandle, FocusHandle } from "./entity.ts";
import type { FlashView, PrepaintContext, PaintContext } from "./element.ts";
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
   * Render the window.
   */
  render(
    createViewContext: <V extends FlashView>(
      entityId: EntityId,
      windowId: WindowId,
      window: FlashWindow
    ) => import("./context.ts").FlashViewContext<V>
  ): void {
    this.scene.clear();
    this.layoutEngine.clear();
    this.layoutEngine.setScaleFactor(this.renderTarget.devicePixelRatio);

    const view = this.readView(this.rootView);
    const cx = createViewContext(this.rootView.id, this.id, this);
    const element = view.render(cx);

    const prepaintCx = this.createPrepaintContext();
    const rootLayoutId = element.prepaint(prepaintCx);

    this.layoutEngine.computeLayout(rootLayoutId, this.width, this.height);

    const rootBounds = this.layoutEngine.layoutBounds(rootLayoutId);
    const paintCx = this.createPaintContext();
    element.paint(paintCx, rootBounds, []);

    this.hitTestTree = [];
    const hitNode = element.hitTest(rootBounds, []);
    if (hitNode) {
      this.hitTestTree.push(hitNode);
    }
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
      requestLayout: (styles: Partial<Styles>, childLayoutIds: LayoutId[]): LayoutId => {
        return this.layoutEngine.requestLayout(styles, childLayoutIds);
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

      getChildLayouts: (_parentBounds: Bounds, childLayoutIds: LayoutId[]): Bounds[] => {
        return childLayoutIds.map((id) => this.layoutEngine.layoutBounds(id));
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
}
