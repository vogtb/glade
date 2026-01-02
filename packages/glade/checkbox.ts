/**
 * Checkbox component - a control that allows the user to toggle between checked and unchecked states.
 *
 * Supports controlled and uncontrolled modes, indeterminate state, and custom styling.
 * Follows accessibility patterns similar to Radix UI / Base UI checkbox components.
 */

import {
  GladeElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { Bounds } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode, ClickHandler } from "./dispatch.ts";
import type { Hitbox } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";
import type { FocusHandle } from "./entity.ts";
import type { Styles } from "./styles.ts";
import { StyleBuilder } from "./styles.ts";
import { toColorObject, type Color, type ColorObject } from "@glade/utils";

const DEFAULT_DISABLED_OPACITY = 0.5;
const DEFAULT_SIZE = 18;
const DEFAULT_BORDER_RADIUS = 4;

/**
 * Request layout state for checkbox element.
 */
type CheckboxRequestState = {
  layoutId: LayoutId;
};

/**
 * Prepaint state for checkbox element.
 */
type CheckboxPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  colors: {
    checkedBg: ColorObject;
    uncheckedBg: ColorObject;
    border: ColorObject;
    check: ColorObject;
    hoverBg: ColorObject;
    hoverBorder: ColorObject;
    disabledOpacity: number;
  };
};

/**
 * Checkbox checked state type.
 */
export type CheckedState = boolean | "indeterminate";

/**
 * Handler called when checkbox state changes.
 */
export type CheckedChangeHandler = (checked: boolean) => void;

/**
 * A checkbox element that renders a toggleable check box.
 *
 * Supports three visual states: unchecked, checked, and indeterminate.
 * Can be used in controlled or uncontrolled mode.
 */
export class GladeCheckbox extends GladeElement<CheckboxRequestState, CheckboxPrepaintState> {
  private sizeValue: number = DEFAULT_SIZE;
  private checkedValue: boolean = false;
  private indeterminateValue: boolean = false;
  private disabledValue: boolean = false;
  private onCheckedChangeHandler: CheckedChangeHandler | null = null;

  // Styling
  private uncheckedBgColor: ColorObject | null = null;
  private checkedBgColor: ColorObject | null = null;
  private borderColorValue: ColorObject | null = null;
  private checkColorValue: ColorObject | null = null;
  private borderRadiusValue: number = DEFAULT_BORDER_RADIUS;
  private borderWidthValue: number = 1;

  // State-based styles
  private hoverStyles: Partial<Styles> | null = null;
  private focusedStyles: Partial<Styles> | null = null;

  // Focus
  private focusHandleRef: FocusHandle | null = null;

  /**
   * Set the checkbox size (width and height).
   */
  size(v: number): this {
    this.sizeValue = v;
    return this;
  }

  /**
   * Set the checked state (controlled mode).
   */
  checked(v: boolean): this {
    this.checkedValue = v;
    return this;
  }

  /**
   * Set the indeterminate state.
   * When true, displays a horizontal line instead of a checkmark.
   */
  indeterminate(v: boolean): this {
    this.indeterminateValue = v;
    return this;
  }

  /**
   * Set the disabled state.
   */
  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  /**
   * Set the change handler.
   */
  onCheckedChange(handler: CheckedChangeHandler): this {
    this.onCheckedChangeHandler = handler;
    return this;
  }

  /**
   * Set the background color when unchecked.
   */
  uncheckedBg(c: Color): this {
    this.uncheckedBgColor = toColorObject(c);
    return this;
  }

  /**
   * Set the background color when checked.
   */
  checkedBg(c: Color): this {
    this.checkedBgColor = toColorObject(c);
    return this;
  }

  /**
   * Set the border color.
   */
  borderColor(c: Color): this {
    this.borderColorValue = toColorObject(c);
    return this;
  }

