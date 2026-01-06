/**
 * @glade/layout - WASM-based Taffy layout engine
 *
 * Provides CSS flexbox/grid layout computation via Taffy, compiled to
 * WebAssembly for use in Glade. Uses Bun macros to embed WASM at build time,
 * works in both native (Bun) and browser environments.
 */

import { log } from "@glade/logging";
import { base64ToBytes, formatBytes } from "@glade/utils";

import type { LayoutBounds, LayoutId } from "../pkg/layout";
import {
  type InitOutput,
  initSync,
  TaffyLayoutEngine as WasmTaffyLayoutEngine,
} from "../pkg/layout";
import { LAYOUT_WASM_BASE64 } from "./gen.embedded";

export class TaffyLayoutEngine extends WasmTaffyLayoutEngine {
  readonly module: InitOutput;

  constructor(module: InitOutput) {
    super();
    this.module = module;
  }
}

/**
 * Create a new layout engine instance.
 */
export function createLayoutEngine(): TaffyLayoutEngine {
  const wasmBytes = base64ToBytes(LAYOUT_WASM_BASE64);
  log.info(`layout engine embedded WASM binary is ${formatBytes(wasmBytes.byteLength)}`);
  const module = initSync({ module: wasmBytes });
  return new TaffyLayoutEngine(module);
}

// Re-export types
export type { InitOutput, LayoutBounds, LayoutId };

/**
 * Callback type for measuring nodes during layout computation. Called by
 * Taffy when it needs the intrinsic size of a measurable node.
 */
export type MeasureCallback = (
  measureId: number,
  knownWidth: number,
  knownHeight: number,
  availableWidth: number,
  availableHeight: number
) => { width: number; height: number };

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

/**
 * Style input for layout computation. Maps to Glade's Styles interface.
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
 * Grid types are passed directly - Rust uses untagged serde to deserialize them.
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

    // CSS Grid Container - passed directly, Rust handles via untagged serde
    grid_template_columns: style.gridTemplateColumns,
    grid_template_rows: style.gridTemplateRows,
    grid_auto_columns: style.gridAutoColumns,
    grid_auto_rows: style.gridAutoRows,
    grid_auto_flow: style.gridAutoFlow,

    // CSS Grid Item - passed directly, Rust handles via untagged serde
    grid_column_start: style.gridColumnStart,
    grid_column_end: style.gridColumnEnd,
    grid_row_start: style.gridRowStart,
    grid_row_end: style.gridRowEnd,

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
