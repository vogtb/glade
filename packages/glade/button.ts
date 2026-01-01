/**
 * Button component - an interactive control that triggers actions when clicked.
 *
 * Supports multiple variants (default, destructive, outline, secondary, ghost, link),
 * sizes (default, sm, lg, icon), and states (hover, active, focused, disabled).
 *
 * Built as a composition of div() and text() elements.
 */

import { GladeDiv } from "./div.ts";
import { GladeTextElement, text } from "./element.ts";
import { StyleBuilder } from "./styles.ts";
import type { Theme } from "./theme.ts";
import type { GladeElement } from "./element.ts";
import type { ColorObject, Color } from "@glade/utils";
import { toColorObject } from "@glade/utils";

/**
 * Button visual variants.
 */
export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

/**
 * Button size presets.
 */
export type ButtonSize = "default" | "sm" | "lg" | "icon";

/**
 * Size dimensions for each button size preset.
 */
const SIZE_CONFIGS: Record<
  ButtonSize,
  { height: number; paddingX: number; fontSize: number; gap: number }
> = {
  default: { height: 36, paddingX: 16, fontSize: 14, gap: 8 },
  sm: { height: 32, paddingX: 12, fontSize: 13, gap: 6 },
  lg: { height: 44, paddingX: 24, fontSize: 16, gap: 10 },
  icon: { height: 36, paddingX: 0, fontSize: 14, gap: 0 },
};

/**
 * Get button colors from theme for each variant.
 */
export function buttonColors(theme: Theme): Record<
  ButtonVariant,
  {
    bg: ColorObject;
    bgHover: ColorObject;
    bgActive: ColorObject;
    text: ColorObject;
    border: ColorObject | null;
  }
> {
  const transparent = { r: 0, g: 0, b: 0, a: 0 };

  const darken = (c: ColorObject, amount: number): ColorObject => ({
    r: Math.max(0, c.r - amount),
    g: Math.max(0, c.g - amount),
    b: Math.max(0, c.b - amount),
    a: c.a,
  });

  const lighten = (c: ColorObject, amount: number): ColorObject => ({
    r: Math.min(1, c.r + amount),
    g: Math.min(1, c.g + amount),
    b: Math.min(1, c.b + amount),
    a: c.a,
  });

  const withAlpha = (c: ColorObject, a: number): ColorObject => ({ ...c, a });

  return {
    default: {
      bg: theme.primary,
      bgHover: darken(theme.primary, 0.1),
      bgActive: darken(theme.primary, 0.15),
      text: theme.primaryForeground,
      border: null,
    },
    destructive: {
      bg: theme.danger,
      bgHover: darken(theme.danger, 0.1),
      bgActive: darken(theme.danger, 0.15),
      text: theme.primaryForeground,
      border: null,
    },
    outline: {
      bg: transparent,
      bgHover: withAlpha(theme.text, 0.05),
      bgActive: withAlpha(theme.text, 0.1),
      text: theme.text,
      border: theme.border,
    },
    secondary: {
      bg: theme.surfaceMuted,
      bgHover:
        theme.scheme === "dark"
          ? lighten(theme.surfaceMuted, 0.05)
          : darken(theme.surfaceMuted, 0.05),
      bgActive:
        theme.scheme === "dark"
          ? lighten(theme.surfaceMuted, 0.1)
          : darken(theme.surfaceMuted, 0.1),
      text: theme.text,
      border: null,
    },
    ghost: {
      bg: transparent,
      bgHover: withAlpha(theme.text, 0.05),
      bgActive: withAlpha(theme.text, 0.1),
      text: theme.text,
      border: null,
    },
    link: {
      bg: transparent,
      bgHover: transparent,
      bgActive: transparent,
      text: theme.primary,
      border: null,
    },
  };
}

/**
 * Button class that wraps a GladeDiv with button-specific configuration.
 * Provides a fluent API for setting variants, sizes, and other button properties.
 */
