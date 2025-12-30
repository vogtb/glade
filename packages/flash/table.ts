/**
 * Table components (table, thead, tbody, tfoot, tr, th, td) built on the Flash grid layout.
 *
 * Implements an HTML-like table model using Taffy's grid sizing so columns align across rows.
 * Sections and rows are structural; all layout work is coordinated by the table element,
 * which flattens cells into a single grid.
 */

import {
  FlashContainerElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type GlobalElementId,
} from "./element.ts";
import { FlashDiv } from "./div.ts";
import type { Bounds } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { Styles, GridTemplate, TrackSize } from "./styles.ts";
import { overflowClipsContent } from "./styles.ts";
import type { HitTestNode } from "./dispatch.ts";
import type { Hitbox } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";

type TableSectionKind = "head" | "body" | "foot";

type TableRequestState = {
  layoutId: LayoutId;
  cellLayoutIds: LayoutId[];
  cellElementIds: GlobalElementId[];
  cellRequestStates: TableCellRequestState[];
  cells: FlashTableCell[];
};

type TablePrepaintState = {
  childElementIds: GlobalElementId[];
  childPrepaintStates: TableCellPrepaintState[];
  childBounds: Bounds[];
  hitbox: Hitbox | null;
};

type FlattenResult = {
  cellLayoutIds: LayoutId[];
  cellElementIds: GlobalElementId[];
  cellRequestStates: TableCellRequestState[];
  cells: FlashTableCell[];
  columnCount: number;
};

type TableCellRequestState = ReturnType<FlashDiv["requestLayout"]>["requestState"];
type TableCellPrepaintState = ReturnType<FlashDiv["prepaint"]>;

/**
 * Root table element. Owns the grid and aligns all cells.
 */
export class FlashTable extends FlashContainerElement<TableRequestState, TablePrepaintState> {
  private styles: Partial<Styles> = { display: "grid" };
  private columnTemplateValue: GridTemplate | null = null;
  private cellsForHitTest: FlashTableCell[] = [];

  /**
   * Set explicit column template (track sizes).
   */
  columnTemplate(tracks: TrackSize[]): this {
    this.columnTemplateValue = tracks;
    return this;
  }

  /**
   * Set a fixed number of equally sized columns.
   */
  columns(count: number): this {
    const safeCount = count < 1 ? 1 : count;
    this.columnTemplateValue = safeCount;
    return this;
  }

  /**
   * Set uniform gap between rows and columns.
   */
  gap(px: number): this {
    this.styles.gap = px;
    return this;
  }

  /**
   * Set column gap.
   */
  columnGap(px: number): this {
    this.styles.columnGap = px;
    return this;
  }

  /**
   * Set row gap.
   */
  rowGap(px: number): this {
    this.styles.rowGap = px;
    return this;
  }