  /**
   * Set the check mark color.
   */
  checkColor(c: Color): this {
    this.checkColorValue = toColorObject(c);
    return this;
  }

  /**
   * Set the border radius.
   */
  rounded(v: number): this {
    this.borderRadiusValue = v;
    return this;
  }

  /**
   * Set the border width.
   */
  border(v: number): this {
    this.borderWidthValue = v;
    return this;
  }

  /**
   * Apply styles on hover.
   */
  hover(f: (s: StyleBuilder) => StyleBuilder): this {
    this.hoverStyles = f(new StyleBuilder()).build();
    return this;
  }

  /**
   * Apply styles when focused.
   */
  focused(f: (s: StyleBuilder) => StyleBuilder): this {
    this.focusedStyles = f(new StyleBuilder()).build();
    return this;
  }

  /**
   * Track focus with a focus handle.
   */
  trackFocus(handle: FocusHandle): this {
    this.focusHandleRef = handle;
    return this;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<CheckboxRequestState> {
    const layoutId = cx.requestLayout(
      {
        width: this.sizeValue,
        height: this.sizeValue,
        flexShrink: 0,
      },
      []
    );

    return { layoutId, requestState: { layoutId } };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    _requestState: CheckboxRequestState
  ): CheckboxPrepaintState {
    const cursor = this.disabledValue ? "not-allowed" : "pointer";
    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal, cursor);

    const onCheckedChangeHandler = this.onCheckedChangeHandler;
    const currentChecked = this.checkedValue;
    const isDisabled = this.disabledValue;

    const clickHandler: ClickHandler = (_event, _window, _cx) => {
      if (isDisabled) return;
      if (onCheckedChangeHandler) {
        onCheckedChangeHandler(!currentChecked);
      }
    };

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {
        click: clickHandler,
      },
      focusHandle: this.focusHandleRef,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };

    const theme = cx.getWindow().getTheme();
    const checkboxTheme = theme.components.checkbox;
    const colors = {
      checkedBg: this.checkedBgColor ?? checkboxTheme.checked.background,
      uncheckedBg: this.uncheckedBgColor ?? checkboxTheme.background,
      border: this.borderColorValue ?? checkboxTheme.border,
      check: this.checkColorValue ?? checkboxTheme.checkmark,
      hoverBg: checkboxTheme.hover.background,
      hoverBorder: checkboxTheme.hover.border,
      disabledOpacity: checkboxTheme.disabled.opacity ?? DEFAULT_DISABLED_OPACITY,
    };

