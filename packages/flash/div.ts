/**
 * FlashDiv - the primary container element.
 *
 * Provides a Tailwind-like chainable API for building UI.
 * Implements three-phase lifecycle: requestLayout → prepaint → paint
 */

import {
  FlashContainerElement,
  FlashElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type GlobalElementId,
} from "./element.ts";
import type { Bounds, Color, TransformationMatrix, ScrollOffset } from "./types.ts";
import { rotateTransform, scaleTransform, translateTransform } from "./types.ts";
import { overflowClipsContent } from "./styles.ts";
import type { LayoutId } from "./layout.ts";
import type { Styles } from "./styles.ts";
import { StyleBuilder } from "./styles.ts";
import type {
  EventHandlers,
  HitTestNode,
  MouseHandler,
  ClickHandler,
  KeyHandler,
  ScrollHandler,
} from "./dispatch.ts";
import type { FocusHandle, ScrollHandle } from "./entity.ts";

/**
 * State passed from requestLayout to prepaint for FlashDiv.
 * Contains child layout IDs and element IDs for recursive processing.
 */
interface DivRequestLayoutState {
  childLayoutIds: LayoutId[];
  childElementIds: GlobalElementId[];
  childRequestStates: unknown[];
}

/**
 * State passed from prepaint to paint for FlashDiv.
 * Contains child element IDs and prepaint states for recursive processing.
 */
interface DivPrepaintState {
  childLayoutIds: LayoutId[];
  childElementIds: GlobalElementId[];
  childPrepaintStates: unknown[];
}

/**
 * The primary container element.
 */
export class FlashDiv extends FlashContainerElement<DivRequestLayoutState, DivPrepaintState> {
  private styles: Partial<Styles> = {};
  private hoverStyles: Partial<Styles> | null = null;
  private activeStyles: Partial<Styles> | null = null;
  private focusedStyles: Partial<Styles> | null = null;
  private handlers: EventHandlers = {};
  private focusHandleRef: FocusHandle | null = null;
  private scrollHandleRef: ScrollHandle | null = null;
  private keyContextValue: string | null = null;

  // ============ Layout Styles (Tailwind-like API) ============

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

  // ============ Visual Styles ============

  // Background
  bg(color: Color): this {
    this.styles.backgroundColor = color;
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
    this.styles.borderColor = color;
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

  // ============ Text Styles ============

  textColor(color: Color): this {
    this.styles.color = color;
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

  // ============ Interactivity ============

  cursor(v: "pointer" | "default" | "text" | "grab" | "grabbing" | "not-allowed"): this {
    this.styles.cursor = v;
    return this;
  }
  cursorPointer(): this {
    return this.cursor("pointer");
  }

  // ============ Transforms ============

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

  // ============ State Styles ============

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

  // ============ Event Handlers ============

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

  // ============ Focus ============

  trackFocus(handle: FocusHandle): this {
    this.focusHandleRef = handle;
    return this;
  }

  keyContext(context: string): this {
    this.keyContextValue = context;
    return this;
  }

  // ============ Scroll ============

  trackScroll(handle: ScrollHandle): this {
    this.scrollHandleRef = handle;
    return this;
  }

  // ============ Three-Phase Lifecycle ============

  /**
   * Phase 1: Request layout for this element and all children.
   * Creates Taffy layout nodes bottom-up.
   */
  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DivRequestLayoutState> {
    const childLayoutIds: LayoutId[] = [];
    const childElementIds: GlobalElementId[] = [];
    const childRequestStates: unknown[] = [];

    for (const child of this.children) {
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
        childLayoutIds,
        childElementIds,
        childRequestStates,
      },
    };
  }

  /**
   * Phase 2: Prepaint - runs after layout computation.
   * Can be used for post-layout processing before painting.
   */
  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DivRequestLayoutState
  ): DivPrepaintState {
    const { childLayoutIds, childElementIds, childRequestStates } = requestState;
    const childBounds = cx.getChildLayouts(bounds, childLayoutIds);
    const childPrepaintStates: unknown[] = [];

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i]!;
      const childId = childElementIds[i]!;
      const childBound = childBounds[i]!;
      const childRequestState = childRequestStates[i];

      const childCx = cx.withElementId(childId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prepaintState = (child as FlashElement<any, any>).prepaint(
        childCx,
        childBound,
        childRequestState
      );
      childPrepaintStates.push(prepaintState);
    }

    return {
      childLayoutIds,
      childElementIds,
      childPrepaintStates,
    };
  }

  /**
   * Phase 3: Paint - emit GPU primitives.
   */
  paint(cx: PaintContext, bounds: Bounds, prepaintState: DivPrepaintState): void {
    const { childLayoutIds, childElementIds, childPrepaintStates } = prepaintState;

    const isHovered = cx.isHovered(bounds);
    const isActive = cx.isActive(bounds);
    const isFocused = this.focusHandleRef ? cx.isFocused(this.focusHandleRef) : false;

    let effectiveStyles = { ...this.styles };
    if (isHovered && this.hoverStyles) {
      effectiveStyles = { ...effectiveStyles, ...this.hoverStyles };
    }
    if (isActive && this.activeStyles) {
      effectiveStyles = { ...effectiveStyles, ...this.activeStyles };
    }
    if (isFocused && this.focusedStyles) {
      effectiveStyles = { ...effectiveStyles, ...this.focusedStyles };
    }

    if (effectiveStyles.shadow && effectiveStyles.shadow !== "none") {
      cx.paintShadow(bounds, effectiveStyles);
    }

    if (effectiveStyles.backgroundColor) {
      cx.paintRect(bounds, effectiveStyles);
    }

    if (effectiveStyles.borderWidth && effectiveStyles.borderColor) {
      cx.paintBorder(bounds, effectiveStyles);
    }

    const childBounds = cx.getChildLayouts(bounds, childLayoutIds);

    // Determine if we need to apply scroll and/or clipping
    const shouldClip = overflowClipsContent(effectiveStyles.overflow);
    const isScrollContainer = this.scrollHandleRef != null;

    // Get scroll offset if this is a scroll container
    let scrollOffset: ScrollOffset | null = null;
    if (isScrollContainer && this.scrollHandleRef) {
      scrollOffset = cx.getScrollOffset(this.scrollHandleRef);
    }

    // Paint children with optional clipping and scroll transform
    const paintChildren = () => {
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i]!;
        const childId = childElementIds[i]!;
        let childBound = childBounds[i]!;
        const childPrepaintState = childPrepaintStates[i];

        // Apply scroll offset to child bounds
        if (scrollOffset) {
          childBound = {
            x: childBound.x - scrollOffset.x,
            y: childBound.y - scrollOffset.y,
            width: childBound.width,
            height: childBound.height,
          };
        }

        const childCx = cx.withElementId(childId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (child as FlashElement<any, any>).paint(childCx, childBound, childPrepaintState);
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
  }

  hitTest(bounds: Bounds, childBounds: Bounds[]): HitTestNode {
    const childNodes: HitTestNode[] = [];

    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
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
export function div(): FlashDiv {
  return new FlashDiv();
}
