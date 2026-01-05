/**
 * GladeDiv - the primary container element. Provides an HTML-like,
 * Tailwind-like chainable API for building UI. Implements three-phase
 * lifecycle: requestLayout -> prepaint -> paint
 */

import { type Color, toColorObject } from "@glade/utils";

import type { Bounds } from "./bounds.ts";
import type {
  ClickHandler,
  EventHandlers,
  HitTestNode,
  KeyHandler,
  MouseHandler,
  ScrollHandler,
  TextInputHandler,
} from "./dispatch.ts";
import {
  type AnyGladeElement,
  GladeContainerElement,
  type GlobalElementId,
  type PaintContext,
  type PrepaintContext,
  type RequestLayoutContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { FocusHandle, ScrollHandle } from "./entity.ts";
import type { Hitbox } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";
import type { LayoutId } from "./layout.ts";
import type { ResolvedScrollbarConfig, ScrollbarConfig, ScrollbarDragState } from "./scrollbar.ts";
import {
  calculateHorizontalTrackBounds,
  calculateThumbBounds,
  calculateThumbMetrics,
  calculateVerticalTrackBounds,
  getThumbColor,
  isPointInThumb,
  resolveScrollbarConfig,
  trackClickToScrollOffset,
} from "./scrollbar.ts";
import type { CursorStyle, GridAutoFlow, Styles, TrackSize } from "./styles.ts";
import { overflowClipsContent } from "./styles.ts";
import { StyleBuilder } from "./styles.ts";
import type { TabStopConfig } from "./tab.ts";
import type { TooltipBuilder, TooltipConfig } from "./tooltip.ts";
import { DEFAULT_TOOLTIP_CONFIG, TooltipConfigBuilder } from "./tooltip.ts";
import {
  rotateTransform,
  scaleTransform,
  type TransformationMatrix,
  translateTransform,
} from "./transform.ts";

/**
 * State passed from requestLayout to prepaint for GladeDiv. Contains child
 * layout IDs and element IDs for recursive processing.
 */
interface DivRequestLayoutState {
  layoutId: LayoutId;
  childLayoutIds: LayoutId[];
  childElementIds: GlobalElementId[];
  childRequestStates: unknown[];
}

/**
 * State passed from prepaint to paint for GladeDiv. Contains child element
 * IDs and prepaint states for recursive processing.
 */
interface DivPrepaintState {
  childLayoutIds: LayoutId[];
  childElementIds: GlobalElementId[];
  childPrepaintStates: unknown[];
  childBounds: Bounds[];
  hitbox: Hitbox | null;
  hitTestNode: HitTestNode;
  // Scrollbar state
  verticalScrollbar: {
    trackBounds: Bounds;
    thumbBounds: Bounds;
    hitbox: Hitbox;
    thumbSize: number;
    maxScroll: number;
  } | null;
  horizontalScrollbar: {
    trackBounds: Bounds;
    thumbBounds: Bounds;
    hitbox: Hitbox;
    thumbSize: number;
    maxScroll: number;
  } | null;
}

/**
 * The primary container element.
 */
export class GladeDiv extends GladeContainerElement<DivRequestLayoutState, DivPrepaintState> {
  private styles: Partial<Styles> = {
    display: "flex",
    flexDirection: "column",
  };
  private hoverStyles: Partial<Styles> | null = null;
  private activeStyles: Partial<Styles> | null = null;
  private focusedStyles: Partial<Styles> | null = null;
  private groupHoverStylesMap: Map<string, Partial<Styles>> = new Map();
  private groupActiveStylesMap: Map<string, Partial<Styles>> = new Map();
  private handlers: EventHandlers = {};
  private focusHandleRef: FocusHandle | null = null;
  private scrollHandleRef: ScrollHandle | null = null;
  private keyContextValue: string | null = null;
  private hitboxBehaviorValue: HitboxBehavior = HitboxBehavior.Normal;
  private groupNameValue: string | null = null;
  private tooltipBuilderFn: TooltipBuilder | null = null;
  private tooltipConfigValue: TooltipConfig = DEFAULT_TOOLTIP_CONFIG;
  private tabStopConfigValue: TabStopConfig | null = null;
  private scrollbarConfigValue: Partial<ScrollbarConfig> | null = null;

  // Display
  flex(): this {
    this.styles.display = "flex";
    return this;
  }
  block(): this {
    this.styles.display = "block";
    return this;
  }
  hidden(): this {
    this.styles.display = "none";
    return this;
  }

  // Flex direction
  flexRow(): this {
    this.styles.flexDirection = "row";
    return this;
  }
  flexCol(): this {
    this.styles.flexDirection = "column";
    return this;
  }
  flexRowReverse(): this {
    this.styles.flexDirection = "row-reverse";
    return this;
  }
  flexColReverse(): this {
    this.styles.flexDirection = "column-reverse";
    return this;
  }

  // Flex wrap
  flexWrap(): this {
    this.styles.flexWrap = "wrap";
    return this;
  }
  flexNoWrap(): this {
    this.styles.flexWrap = "nowrap";
    return this;
  }

  // Flex grow/shrink
  flexGrow(): this {
    this.styles.flexGrow = 1;
    return this;
  }
  flexGrow0(): this {
    this.styles.flexGrow = 0;
    return this;
  }
  flexShrink(): this {
    this.styles.flexShrink = 1;
    return this;
  }
  flexShrink0(): this {
    this.styles.flexShrink = 0;
    return this;
  }
  flex1(): this {
    this.styles.flex = "1 1 0%";
    return this;
  }
  flexAuto(): this {
    this.styles.flex = "1 1 auto";
    return this;
  }
  flexNone(): this {
    this.styles.flex = "none";
    return this;
  }

  // Alignment
  itemsStart(): this {
    this.styles.alignItems = "flex-start";
    return this;
  }
  itemsCenter(): this {
    this.styles.alignItems = "center";
    return this;
  }
  itemsEnd(): this {
    this.styles.alignItems = "flex-end";
    return this;
  }
  itemsStretch(): this {
    this.styles.alignItems = "stretch";
    return this;
  }
  itemsBaseline(): this {
    this.styles.alignItems = "baseline";
    return this;
  }

  justifyStart(): this {
    this.styles.justifyContent = "flex-start";
    return this;
  }
  justifyCenter(): this {
    this.styles.justifyContent = "center";
    return this;
  }
  justifyEnd(): this {
    this.styles.justifyContent = "flex-end";
    return this;
  }
  justifyBetween(): this {
    this.styles.justifyContent = "space-between";
    return this;
  }
  justifyAround(): this {
    this.styles.justifyContent = "space-around";
    return this;
  }
  justifyEvenly(): this {
    this.styles.justifyContent = "space-evenly";
    return this;
  }

  selfStart(): this {
    this.styles.alignSelf = "flex-start";
    return this;
  }
  selfCenter(): this {
    this.styles.alignSelf = "center";
    return this;
  }
  selfEnd(): this {
    this.styles.alignSelf = "flex-end";
    return this;
  }
  selfStretch(): this {
    this.styles.alignSelf = "stretch";
    return this;
  }

  // Gap
  gap(v: number): this {
    this.styles.gap = v;
    return this;
  }
  gapX(v: number): this {
    this.styles.columnGap = v;
    return this;
  }
  gapY(v: number): this {
    this.styles.rowGap = v;
    return this;
  }

  /**
   * Enable grid display mode. Equivalent to Tailwind's `grid` class.
   */
  grid(): this {
    this.styles.display = "grid";
    return this;
  }

  /**
   * Set number of grid columns with equal 1fr sizing. Equivalent to
   * Tailwind's `grid-cols-N` classes.
   */
  gridCols(count: number): this {
    this.styles.gridTemplateColumns = count;
    return this;
  }

  /**
   * Set explicit grid column template with custom track sizes. For advanced
   * layouts needing specific column widths.
   * @param tracks Array of track sizes
   * @example gridColsTemplate([200, "1fr", "2fr"]) // 200px, 1fr, 2fr
   * @example gridColsTemplate(["auto", { min: 100, max: "1fr" }])
   */
  gridColsTemplate(tracks: TrackSize[]): this {
    this.styles.gridTemplateColumns = tracks;
    return this;
  }

  /**
   * Set number of grid rows with equal 1fr sizing. Equivalent to
   * Tailwind's `grid-rows-N` classes.
   */
  gridRows(count: number): this {
    this.styles.gridTemplateRows = count;
    return this;
  }

  /**
   * Set explicit grid row template with custom track sizes.
   */
  gridRowsTemplate(tracks: TrackSize[]): this {
    this.styles.gridTemplateRows = tracks;
    return this;
  }

  /**
   * Set auto-generated column sizing for implicit columns. Equivalent to
   * Tailwind's `auto-cols-*` classes.
   */
  gridAutoCols(size: TrackSize): this {
    this.styles.gridAutoColumns = size;
    return this;
  }

  /**
   * Set auto-generated row sizing for implicit rows. Like Tailwind's
   * `auto-rows-*` classes.
   */
  gridAutoRows(size: TrackSize): this {
    this.styles.gridAutoRows = size;
    return this;
  }

  /**
   * Set grid auto-flow direction. Maps to Tailwind's `grid-flow-*` classes.
   */
  gridFlow(flow: GridAutoFlow): this {
    this.styles.gridAutoFlow = flow;
    return this;
  }

  /** Shorthand for gridFlow("row"). */
  gridFlowRow(): this {
    return this.gridFlow("row");
  }

  /** Shorthand for gridFlow("column"). */
  gridFlowCol(): this {
    return this.gridFlow("column");
  }

  /** Shorthand for gridFlow("row-dense"). */
  gridFlowRowDense(): this {
    return this.gridFlow("row-dense");
  }

  /** Shorthand for gridFlow("column-dense"). */
  gridFlowColDense(): this {
    return this.gridFlow("column-dense");
  }

  /**
   * Set column start position.
   * Equivalent to Tailwind's `col-start-N` classes.
   */
  colStart(line: number): this {
    this.styles.gridColumnStart = line;
    return this;
  }

  /**
   * Set column end position.
   * Equivalent to Tailwind's `col-end-N` classes.
   */
  colEnd(line: number): this {
    this.styles.gridColumnEnd = line;
    return this;
  }

  /**
   * Span across N columns from current position.
   * Equivalent to Tailwind's `col-span-N` classes.
   */
  colSpan(count: number): this {
    this.styles.gridColumnEnd = { span: count };
    return this;
  }

  /**
   * Span all columns (col-span-full).
   * Sets column from line 1 to line -1 (last line).
   */
  colSpanFull(): this {
    this.styles.gridColumnStart = 1;
    this.styles.gridColumnEnd = -1;
    return this;
  }

  /**
   * Set row start position.
   * Equivalent to Tailwind's `row-start-N` classes.
   */
  rowStart(line: number): this {
    this.styles.gridRowStart = line;
    return this;
  }

  /**
   * Set row end position.
   * Equivalent to Tailwind's `row-end-N` classes.
   */
  rowEnd(line: number): this {
    this.styles.gridRowEnd = line;
    return this;
  }

  /**
   * Span across N rows from current position.
   * Equivalent to Tailwind's `row-span-N` classes.
   */
  rowSpan(count: number): this {
    this.styles.gridRowEnd = { span: count };
    return this;
  }

  /**
   * Span all rows (row-span-full). Sets row from line 1 to line -1 (last line).
   */
  rowSpanFull(): this {
    this.styles.gridRowStart = 1;
    this.styles.gridRowEnd = -1;
    return this;
  }

  /**
   * Place item at specific grid cell (1-indexed). Method for combining
   * colStart and rowStart.
   */
  gridCell(col: number, row: number): this {
    this.styles.gridColumnStart = col;
    this.styles.gridRowStart = row;
    return this;
  }

  /**
   * Place item in a grid area defined by start/end positions. Convenience
   * method for setting all four grid placement properties.
   */
  gridArea(colStart: number, rowStart: number, colEnd: number, rowEnd: number): this {
    this.styles.gridColumnStart = colStart;
    this.styles.gridColumnEnd = colEnd;
    this.styles.gridRowStart = rowStart;
    this.styles.gridRowEnd = rowEnd;
    return this;
  }

  // Padding
  p(v: number): this {
    this.styles.paddingTop = v;
    this.styles.paddingRight = v;
    this.styles.paddingBottom = v;
    this.styles.paddingLeft = v;
    return this;
  }
  px(v: number): this {
    this.styles.paddingLeft = v;
    this.styles.paddingRight = v;
    return this;
  }
  py(v: number): this {
    this.styles.paddingTop = v;
    this.styles.paddingBottom = v;
    return this;
  }
  pt(v: number): this {
    this.styles.paddingTop = v;
    return this;
  }
  pr(v: number): this {
    this.styles.paddingRight = v;
    return this;
  }
  pb(v: number): this {
    this.styles.paddingBottom = v;
    return this;
  }
  pl(v: number): this {
    this.styles.paddingLeft = v;
    return this;
  }

  // Margin
  m(v: number): this {
    this.styles.marginTop = v;
    this.styles.marginRight = v;
    this.styles.marginBottom = v;
    this.styles.marginLeft = v;
    return this;
  }
  mx(v: number): this {
    this.styles.marginLeft = v;
    this.styles.marginRight = v;
    return this;
  }
  my(v: number): this {
    this.styles.marginTop = v;
    this.styles.marginBottom = v;
    return this;
  }
  mt(v: number): this {
    this.styles.marginTop = v;
    return this;
  }
  mr(v: number): this {
    this.styles.marginRight = v;
    return this;
  }
  mb(v: number): this {
    this.styles.marginBottom = v;
    return this;
  }
  ml(v: number): this {
    this.styles.marginLeft = v;
    return this;
  }
  mxAuto(): this {
    this.styles.marginLeft = "auto";
    this.styles.marginRight = "auto";
    return this;
  }

  // Sizing
  w(v: number | string): this {
    this.styles.width = v;
    return this;
  }
  wFull(): this {
    this.styles.width = "100%";
    return this;
  }
  wScreen(): this {
    this.styles.width = "100vw";
    return this;
  }
  wMin(v: number): this {
    this.styles.minWidth = v;
    return this;
  }
  wMax(v: number): this {
    this.styles.maxWidth = v;
    return this;
  }

  h(v: number | string): this {
    this.styles.height = v;
    return this;
  }
  hFull(): this {
    this.styles.height = "100%";
    return this;
  }
  hScreen(): this {
    this.styles.height = "100vh";
    return this;
  }
  hMin(v: number): this {
    this.styles.minHeight = v;
    return this;
  }
  hMax(v: number): this {
    this.styles.maxHeight = v;
    return this;
  }

  size(v: number | string): this {
    this.styles.width = v;
    this.styles.height = v;
    return this;
  }

  // Position
  relative(): this {
    this.styles.position = "relative";
    return this;
  }
  absolute(): this {
    this.styles.position = "absolute";
    return this;
  }

  inset(v: number): this {
    this.styles.top = v;
    this.styles.right = v;
    this.styles.bottom = v;
    this.styles.left = v;
    return this;
  }
  top(v: number): this {
    this.styles.top = v;
    return this;
  }
  right(v: number): this {
    this.styles.right = v;
    return this;
  }
  bottom(v: number): this {
    this.styles.bottom = v;
    return this;
  }
  left(v: number): this {
    this.styles.left = v;
    return this;
  }

  // Overflow
  overflowHidden(): this {
    this.styles.overflow = "hidden";
    return this;
  }
  overflowScroll(): this {
    this.styles.overflow = "scroll";
    return this;
  }
  overflowAuto(): this {
    this.styles.overflow = "auto";
    return this;
  }
  overflowVisible(): this {
    this.styles.overflow = "visible";
    return this;
  }

  // Background
  bg(color: Color): this {
    this.styles.backgroundColor = toColorObject(color);
    return this;
  }

  // Border radius
  rounded(v: number): this {
    this.styles.borderRadius = v;
    return this;
  }
  roundedSm(): this {
    return this.rounded(2);
  }
  roundedMd(): this {
    return this.rounded(6);
  }
  roundedLg(): this {
    return this.rounded(8);
  }
  roundedXl(): this {
    return this.rounded(12);
  }
  roundedFull(): this {
    return this.rounded(9999);
  }

  // Border
  border(width = 1): this {
    this.styles.borderWidth = width;
    return this;
  }
  borderColor(color: Color): this {
    this.styles.borderColor = toColorObject(color);
    return this;
  }
  borderSolid(): this {
    this.styles.borderStyle = "solid";
    return this;
  }
  borderDashed(): this {
    this.styles.borderStyle = "dashed";
    return this;
  }
  borderDashLength(length: number): this {
    this.styles.borderDashLength = length;
    return this;
  }
  borderGapLength(length: number): this {
    this.styles.borderGapLength = length;
    return this;
  }

  // Shadow
  shadow(): this {
    this.styles.shadow = "sm";
    return this;
  }
  shadowMd(): this {
    this.styles.shadow = "md";
    return this;
  }
  shadowLg(): this {
    this.styles.shadow = "lg";
    return this;
  }
  shadowXl(): this {
    this.styles.shadow = "xl";
    return this;
  }
  shadowNone(): this {
    this.styles.shadow = "none";
    return this;
  }

  // Opacity
  opacity(v: number): this {
    this.styles.opacity = v;
    return this;
  }

  // Z-Index (creates a stacking context)
  zIndex(v: number): this {
    this.styles.zIndex = v;
    return this;
  }

  textColor(color: Color): this {
    this.styles.color = toColorObject(color);
    return this;
  }
  textSize(v: number): this {
    this.styles.fontSize = v;
    return this;
  }
  fontWeight(v: number | string): this {
    this.styles.fontWeight = v;
    return this;
  }
  fontBold(): this {
    return this.fontWeight(700);
  }
  fontMedium(): this {
    return this.fontWeight(500);
  }
  fontNormal(): this {
    return this.fontWeight(400);
  }
  fontFamily(v: string): this {
    this.styles.fontFamily = v;
    return this;
  }
  lineHeight(v: number): this {
    this.styles.lineHeight = v;
    return this;
  }
  textCenter(): this {
    this.styles.textAlign = "center";
    return this;
  }
  textLeft(): this {
    this.styles.textAlign = "left";
    return this;
  }
  textRight(): this {
    this.styles.textAlign = "right";
    return this;
  }

  cursor(v: CursorStyle): this {
    this.styles.cursor = v;
    return this;
  }
  cursorPointer(): this {
    return this.cursor("pointer");
  }

  transformMatrix(matrix: TransformationMatrix): this {
    this.styles.transform = matrix;
    return this;
  }

  rotate(angleRadians: number): this {
    this.styles.transform = rotateTransform(angleRadians);
    return this;
  }

  rotateDeg(angleDegrees: number): this {
    return this.rotate((angleDegrees * Math.PI) / 180);
  }

  scale(s: number): this;
  scale(sx: number, sy: number): this;
  scale(sx: number, sy?: number): this {
    this.styles.transform = scaleTransform(sx, sy);
    return this;
  }

  translate(x: number, y: number): this {
    this.styles.transform = translateTransform(x, y);
    return this;
  }

  hover(f: (s: StyleBuilder) => StyleBuilder): this {
    this.hoverStyles = f(new StyleBuilder()).build();
    return this;
  }

  active(f: (s: StyleBuilder) => StyleBuilder): this {
    this.activeStyles = f(new StyleBuilder()).build();
    return this;
  }

  focused(f: (s: StyleBuilder) => StyleBuilder): this {
    this.focusedStyles = f(new StyleBuilder()).build();
    return this;
  }

  onMouseDown(handler: MouseHandler): this {
    this.handlers.mouseDown = handler;
    return this;
  }

  onMouseUp(handler: MouseHandler): this {
    this.handlers.mouseUp = handler;
    return this;
  }

  onMouseMove(handler: MouseHandler): this {
    this.handlers.mouseMove = handler;
    return this;
  }

  onMouseEnter(handler: MouseHandler): this {
    this.handlers.mouseEnter = handler;
    return this;
  }

  onMouseLeave(handler: MouseHandler): this {
    this.handlers.mouseLeave = handler;
    return this;
  }

  onClick(handler: ClickHandler): this {
    this.handlers.click = handler;
    return this;
  }

  onScroll(handler: ScrollHandler): this {
    this.handlers.scroll = handler;
    return this;
  }

  onKeyDown(handler: KeyHandler): this {
    this.handlers.keyDown = handler;
    return this;
  }

  onKeyUp(handler: KeyHandler): this {
    this.handlers.keyUp = handler;
    return this;
  }

  onTextInput(handler: TextInputHandler): this {
    this.handlers.textInput = handler;
    return this;
  }

  /**
   * Add a tooltip to this element.
   * @param builder Function that creates the tooltip content element.
   * @param config Optional tooltip configuration or builder function.
   */
  tooltip(
    builder: TooltipBuilder,
    config?: TooltipConfig | ((cfg: TooltipConfigBuilder) => TooltipConfigBuilder)
  ): this {
    this.tooltipBuilderFn = builder;
    if (config) {
      if (typeof config === "function") {
        this.tooltipConfigValue = config(new TooltipConfigBuilder()).build();
      } else {
        this.tooltipConfigValue = config;
      }
    }
    return this;
  }

  trackFocus(handle: FocusHandle): this {
    this.focusHandleRef = handle;
    return this;
  }

  keyContext(context: string): this {
    this.keyContextValue = context;
    return this;
  }

  /**
   * Mark this element as focusable with tab navigation.
   */
  tabStop(config?: TabStopConfig): this {
    this.tabStopConfigValue = config ?? {};
    return this;
  }

  /**
   * Set explicit tab order index.
   */
  tabIndex(index: number): this {
    this.tabStopConfigValue = { ...this.tabStopConfigValue, index };
    return this;
  }

  /**
   * Assign to a focus group (tab navigates within group first).
   */
  focusGroup(group: string): this {
    this.tabStopConfigValue = { ...this.tabStopConfigValue, group };
    return this;
  }

  /**
   * Focus on mouse down instead of click.
   */
  focusOnPress(): this {
    this.tabStopConfigValue = { ...this.tabStopConfigValue, focusOnPress: true };
    return this;
  }

  // ============ Scroll ============

  trackScroll(handle: ScrollHandle): this {
    this.scrollHandleRef = handle;
    return this;
  }

  /**
   * Configure scrollbar appearance.
   */
  scrollbar(config: Partial<ScrollbarConfig>): this {
    this.scrollbarConfigValue = { ...this.scrollbarConfigValue, ...config };
    return this;
  }

  /**
   * Set scrollbar width.
   */
  scrollbarWidth(width: number): this {
    this.scrollbarConfigValue = { ...this.scrollbarConfigValue, width };
    return this;
  }

  /**
   * Always show scrollbars when content is scrollable.
   */
  scrollbarAlways(): this {
    this.scrollbarConfigValue = { ...this.scrollbarConfigValue, visibility: "always" };
    return this;
  }

  /**
   * Show scrollbars only on hover.
   */
  scrollbarOnHover(): this {
    this.scrollbarConfigValue = { ...this.scrollbarConfigValue, visibility: "hover" };
    return this;
  }

  /**
   * Hide scrollbars completely.
   */
  hideScrollbar(): this {
    this.scrollbarConfigValue = { ...this.scrollbarConfigValue, visibility: "never" };
    return this;
  }

  /**
   * Set this element to block all mouse events for elements behind it. Use for
   * modal overlays that should prevent interaction with underlying content.
   */
  occludeMouse(): this {
    this.hitboxBehaviorValue = HitboxBehavior.BlockMouse;
    return this;
  }

  /**
  /**
   * Set this element to block hover but allow scroll events. Use for
   * overlays that should allow scrolling underlying content.
   */
  blockMouseExceptScroll(): this {
    this.hitboxBehaviorValue = HitboxBehavior.BlockMouseExceptScroll;
    return this;
  }

  /**
   * Assign this element to a hitbox group. Other elements can use groupHover()
   * to respond to hover on this group.
   */
  group(name: string): this {
    this.groupNameValue = name;
    return this;
  }

  /**
   * Apply styles when any element in the named group is hovered. Use for
   * coordinated hover effects across multiple elements.
   */
  groupHover(groupName: string, f: (s: StyleBuilder) => StyleBuilder): this {
    this.groupHoverStylesMap.set(groupName, f(new StyleBuilder()).build());
    return this;
  }

  /**
   * Apply styles when any element in the named group is active (mouse down).
   * Use for coordinated active effects across multiple elements.
   */
  groupActive(groupName: string, f: (s: StyleBuilder) => StyleBuilder): this {
    this.groupActiveStylesMap.set(groupName, f(new StyleBuilder()).build());
    return this;
  }

  /**
   * Phase 1: Request layout for this element and all children. Creates Taffy
   * layout nodes bottom-up.
   */
  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DivRequestLayoutState> {
    const childLayoutIds: LayoutId[] = [];
    const childElementIds: GlobalElementId[] = [];
    const childRequestStates: unknown[] = [];

    for (const child of this.getChildren()) {
      const childId = cx.allocateChildId();
      const childCx: RequestLayoutContext = {
        ...cx,
        elementId: childId,
      };
      const result = child.requestLayout(childCx);
      childLayoutIds.push(result.layoutId);
      childElementIds.push(childId);
      childRequestStates.push(result.requestState);
    }

    this.childLayoutIds = childLayoutIds;

    const layoutId = cx.requestLayout(this.styles, childLayoutIds);

    return {
      layoutId,
      requestState: {
        layoutId,
        childLayoutIds,
        childElementIds,
        childRequestStates,
      },
    };
  }

  /**
   * Phase 2: Prepaint - runs after layout computation. Creates hitbox and
   * processes children.
   */
  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DivRequestLayoutState
  ): DivPrepaintState {
    const { layoutId, childLayoutIds, childElementIds, childRequestStates } = requestState;

    // Create hitbox for this element (pass cursor for platform cursor updates)
    const hitbox = cx.insertHitbox(bounds, this.hitboxBehaviorValue, this.styles.cursor);

    // Register tooltip if this element has one
    if (this.tooltipBuilderFn) {
      cx.registerTooltip(hitbox.id, bounds, this.tooltipBuilderFn, this.tooltipConfigValue);
    }

    // Register with group if this element is in a group
    if (this.groupNameValue) {
      cx.addGroupHitbox(this.groupNameValue, hitbox.id);
    }

    // Register tab stop if this element is focusable
    if (this.tabStopConfigValue && this.focusHandleRef) {
      cx.registerTabStop?.(this.focusHandleRef.id, bounds, this.tabStopConfigValue);
    }

    // Get our original layout bounds and compute the delta from the passed
    // bounds. delta accounts for scroll offsets from ancestor scroll containers.
    const originalBounds = cx.getBounds(layoutId);
    const deltaX = bounds.x - originalBounds.x;
    const deltaY = bounds.y - originalBounds.y;

    const layoutChildBounds = cx.getChildLayouts(bounds, childLayoutIds);
    const childPrepaintStates: unknown[] = [];
    const adjustedChildBounds: Bounds[] = [];

    // Get scroll offset if this is a scroll container
    const scrollOffset = this.scrollHandleRef ? cx.getScrollOffset(this.scrollHandleRef) : null;

    for (let i = 0; i < this.getChildren().length; i++) {
      const child = this.getChildren()[i]!;
      const childId = childElementIds[i]!;
      let childBound = layoutChildBounds[i]!;
      const childRequestState = childRequestStates[i];

      // Apply the delta from ancestor scroll to propagate scroll
      // offset to children
      childBound = {
        x: childBound.x + deltaX,
        y: childBound.y + deltaY,
        width: childBound.width,
        height: childBound.height,
      };

      // Apply this element's scroll offset to child bounds
      if (scrollOffset) {
        childBound = {
          x: childBound.x - scrollOffset.x,
          y: childBound.y - scrollOffset.y,
          width: childBound.width,
          height: childBound.height,
        };
      }

      adjustedChildBounds.push(childBound);

      const childCx = cx.withElementId(childId);

      const prepaintState = (child as AnyGladeElement).prepaint(
        childCx,
        childBound,
        childRequestState
      );
      childPrepaintStates.push(prepaintState);
    }

    // If this is a scroll container, compute content size from children
    // (using original layout bounds)
    if (this.scrollHandleRef && layoutChildBounds.length > 0) {
      let contentWidth = 0;
      let contentHeight = 0;

      for (const childBound of layoutChildBounds) {
        const childRight = childBound.x - bounds.x + childBound.width;
        const childBottom = childBound.y - bounds.y + childBound.height;
        contentWidth = Math.max(contentWidth, childRight);
        contentHeight = Math.max(contentHeight, childBottom);
      }

      // Account for padding
      const paddingRight = this.styles.paddingRight ?? 0;
      const paddingBottom = this.styles.paddingBottom ?? 0;
      contentWidth += paddingRight;
      contentHeight += paddingBottom;

      cx.updateScrollContentSize(
        this.scrollHandleRef,
        { width: contentWidth, height: contentHeight },
        { width: bounds.width, height: bounds.height },
        { x: bounds.x, y: bounds.y }
      );
    }

    // Build hit test node with scroll-adjusted child bounds
    const childHitTestNodes: HitTestNode[] = [];
    for (let i = this.getChildren().length - 1; i >= 0; i--) {
      const child = this.getChildren()[i];
      const childPrepaintState = childPrepaintStates[i] as DivPrepaintState | undefined;
      if (child && childPrepaintState?.hitTestNode) {
        childHitTestNodes.unshift(childPrepaintState.hitTestNode);
      }
    }

    // Calculate scrollbar state if this is a scroll container
    // (before building hitTestNode so we can add scrollbar nodes as children)
    let verticalScrollbar: DivPrepaintState["verticalScrollbar"] = null;
    let horizontalScrollbar: DivPrepaintState["horizontalScrollbar"] = null;

    if (this.scrollHandleRef) {
      const scrollState = cx.getWindow().getScrollState(this.scrollHandleRef.id);
      if (scrollState) {
        const config = resolveScrollbarConfig(this.scrollbarConfigValue ?? undefined);

        // Check if scrollbars should be visible
        const showScrollbars = config.visibility !== "never";
        const isVerticalScrollable =
          scrollState.contentSize.height > scrollState.viewportSize.height;
        const isHorizontalScrollable =
          scrollState.contentSize.width > scrollState.viewportSize.width;

        if (showScrollbars && isVerticalScrollable) {
          const trackBounds = calculateVerticalTrackBounds(bounds, config, isHorizontalScrollable);
          const metrics = calculateThumbMetrics(
            scrollState.contentSize.height,
            scrollState.viewportSize.height,
            scrollState.offset.y,
            trackBounds.height,
            config.minThumbSize
          );

          if (metrics.isScrollable) {
            const thumbBounds = calculateThumbBounds(
              trackBounds,
              metrics.thumbPosition,
              metrics.thumbSize,
              "y"
            );
            const scrollbarHitbox = cx.insertHitbox(trackBounds, HitboxBehavior.Normal, "default");
            const maxScroll = scrollState.contentSize.height - scrollState.viewportSize.height;
            verticalScrollbar = {
              trackBounds,
              thumbBounds,
              hitbox: scrollbarHitbox,
              thumbSize: metrics.thumbSize,
              maxScroll,
            };
          }
        }

        if (showScrollbars && isHorizontalScrollable) {
          const trackBounds = calculateHorizontalTrackBounds(bounds, config, isVerticalScrollable);
          const metrics = calculateThumbMetrics(
            scrollState.contentSize.width,
            scrollState.viewportSize.width,
            scrollState.offset.x,
            trackBounds.width,
            config.minThumbSize
          );

          if (metrics.isScrollable) {
            const thumbBounds = calculateThumbBounds(
              trackBounds,
              metrics.thumbPosition,
              metrics.thumbSize,
              "x"
            );
            const scrollbarHitbox = cx.insertHitbox(trackBounds, HitboxBehavior.Normal, "default");
            const maxScroll = scrollState.contentSize.width - scrollState.viewportSize.width;
            horizontalScrollbar = {
              trackBounds,
              thumbBounds,
              hitbox: scrollbarHitbox,
              thumbSize: metrics.thumbSize,
              maxScroll,
            };
          }
        }
      }
    }

    // Build scrollbar hit test nodes with mouseDown handlers
    const scrollbarHitTestNodes: HitTestNode[] = [];
    const scrollHandleRef = this.scrollHandleRef;

    if (verticalScrollbar && scrollHandleRef) {
      const vScrollbar = verticalScrollbar;
      const scrollHandleId = scrollHandleRef.id;

      scrollbarHitTestNodes.push({
        bounds: vScrollbar.trackBounds,
        handlers: {
          mouseDown: (event, window, _cx) => {
            const clickY = event.y - vScrollbar.trackBounds.y;
            const scrollState = window.getScrollState(scrollHandleId);
            if (!scrollState) return;

            // Check if click is on thumb or track
            if (isPointInThumb({ x: event.x, y: event.y }, vScrollbar.thumbBounds)) {
              // Start thumb drag
              const dragState: ScrollbarDragState = {
                axis: "y",
                scrollHandleId,
                startOffset: scrollState.offset.y,
                startMousePos: event.y,
                trackLength: vScrollbar.trackBounds.height,
                thumbSize: vScrollbar.thumbSize,
                maxScroll: vScrollbar.maxScroll,
              };
              window.startScrollbarDrag(dragState);
            } else {
              // Track click - jump to position
              const newOffset = trackClickToScrollOffset(
                clickY,
                vScrollbar.thumbSize,
                vScrollbar.trackBounds.height,
                scrollState.contentSize.height,
                scrollState.viewportSize.height
              );
              window.setScrollOffset(scrollHandleId, {
                x: scrollState.offset.x,
                y: newOffset,
              });
            }
            return { stopPropagation: true };
          },
        },
        focusHandle: null,
        scrollHandle: null,
        keyContext: null,
        children: [],
      });
    }

    if (horizontalScrollbar && scrollHandleRef) {
      const hScrollbar = horizontalScrollbar;
      const scrollHandleId = scrollHandleRef.id;

      scrollbarHitTestNodes.push({
        bounds: hScrollbar.trackBounds,
        handlers: {
          mouseDown: (event, window, _cx) => {
            const clickX = event.x - hScrollbar.trackBounds.x;
            const scrollState = window.getScrollState(scrollHandleId);
            if (!scrollState) return;

            // Check if click is on thumb or track
            if (isPointInThumb({ x: event.x, y: event.y }, hScrollbar.thumbBounds)) {
              // Start thumb drag
              const dragState: ScrollbarDragState = {
                axis: "x",
                scrollHandleId,
                startOffset: scrollState.offset.x,
                startMousePos: event.x,
                trackLength: hScrollbar.trackBounds.width,
                thumbSize: hScrollbar.thumbSize,
                maxScroll: hScrollbar.maxScroll,
              };
              window.startScrollbarDrag(dragState);
            } else {
              // Track click - jump to position
              const newOffset = trackClickToScrollOffset(
                clickX,
                hScrollbar.thumbSize,
                hScrollbar.trackBounds.width,
                scrollState.contentSize.width,
                scrollState.viewportSize.width
              );
              window.setScrollOffset(scrollHandleId, {
                x: newOffset,
                y: scrollState.offset.y,
              });
            }
            return { stopPropagation: true };
          },
        },
        focusHandle: null,
        scrollHandle: null,
        keyContext: null,
        children: [],
      });
    }

    // Build final hit test node with scrollbar children at the end (on top)
    const hitTestNode: HitTestNode = {
      bounds,
      handlers: this.handlers,
      focusHandle: this.focusHandleRef,
      scrollHandle: this.scrollHandleRef,
      keyContext: this.keyContextValue,
      children: [...childHitTestNodes, ...scrollbarHitTestNodes],
    };

    return {
      childLayoutIds,
      childElementIds,
      childPrepaintStates,
      childBounds: adjustedChildBounds,
      hitbox,
      hitTestNode,
      verticalScrollbar,
      horizontalScrollbar,
    };
  }

  /**
   * Phase 3: Paint - emit GPU primitives.
   */
  paint(cx: PaintContext, bounds: Bounds, prepaintState: DivPrepaintState): void {
    const { childElementIds, childPrepaintStates, childBounds, hitbox } = prepaintState;

    // Use hitbox for hover/active detection (with occlusion support)
    const isHovered = hitbox ? cx.isHitboxHovered(hitbox) : false;
    const isActive = isHovered && cx.isActive(bounds);
    const isFocused = this.focusHandleRef ? cx.isFocused(this.focusHandleRef) : false;

    let effectiveStyles = { ...this.styles };

    // Apply group hover styles
    for (const [groupName, groupStyles] of this.groupHoverStylesMap) {
      if (cx.isGroupHovered(groupName)) {
        effectiveStyles = { ...effectiveStyles, ...groupStyles };
      }
    }

    // Apply group active styles
    for (const [groupName, groupStyles] of this.groupActiveStylesMap) {
      if (cx.isGroupActive(groupName)) {
        effectiveStyles = { ...effectiveStyles, ...groupStyles };
      }
    }

    // Apply element hover styles
    if (isHovered && this.hoverStyles) {
      effectiveStyles = { ...effectiveStyles, ...this.hoverStyles };
    }
    if (isActive && this.activeStyles) {
      effectiveStyles = { ...effectiveStyles, ...this.activeStyles };
    }
    if (isFocused && this.focusedStyles) {
      effectiveStyles = { ...effectiveStyles, ...this.focusedStyles };
    }

    // Determine if we need a stacking context
    // Stacking contexts are created for: z-index, transform, or opacity < 1
    const needsStackingContext =
      effectiveStyles.zIndex !== undefined ||
      effectiveStyles.transform !== undefined ||
      (effectiveStyles.opacity !== undefined && effectiveStyles.opacity < 1);

    const paintContent = () => {
      if (effectiveStyles.shadow && effectiveStyles.shadow !== "none") {
        cx.paintShadow(bounds, effectiveStyles);
      }

      if (effectiveStyles.backgroundColor) {
        cx.paintRect(bounds, effectiveStyles);
      }

      if (effectiveStyles.borderWidth && effectiveStyles.borderColor) {
        cx.paintBorder(bounds, effectiveStyles);
      }

      // Use child bounds from prepaint (already adjusted for scroll)
      // Determine if we need to apply clipping
      const shouldClip = overflowClipsContent(effectiveStyles.overflow);

      // Paint children with optional clipping
      const paintChildren = () => {
        for (let i = 0; i < this.getChildren().length; i++) {
          const child = this.getChildren()[i]!;
          const childId = childElementIds[i]!;
          const childBound = childBounds[i]!;
          const childPrepaintState = childPrepaintStates[i];

          const childCx = cx.withElementId(childId);

          (child as AnyGladeElement).paint(childCx, childBound, childPrepaintState);
        }
      };

      if (shouldClip) {
        cx.withContentMask(
          {
            bounds,
            cornerRadius: effectiveStyles.borderRadius ?? 0,
          },
          paintChildren
        );
      } else {
        paintChildren();
      }

      // Paint scrollbars on top of children
      this.paintScrollbars(cx, prepaintState);
    };

    // Wrap content in stacking context if needed
    if (needsStackingContext) {
      cx.withStackingContext(bounds, effectiveStyles.zIndex ?? 0, paintContent);
    } else {
      paintContent();
    }
  }

  /**
   * Paint scrollbars if present.
   */
  private paintScrollbars(cx: PaintContext, prepaintState: DivPrepaintState): void {
    const { verticalScrollbar, horizontalScrollbar } = prepaintState;
    const config = resolveScrollbarConfig(this.scrollbarConfigValue ?? undefined);

    // Check visibility based on configuration
    const shouldShow = this.shouldShowScrollbars(cx, prepaintState, config);
    if (!shouldShow) return;

    // Paint vertical scrollbar
    if (verticalScrollbar) {
      const isThumbHovered = cx.isHitboxHovered(verticalScrollbar.hitbox);
      const isDragging = cx.getWindow().isScrollbarDragging?.() ?? false;

      // Paint track
      cx.paintRect(verticalScrollbar.trackBounds, {
        backgroundColor: config.trackColor,
        borderRadius: config.cornerRadius,
      });

      // Paint thumb
      const thumbColor = getThumbColor(config, isThumbHovered, isDragging);
      cx.paintRect(verticalScrollbar.thumbBounds, {
        backgroundColor: thumbColor,
        borderRadius: config.cornerRadius,
      });
    }

    // Paint horizontal scrollbar
    if (horizontalScrollbar) {
      const isThumbHovered = cx.isHitboxHovered(horizontalScrollbar.hitbox);
      const isDragging = cx.getWindow().isScrollbarDragging?.() ?? false;

      // Paint track
      cx.paintRect(horizontalScrollbar.trackBounds, {
        backgroundColor: config.trackColor,
        borderRadius: config.cornerRadius,
      });

      // Paint thumb
      const thumbColor = getThumbColor(config, isThumbHovered, isDragging);
      cx.paintRect(horizontalScrollbar.thumbBounds, {
        backgroundColor: thumbColor,
        borderRadius: config.cornerRadius,
      });
    }
  }

  /**
   * Determine if scrollbars should be shown based on visibility setting.
   */
  private shouldShowScrollbars(
    cx: PaintContext,
    prepaintState: DivPrepaintState,
    config: ResolvedScrollbarConfig
  ): boolean {
    if (config.visibility === "never") return false;
    if (config.visibility === "always") return true;

    // For "hover" visibility, show when container or scrollbar is hovered
    if (config.visibility === "hover") {
      const containerHovered = prepaintState.hitbox
        ? cx.isHitboxHovered(prepaintState.hitbox)
        : false;
      const verticalHovered = prepaintState.verticalScrollbar
        ? cx.isHitboxHovered(prepaintState.verticalScrollbar.hitbox)
        : false;
      const horizontalHovered = prepaintState.horizontalScrollbar
        ? cx.isHitboxHovered(prepaintState.horizontalScrollbar.hitbox)
        : false;
      return containerHovered || verticalHovered || horizontalHovered;
    }

    return true;
  }

  hitTest(bounds: Bounds, childBounds: Bounds[]): HitTestNode {
    const childNodes: HitTestNode[] = [];

    for (let i = this.getChildren().length - 1; i >= 0; i--) {
      const child = this.getChildren()[i];
      const childBound = childBounds[i];
      if (child && childBound) {
        const childNode = child.hitTest(childBound, []);
        if (childNode) {
          childNodes.unshift(childNode);
        }
      }
    }

    return {
      bounds,
      handlers: this.handlers,
      focusHandle: this.focusHandleRef,
      scrollHandle: this.scrollHandleRef,
      keyContext: this.keyContextValue,
      children: childNodes,
    };
  }
}

/**
 * Factory function to create a div element.
 */
export function div(): GladeDiv {
  return new GladeDiv();
}
