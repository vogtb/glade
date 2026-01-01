/**
 * Layout engine for Glade - wraps the Taffy WASM module.
 *
 * Follows GPUI's pattern:
 * 1. request_layout() - Create layout nodes during element tree traversal
 * 2. compute_layout() - Run Taffy's layout algorithm
 * 3. layout_bounds() - Retrieve computed bounds with parent offset accumulation
 */

import {
  createLayoutEngine,
  styleToWasm,
  type TaffyLayoutEngine,
  type LayoutId as WasmLayoutId,
  type StyleInput,
  type MeasureCallback,
} from "@glade/layout";
import type { Bounds } from "./types.ts";
import type { Styles } from "./styles.ts";

declare const __layoutIdBrand: unique symbol;
export type LayoutId = number & { [__layoutIdBrand]: true };

export interface AvailableSpace {
  width: AvailableSpaceValue;
  height: AvailableSpaceValue;
}

export type AvailableSpaceValue =
  | { type: "definite"; value: number }
  | { type: "min-content" }
  | { type: "max-content" };

export function definite(value: number): AvailableSpaceValue {
  return { type: "definite", value };
}

export function minContent(): AvailableSpaceValue {
  return { type: "min-content" };
}

export function maxContent(): AvailableSpaceValue {
  return { type: "max-content" };
}

/**
 * Glade layout engine wrapping Taffy WASM.
 */
export class GladeLayoutEngine {
  private engine: TaffyLayoutEngine;
  private wasmIdToLayoutId: Map<bigint, LayoutId> = new Map();
  private layoutIdToWasmId: Map<LayoutId, WasmLayoutId> = new Map();
  private parentMap: Map<LayoutId, LayoutId> = new Map();
  private absoluteBoundsCache: Map<LayoutId, Bounds> = new Map();
  private scaleFactor: number = 1;

  constructor() {
    this.engine = createLayoutEngine();
  }

  /**
   * Set the device pixel ratio / scale factor.
   */
  setScaleFactor(factor: number): void {
    this.scaleFactor = factor;
  }

  /**
   * Request layout for an element with no children (leaf node).
   */
  requestLayout(style: Partial<Styles>, children: LayoutId[] = []): LayoutId {
    const styleInput = this.convertStyle(style);
    const wasmStyle = styleToWasm(styleInput);

    let wasmId: WasmLayoutId;
    if (children.length === 0) {
      wasmId = this.engine.new_leaf(wasmStyle);
    } else {
      const childWasmIds = children.map((id) => {
        const wasmChildId = this.layoutIdToWasmId.get(id);
        if (!wasmChildId) {
          throw new Error(`Unknown layout ID: ${id}`);
        }
        return wasmChildId.id;
      });
      wasmId = this.engine.new_with_children(wasmStyle, childWasmIds);
    }

    const layoutId = Number(wasmId.id) as LayoutId;
    this.wasmIdToLayoutId.set(wasmId.id, layoutId);
    this.layoutIdToWasmId.set(layoutId, wasmId);

    for (const childId of children) {
      this.parentMap.set(childId, layoutId);
    }

    return layoutId;
  }

  /**
   * Request layout for a measurable element (e.g., text).
   * The measureId is used during layout to call back for measurement.
   */
  requestMeasurableLayout(style: Partial<Styles>, measureId: number): LayoutId {
    const styleInput = this.convertStyle(style);
    const wasmStyle = styleToWasm(styleInput);

    const wasmId = this.engine.new_measurable_leaf(wasmStyle, BigInt(measureId));

    const layoutId = Number(wasmId.id) as LayoutId;
    this.wasmIdToLayoutId.set(wasmId.id, layoutId);
    this.layoutIdToWasmId.set(layoutId, wasmId);

    return layoutId;
  }

  /**
   * Compute layout for the tree rooted at the given node.
   */
  computeLayout(rootId: LayoutId, availableWidth: number, availableHeight: number): void {
    this.absoluteBoundsCache.clear();

    const wasmId = this.layoutIdToWasmId.get(rootId);
    if (!wasmId) {
      throw new Error(`Unknown layout ID: ${rootId}`);
    }

    const scaledWidth = availableWidth * this.scaleFactor;
    const scaledHeight = availableHeight * this.scaleFactor;

    this.engine.compute_layout(wasmId, scaledWidth, scaledHeight);
  }

