/**
 * Element base classes and View trait for Flash.
 *
 * Elements are lightweight, declarative descriptions of UI.
 * They're created fresh each render and converted to GPU primitives.
 *
 * Three-phase lifecycle (inspired by GPUI):
 * 1. requestLayout() - Create layout nodes, return LayoutId + RequestLayoutState
 * 2. prepaint() - Run after layout computation, return PrepaintState
 * 3. paint() - Emit GPU primitives using PrepaintState
 */

import type { Bounds, Color, ContentMask, TransformationMatrix } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { Styles, Cursor } from "./styles.ts";
import type { HitTestNode } from "./dispatch.ts";
import type { FlashViewContext } from "./context.ts";
import type { FocusHandle, ScrollHandle } from "./entity.ts";
import type { ScrollOffset } from "./types.ts";
import type { FlashScene } from "./scene.ts";
import type { Hitbox, HitboxId } from "./hitbox.ts";
import type { HitboxBehavior } from "./hitbox.ts";

// ============ Element Identity Types ============

declare const __globalElementIdBrand: unique symbol;
export type GlobalElementId = number & { [__globalElementIdBrand]: true };

declare const __dispatchNodeIdBrand: unique symbol;
export type DispatchNodeId = number & { [__dispatchNodeIdBrand]: true };

/**
 * Marker type for elements that don't need state between phases.
 */
export type NoState = void;

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
export interface FlashView {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render(cx: FlashViewContext<this>): FlashElement<any, any>;
}

/**
 * Marker for stateless components that are consumed on render.
 * Similar to GPUI's RenderOnce.
 */
export interface FlashRenderOnce {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render(cx: FlashViewContext<never>): FlashElement<any, any>;
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
   * Measure text with the given options.
   */
  measureText(
    text: string,
    options: { fontSize: number; fontFamily: string; fontWeight: number }
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
  insertHitbox(bounds: Bounds, behavior?: HitboxBehavior, cursor?: Cursor): Hitbox;

  /**
   * Push a hitbox onto a group stack.
   * Use for group hover effects.
   */
  pushGroupHitbox(groupName: string, hitboxId: HitboxId): void;

  /**
   * Pop a hitbox from a group stack.
   */
  popGroupHitbox(groupName: string): void;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    builder: (cx: import("./context.ts").FlashContext) => FlashElement<any, any>,
    config: import("./tooltip.ts").TooltipConfig
  ): void;

  /**
   * Update the content and viewport size for a scroll handle.
   * This allows proper scroll offset clamping.
   */
  updateScrollContentSize(
    handle: ScrollHandle,
    contentSize: { width: number; height: number },
    viewportSize: { width: number; height: number }
  ): void;

  /**
   * Get the current scroll offset for a scroll handle.
   */
  getScrollOffset(handle: ScrollHandle): ScrollOffset;
}

/**
 * Context for the paint phase.
 * Provides access to scene graph and state queries.
 */
export interface PaintContext {
  /** The scene to paint primitives into. */
  scene: FlashScene;

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
    options: { fontSize: number; fontFamily: string; fontWeight: number }
  ): void;

  /**
   * Paint a path primitive.
   */
  paintPath(path: import("./path.ts").PathBuilder, color: Color): void;

  /**
   * Paint an underline primitive.
   */
  paintUnderline(
    x: number,
    y: number,
    width: number,
    thickness: number,
    color: Color,
    style: "solid" | "wavy",
    options?: { wavelength?: number; amplitude?: number }
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
}

// ============ Element Base Classes ============

/**
 * Base class for all Flash elements.
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
export abstract class FlashElement<RequestLayoutState = NoState, PrepaintState = NoState> {
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
 * An element that can contain children.
 */
export abstract class FlashContainerElement<
  RequestLayoutState = NoState,
  PrepaintState = NoState,
> extends FlashElement<RequestLayoutState, PrepaintState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected children: FlashElement<any, any>[] = [];
  protected childLayoutIds: LayoutId[] = [];

  /**
   * Add a child element.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  child(element: FlashElement<any, any> | string | number): this {
    if (typeof element === "string" || typeof element === "number") {
      this.children.push(new FlashTextElement(String(element)));
    } else {
      this.children.push(element);
    }
    return this;
  }

  /**
   * Add multiple children.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children_(...elements: Array<FlashElement<any, any> | string | number | null | undefined>): this {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getChildren(): readonly FlashElement<any, any>[] {
    return this.children;
  }
}

// ============ Text Element ============

/**
 * Simple text element.
 * Full text rendering will be added when text system is implemented.
 */
export class FlashTextElement extends FlashElement<NoState, NoState> {
  private textColor: Color = { r: 1, g: 1, b: 1, a: 1 };
  private fontSize = 14;
  private fontFamily = "system-ui";
  private fontWeight = 400;

  constructor(private text: string) {
    super();
  }

  color(c: Color): this {
    this.textColor = c;
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

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<NoState> {
    const metrics = cx.measureText(this.text, {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
    });

    const layoutId = cx.requestLayout(
      {
        width: metrics.width,
        height: metrics.height,
      },
      []
    );

    return { layoutId, requestState: undefined };
  }

  prepaint(_cx: PrepaintContext, _bounds: Bounds, _requestState: NoState): NoState {
    return undefined;
  }

  paint(cx: PaintContext, bounds: Bounds, _prepaintState: NoState): void {
    cx.paintGlyphs(this.text, bounds, this.textColor, {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
    });
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

/**
 * Factory function to create a text element.
 */
export function text(content: string): FlashTextElement {
  return new FlashTextElement(content);
}
