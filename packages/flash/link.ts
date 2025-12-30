/**
 * Link element - a clickable text link that opens URLs.
 *
 * Styled like a traditional HTML anchor tag with blue color and underline on hover.
 */

import {
  FlashElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { Bounds } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode } from "./dispatch.ts";
import type { Hitbox } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";
import { linkColors } from "./theme.ts";
import { toColorObject, type Color, type ColorObject } from "@glade/utils";

/**
 * Default link color (blue).
 */

/**
 * Request layout state for link element.
 */
type LinkRequestState = {
  layoutId: LayoutId;
  measureId: number;
  textWidth: number;
};

/**
 * Prepaint state for link element.
 */
type LinkPrepaintState = {
  hitbox: Hitbox;
  measureId: number;
  textWidth: number;
  hitTestNode: HitTestNode;
  colors: {
    default: ColorObject;
    hover: ColorObject;
  };
};

/**
 * A link element that renders clickable text.
 *
 * Opens URLs in the default browser when clicked.
 * In browser environments, opens in a new tab.
 */
export class FlashLink extends FlashElement<LinkRequestState, LinkPrepaintState> {
  private textContent: string;
  private href: string;
  private colorValue: ColorObject | null = null;
  private hoverColorValue: ColorObject | null = null;
  private fontSizeValue = 14;
  private fontFamilyValue = "system-ui";
  private fontWeightValue = 400;
  private underlineValue = false;
  private hoverUnderlineValue = true;

  constructor(text: string, href: string) {
    super();
    this.textContent = text;
    this.href = href;
  }

  /**
   * Set the link color.
   */
  color(c: Color): this {
    this.colorValue = toColorObject(c);
    return this;
  }

  /**
   * Set the hover color.
   */
  hoverColor(c: Color): this {
    this.hoverColorValue = toColorObject(c);
    return this;
  }

  /**
   * Set the font size.
   */
  size(v: number): this {
    this.fontSizeValue = v;
    return this;
  }

  /**
   * Set the font family.
   */
  font(family: string): this {
    this.fontFamilyValue = family;
    return this;
  }

  /**
   * Set the font weight.
   */
  weight(v: number): this {
    this.fontWeightValue = v;
    return this;
  }

  /**
   * Always show underline (not just on hover).
   */
  underline(): this {
    this.underlineValue = true;
    return this;
  }

  /**
   * Never show underline (even on hover).
   */
  noUnderline(): this {
    this.underlineValue = false;
    this.hoverUnderlineValue = false;
    return this;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<LinkRequestState> {
    const measureId = cx.registerTextMeasure({
      text: this.textContent,
      fontSize: this.fontSizeValue,
      fontFamily: this.fontFamilyValue,
      fontWeight: this.fontWeightValue,
      lineHeight: this.fontSizeValue * 1.2,
      noWrap: true,
      maxWidth: null,
    });

    const layoutId = cx.requestMeasurableLayout({}, measureId);

    // Measure text width for underline
    const measured = cx.measureText(this.textContent, {
      fontSize: this.fontSizeValue,
      fontFamily: this.fontFamilyValue,
      fontWeight: this.fontWeightValue,
    });

    return { layoutId, requestState: { layoutId, measureId, textWidth: measured.width } };
  }

  prepaint(cx: PrepaintContext, bounds: Bounds, requestState: LinkRequestState): LinkPrepaintState {
    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal, "pointer");

    const href = this.href;
    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {
        click: (_event, window) => {
          window.openUrl(href);
        },
      },
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };

    const theme = cx.getWindow().getTheme();
    const palette = linkColors(theme);
    const colors = {
      default: this.colorValue ?? palette.default,
      hover: this.hoverColorValue ?? palette.hover,
    };

    return {
      hitbox,
      measureId: requestState.measureId,
      textWidth: requestState.textWidth,
      hitTestNode,
      colors,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: LinkPrepaintState): void {
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const textColor = isHovered ? prepaintState.colors.hover : prepaintState.colors.default;
    const showUnderline = this.underlineValue || (isHovered && this.hoverUnderlineValue);

    cx.paintGlyphs(this.textContent, bounds, textColor, {
      fontSize: this.fontSizeValue,
      fontFamily: this.fontFamilyValue,
      fontWeight: this.fontWeightValue,
    });

    if (showUnderline) {
      const underlineY = bounds.y + this.fontSizeValue + 2;
      cx.paintUnderline(bounds.x, underlineY, prepaintState.textWidth, 1, textColor, "solid");
    }
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode {
    const href = this.href;
    return {
      bounds,
      handlers: {
        click: (_event, window) => {
          window.openUrl(href);
        },
      },
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };
  }
}

/**
 * Factory function to create a link element.
 *
 * @param text - The link text to display
 * @param href - The URL to open when clicked
 *
 * @example
 * // Basic link
 * link("Visit GitHub", "https://github.com")
 *
 * @example
 * // Styled link
 * link("Documentation", "https://docs.example.com")
 *   .size(16)
 *   .font("Inter")
 *   .color({ r: 0.2, g: 0.5, b: 0.9, a: 1 })
 *
 * @example
 * // Always underlined
 * link("Click here", "https://example.com").underline()
 */
export function link(text: string, href: string): FlashLink {
  return new FlashLink(text, href);
}