  /**
   * Compute layout with measure callback for measurable nodes (e.g., text).
   */
  computeLayoutWithMeasure(
    rootId: LayoutId,
    availableWidth: number,
    availableHeight: number,
    measureCallback: MeasureCallback
  ): void {
    this.absoluteBoundsCache.clear();

    const wasmId = this.layoutIdToWasmId.get(rootId);
    if (!wasmId) {
      throw new Error(`Unknown layout ID: ${rootId}`);
    }

    const scaledWidth = availableWidth * this.scaleFactor;
    const scaledHeight = availableHeight * this.scaleFactor;
    const sf = this.scaleFactor;

    // Wrap callback to handle scaling
    const scaledCallback = (
      measureId: number,
      knownW: number,
      knownH: number,
      availW: number,
      availH: number
    ) => {
      // Convert from scaled to logical coordinates for measurement
      const result = measureCallback(
        measureId,
        Number.isNaN(knownW) ? knownW : knownW / sf,
        Number.isNaN(knownH) ? knownH : knownH / sf,
        Number.isFinite(availW) ? availW / sf : availW,
        Number.isFinite(availH) ? availH / sf : availH
      );
      // Convert result back to scaled coordinates
      return {
        width: result.width * sf,
        height: result.height * sf,
      };
    };

    this.engine.compute_layout_with_measure(wasmId, scaledWidth, scaledHeight, scaledCallback);
  }

  /**
   * Get the computed bounds for a layout node.
   * Returns absolute bounds (accumulated from parent offsets).
   */
  layoutBounds(layoutId: LayoutId): Bounds {
    const cached = this.absoluteBoundsCache.get(layoutId);
    if (cached) {
      return cached;
    }

    const wasmId = this.layoutIdToWasmId.get(layoutId);
    if (!wasmId) {
      throw new Error(`Unknown layout ID: ${layoutId}`);
    }

    const layout = this.engine.get_layout(wasmId);
    let bounds: Bounds = {
      x: layout.x / this.scaleFactor,
      y: layout.y / this.scaleFactor,
      width: layout.width / this.scaleFactor,
      height: layout.height / this.scaleFactor,
    };

    const parentId = this.parentMap.get(layoutId);
    if (parentId !== undefined) {
      const parentBounds = this.layoutBounds(parentId);
      bounds = {
        x: bounds.x + parentBounds.x,
        y: bounds.y + parentBounds.y,
        width: bounds.width,
        height: bounds.height,
      };
    }

    this.absoluteBoundsCache.set(layoutId, bounds);
    return bounds;
  }

  /**
   * Clear all layout nodes and reset state.
   */
  clear(): void {
    this.engine.clear();
    this.wasmIdToLayoutId.clear();
    this.layoutIdToWasmId.clear();
    this.parentMap.clear();
    this.absoluteBoundsCache.clear();
  }

  /**
   * Get the number of layout nodes.
   */
  nodeCount(): number {
    return this.engine.node_count();
  }

