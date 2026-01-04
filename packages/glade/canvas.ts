/**
 * Canvas element for ad-hoc custom painting.
 *
 * Mirrors GPUI's canvas helper: callers can hook into prepaint/paint without
 * defining a full element type.
 */

import {
  GladeElement,
  type NoState,
  type PaintContext,
  type PrepaintContext,
  type RequestLayoutContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { Styles } from "./styles.ts";
import type { Bounds } from "./types.ts";

export type CanvasPrepaint<T> = (bounds: Bounds, cx: PrepaintContext) => T;

export type CanvasPaint<T> = (cx: PaintContext, bounds: Bounds, state: T) => void;

type CanvasOptionsBase = {
  styles?: Partial<Styles>;
};

export type CanvasOptionsWithPrepaint<T> = CanvasOptionsBase & {
  prepaint: CanvasPrepaint<T>;
  paint: CanvasPaint<T>;
};

export type CanvasOptionsWithoutPrepaint = CanvasOptionsBase & {
  paint: CanvasPaint<void>;
};

function noStatePrepaint(): void {
  return;
}

/**
 * A lightweight element that forwards directly to user-provided paint callbacks.
 */
export class CanvasElement<T> extends GladeElement<NoState, T> {
  private styles: Partial<Styles>;
  private prepaintFn: CanvasPrepaint<T>;
  private paintFn: CanvasPaint<T>;

  constructor(prepaint: CanvasPrepaint<T>, paint: CanvasPaint<T>, styles?: Partial<Styles>) {
    super();
    this.styles = styles ?? {};
    this.prepaintFn = prepaint;
    this.paintFn = paint;
  }

  /**
   * Merge additional styles for layout.
   */
  style(styles: Partial<Styles>): this {
    this.styles = { ...this.styles, ...styles };
    return this;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<NoState> {
    const layoutId = cx.requestLayout(this.styles, []);
    return { layoutId, requestState: undefined };
  }

  prepaint(cx: PrepaintContext, bounds: Bounds, _requestState: NoState): T {
    return this.prepaintFn(bounds, cx);
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: T): void {
    this.paintFn(cx, bounds, prepaintState);
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): null {
    return null;
  }
}

/**
 * Create a canvas element for inline custom painting.
 */
export function canvas(options: CanvasOptionsWithoutPrepaint): CanvasElement<void>;
export function canvas<T>(options: CanvasOptionsWithPrepaint<T>): CanvasElement<T>;
export function canvas<T>(
  options: CanvasOptionsWithPrepaint<T> | CanvasOptionsWithoutPrepaint
): CanvasElement<T> {
  const styles = options.styles ?? {};
  if ("prepaint" in options) {
    return new CanvasElement(options.prepaint, options.paint, styles);
  }
  return new CanvasElement(noStatePrepaint, options.paint, styles) as unknown as CanvasElement<T>;
}
