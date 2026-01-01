/**
 * RadioGroup and RadioGroupItem components - a set of checkable buttons where only one can be checked at a time.
 *
 * The RadioGroup is the parent container that manages selection state.
 * RadioGroupItems are the individual radio buttons within the group.
 *
 * Follows accessibility patterns similar to Radix UI radio group components.
 */

import {
  GladeContainerElement,
  GladeElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type GlobalElementId,
} from "./element.ts";
import type { Bounds } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode, ClickHandler } from "./dispatch.ts";
import type { Hitbox } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";
import type { FocusHandle } from "./entity.ts";
import type { Styles } from "./styles.ts";
import { StyleBuilder } from "./styles.ts";
import { radioColors } from "./theme.ts";
import type { Theme } from "./theme.ts";
import { toColorObject, type Color, type ColorObject } from "@glade/utils";

/**
 * Default colors for radio states.
 */
const DEFAULT_UNCHECKED_BG: ColorObject = { r: 0.15, g: 0.15, b: 0.15, a: 1 };
const DEFAULT_CHECKED_BG: ColorObject = { r: 0.4, g: 0.6, b: 1, a: 1 };
const DEFAULT_BORDER_COLOR: ColorObject = { r: 0.3, g: 0.3, b: 0.3, a: 1 };
const DEFAULT_INDICATOR_COLOR: ColorObject = { r: 1, g: 1, b: 1, a: 1 };
const DEFAULT_DISABLED_OPACITY = 0.5;
const DEFAULT_SIZE = 18;

/**
 * Handler called when radio group value changes.
 */
export type RadioValueChangeHandler = (value: string) => void;

/**
 * Context passed from RadioGroup to RadioGroupItem.
 * This is used internally to communicate selection state.
 */
type RadioGroupContext = {
  value: string | null;
  onValueChange: RadioValueChangeHandler | null;
  disabled: boolean;
  size: number;
  uncheckedBg: ColorObject;
  checkedBg: ColorObject;
  borderColor: ColorObject;
  indicatorColor: ColorObject;
};

// ============================================================================
// RadioGroupItem
// ============================================================================

/**
 * Request layout state for radio item.
 */
type RadioItemRequestState = {
  layoutId: LayoutId;
};

/**
 * Prepaint state for radio item.
 */
type RadioItemPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
};

/**
 * A radio button item within a RadioGroup.
 *
 * Must be used as a child of RadioGroup. The item's `value` property
 * is compared against the group's `value` to determine checked state.
 */
export class GladeRadioGroupItem extends GladeElement<
  RadioItemRequestState,
  RadioItemPrepaintState
