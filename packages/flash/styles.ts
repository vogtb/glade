/**
 * Style types for Flash elements.
 *
 * Provides a Tailwind-like styling API for layout and visual properties.
 */

import type { Color, TransformationMatrix } from "./types.ts";
import { scaleTransform, rotateTransform, translateTransform } from "./types.ts";
import { CursorStyle } from "@glade/core/events.ts";

/**
 * Shadow preset names.
 */
export type ShadowPreset = "none" | "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * Display mode.
 */
export type Display = "flex" | "block" | "none";

/**
 * Flex direction.
 */
export type FlexDirection = "row" | "column" | "row-reverse" | "column-reverse";

/**
 * Flex wrap.
 */
export type FlexWrap = "wrap" | "nowrap" | "wrap-reverse";

/**
 * Alignment for items along the cross axis.
 */
export type AlignItems = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";

/**
 * Alignment for content along the main axis.
 */
export type JustifyContent =
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly";

/**
 * Self alignment.
 */
export type AlignSelf = "auto" | "flex-start" | "flex-end" | "center" | "stretch" | "baseline";

/**
 * Position type.
 */
export type Position = "relative" | "absolute";

/**
 * Overflow behavior.
 */
export type Overflow = "visible" | "hidden" | "scroll" | "auto";

/**
 * Text alignment.
 */
export type TextAlign = "left" | "center" | "right" | "justify";

/**
 * Cursor style.
 */
export type Cursor = "default" | "pointer" | "text" | "grab" | "grabbing" | "not-allowed" | "move";

/**
 * Border style.
 */
export type BorderStyle = "solid" | "dashed";

/**
 * Complete style definition for a Flash element.
 */
export interface Styles {
  // Display & Flexbox
  display?: Display;
  flexDirection?: FlexDirection;
  flexWrap?: FlexWrap;
  flex?: string;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | string;
  alignItems?: AlignItems;
  justifyContent?: JustifyContent;
  alignSelf?: AlignSelf;
  gap?: number;
  rowGap?: number;
  columnGap?: number;

  // Sizing
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;

  // Spacing
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number | "auto";
  marginRight?: number | "auto";
  marginBottom?: number | "auto";
  marginLeft?: number | "auto";

  // Position
  position?: Position;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;

  // Overflow
  overflow?: Overflow;
  overflowX?: Overflow;
  overflowY?: Overflow;

  // Visual
  backgroundColor?: Color;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: Color;
  borderStyle?: BorderStyle;
  /** Dash length for dashed borders. Default is 6. */
  borderDashLength?: number;
  /** Gap length between dashes. Default is 4. */
  borderGapLength?: number;
  shadow?: ShadowPreset;
  opacity?: number;

  // Transform
  transform?: TransformationMatrix;

  // Text
  color?: Color;
  fontSize?: number;
  fontWeight?: number | string;
  fontFamily?: string;
  lineHeight?: number;
  textAlign?: TextAlign;
  letterSpacing?: number;

  // Interactivity
  cursor?: Cursor;
}

/**
 * Builder for creating style objects, used in hover/active/focus callbacks.
 */
export class StyleBuilder {
  private styles: Partial<Styles> = {};

  bg(color: Color): this {
    this.styles.backgroundColor = color;
    return this;
  }

  borderColor(color: Color): this {
    this.styles.borderColor = color;
    return this;
  }

  textColor(color: Color): this {
    this.styles.color = color;
    return this;
  }

  opacity(v: number): this {
    this.styles.opacity = v;
    return this;
  }

  cursor(v: Cursor): this {
    this.styles.cursor = v;
    return this;
  }

  shadow(v: ShadowPreset): this {
    this.styles.shadow = v;
    return this;
  }

  scale(v: number): this {
    this.styles.transform = scaleTransform(v);
    return this;
  }

  rotate(angleRadians: number): this {
    this.styles.transform = rotateTransform(angleRadians);
    return this;
  }

  translate(x: number, y: number): this {
    this.styles.transform = translateTransform(x, y);
    return this;
  }

  transform(matrix: TransformationMatrix): this {
    this.styles.transform = matrix;
    return this;
  }

  build(): Partial<Styles> {
    return this.styles;
  }
}

/**
 * Check if overflow style enables scrolling.
 */
export function overflowAllowsScroll(overflow: Overflow | undefined): boolean {
  return overflow === "scroll" || overflow === "auto";
}

/**
 * Check if overflow style clips content.
 */
export function overflowClipsContent(overflow: Overflow | undefined): boolean {
  return overflow === "hidden" || overflow === "scroll" || overflow === "auto";
}

/**
 * Shadow definitions for each preset.
 */
export const SHADOW_DEFINITIONS: Record<
  Exclude<ShadowPreset, "none">,
  { blur: number; offsetY: number; opacity: number }
> = {
  sm: { blur: 2, offsetY: 1, opacity: 0.05 },
  md: { blur: 6, offsetY: 3, opacity: 0.1 },
  lg: { blur: 15, offsetY: 8, opacity: 0.1 },
  xl: { blur: 25, offsetY: 20, opacity: 0.1 },
  "2xl": { blur: 50, offsetY: 25, opacity: 0.25 },
};

/**
 * Convert Flash Cursor style to platform CursorStyle.
 */
export function cursorToCursorStyle(cursor: Cursor | undefined): CursorStyle {
  switch (cursor) {
    case "pointer":
      return CursorStyle.Pointer;
    case "text":
      return CursorStyle.Text;
    case "grab":
      return CursorStyle.Grab;
    case "grabbing":
      return CursorStyle.Grabbing;
    case "not-allowed":
      return CursorStyle.NotAllowed;
    case "move":
      return CursorStyle.Move;
    case "default":
    default:
      return CursorStyle.Default;
  }
}
