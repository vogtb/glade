/**
 * FlashDiv - the primary container element.
 *
 * Provides a Tailwind-like chainable API for building UI.
 */

import { FlashContainerElement, type PrepaintContext, type PaintContext } from "./element.ts";
import type { Bounds, Color } from "./types.ts";
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
import type { FocusHandle } from "./entity.ts";

/**
 * The primary container element.
 */
export class FlashDiv extends FlashContainerElement {
  private styles: Partial<Styles> = {};
  private hoverStyles: Partial<Styles> | null = null;
  private activeStyles: Partial<Styles> | null = null;
  private focusedStyles: Partial<Styles> | null = null;
  private handlers: EventHandlers = {};
  private focusHandleRef: FocusHandle | null = null;
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

  // ============ Rendering ============

  prepaint(cx: PrepaintContext): LayoutId {
    // First, prepaint all children
    this.childLayoutIds = this.children.map((child) => child.prepaint(cx));

    // Request layout for this element with its children
    return cx.requestLayout(this.styles, this.childLayoutIds);
  }

  paint(cx: PaintContext, bounds: Bounds, childLayoutIds: LayoutId[]): void {
    // Determine effective styles based on state
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

    // Paint shadow (if any)
    if (effectiveStyles.shadow && effectiveStyles.shadow !== "none") {
      cx.paintShadow(bounds, effectiveStyles);
    }

    // Paint background rectangle
    if (effectiveStyles.backgroundColor) {
      cx.paintRect(bounds, effectiveStyles);
    }

    // Paint border
    if (effectiveStyles.borderWidth && effectiveStyles.borderColor) {
      cx.paintBorder(bounds, effectiveStyles);
    }

    // Paint children
    const childBounds = cx.getChildLayouts(bounds, childLayoutIds);
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i]!;
      const childBound = childBounds[i]!;
      child.paint(cx, childBound, []);
    }
  }

  hitTest(bounds: Bounds, childBounds: Bounds[]): HitTestNode {
    const childNodes: HitTestNode[] = [];

    // Hit test children (in reverse order for proper z-order)
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
