/**
 * @glade/layout - WASM-based Taffy layout engine
 *
 * Provides CSS flexbox/grid layout computation via Taffy,
 * compiled to WebAssembly for use in Glade.
 *
 * Uses Bun macros to embed WASM at build time, works in both
 * native (Bun) and browser environments.
 */

import { base64ToBytes } from "@glade/utils";
import { log } from "@glade/logging";
import {
  initSync,
  TaffyLayoutEngine as WasmTaffyLayoutEngine,
  type InitOutput,
} from "../pkg/layout";
import type { LayoutId, LayoutBounds } from "../pkg/layout";
import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };

// Embed WASM as base64 at build time via Bun macro
const wasmBase64 = COMPTIME_embedAsBase64("../layout/pkg/layout_bg.wasm");

export class TaffyLayoutEngine extends WasmTaffyLayoutEngine {
  readonly module: InitOutput;

  constructor(module: InitOutput) {
    super();
    this.module = module;
  }
}

/**
 * Create a new layout engine instance.
 * Automatically initializes WASM if not already done.
 */
export function createLayoutEngine(): TaffyLayoutEngine {
  const kb = new TextEncoder().encode(wasmBase64).length / 1000;
  log.info(`layout engine embedded WASM binary is ${kb} kb`);
  const wasmBytes = base64ToBytes(wasmBase64);
  const module = initSync({ module: wasmBytes });
  return new TaffyLayoutEngine(module);
}

// Re-export types
export type { LayoutId, LayoutBounds, InitOutput };

/**
 * Callback type for measuring nodes during layout computation.
 * Called by Taffy when it needs the intrinsic size of a measurable node.
 */
export type MeasureCallback = (
  measureId: number,
  knownWidth: number,
  knownHeight: number,
  availableWidth: number,
  availableHeight: number
) => { width: number; height: number };

// ============ CSS Grid Types ============

/**
 * Grid auto-flow direction for CSS Grid.
 */
export type GridAutoFlow = "row" | "column" | "row-dense" | "column-dense";

/**
 * Grid placement for items - can be auto, a line number, or a span.
 */
export type GridPlacement = "auto" | number | { span: number } | { line: number };

/**
 * Track size value for grid templates.
 */
export type TrackSizeValue = number | `${number}fr` | "auto" | "min-content" | "max-content";

/**
 * Track size - can be a fixed value, fr unit, keyword, or minmax.
 */
export type TrackSize =
  | number
  | `${number}fr`
  | "auto"
  | "min-content"
  | "max-content"
  | { min: TrackSizeValue; max: TrackSizeValue };

/**
 * Grid template - either a count of equal columns/rows, or explicit tracks.
 */
export type GridTemplate = number | TrackSize[];

// ============ WASM Input Types for Grid ============

/**
 * Track size input format for WASM serialization.
 */
export type TrackSizeInput =
  | { type: "fixed"; value: number }
  | { type: "fr"; value: number }
  | { type: "auto" }
  | { type: "min-content" }
  | { type: "max-content" }
  | { type: "minmax"; min: TrackSizeInput; max: TrackSizeInput };

/**
 * Grid template input format for WASM serialization.
 */
export type GridTemplateInput =
  | { type: "count"; value: number }
  | { type: "tracks"; tracks: TrackSizeInput[] };

/**
 * Grid placement input format for WASM serialization.
 */
export type GridPlacementInput =
  | { type: "auto" }
  | { type: "line"; value: number }
  | { type: "span"; value: number };

// ============ Grid Conversion Functions ============

/**
 * Convert a TrackSize to WASM input format.
 */
export function convertTrackSize(size: TrackSize): TrackSizeInput {
  if (typeof size === "number") {
    return { type: "fixed", value: size };
  }
  if (typeof size === "string") {
    if (size === "auto") return { type: "auto" };
    if (size === "min-content") return { type: "min-content" };
    if (size === "max-content") return { type: "max-content" };
    if (size.endsWith("fr")) {
      const value = parseFloat(size.slice(0, -2));
      return { type: "fr", value };
    }
  }
  if (typeof size === "object" && "min" in size && "max" in size) {
    return {
      type: "minmax",
      min: convertTrackSizeValue(size.min),
      max: convertTrackSizeValue(size.max),
    };
  }
  return { type: "auto" };
}

/**
 * Convert a TrackSizeValue to WASM input format.
 */
function convertTrackSizeValue(value: TrackSizeValue): TrackSizeInput {
  if (typeof value === "number") {
    return { type: "fixed", value };
  }
  if (typeof value === "string") {
    if (value === "auto") return { type: "auto" };
    if (value === "min-content") return { type: "min-content" };
    if (value === "max-content") return { type: "max-content" };
    if (value.endsWith("fr")) {
      const num = parseFloat(value.slice(0, -2));
      return { type: "fr", value: num };
    }
  }
  return { type: "auto" };
}

/**
 * Convert a GridTemplate to WASM input format.
 */
