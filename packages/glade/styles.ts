/**
 * Style types for Glade elements. Provides a Tailwind-like styling API for
 * layout and visual properties.
 */

import { type CursorStyle } from "@glade/core/events.ts";

export { CursorStyle } from "@glade/core/events.ts";
import { type Color, type ColorObject, toColorObject } from "@glade/utils";

import {
  rotateTransform,
  scaleTransform,
  type TransformationMatrix,
  translateTransform,
} from "./transform.ts";

/**
 * Shadow preset names.
 */
export type ShadowPreset = "none" | "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * Display mode.
 */
export type Display = "flex" | "block" | "grid" | "none";

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
 * Border style.
 */
export type BorderStyle = "solid" | "dashed";

/**
 * Whitespace handling mode (mirrors CSS white-space property).
 * - "normal": Collapse whitespace (including newlines), wrap text
 * - "nowrap": Collapse whitespace, no wrapping
 * - "pre": Preserve all whitespace, no wrapping
 * - "pre-wrap": Preserve all whitespace, wrap text
 * - "pre-line": Preserve newlines, collapse other whitespace, wrap text
 */
export type WhitespaceMode = "normal" | "nowrap" | "pre" | "pre-wrap" | "pre-line";

/**
 * Grid auto-flow direction and packing algorithm.
 */
export type GridAutoFlow = "row" | "column" | "row-dense" | "column-dense";

/**
 * Grid placement for an item (start or end position).
 * - "auto": Automatic placement by grid algorithm
 * - number: Line number (1-indexed, negative counts from end)
 * - { span: number }: Span across N tracks
 * - { line: number }: Explicit line number (alternative to bare number)
 */
export type GridPlacement = "auto" | number | { span: number } | { line: number };

/**
 * Values usable in track sizing, including minmax().
 */
export type TrackSizeValue = number | `${number}fr` | "auto" | "min-content" | "max-content";

/**
 * Track sizing function for grid templates.
 * Supports CSS Grid track sizing including fr units, minmax, and content sizing.
 * - number: Fixed pixels
 * - `${number}fr`: Fraction unit (e.g., "1fr", "2fr")
 * - "auto": Auto size based on content
 * - "min-content": Minimum content size
 * - "max-content": Maximum content size
 * - { min, max }: minmax() function
 */
export type TrackSize =
  | number
  | `${number}fr`
  | "auto"
  | "min-content"
  | "max-content"
  | { min: TrackSizeValue; max: TrackSizeValue };

/**
 * Grid template definition.
 * - number: Creates N columns/rows with 1fr sizing each (GPUI-style shorthand)
 * - TrackSize[]: Explicit track sizing for each column/row
 */
export type GridTemplate = number | TrackSize[];

/**
 * Object-fit behavior for images.
 * - fill: Stretch to fill bounds (may distort aspect ratio)
 * - contain: Scale to fit within bounds, preserve aspect ratio
 * - cover: Scale to cover bounds, preserve aspect ratio, crop edges
 * - scale-down: Like contain but never scales up larger than natural size
 * - none: Display at natural size, may overflow
 */
export type ObjectFit = "fill" | "contain" | "cover" | "scale-down" | "none";

/**
 * Complete style definition for a Glade element.
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

  // CSS Grid Container
  gridTemplateColumns?: GridTemplate;
  gridTemplateRows?: GridTemplate;
  gridAutoColumns?: TrackSize;
  gridAutoRows?: TrackSize;
  gridAutoFlow?: GridAutoFlow;

  // CSS Grid Item
  gridColumnStart?: GridPlacement;
  gridColumnEnd?: GridPlacement;
  gridRowStart?: GridPlacement;
  gridRowEnd?: GridPlacement;

  // Sizing
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;

  // Aspect ratio (width / height) - used by layout engine
  aspectRatio?: number;

  // Percentage-based sizing (0-100)
  widthPercent?: number;
  heightPercent?: number;

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
  backgroundColor?: ColorObject;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: ColorObject;
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
  color?: ColorObject;
  fontSize?: number;
  fontWeight?: number | string;
  fontFamily?: string;
  lineHeight?: number;
  textAlign?: TextAlign;
  letterSpacing?: number;

  // Interactivity
  cursor?: CursorStyle;

  // Stacking
  zIndex?: number;
}

/**
 * Builder for creating style objects, used in hover/active/focus callbacks.
 */
export class StyleBuilder {
  private styles: Partial<Styles> = {};

  bg(color: Color): this {
    this.styles.backgroundColor = toColorObject(color);
    return this;
  }

  borderColor(color: Color): this {
    this.styles.borderColor = toColorObject(color);
    return this;
  }

  textColor(color: Color): this {
    this.styles.color = toColorObject(color);
    return this;
  }

  opacity(v: number): this {
    this.styles.opacity = v;
    return this;
  }

  cursor(v: CursorStyle): this {
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

  zIndex(v: number): this {
    this.styles.zIndex = v;
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