export class GladeButton extends GladeDiv {
  private labelText: string | null = null;
  private variantValue: ButtonVariant = "default";
  private sizeValue: ButtonSize = "default";
  private disabledValue = false;
  private labelElement: GladeTextElement | null = null;
  private customBg: ColorObject | null = null;
  private customTextColor: ColorObject | null = null;
  private customBorderColor: ColorObject | null = null;

  constructor(label?: string) {
    super();
    if (label !== undefined) {
      this.labelText = label;
    }
    // Set base styles
    this.flex().flexRow().itemsCenter().justifyCenter().cursorPointer();
    this.applySize();
  }

  private applySize(): void {
    const config = SIZE_CONFIGS[this.sizeValue];
    this.h(config.height).gap(config.gap).rounded(6);
    if (this.sizeValue === "icon") {
      this.w(config.height).p(0);
    } else {
      this.px(config.paddingX);
    }
  }

  /** Set the button label text. */
  label(labelText: string): this {
    this.labelText = labelText;
    return this;
  }

  /** Set the button variant. */
  variant(v: ButtonVariant): this {
    this.variantValue = v;
    return this;
  }

  /** Set the button size. */
  override size(s: ButtonSize): this {
    this.sizeValue = s;
    this.applySize();
    return this;
  }

  /** Set the disabled state. */
  disabled(v: boolean): this {
    this.disabledValue = v;
    if (v) {
      this.cursor("not-allowed").opacity(0.5);
    } else {
      this.cursorPointer().opacity(1);
    }
    return this;
  }

  /** Set variant to "default" (primary button). */
  primary(): this {
    return this.variant("default");
  }

  /** Set variant to "destructive" (danger button). */
  destructive(): this {
    return this.variant("destructive");
  }

  /** Set variant to "outline". */
  outline(): this {
    return this.variant("outline");
  }

  /** Set variant to "secondary". */
  secondary(): this {
    return this.variant("secondary");
  }

  /** Set variant to "ghost". */
  ghost(): this {
    return this.variant("ghost");
  }

  /** Set variant to "link". */
  link(): this {
    return this.variant("link");
  }

  /** Set size to "sm". */
  sm(): this {
    return this.size("sm");
  }

  /** Set size to "lg". */
  lg(): this {
    return this.size("lg");
  }

  /** Set size to "icon" (square button for icon-only). */
  iconSize(): this {
    return this.size("icon");
  }

  /** Override background color. */
  override bg(c: Color): this {
    this.customBg = toColorObject(c);
    return super.bg(c);
  }

  /** Override text color. */
  override textColor(c: Color): this {
    this.customTextColor = toColorObject(c);
    return this;
  }

  /** Override border color. */
  override borderColor(c: Color): this {
    this.customBorderColor = toColorObject(c);
    return super.borderColor(c);
  }

  /** Override the child method to track children. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override child(element: GladeElement<any, any> | string | number): this {
    return super.child(element);
  }

  /**
   * Build the final element tree with theme-aware colors.
   * This is called internally during requestLayout.
   */
  private buildContent(theme: Theme): void {
    const colors = buttonColors(theme)[this.variantValue];
    const config = SIZE_CONFIGS[this.sizeValue];

    // Apply background color (unless custom)
    if (!this.customBg && colors.bg.a > 0) {
      super.bg(colors.bg);
    }

    // Apply border for outline variant
    if (colors.border && !this.customBorderColor) {
      this.border(1);
      super.borderColor(colors.border);
    }

    // Apply hover styles
    this.hover((s: StyleBuilder) => {
      if (this.disabledValue) return s;
      if (!this.customBg) {
        s.bg(colors.bgHover);
      }
      return s;
    });

    // Apply active styles
    this.active((s: StyleBuilder) => {
      if (this.disabledValue) return s;
      if (!this.customBg) {
        s.bg(colors.bgActive);
      }
      return s;
    });

    // Add label text if present (and not already added)
    if (this.labelText && !this.labelElement) {
      const textColor = this.customTextColor ?? colors.text;
      this.labelElement = text(this.labelText)
        .size(config.fontSize)
        .weight(500)
        .color(textColor)
        .noWrap();
      super.child(this.labelElement);
    } else if (this.labelElement && this.labelText) {
      // Update existing label's color
      const textColor = this.customTextColor ?? colors.text;
      this.labelElement.color(textColor);
    }
  }