> {
  private itemValue: string;
  private disabledValue: boolean = false;
  private focusHandleRef: FocusHandle | null = null;
  private hoverStyles: Partial<Styles> | null = null;
  private focusedStyles: Partial<Styles> | null = null;

  // Context from parent group (set during layout/paint)
  private groupContext: RadioGroupContext | null = null;

  constructor(value: string) {
    super();
    this.itemValue = value;
  }

  /**
   * Get the value of this radio item.
   */
  getValue(): string {
    return this.itemValue;
  }

  /**
   * Set the disabled state for this specific item.
   */
  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  /**
   * Track focus with a focus handle.
   */
  trackFocus(handle: FocusHandle): this {
    this.focusHandleRef = handle;
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
   * Set the group context (called by parent RadioGroup).
   * @internal
   */
  setGroupContext(context: RadioGroupContext): void {
    this.groupContext = context;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<RadioItemRequestState> {
    const size = this.groupContext?.size ?? DEFAULT_SIZE;

    const layoutId = cx.requestLayout(
      {
        width: size,
        height: size,
        flexShrink: 0,
      },
      []
    );

    return { layoutId, requestState: { layoutId } };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    _requestState: RadioItemRequestState
  ): RadioItemPrepaintState {
    const isDisabled = this.disabledValue || (this.groupContext?.disabled ?? false);
    const cursor = isDisabled ? "not-allowed" : "pointer";
    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal, cursor);

    const itemValue = this.itemValue;
    const groupContext = this.groupContext;

    const clickHandler: ClickHandler = (_event, _window, _cx) => {
      if (isDisabled) return;
      if (groupContext?.onValueChange) {
        groupContext.onValueChange(itemValue);
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

    return { hitbox, hitTestNode };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: RadioItemPrepaintState): void {
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.focusHandleRef ? cx.isFocused(this.focusHandleRef) : false;
    const isChecked = this.groupContext?.value === this.itemValue;
    const isDisabled = this.disabledValue || (this.groupContext?.disabled ?? false);

    const uncheckedBg = this.groupContext?.uncheckedBg ?? DEFAULT_UNCHECKED_BG;
    const checkedBg = this.groupContext?.checkedBg ?? DEFAULT_CHECKED_BG;
    const borderColor = this.groupContext?.borderColor ?? DEFAULT_BORDER_COLOR;
    const indicatorColor = this.groupContext?.indicatorColor ?? DEFAULT_INDICATOR_COLOR;

    // Determine colors
    let bgColor = isChecked ? checkedBg : uncheckedBg;
    let currentBorderColor = borderColor;
    let opacity = isDisabled ? DEFAULT_DISABLED_OPACITY : 1;

    // Apply hover styles
    if (isHovered && !isDisabled && this.hoverStyles) {
      if (this.hoverStyles.backgroundColor) {
        bgColor = this.hoverStyles.backgroundColor;
      }
      if (this.hoverStyles.borderColor) {
        currentBorderColor = this.hoverStyles.borderColor;
      }
      if (this.hoverStyles.opacity !== undefined) {
        opacity = this.hoverStyles.opacity;
      }
    }

    // Apply focused styles
    if (isFocused && this.focusedStyles) {
      if (this.focusedStyles.backgroundColor) {
        bgColor = this.focusedStyles.backgroundColor;
      }
      if (this.focusedStyles.borderColor) {
        currentBorderColor = this.focusedStyles.borderColor;
      }
    }

    // Paint outer circle (background)
    cx.paintRect(bounds, {
      backgroundColor: { ...bgColor, a: bgColor.a * opacity },
      borderRadius: bounds.width / 2, // Full circle
    });

    // Paint border
    cx.paintBorder(bounds, {
      borderWidth: 1,
      borderColor: { ...currentBorderColor, a: currentBorderColor.a * opacity },
      borderRadius: bounds.width / 2,
      borderStyle: "solid",
    });

    // Paint inner indicator circle when checked
    if (isChecked) {
      const indicatorSize = bounds.width * 0.4;
      const indicatorBounds: Bounds = {
        x: bounds.x + (bounds.width - indicatorSize) / 2,
        y: bounds.y + (bounds.height - indicatorSize) / 2,
        width: indicatorSize,
        height: indicatorSize,
      };

      cx.paintRect(indicatorBounds, {
        backgroundColor: { ...indicatorColor, a: indicatorColor.a * opacity },
        borderRadius: indicatorSize / 2,
      });
    }
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode {
    const isDisabled = this.disabledValue || (this.groupContext?.disabled ?? false);
    const itemValue = this.itemValue;
    const groupContext = this.groupContext;

    return {
      bounds,
      handlers: {
        click: (_event, _window, _cx) => {
          if (isDisabled) return;
          if (groupContext?.onValueChange) {
            groupContext.onValueChange(itemValue);
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

// ============================================================================
// RadioGroup
// ============================================================================

/**
 * Request layout state for radio group.
 */
type RadioGroupRequestState = {
  layoutId: LayoutId;
  childLayoutIds: LayoutId[];
  childElementIds: GlobalElementId[];
  childRequestStates: unknown[];
};

/**
 * Prepaint state for radio group.
 */
type RadioGroupPrepaintState = {
  childElementIds: GlobalElementId[];
  childPrepaintStates: unknown[];
  childBounds: Bounds[];
  hitTestNode: HitTestNode;
};

/**
 * A radio group container that manages selection state for radio items.
 *
 * Only one item in the group can be selected at a time.
 * Selection is controlled via the `value` and `onValueChange` props.
 */
export class GladeRadioGroup extends GladeContainerElement<
  RadioGroupRequestState,
  RadioGroupPrepaintState
> {
  private styles: Partial<Styles> = {};
  private valueState: string | null = null;
  private onValueChangeHandler: RadioValueChangeHandler | null = null;
  private disabledValue: boolean = false;

  // Styling for child radio items
  private itemSizeValue: number = DEFAULT_SIZE;
  private uncheckedBgColor: ColorObject | null = null;
  private checkedBgColor: ColorObject | null = null;
  private borderColorValue: ColorObject | null = null;
  private indicatorColorValue: ColorObject | null = null;

  // ============ Layout Styles ============

  /**
   * Enable flex display.
   */
  flex(): this {
    this.styles.display = "flex";
    return this;
  }

  /**
   * Set flex direction to row.
   */
  flexRow(): this {
    this.styles.flexDirection = "row";
    return this;
  }

  /**
   * Set flex direction to column.
   */
  flexCol(): this {
    this.styles.flexDirection = "column";
    return this;
  }

  /**
   * Set gap between items.
   */
  gap(v: number): this {
    this.styles.gap = v;
    return this;
  }

  /**
   * Set padding.
   */
  p(v: number): this {
    this.styles.paddingTop = v;
    this.styles.paddingRight = v;
    this.styles.paddingBottom = v;
    this.styles.paddingLeft = v;
    return this;
  }

  // ============ RadioGroup Specific ============

  /**
   * Set the currently selected value (controlled mode).
   */
  value(v: string): this {
    this.valueState = v;
    return this;
  }

  /**
   * Set the change handler.
   */
  onValueChange(handler: RadioValueChangeHandler): this {
    this.onValueChangeHandler = handler;
    return this;
  }

  /**
   * Disable all items in the group.
   */
  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  /**
   * Set the size of radio items.
   */
  itemSize(v: number): this {
    this.itemSizeValue = v;
    return this;
  }

  /**
   * Set the background color for unchecked items.
   */
  uncheckedBg(c: Color): this {
    this.uncheckedBgColor = toColorObject(c);
    return this;
  }

  /**
   * Set the background color for checked items.
   */
  checkedBg(c: Color): this {
    this.checkedBgColor = toColorObject(c);
    return this;
  }

  /**
   * Set the border color for items.
   */
  borderColor(c: Color): this {
    this.borderColorValue = toColorObject(c);
    return this;
  }

  /**
   * Set the indicator (inner circle) color.
   */
  indicatorColor(c: Color): this {
    this.indicatorColorValue = toColorObject(c);
    return this;
  }

  /**
   * Add children to this radio group.
   * Children should be GladeRadioGroupItem elements.
   */
  items(...items: GladeRadioGroupItem[]): this {
    for (const item of items) {
      this._children.push(item);
    }
    return this;
  }

  /**
   * Build the context to pass to child items.
   */
  private buildContext(theme?: Theme): RadioGroupContext {
    const defaults = theme
      ? radioColors(theme)
      : {
          uncheckedBg: DEFAULT_UNCHECKED_BG,
          checkedBg: DEFAULT_CHECKED_BG,
          border: DEFAULT_BORDER_COLOR,
          indicator: DEFAULT_INDICATOR_COLOR,
        };
    return {
      value: this.valueState,
      onValueChange: this.onValueChangeHandler,
      disabled: this.disabledValue,
      size: this.itemSizeValue,
      uncheckedBg: this.uncheckedBgColor ?? defaults.uncheckedBg,
      checkedBg: this.checkedBgColor ?? defaults.checkedBg,
      borderColor: this.borderColorValue ?? defaults.border,
      indicatorColor: this.indicatorColorValue ?? defaults.indicator,
    };
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<RadioGroupRequestState> {
    const context = this.buildContext();
    const childLayoutIds: LayoutId[] = [];
    const childElementIds: GlobalElementId[] = [];
    const childRequestStates: unknown[] = [];

    for (const child of this.children__) {
      // Pass context to radio items
      if (child instanceof GladeRadioGroupItem) {
        child.setGroupContext(context);
      }

      const childId = cx.allocateChildId();
      const childCx: RequestLayoutContext = {
        ...cx,
        elementId: childId,
      };
      const result = child.requestLayout(childCx);
      childLayoutIds.push(result.layoutId);
      childElementIds.push(childId);
      childRequestStates.push(result.requestState);
    }

    const layoutId = cx.requestLayout(this.styles, childLayoutIds);

    return {
      layoutId,
      requestState: {
        layoutId,
        childLayoutIds,
        childElementIds,
        childRequestStates,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: RadioGroupRequestState
  ): RadioGroupPrepaintState {
    const { layoutId, childLayoutIds, childElementIds, childRequestStates } = requestState;
    const context = this.buildContext(cx.getWindow().getTheme());

    // Get original bounds and compute delta for scroll offset propagation
    const originalBounds = cx.getBounds(layoutId);
    const deltaX = bounds.x - originalBounds.x;
    const deltaY = bounds.y - originalBounds.y;

    const layoutChildBounds = cx.getChildLayouts(bounds, childLayoutIds);
    const childPrepaintStates: unknown[] = [];
    const adjustedChildBounds: Bounds[] = [];

    for (let i = 0; i < this.children__.length; i++) {
      const child = this.children__[i]!;
      const childId = childElementIds[i]!;
      let childBound = layoutChildBounds[i]!;
      const childRequestState = childRequestStates[i];

      // Apply delta from ancestor scroll
      childBound = {
        x: childBound.x + deltaX,
        y: childBound.y + deltaY,
        width: childBound.width,
        height: childBound.height,
      };

      adjustedChildBounds.push(childBound);

      // Update context for radio items
      if (child instanceof GladeRadioGroupItem) {
        child.setGroupContext(context);
      }

      const childCx = cx.withElementId(childId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prepaintState = (child as GladeElement<any, any>).prepaint(
        childCx,
        childBound,
        childRequestState
      );
      childPrepaintStates.push(prepaintState);
    }

    // Build hit test node
    const childHitTestNodes: HitTestNode[] = [];
    for (let i = this.children__.length - 1; i >= 0; i--) {
      const childPrepaintState = childPrepaintStates[i] as RadioItemPrepaintState | undefined;
      if (childPrepaintState?.hitTestNode) {
        childHitTestNodes.unshift(childPrepaintState.hitTestNode);
      }
    }

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: childHitTestNodes,
    };

    return {
      childElementIds,
      childPrepaintStates,
      childBounds: adjustedChildBounds,
      hitTestNode,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: RadioGroupPrepaintState): void {
    const { childElementIds, childPrepaintStates, childBounds } = prepaintState;
    const context = this.buildContext();

    // Paint background if specified
    if (this.styles.backgroundColor) {
      cx.paintRect(bounds, { backgroundColor: this.styles.backgroundColor });
    }

    // Paint children
    for (let i = 0; i < this.children__.length; i++) {
      const child = this.children__[i]!;
      const childId = childElementIds[i]!;
      const childBound = childBounds[i]!;
      const childPrepaintState = childPrepaintStates[i];

      // Update context for radio items
      if (child instanceof GladeRadioGroupItem) {
        child.setGroupContext(context);
      }

      const childCx = cx.withElementId(childId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (child as GladeElement<any, any>).paint(childCx, childBound, childPrepaintState);
    }
  }

  hitTest(bounds: Bounds, childBounds: Bounds[]): HitTestNode {
    const childNodes: HitTestNode[] = [];

    for (let i = this.children__.length - 1; i >= 0; i--) {
      const child = this.children__[i];
      const childBound = childBounds[i];
      if (child && childBound) {
        const childNode = child.hitTest(childBound, []);
        if (childNode) {
          childNodes.unshift(childNode);
        }
      }
    }

    return {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: childNodes,
    };
  }
}

/**
 * Factory function to create a radio group.
 *
 * @example
 * // Basic radio group
 * radioGroup()
 *   .flexCol()
 *   .gap(8)
 *   .value(selectedValue)
 *   .onValueChange(setSelectedValue)
 *   .items(
 *     radioItem("option1"),
 *     radioItem("option2"),
 *     radioItem("option3")
 *   )
 *
 * @example
 * // Styled radio group
 * radioGroup()
 *   .flexRow()
 *   .gap(16)
 *   .itemSize(24)
 *   .checkedBg({ r: 0.2, g: 0.8, b: 0.4, a: 1 })
 *   .value("a")
 *   .onValueChange(handleChange)
 *   .items(
 *     radioItem("a"),
 *     radioItem("b"),
 *     radioItem("c")
 *   )
 *
 * @example
 * // Disabled radio group
 * radioGroup()
 *   .disabled(true)
 *   .value("selected")
 *   .items(
 *     radioItem("selected"),
 *     radioItem("other")
 *   )
 */
export function radioGroup(): GladeRadioGroup {
  return new GladeRadioGroup();
}

/**
 * Factory function to create a radio group item.
 *
 * @param value - The value of this radio option
 *
 * @example
 * // Basic radio item
 * radioItem("option1")
 *
 * @example
 * // Disabled radio item
 * radioItem("disabled-option").disabled(true)
 *
 * @example
 * // Radio item with hover effect
 * radioItem("hover-option")
 *   .hover(s => s.opacity(0.8))
 */
export function radioItem(value: string): GladeRadioGroupItem {
  return new GladeRadioGroupItem(value);
}
