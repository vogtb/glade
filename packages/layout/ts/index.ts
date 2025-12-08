/**
 * @glade/layout - WASM-based Taffy layout engine
 *
 * Provides CSS flexbox/grid layout computation via Taffy,
 * compiled to WebAssembly for use in Flash.
 */

import type { InitOutput } from "../pkg/layout";

export type { LayoutId, LayoutBounds, TaffyLayoutEngine } from "../pkg/layout";

let wasmModule: InitOutput | null = null;
let initPromise: Promise<InitOutput> | null = null;

/**
 * Initialize the WASM module.
 * Must be called before using any layout functions.
 * Safe to call multiple times - will only initialize once.
 */
export async function initLayout(): Promise<InitOutput> {
  if (wasmModule) {
    return wasmModule;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const wasm = await import("../pkg/layout");
    wasmModule = await wasm.default();
    return wasmModule;
  })();

  return initPromise;
}

/**
 * Check if the WASM module is initialized.
 */
export function isInitialized(): boolean {
  return wasmModule !== null;
}

/**
 * Get the layout engine class.
 * Throws if WASM is not initialized.
 */
export async function createLayoutEngine(): Promise<
  InstanceType<typeof import("../pkg/layout").TaffyLayoutEngine>
> {
  await initLayout();
  const { TaffyLayoutEngine } = await import("../pkg/layout");
  return new TaffyLayoutEngine();
}

/**
 * Style input for layout computation.
 * Maps to Flash's Styles interface.
 */
export interface StyleInput {
  // Display & Flexbox
  display?: "flex" | "block" | "none";
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
  };
}