  /**
   * Override requestLayout to build content with theme colors.
   */
  override requestLayout(cx: import("./element.ts").RequestLayoutContext) {
    // Get theme from persistent state or use a default approach
    // For now, we'll build content lazily - the theme will be applied in prepaint

    // Add label if needed (without theme colors for now)
    if (this.labelText && !this.labelElement) {
      const config = SIZE_CONFIGS[this.sizeValue];
      this.labelElement = text(this.labelText).size(config.fontSize).weight(500).noWrap();
      super.child(this.labelElement);
    }

    return super.requestLayout(cx);
  }

  /**
   * Override prepaint to apply theme-aware colors.
   */
  override prepaint(
    cx: import("./element.ts").PrepaintContext,
    bounds: import("./types.ts").Bounds,
    requestState: unknown
  ) {
    const theme = cx.getWindow().getTheme();
    const colors = buttonColors(theme)[this.variantValue];

    // Apply theme colors
    if (!this.customBg && colors.bg.a > 0) {
      super.bg(colors.bg);
    }

    if (colors.border && !this.customBorderColor) {
      this.border(1);
      super.borderColor(colors.border);
    }

    // Update label color
    if (this.labelElement) {
      const textColor = this.customTextColor ?? colors.text;
      this.labelElement.color(textColor);
    }

    // Apply hover/active styles
    this.hover((s: StyleBuilder) => {
      if (this.disabledValue) return s;
      if (!this.customBg) {
        s.bg(colors.bgHover);
      }
      return s;
    });

    this.active((s: StyleBuilder) => {
      if (this.disabledValue) return s;
      if (!this.customBg) {
        s.bg(colors.bgActive);
      }
      return s;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return super.prepaint(cx, bounds, requestState as any);
  }
}

/**
 * Factory function to create a button element.
 *
 * @param label - Optional button label text
 *
 * @example
 * // Basic button
 * button("Click me")
 *   .onClick(() => console.log("Clicked!"))
 *
 * @example
 * // Primary button (default variant)
 * button("Submit")
 *   .primary()
 *   .onClick(handleSubmit)
 *
 * @example
 * // Destructive button
 * button("Delete")
 *   .destructive()
 *   .onClick(handleDelete)
 *
 * @example
 * // Outline button
 * button("Cancel")
 *   .outline()
 *   .onClick(handleCancel)
 *
 * @example
 * // Ghost button (minimal style)
 * button("More options")
 *   .ghost()
 *   .onClick(handleMore)
 *
 * @example
 * // Link-styled button
 * button("Learn more")
 *   .link()
 *   .onClick(handleLearnMore)
 *
 * @example
 * // Small button
 * button("Small")
 *   .sm()
 *
 * @example
 * // Large button
 * button("Large Action")
 *   .lg()
 *   .primary()
 *
 * @example
 * // Icon-only button (square)
 * button()
 *   .iconSize()
 *   .ghost()
 *   .child(icon("close"))
 *   .onClick(handleClose)
 *
 * @example
 * // Button with icon and text
 * button("Download")
 *   .child(icon("download"))
 *
 * @example
 * // Disabled button
 * button("Submit")
 *   .primary()
 *   .disabled(true)
 *
 * @example
 * // Pill-shaped button
 * button("Rounded")
 *   .roundedFull()
 *
 * @example
 * // Custom styled button
 * button("Custom")
 *   .bg(colors.purple.x500)
 *   .textColor(colors.white.default)
 *   .rounded(12)
 */
export function button(label?: string): GladeButton {
  return new GladeButton(label);
}