export function convertGridTemplate(template: GridTemplate): GridTemplateInput {
  if (typeof template === "number") {
    return { type: "count", value: template };
  }
  return {
    type: "tracks",
    tracks: template.map(convertTrackSize),
  };
}

/**
 * Convert a GridPlacement to WASM input format.
 *
 * TODO: I think we should actually unify these types... Same for many parallel
 * types in this package.
 */
export function convertGridPlacement(placement: GridPlacement): GridPlacementInput {
  if (placement === "auto") {
    return { type: "auto" };
  }
  if (typeof placement === "number") {
    return { type: "line", value: placement };
  }
  if (typeof placement === "object") {
    if ("span" in placement) {
      return { type: "span", value: placement.span };
    }
    if ("line" in placement) {
      return { type: "line", value: placement.line };
    }
  }
  return { type: "auto" };
}

// ============ Style Input ============

/**
 * Style input for layout computation.
 * Maps to Glade's Styles interface.
 */
export interface StyleInput {
  // Display & Flexbox
  display?: "flex" | "block" | "grid" | "none";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  flexWrap?: "wrap" | "nowrap" | "wrap-reverse";
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number;
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignSelf?: "auto" | "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
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
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;

  // Sizing percentages
  widthPercent?: number;
  heightPercent?: number;
  minWidthPercent?: number;
  maxWidthPercent?: number;
  minHeightPercent?: number;
  maxHeightPercent?: number;

  // Spacing
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;

  // Auto margins
  marginTopAuto?: boolean;
  marginRightAuto?: boolean;
  marginBottomAuto?: boolean;
  marginLeftAuto?: boolean;

  // Position
  position?: "relative" | "absolute";
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;

  // Overflow
  overflow?: "visible" | "hidden" | "scroll";
  overflowX?: "visible" | "hidden" | "scroll";
  overflowY?: "visible" | "hidden" | "scroll";

  // Border (for layout)
  borderWidth?: number;

  // Aspect ratio (width / height)
  aspectRatio?: number;
}

/**
 * Convert StyleInput to the format expected by WASM.
 * Transforms camelCase to snake_case for Rust serde.
 */
export function styleToWasm(style: StyleInput): Record<string, unknown> {
  return {
    display: style.display,
    flex_direction: style.flexDirection,
    flex_wrap: style.flexWrap,
    flex_grow: style.flexGrow,
    flex_shrink: style.flexShrink,
    flex_basis: style.flexBasis,
    align_items: style.alignItems,
    justify_content: style.justifyContent,
    align_self: style.alignSelf,
    gap: style.gap,
    row_gap: style.rowGap,
    column_gap: style.columnGap,

    // CSS Grid Container
    grid_template_columns: style.gridTemplateColumns
      ? convertGridTemplate(style.gridTemplateColumns)
      : undefined,
    grid_template_rows: style.gridTemplateRows
      ? convertGridTemplate(style.gridTemplateRows)
      : undefined,
    grid_auto_columns: style.gridAutoColumns ? convertTrackSize(style.gridAutoColumns) : undefined,
    grid_auto_rows: style.gridAutoRows ? convertTrackSize(style.gridAutoRows) : undefined,
    grid_auto_flow: style.gridAutoFlow,

    // CSS Grid Item
    grid_column_start: style.gridColumnStart
      ? convertGridPlacement(style.gridColumnStart)
      : undefined,
    grid_column_end: style.gridColumnEnd ? convertGridPlacement(style.gridColumnEnd) : undefined,
    grid_row_start: style.gridRowStart ? convertGridPlacement(style.gridRowStart) : undefined,
    grid_row_end: style.gridRowEnd ? convertGridPlacement(style.gridRowEnd) : undefined,

    width: style.width,
    height: style.height,
    min_width: style.minWidth,
    max_width: style.maxWidth,
    min_height: style.minHeight,
    max_height: style.maxHeight,
    width_percent: style.widthPercent,
    height_percent: style.heightPercent,
    min_width_percent: style.minWidthPercent,
    max_width_percent: style.maxWidthPercent,
    min_height_percent: style.minHeightPercent,
    max_height_percent: style.maxHeightPercent,
    padding_top: style.paddingTop,
    padding_right: style.paddingRight,
    padding_bottom: style.paddingBottom,
    padding_left: style.paddingLeft,
    margin_top: style.marginTop,
    margin_right: style.marginRight,
    margin_bottom: style.marginBottom,
    margin_left: style.marginLeft,
    margin_top_auto: style.marginTopAuto,
    margin_right_auto: style.marginRightAuto,
    margin_bottom_auto: style.marginBottomAuto,
    margin_left_auto: style.marginLeftAuto,
    position: style.position,
    top: style.top,
    right: style.right,
    bottom: style.bottom,
    left: style.left,
    overflow: style.overflow,
    overflow_x: style.overflowX,
    overflow_y: style.overflowY,
    border_width: style.borderWidth,
    aspect_ratio: style.aspectRatio,
  };
}