  /**
   * Convert Glade Styles to StyleInput for WASM.
   */
  private convertStyle(style: Partial<Styles>): StyleInput {
    const result: StyleInput = {};

    if (style.display !== undefined) result.display = style.display;
    if (style.flexDirection !== undefined) result.flexDirection = style.flexDirection;
    if (style.flexWrap !== undefined) result.flexWrap = style.flexWrap;

    // Handle flex shorthand (e.g., "1 1 0%", "1 1 auto", "none")
    if (style.flex !== undefined) {
      if (style.flex === "none") {
        result.flexGrow = 0;
        result.flexShrink = 0;
      } else {
        const parts = style.flex.split(" ");
        if (parts.length >= 1) result.flexGrow = parseFloat(parts[0]!);
        if (parts.length >= 2) result.flexShrink = parseFloat(parts[1]!);
        // flexBasis from shorthand is typically "0%" or "auto" - we ignore for now
      }
    }

    if (style.flexGrow !== undefined) result.flexGrow = style.flexGrow;
    if (style.flexShrink !== undefined) result.flexShrink = style.flexShrink;
    if (typeof style.flexBasis === "number") result.flexBasis = style.flexBasis;
    if (style.alignItems !== undefined) result.alignItems = style.alignItems;
    if (style.justifyContent !== undefined) result.justifyContent = style.justifyContent;
    if (style.alignSelf !== undefined) result.alignSelf = style.alignSelf;
    if (style.gap !== undefined) result.gap = style.gap;
    if (style.rowGap !== undefined) result.rowGap = style.rowGap;
    if (style.columnGap !== undefined) result.columnGap = style.columnGap;

    // CSS Grid Container
    if (style.gridTemplateColumns !== undefined)
      result.gridTemplateColumns = style.gridTemplateColumns;
    if (style.gridTemplateRows !== undefined) result.gridTemplateRows = style.gridTemplateRows;
    if (style.gridAutoColumns !== undefined) result.gridAutoColumns = style.gridAutoColumns;
    if (style.gridAutoRows !== undefined) result.gridAutoRows = style.gridAutoRows;
    if (style.gridAutoFlow !== undefined) result.gridAutoFlow = style.gridAutoFlow;

    // CSS Grid Item
    if (style.gridColumnStart !== undefined) result.gridColumnStart = style.gridColumnStart;
    if (style.gridColumnEnd !== undefined) result.gridColumnEnd = style.gridColumnEnd;
    if (style.gridRowStart !== undefined) result.gridRowStart = style.gridRowStart;
    if (style.gridRowEnd !== undefined) result.gridRowEnd = style.gridRowEnd;

    if (typeof style.width === "number") result.width = style.width;
    if (typeof style.height === "number") result.height = style.height;
    if (typeof style.minWidth === "number") result.minWidth = style.minWidth;
    if (typeof style.maxWidth === "number") result.maxWidth = style.maxWidth;
    if (typeof style.minHeight === "number") result.minHeight = style.minHeight;
    if (typeof style.maxHeight === "number") result.maxHeight = style.maxHeight;

    // Percentage-based sizing
    if (typeof style.widthPercent === "number") result.widthPercent = style.widthPercent;
    if (typeof style.heightPercent === "number") result.heightPercent = style.heightPercent;

    if (style.paddingTop !== undefined) result.paddingTop = style.paddingTop;
    if (style.paddingRight !== undefined) result.paddingRight = style.paddingRight;
    if (style.paddingBottom !== undefined) result.paddingBottom = style.paddingBottom;
    if (style.paddingLeft !== undefined) result.paddingLeft = style.paddingLeft;

    if (style.marginTop === "auto") {
      result.marginTopAuto = true;
    } else if (typeof style.marginTop === "number") {
      result.marginTop = style.marginTop;
    }
    if (style.marginRight === "auto") {
      result.marginRightAuto = true;
    } else if (typeof style.marginRight === "number") {
      result.marginRight = style.marginRight;
    }
    if (style.marginBottom === "auto") {
      result.marginBottomAuto = true;
    } else if (typeof style.marginBottom === "number") {
      result.marginBottom = style.marginBottom;
    }
    if (style.marginLeft === "auto") {
      result.marginLeftAuto = true;
    } else if (typeof style.marginLeft === "number") {
      result.marginLeft = style.marginLeft;
    }

    if (style.position !== undefined) result.position = style.position;
    if (style.top !== undefined) result.top = style.top;
    if (style.right !== undefined) result.right = style.right;
    if (style.bottom !== undefined) result.bottom = style.bottom;
    if (style.left !== undefined) result.left = style.left;

    if (style.overflow !== undefined && style.overflow !== "auto") {
      result.overflow = style.overflow;
    }
    if (style.overflowX !== undefined && style.overflowX !== "auto") {
      result.overflowX = style.overflowX;
    }
    if (style.overflowY !== undefined && style.overflowY !== "auto") {
      result.overflowY = style.overflowY;
    }

    if (style.borderWidth !== undefined) result.borderWidth = style.borderWidth;

    return result;
  }
}