  /**
   * Merge additional styles for the table container (background, border, sizing, etc).
   */
  style(styles: Partial<Styles>): this {
    this.styles = { ...this.styles, ...styles };
    return this;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<TableRequestState> {
    const flattened = this.flattenStructure(cx);

    const templateColumns =
      this.columnTemplateValue ?? (flattened.columnCount < 1 ? 1 : flattened.columnCount);

    const layoutId = cx.requestLayout(
      {
        ...this.styles,
        display: "grid",
        gridTemplateColumns: templateColumns,
      },
      flattened.cellLayoutIds
    );

    this.cellsForHitTest = flattened.cells;

    return {
      layoutId,
      requestState: {
        layoutId,
        cellLayoutIds: flattened.cellLayoutIds,
        cellElementIds: flattened.cellElementIds,
        cellRequestStates: flattened.cellRequestStates,
        cells: flattened.cells,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: TableRequestState
  ): TablePrepaintState {
    const { layoutId, cellLayoutIds, cellElementIds, cellRequestStates, cells } = requestState;

    const originalBounds = cx.getBounds(layoutId);
    const deltaX = bounds.x - originalBounds.x;
    const deltaY = bounds.y - originalBounds.y;

    const layoutChildBounds = cx.getChildLayouts(bounds, cellLayoutIds);
    const adjustedChildBounds: Bounds[] = [];
    const childPrepaintStates: TableCellPrepaintState[] = [];

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const cellId = cellElementIds[i];
      const cellBound = layoutChildBounds[i];
      const childRequestState = cellRequestStates[i];

      if (!cell || !cellId || !cellBound) {
        throw new Error("Table cell layout state is missing.");
      }
      if (childRequestState === undefined) {
        throw new Error("Table cell request state is missing.");
      }

      const adjustedBound: Bounds = {
        x: cellBound.x + deltaX,
        y: cellBound.y + deltaY,
        width: cellBound.width,
        height: cellBound.height,
      };

      adjustedChildBounds.push(adjustedBound);

      const childCx = cx.withElementId(cellId);
      const prepaintState = cell.prepaint(childCx, adjustedBound, childRequestState);
      childPrepaintStates.push(prepaintState);
    }

    this.cellsForHitTest = cells;

    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal);

    return {
      childElementIds: cellElementIds,
      childPrepaintStates,
      childBounds: adjustedChildBounds,
      hitbox,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: TablePrepaintState): void {
    if (this.styles.shadow && this.styles.shadow !== "none") {
      cx.paintShadow(bounds, this.styles);
    }

    if (this.styles.backgroundColor) {
      cx.paintRect(bounds, this.styles);
    }

    if (this.styles.borderWidth && this.styles.borderColor) {
      cx.paintBorder(bounds, this.styles);
    }

    const shouldClip = overflowClipsContent(this.styles.overflow);
    const paintChildren = () => {
      for (let i = 0; i < this.cellsForHitTest.length; i++) {
        const cell = this.cellsForHitTest[i];
        const childId = prepaintState.childElementIds[i];
        const childBound = prepaintState.childBounds[i];
        const childPrepaintState = prepaintState.childPrepaintStates[i];

        if (!cell || !childId || !childBound) {
          continue;
        }
        if (childPrepaintState === undefined) {
          continue;
        }

        const childCx = cx.withElementId(childId);
        cell.paint(childCx, childBound, childPrepaintState);
      }
    };

    if (shouldClip) {
      cx.withContentMask(
        {
          bounds,
          cornerRadius: this.styles.borderRadius ?? 0,
        },
        paintChildren
      );
    } else {
      paintChildren();
    }
  }

  hitTest(bounds: Bounds, childBounds: Bounds[]): HitTestNode {
    const childNodes: HitTestNode[] = [];

    for (let i = this.cellsForHitTest.length - 1; i >= 0; i--) {
      const cell = this.cellsForHitTest[i];
      const cellBound = childBounds[i];
      if (cell && cellBound) {
        const childNode = cell.hitTest(cellBound, []);
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

  private flattenStructure(cx: RequestLayoutContext): FlattenResult {
    const cellLayoutIds: LayoutId[] = [];
    const cellElementIds: GlobalElementId[] = [];
    const cellRequestStates: TableCellRequestState[] = [];
    const cells: FlashTableCell[] = [];

    const sections = this.collectSections();

    let rowIndex = 1;
    let maxColumns = 0;
    const activeRowSpans: Map<number, number> = new Map();

    for (const section of sections) {
      const rows = this.collectRows(section);
      for (const row of rows) {
        const rowCells = this.collectCells(row);
        let colStart = 1;
        for (const cell of rowCells) {
          const colSpan = cell.getColSpan();
          const rowSpan = cell.getRowSpan();
          const placementStart = this.findNextAvailableColumn(colStart, colSpan, activeRowSpans);
          const colEnd = placementStart + colSpan;
          const rowEnd = rowIndex + rowSpan;

          cell.setGridPlacement(rowIndex, placementStart, colEnd, rowEnd);

          const childId = cx.allocateChildId();
          const childCx: RequestLayoutContext = {
            ...cx,
            elementId: childId,
          };
          const result = cell.requestLayout(childCx);

          cellLayoutIds.push(result.layoutId);
          cellElementIds.push(childId);
          cellRequestStates.push(result.requestState);
          cells.push(cell);

          if (rowSpan > 1) {
            for (let col = placementStart; col < colEnd; col++) {
              const remaining = activeRowSpans.get(col);
              const updated = (remaining ?? 0) + (rowSpan - 1);
              activeRowSpans.set(col, updated);
            }
          }

          colStart = colEnd;

          const lastColumn = colEnd - 1;
          if (lastColumn > maxColumns) {
            maxColumns = lastColumn;
          }
        }
        const spanningColumns = this.maxSpanningColumn(activeRowSpans);
        if (spanningColumns > maxColumns) {
          maxColumns = spanningColumns;
        }
        this.advanceRowSpanMap(activeRowSpans);
        rowIndex += 1;
      }
    }

    const columnCount = maxColumns < 1 ? 1 : maxColumns;

    return {
      cellLayoutIds,
      cellElementIds,
      cellRequestStates,
      cells,
      columnCount,
    };
  }

  private collectSections(): FlashTableSection[] {
    const sections: FlashTableSection[] = [];
    for (const child of this.children) {
      if (child instanceof FlashTableSection) {
        sections.push(child);
      } else if (child instanceof FlashTableRow) {
        const body = new FlashTableSection("body");
        body.child(child);
        sections.push(body);
      }
    }
    return sections;
  }

  private collectRows(section: FlashTableSection): FlashTableRow[] {
    const rows: FlashTableRow[] = [];
    const candidates = section.getChildren();
    for (const candidate of candidates) {
      if (candidate instanceof FlashTableRow) {
        rows.push(candidate);
      }
    }
    return rows;
  }

  private collectCells(row: FlashTableRow): FlashTableCell[] {
    const cells: FlashTableCell[] = [];
    const candidates = row.getChildren();
    for (const candidate of candidates) {
      if (candidate instanceof FlashTableCell) {
        cells.push(candidate);
      }
    }
    return cells;
  }

  private findNextAvailableColumn(
    start: number,
    span: number,
    activeRowSpans: Map<number, number>
  ): number {
    let candidate = start;
    while (this.isBlocked(candidate, span, activeRowSpans)) {
      candidate += 1;
    }
    return candidate;
  }

  private isBlocked(start: number, span: number, activeRowSpans: Map<number, number>): boolean {
    for (let col = start; col < start + span; col++) {
      const remaining = activeRowSpans.get(col);
      if (remaining !== undefined && remaining > 0) {
        return true;
      }
    }
    return false;
  }

  private maxSpanningColumn(activeRowSpans: Map<number, number>): number {
    let maxColumn = 0;
    for (const [col, remaining] of activeRowSpans.entries()) {
      if (remaining > 0 && col > maxColumn) {
        maxColumn = col;
      }
    }
    return maxColumn;
  }

  private advanceRowSpanMap(activeRowSpans: Map<number, number>): void {
    for (const [col, remaining] of Array.from(activeRowSpans.entries())) {
      const nextRemaining = remaining - 1;
      if (nextRemaining <= 0) {
        activeRowSpans.delete(col);
      } else {
        activeRowSpans.set(col, nextRemaining);
      }
    }
  }
}

/**
 * Table section (thead, tbody, tfoot). Structural only.
 */
export class FlashTableSection extends FlashContainerElement<null, null> {
  constructor(private readonly kind: TableSectionKind) {
    super();
  }

  getKind(): TableSectionKind {
    return this.kind;
  }

  requestLayout(): RequestLayoutResult<null> {
    throw new Error("FlashTableSection must be used inside table().");
  }

  prepaint(): null {
    throw new Error("FlashTableSection must be used inside table().");
  }

  paint(): void {
    throw new Error("FlashTableSection must be used inside table().");
  }

  hitTest(): HitTestNode | null {
    return null;
  }
}

/**
 * Table row. Structural only.
 */
export class FlashTableRow extends FlashContainerElement<null, null> {
  requestLayout(): RequestLayoutResult<null> {
    throw new Error("FlashTableRow must be used inside table().");
  }

  prepaint(): null {
    throw new Error("FlashTableRow must be used inside table().");
  }

  paint(): void {
    throw new Error("FlashTableRow must be used inside table().");
  }

  hitTest(): HitTestNode | null {
    return null;
  }
}

/**
 * Table cell. Renders via FlashDiv and stores span metadata for table layout.
 */
export class FlashTableCell extends FlashDiv {
  private colSpanValue = 1;
  private rowSpanValue = 1;

  constructor(private readonly isHeader: boolean) {
    super();
    this.px(12).py(8);
    this.textLeft();
    if (this.isHeader) {
      this.fontBold();
    }
  }

  override colSpan(span: number): this {
    if (span > 1) {
      this.colSpanValue = span;
    } else {
      this.colSpanValue = 1;
    }
    super.colSpan(this.colSpanValue);
    return this;
  }

  override rowSpan(span: number): this {
    if (span > 1) {
      this.rowSpanValue = span;
    } else {
      this.rowSpanValue = 1;
    }
    super.rowSpan(this.rowSpanValue);
    return this;
  }

  getColSpan(): number {
    return this.colSpanValue;
  }

  getRowSpan(): number {
    return this.rowSpanValue;
  }

  setGridPlacement(rowStart: number, colStart: number, colEnd: number, rowEnd: number): void {
    this.gridArea(colStart, rowStart, colEnd, rowEnd);
  }
}

// Factory helpers

export function table(): FlashTable {
  return new FlashTable();
}

export function thead(): FlashTableSection {
  return new FlashTableSection("head");
}

export function tbody(): FlashTableSection {
  return new FlashTableSection("body");
}

export function tfoot(): FlashTableSection {
  return new FlashTableSection("foot");
}

export function tr(): FlashTableRow {
  return new FlashTableRow();
}

export function th(): FlashTableCell {
  return new FlashTableCell(true);
}

export function td(): FlashTableCell {
  return new FlashTableCell(false);
}
