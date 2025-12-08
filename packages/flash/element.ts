/**
 * Element base classes and View trait for Flash.
 *
 * Elements are lightweight, declarative descriptions of UI.
 * They're created fresh each render and converted to GPU primitives.
 */

import type { Bounds, LayoutId, Color } from "./types.ts";
import type { Styles } from "./styles.ts";
import type { HitTestNode } from "./dispatch.ts";
import type { FlashViewContext } from "./context.ts";
import type { FocusHandle } from "./entity.ts";
import type { FlashScene } from "./scene.ts";

/**
 * A view is an entity that can render a tree of elements.
 * Analogous to a React component or GPUI View.
 */
export interface FlashView {
  render(cx: FlashViewContext<this>): FlashElement;
}

/**
 * Marker for stateless components that are consumed on render.
 * Similar to GPUI's RenderOnce.
 */
export interface FlashRenderOnce {
  render(cx: FlashViewContext<never>): FlashElement;
}

/**
 * Context for the prepaint phase.
 * Provides access to layout computation.
 */
export interface PrepaintContext {
  /**
   * Request layout for an element with the given styles and children.
   * Returns a layout ID that can be used to get computed bounds.
   */
  requestLayout(styles: Partial<Styles>, childLayoutIds: LayoutId[]): LayoutId;

  /**
   * Measure text with the given options.
   * (Stubbed until text system is implemented)
   */
  measureText(
    text: string,
    options: { fontSize: number; fontFamily: string; fontWeight: number }
  ): { width: number; height: number };
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
   * (Stubbed until text system is implemented)
   */
  paintGlyphs(
    text: string,
    bounds: Bounds,
    color: Color,
    options: { fontSize: number; fontFamily: string; fontWeight: number }
  ): void;
}

/**
 * Base class for all Flash elements.
 * Elements are lightweight, declarative descriptions of UI.
 * They're created fresh each render and converted to GPU primitives.
 */
export abstract class FlashElement {
  /**
   * Prepaint phase: request layout, return layout ID.
   */
  abstract prepaint(cx: PrepaintContext): LayoutId;

  /**
   * Paint phase: given computed bounds, emit GPU primitives.
   */
  abstract paint(cx: PaintContext, bounds: Bounds, childLayoutIds: LayoutId[]): void;

  /**
   * Build hit test tree for event dispatch.
   */
  abstract hitTest(bounds: Bounds, childBounds: Bounds[]): HitTestNode | null;
}

/**
 * An element that can contain children.
 */
export abstract class FlashContainerElement extends FlashElement {
  protected children: FlashElement[] = [];
  protected childLayoutIds: LayoutId[] = [];

  /**
   * Add a child element.
   */
  child(element: FlashElement | string | number): this {
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
  children_(...elements: Array<FlashElement | string | number | null | undefined>): this {
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
  getChildren(): readonly FlashElement[] {
    return this.children;
  }
}

/**
 * Simple text element placeholder.
 * Full text rendering will be added when text system is implemented.
 */
export class FlashTextElement extends FlashElement {
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

  prepaint(cx: PrepaintContext): LayoutId {
    const metrics = cx.measureText(this.text, {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
    });

    return cx.requestLayout(
      {
        width: metrics.width,
        height: metrics.height,
      },
      []
    );
  }

  paint(cx: PaintContext, bounds: Bounds, _childLayoutIds: LayoutId[]): void {
    cx.paintGlyphs(this.text, bounds, this.textColor, {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
    });
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    // Text elements don't receive events by default
    return null;
  }
}

/**
 * Factory function to create a text element.
 */
export function text(content: string): FlashTextElement {
  return new FlashTextElement(content);
}
