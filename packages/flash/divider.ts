/**
 * Divider element - a visual separator for content.
 *
 * Similar to shadcn's Separator component, provides a thin line
 * that visually or semantically separates content.
 */

import {
  FlashElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type NoState,
} from "./element.ts";
import type { Bounds, Color } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode } from "./dispatch.ts";

type DividerOrientation = "horizontal" | "vertical";

/**
 * Request layout state for divider - carries layoutId for bounds lookup.
 */
type DividerRequestState = {
  layoutId: LayoutId;
};

/**
 * A divider element that renders a thin line to separate content.
 *
 * Horizontal dividers span full width with 1px height.
 * Vertical dividers span full height with 1px width.
 */
export class FlashDivider extends FlashElement<DividerRequestState, NoState> {
  private orientation: DividerOrientation = "horizontal";
  private colorValue: Color = { r: 0.2, g: 0.2, b: 0.2, a: 1 };
  private thicknessValue = 1;
  private marginValue = 0;

  /**
   * Set the divider orientation to vertical.
   * Vertical dividers are useful in flex row layouts.
   */
  vertical(): this {
    this.orientation = "vertical";
    return this;
  }

  /**
   * Set the divider orientation to horizontal (default).
   * Horizontal dividers are useful in flex column layouts.
   */
  horizontal(): this {
    this.orientation = "horizontal";
    return this;
  }

  /**
   * Set the divider color.
   */
  color(c: Color): this {
    this.colorValue = c;
    return this;
  }

  /**
   * Set the divider thickness in pixels.
   * Default is 1px.
   */
  thickness(px: number): this {
    this.thicknessValue = px;
    return this;
  }

  /**
   * Set margin on both sides of the divider.
   * For horizontal: top and bottom margin.
   * For vertical: left and right margin.
   */
  margin(px: number): this {
    this.marginValue = px;
    return this;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DividerRequestState> {
    const isHorizontal = this.orientation === "horizontal";

    const layoutId = cx.requestLayout(
      {
        // Horizontal: full width, fixed height
        // Vertical: fixed width, stretch to fill parent height
        width: isHorizontal ? "100%" : this.thicknessValue,
        height: isHorizontal ? this.thicknessValue : undefined,
        // Vertical dividers stretch to fill parent height
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

  prepaint(_cx: PrepaintContext, _bounds: Bounds, _requestState: DividerRequestState): NoState {
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
 * Factory function to create a divider element.
 *
 * @example
 * // Horizontal divider (default)
 * div().flexCol().children_(
 *   text("Above"),
 *   divider(),
 *   text("Below")
 * )
 *
 * @example
 * // Vertical divider
 * div().flexRow().children_(
 *   text("Left"),
 *   divider().vertical(),
 *   text("Right")
 * )
 *
 * @example
 * // Styled divider
 * divider().color(rgba(1, 1, 1, 0.1)).thickness(2).margin(8)
 */
export function divider(): FlashDivider {
  return new FlashDivider();
}