    return { hitbox, hitTestNode, colors };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: CheckboxPrepaintState): void {
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.focusHandleRef ? cx.isFocused(this.focusHandleRef) : false;
    const isCheckedOrIndeterminate = this.checkedValue || this.indeterminateValue;
    const colors = prepaintState.colors;

    // Determine background color
    let bgColor = isCheckedOrIndeterminate ? colors.checkedBg : colors.uncheckedBg;
    let borderColor = colors.border;
    let opacity = this.disabledValue ? colors.disabledOpacity : 1;

    // Apply hover styles
    if (isHovered && !this.disabledValue) {
      const hoverStyles = this.hoverStyles;
      if (hoverStyles?.backgroundColor) {
        bgColor = hoverStyles.backgroundColor;
      } else {
        bgColor = colors.hoverBg;
      }
      if (hoverStyles?.borderColor) {
        borderColor = hoverStyles.borderColor;
      } else {
        borderColor = colors.hoverBorder;
      }
      if (hoverStyles?.opacity !== undefined) {
        opacity = hoverStyles.opacity;
      }
    }

    // Apply focused styles
    if (isFocused && this.focusedStyles) {
      if (this.focusedStyles.backgroundColor) {
        bgColor = this.focusedStyles.backgroundColor;
      }
      if (this.focusedStyles.borderColor) {
        borderColor = this.focusedStyles.borderColor;
      }
    }

    // Paint background
    cx.paintRect(bounds, {
      backgroundColor: { ...bgColor, a: bgColor.a * opacity },
      borderRadius: this.borderRadiusValue,
    });

    // Paint border (only when unchecked or always if specified)
    if (!isCheckedOrIndeterminate || this.borderWidthValue > 0) {
      cx.paintBorder(bounds, {
        borderWidth: this.borderWidthValue,
        borderColor: { ...borderColor, a: borderColor.a * opacity },
        borderRadius: this.borderRadiusValue,
        borderStyle: "solid",
      });
    }

    // Paint check mark or indeterminate line
    const checkColor = { ...colors.check, a: colors.check.a * opacity };
    if (this.indeterminateValue) {
      this.paintIndeterminateMark(cx, bounds, opacity, checkColor);
    } else if (this.checkedValue) {
      this.paintCheckMark(cx, bounds, opacity, checkColor);
    }
  }

  /**
   * Paint the check mark (✓) inside the checkbox using the Inter font checkmark character.
   */
  private paintCheckMark(
    cx: PaintContext,
    bounds: Bounds,
    _opacity: number,
    checkColor: ColorObject
  ): void {
    // Use a font size that fits well within the checkbox
    const fontSize = this.sizeValue * 0.7;
    const fontFamily = cx.getWindow().getTheme().fonts.sans;

    // Position the checkmark centered in the checkbox
    // Small padding from edges, vertically offset to appear centered
    const padding = this.sizeValue * 0.15;

    const checkBounds: Bounds = {
      x: bounds.x + padding,
      y: bounds.y + padding,
      width: bounds.width - padding * 2,
      height: bounds.height - padding * 2,
    };

    cx.paintGlyphs("✓", checkBounds, checkColor, {
      fontSize,
      fontFamily,
      fontWeight: 600,
    });
  }

  /**
   * Paint the indeterminate mark (—) inside the checkbox.
   */
  private paintIndeterminateMark(
    cx: PaintContext,
    bounds: Bounds,
    _opacity: number,
    checkColor: ColorObject
  ): void {
    const padding = this.sizeValue * 0.25;
    const strokeWidth = Math.max(2, this.sizeValue * 0.15);

    const lineBounds: Bounds = {
      x: bounds.x + padding,
      y: bounds.y + (bounds.height - strokeWidth) / 2,
      width: bounds.width - padding * 2,
      height: strokeWidth,
    };

    cx.paintRect(lineBounds, {
      backgroundColor: checkColor,
      borderRadius: strokeWidth / 2,
    });
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode {
    const onCheckedChangeHandler = this.onCheckedChangeHandler;
    const currentChecked = this.checkedValue;
    const isDisabled = this.disabledValue;

    return {
      bounds,
      handlers: {
        click: (_event, _window, _cx) => {
          if (isDisabled) return;
          if (onCheckedChangeHandler) {
            onCheckedChangeHandler(!currentChecked);
          }
        },
      },
      focusHandle: this.focusHandleRef,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };
  }
}

/**
 * Factory function to create a checkbox element.
 *
 * @example
 * // Basic checkbox
 * checkbox()
 *   .checked(isChecked)
 *   .onCheckedChange(setIsChecked)
 *
 * @example
 * // Styled checkbox
 * checkbox()
 *   .size(20)
 *   .checked(true)
 *   .checkedBg({ r: 0.2, g: 0.8, b: 0.4, a: 1 })
 *   .rounded(6)
 *
 * @example
 * // Indeterminate state (for "select all" with partial selection)
 * checkbox()
 *   .indeterminate(someSelected && !allSelected)
 *   .checked(allSelected)
 *   .onCheckedChange(handleSelectAll)
 *
 * @example
 * // Disabled checkbox
 * checkbox()
 *   .checked(true)
 *   .disabled(true)
 */
export function checkbox(): GladeCheckbox {
  return new GladeCheckbox();
}
