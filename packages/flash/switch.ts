/**
 * Switch component - a control that allows the user to toggle between on and off states.
 *
 * Visually distinct from a checkbox, the switch shows a track with a sliding thumb.
 * Commonly used for settings that take effect immediately.
 *
 * Follows accessibility patterns similar to Radix UI / Base UI switch components.
 */

import {
  FlashElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { Bounds, Color, ColorObject } from "./types.ts";
import { toColorObject } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode, ClickHandler } from "./dispatch.ts";
import type { Hitbox } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";
import type { FocusHandle } from "./entity.ts";
import type { Styles } from "./styles.ts";
import { StyleBuilder } from "./styles.ts";
import { switchColors } from "./theme.ts";

const DEFAULT_DISABLED_OPACITY = 0.5;

// Default dimensions following common switch proportions
const DEFAULT_WIDTH = 44;
const DEFAULT_HEIGHT = 24;
const DEFAULT_THUMB_PADDING = 2;

/**
 * Request layout state for switch element.
 */
type SwitchRequestState = {
  layoutId: LayoutId;
};

/**
 * Prepaint state for switch element.
 */
type SwitchPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  colors: {
    uncheckedTrack: ColorObject;
    checkedTrack: ColorObject;
    thumb: ColorObject;
  };
};

/**
 * Handler called when switch state changes.
 */
export type SwitchChangeHandler = (checked: boolean) => void;

/**
 * A switch element that renders a toggleable on/off control.
 *
 * Displays a track with a sliding thumb that moves between
 * left (off) and right (on) positions.
 */
export class FlashSwitch extends FlashElement<SwitchRequestState, SwitchPrepaintState> {
  private widthValue: number = DEFAULT_WIDTH;
  private heightValue: number = DEFAULT_HEIGHT;
  private checkedValue: boolean = false;
  private disabledValue: boolean = false;
  private onCheckedChangeHandler: SwitchChangeHandler | null = null;

  // Styling
  private uncheckedTrackColor: ColorObject | null = null;
  private checkedTrackColor: ColorObject | null = null;
  private thumbColorValue: ColorObject | null = null;
  private thumbPaddingValue: number = DEFAULT_THUMB_PADDING;

  // State-based styles
  private hoverStyles: Partial<Styles> | null = null;
  private focusedStyles: Partial<Styles> | null = null;

  // Focus
  private focusHandleRef: FocusHandle | null = null;

  /**
   * Set the switch dimensions.
   */
  size(width: number, height: number): this {
    this.widthValue = width;
    this.heightValue = height;
    return this;
  }

  /**
   * Set the switch width.
   */
  w(v: number): this {
    this.widthValue = v;
    return this;
  }

  /**
   * Set the switch height.
   */
  h(v: number): this {
    this.heightValue = v;
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
   * Set the disabled state.
   */
  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  /**
   * Set the change handler.
   */
  onCheckedChange(handler: SwitchChangeHandler): this {
    this.onCheckedChangeHandler = handler;
    return this;
  }

  /**
   * Set the track color when unchecked (off).
   */
  uncheckedTrack(c: Color): this {
    this.uncheckedTrackColor = toColorObject(c);
    return this;
  }

  /**
   * Set the track color when checked (on).
   */
  checkedTrack(c: Color): this {
    this.checkedTrackColor = toColorObject(c);
    return this;
  }

  /**
   * Set the thumb color.
   */
  thumbColor(c: Color): this {
    this.thumbColorValue = toColorObject(c);
    return this;
  }

  /**
   * Set the padding between thumb and track edge.
   */
  thumbPadding(v: number): this {
    this.thumbPaddingValue = v;
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

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<SwitchRequestState> {
    const layoutId = cx.requestLayout(
      {
        width: this.widthValue,
        height: this.heightValue,
        flexShrink: 0,
      },
      []
    );

    return { layoutId, requestState: { layoutId } };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    _requestState: SwitchRequestState
  ): SwitchPrepaintState {
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
    const defaults = switchColors(theme);
    const colors = {
      uncheckedTrack: this.uncheckedTrackColor ?? defaults.trackOff,
      checkedTrack: this.checkedTrackColor ?? defaults.trackOn,
      thumb: this.thumbColorValue ?? defaults.thumb,
    };

    return { hitbox, hitTestNode, colors };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: SwitchPrepaintState): void {
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.focusHandleRef ? cx.isFocused(this.focusHandleRef) : false;
    const colors = prepaintState.colors;

    // Determine track color
    let trackColor = this.checkedValue ? colors.checkedTrack : colors.uncheckedTrack;
    const thumbColor = colors.thumb;
    let opacity = this.disabledValue ? DEFAULT_DISABLED_OPACITY : 1;

    // Apply hover styles
    if (isHovered && !this.disabledValue && this.hoverStyles) {
      if (this.hoverStyles.backgroundColor) {
        trackColor = this.hoverStyles.backgroundColor;
      }
      if (this.hoverStyles.opacity !== undefined) {
        opacity = this.hoverStyles.opacity;
      }
    }

    // Apply focused styles
    if (isFocused && this.focusedStyles) {
      if (this.focusedStyles.backgroundColor) {
        trackColor = this.focusedStyles.backgroundColor;
      }
    }

    // Calculate track bounds (full switch area)
    const trackRadius = bounds.height / 2;

    // Paint track
    cx.paintRect(bounds, {
      backgroundColor: { ...trackColor, a: trackColor.a * opacity },
      borderRadius: trackRadius,
    });

    // Calculate thumb dimensions
    const thumbDiameter = bounds.height - this.thumbPaddingValue * 2;
    const thumbRadius = thumbDiameter / 2;

    // Thumb position: left when unchecked, right when checked
    const thumbX = this.checkedValue
      ? bounds.x + bounds.width - this.thumbPaddingValue - thumbDiameter
      : bounds.x + this.thumbPaddingValue;
    const thumbY = bounds.y + this.thumbPaddingValue;

    const thumbBounds: Bounds = {
      x: thumbX,
      y: thumbY,
      width: thumbDiameter,
      height: thumbDiameter,
    };

    // Paint thumb
    cx.paintRect(thumbBounds, {
      backgroundColor: { ...thumbColor, a: thumbColor.a * opacity },
      borderRadius: thumbRadius,
    });

    // Add subtle shadow to thumb for depth
    if (!this.disabledValue) {
      cx.paintShadow(thumbBounds, {
        shadow: "sm",
        borderRadius: thumbRadius,
      });
    }
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
 * Factory function to create a switch element.
 *
 * @example
 * // Basic switch
 * switchToggle()
 *   .checked(isEnabled)
 *   .onCheckedChange(setIsEnabled)
 *
 * @example
 * // Styled switch
 * switchToggle()
 *   .size(52, 28)
 *   .checked(true)
 *   .checkedTrack({ r: 0.2, g: 0.8, b: 0.4, a: 1 })
 *   .thumbColor({ r: 1, g: 1, b: 1, a: 1 })
 *
 * @example
 * // Disabled switch
 * switchToggle()
 *   .checked(true)
 *   .disabled(true)
 *
 * @example
 * // Compact switch
 * switchToggle()
 *   .size(36, 20)
 *   .thumbPadding(2)
 *   .checked(false)
 *   .onCheckedChange(handleToggle)
 */
export function switchToggle(): FlashSwitch {
  return new FlashSwitch();
}

// Also export as 'toggle' for convenience
export { switchToggle as toggle };
