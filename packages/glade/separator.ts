/**
 * Separator element - a visual separator for content. Similar to shadcn's
 * Separator component, provides a thin line that visually or semantically
 * separates content.
 */

import { type Color, type ColorObject, toColorObject } from "@glade/utils";

import type { Bounds } from "./bounds.ts";
import type { HitTestNode } from "./dispatch.ts";
import {
  GladeElement,
  type NoState,
  type PaintContext,
  type PrepaintContext,
  type RequestLayoutContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { LayoutId } from "./layout.ts";

type SeparatorOrientation = "horizontal" | "vertical";

/**
 * Request layout state for separator - carries layoutId for bounds lookup.
 */
type SeparatorRequestState = {
  layoutId: LayoutId;
};

/**
 * A separator element that renders a thin line to separate content.
 *
 * Horizontal separators span full width with 1px height. Vertical separators
 * span full height with 1px width.
 */
export class GladeSeparator extends GladeElement<SeparatorRequestState, NoState> {
  private orientation: SeparatorOrientation = "horizontal";
  private colorValue: ColorObject = { r: 0.2, g: 0.2, b: 0.2, a: 1 };
  private thicknessValue = 1;
  private marginValue = 0;

  /**
   * Set the separator orientation to vertical. Vertical separators are
   * useful in flex row layouts.
   */
  vertical(): this {
    this.orientation = "vertical";
    return this;
  }

  /**
   * Set the separator orientation to horizontal (default). Horizontal
   * separators are useful in flex column layouts.
   */
  horizontal(): this {
    this.orientation = "horizontal";
    return this;
  }

  /**
   * Set the separator color.
   */
  color(c: Color): this {
    this.colorValue = toColorObject(c);
    return this;
  }

  /**
   * Set the separator thickness in pixels.
   * Default is 1px.
   */
  thickness(px: number): this {
    this.thicknessValue = px;
    return this;
  }

  /**
   * Set margin on both sides of the separator. For horizontal: top and bottom
   * margin. For vertical: left and right margin.
   */
  margin(px: number): this {
    this.marginValue = px;
    return this;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<SeparatorRequestState> {
    const isHorizontal = this.orientation === "horizontal";

    const layoutId = cx.requestLayout(
      {
        // Horizontal: full width, fixed height
        // Vertical: fixed width, stretch to fill parent height
        width: isHorizontal ? "100%" : this.thicknessValue,
        height: isHorizontal ? this.thicknessValue : undefined,
        // Vertical separators stretch to fill parent height
        alignSelf: isHorizontal ? undefined : "stretch",
        // Apply margin
        marginTop: isHorizontal ? this.marginValue : 0,
        marginBottom: isHorizontal ? this.marginValue : 0,
        marginLeft: isHorizontal ? 0 : this.marginValue,
        marginRight: isHorizontal ? 0 : this.marginValue,
        // Prevent shrinking
        flexShrink: 0,
      },
      []
    );

    return { layoutId, requestState: { layoutId } };
  }

  prepaint(_cx: PrepaintContext, _bounds: Bounds, _requestState: SeparatorRequestState): NoState {
    return undefined;
  }

  paint(cx: PaintContext, bounds: Bounds, _prepaintState: NoState): void {
    cx.paintRect(bounds, {
      backgroundColor: this.colorValue,
    });
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

/**
 * Factory function to create a separator element.
 *
 * @example
 * // Horizontal separator (default)
 * div().flexCol().children_(
 *   text("Above"),
 *   separator(),
 *   text("Below")
 * )
 *
 * @example
 * // Vertical separator
 * div().flexRow().children_(
 *   text("Left"),
 *   separator().vertical(),
 *   text("Right")
 * )
 *
 * @example
 * // Styled separator
 * separator().color(rgba(1, 1, 1, 0.1)).thickness(2).margin(8)
 */
export function separator(): GladeSeparator {
  return new GladeSeparator();
}
