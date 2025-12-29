/**
 * Dropdown menu components for Flash.
 *
 * Provides a trigger element and positioned menu overlay with items,
 * separators, labels, and keyboard navigation.
 *
 * Uses the PopoverManager pattern for proper overlay rendering:
 * - Dropdown only layouts its trigger as a child
 * - Menu is registered with PopoverManager during prepaint
 * - PopoverManager renders menu in deferred pass (after normal elements)
 * - This ensures menu doesn't affect trigger/parent layout
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
import type { Bounds, Color } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode, ClickHandler } from "./dispatch.ts";
import type { Hitbox } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";
import type { PopoverConfig } from "./popover.ts";
import type { FlashContext } from "./context.ts";

// ============================================================================
// Default Colors and Sizes
// ============================================================================

const DEFAULT_MENU_BG: Color = { r: 0.12, g: 0.12, b: 0.12, a: 1 };
const DEFAULT_MENU_BORDER: Color = { r: 0.25, g: 0.25, b: 0.25, a: 1 };
const DEFAULT_ITEM_BG: Color = { r: 0, g: 0, b: 0, a: 0 };
const DEFAULT_ITEM_HOVER_BG: Color = { r: 0.2, g: 0.4, b: 0.8, a: 1 };
const DEFAULT_ITEM_TEXT: Color = { r: 0.9, g: 0.9, b: 0.9, a: 1 };
const DEFAULT_ITEM_HOVER_TEXT: Color = { r: 1, g: 1, b: 1, a: 1 };
const DEFAULT_ITEM_DISABLED_TEXT: Color = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
const DEFAULT_LABEL_TEXT: Color = { r: 0.6, g: 0.6, b: 0.6, a: 1 };
const DEFAULT_SEPARATOR_COLOR: Color = { r: 0.25, g: 0.25, b: 0.25, a: 1 };
const DEFAULT_DESTRUCTIVE_TEXT: Color = { r: 0.9, g: 0.3, b: 0.3, a: 1 };
const DEFAULT_DESTRUCTIVE_HOVER_BG: Color = { r: 0.8, g: 0.2, b: 0.2, a: 1 };

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_LABEL_FONT_SIZE = 12;
const DEFAULT_ITEM_PADDING_X = 12;
const DEFAULT_ITEM_PADDING_Y = 8;
const DEFAULT_MENU_PADDING = 4;
const DEFAULT_MENU_BORDER_RADIUS = 6;
const DEFAULT_MENU_MIN_WIDTH = 160;
const DEFAULT_SEPARATOR_HEIGHT = 1;
const DEFAULT_SEPARATOR_MARGIN = 4;

// ============================================================================
// Types
// ============================================================================

/**
 * Handler called when dropdown open state changes.
 */
export type DropdownOpenChangeHandler = (open: boolean) => void;

/**
 * Handler called when an item is selected.
 */
export type DropdownSelectHandler = () => void;

/**
 * Side preference for menu positioning.
 */
export type DropdownSide = "top" | "bottom" | "left" | "right";

/**
 * Alignment along the side.
 */
export type DropdownAlign = "start" | "center" | "end";

/**
 * Context passed from Dropdown to menu items.
 */
type DropdownMenuContext = {
  onOpenChange: DropdownOpenChangeHandler | null;
  disabled: boolean;
  // Styling
  menuBg: Color;
  menuBorder: Color;
  menuBorderRadius: number;
  menuPadding: number;
  itemBg: Color;
  itemHoverBg: Color;
  itemText: Color;
  itemHoverText: Color;
  itemDisabledText: Color;
  labelText: Color;
  separatorColor: Color;
  destructiveText: Color;
  destructiveHoverBg: Color;
  fontSize: number;
  labelFontSize: number;
  itemPaddingX: number;
  itemPaddingY: number;
};

// ============================================================================
// DropdownItem
// ============================================================================

type DropdownItemRequestState = {
  layoutId: LayoutId;
  measureId: number;
};

type DropdownItemPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  textBounds: Bounds;
};

/**
 * A selectable item in the dropdown menu.
 */
export class FlashDropdownItem extends FlashElement<
  DropdownItemRequestState,
  DropdownItemPrepaintState
> {
  private labelText: string;
  private disabledValue = false;
  private destructiveValue = false;
  private onSelectHandler: DropdownSelectHandler | null = null;
  private context: DropdownMenuContext | null = null;

  constructor(label: string) {
    super();
    this.labelText = label;
  }

  /**
   * Disable this item.
   */
  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  /**
   * Mark as destructive action (red styling).
   */
  destructive(v: boolean): this {
    this.destructiveValue = v;
    return this;
  }

  /**
   * Set selection handler.
   */
  onSelect(handler: DropdownSelectHandler): this {
    this.onSelectHandler = handler;
    return this;
  }

  /**
   * @internal
   */
  setContext(context: DropdownMenuContext): void {
    this.context = context;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownItemRequestState> {
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y;
    const lineHeight = fontSize * 1.2;

    const measureId = cx.registerTextMeasure({
      text: this.labelText,
      fontSize,
      fontFamily: "Inter",
      fontWeight: 400,
      lineHeight,
      noWrap: true,
      maxWidth: null,
    });

    const layoutId = cx.requestMeasurableLayout(
      {
        paddingLeft: paddingX,
        paddingRight: paddingX,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        width: "100%",
      },
      measureId
    );

    return { layoutId, requestState: { layoutId, measureId } };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    _requestState: DropdownItemRequestState
  ): DropdownItemPrepaintState {
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);
    const cursor = isDisabled ? "not-allowed" : "pointer";
    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal, cursor);

    const context = this.context;
    const onSelectHandler = this.onSelectHandler;

    const clickHandler: ClickHandler = (_event, _window, _cx) => {
      if (isDisabled) return;
      if (onSelectHandler) {
        onSelectHandler();
      }
      if (context?.onOpenChange) {
        context.onOpenChange(false);
      }
    };

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: { click: clickHandler },
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };

    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y;

    const textBounds: Bounds = {
      x: bounds.x + paddingX,
      y: bounds.y + paddingY,
      width: bounds.width - paddingX * 2,
      height: bounds.height - paddingY * 2,
    };

    return { hitbox, hitTestNode, textBounds };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DropdownItemPrepaintState): void {
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);

    const itemBg = this.context?.itemBg ?? DEFAULT_ITEM_BG;
    const itemHoverBg = this.destructiveValue
      ? (this.context?.destructiveHoverBg ?? DEFAULT_DESTRUCTIVE_HOVER_BG)
      : (this.context?.itemHoverBg ?? DEFAULT_ITEM_HOVER_BG);
    const itemText = this.destructiveValue
      ? (this.context?.destructiveText ?? DEFAULT_DESTRUCTIVE_TEXT)
      : (this.context?.itemText ?? DEFAULT_ITEM_TEXT);
    const itemHoverText = this.context?.itemHoverText ?? DEFAULT_ITEM_HOVER_TEXT;
    const itemDisabledText = this.context?.itemDisabledText ?? DEFAULT_ITEM_DISABLED_TEXT;
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;

    const bgColor = isHovered && !isDisabled ? itemHoverBg : itemBg;
    const textColor = isDisabled ? itemDisabledText : isHovered ? itemHoverText : itemText;

    // Paint background
    if (bgColor.a > 0) {
      cx.paintRect(bounds, {
        backgroundColor: bgColor,
        borderRadius: 4,
      });
    }

    // Paint text
    cx.paintGlyphs(this.labelText, prepaintState.textBounds, textColor, {
      fontSize,
      fontFamily: "Inter",
      fontWeight: 400,
    });
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================
// DropdownSeparator
// ============================================================================

type DropdownSeparatorRequestState = {
  layoutId: LayoutId;
};

type DropdownSeparatorPrepaintState = {
  hitTestNode: HitTestNode | null;
};

/**
 * A visual separator between menu items.
 */
export class FlashDropdownSeparator extends FlashElement<
  DropdownSeparatorRequestState,
  DropdownSeparatorPrepaintState
> {
  private context: DropdownMenuContext | null = null;

  /**
   * @internal
   */
  setContext(context: DropdownMenuContext): void {
    this.context = context;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownSeparatorRequestState> {
    const layoutId = cx.requestLayout(
      {
        width: "100%",
        height: DEFAULT_SEPARATOR_HEIGHT,
        marginTop: DEFAULT_SEPARATOR_MARGIN,
        marginBottom: DEFAULT_SEPARATOR_MARGIN,
      },
      []
    );

    return { layoutId, requestState: { layoutId } };
  }

  prepaint(
    _cx: PrepaintContext,
    _bounds: Bounds,
    _requestState: DropdownSeparatorRequestState
  ): DropdownSeparatorPrepaintState {
    return { hitTestNode: null };
  }

  paint(cx: PaintContext, bounds: Bounds, _prepaintState: DropdownSeparatorPrepaintState): void {
    const separatorColor = this.context?.separatorColor ?? DEFAULT_SEPARATOR_COLOR;

    cx.paintRect(bounds, {
      backgroundColor: separatorColor,
    });
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================
// DropdownLabel
// ============================================================================

type DropdownLabelRequestState = {
  layoutId: LayoutId;
  measureId: number;
};

type DropdownLabelPrepaintState = {
  textBounds: Bounds;
  hitTestNode: HitTestNode | null;
};

/**
 * A non-interactive label for grouping items.
 */
export class FlashDropdownLabel extends FlashElement<
  DropdownLabelRequestState,
  DropdownLabelPrepaintState
> {
  private labelText: string;
  private context: DropdownMenuContext | null = null;

  constructor(label: string) {
    super();
    this.labelText = label;
  }

  /**
   * @internal
   */
  setContext(context: DropdownMenuContext): void {
    this.context = context;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownLabelRequestState> {
    const fontSize = this.context?.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE;
    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = (this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y) / 2;
    const lineHeight = fontSize * 1.2;

    const measureId = cx.registerTextMeasure({
      text: this.labelText,
      fontSize,
      fontFamily: "Inter",
      fontWeight: 500,
      lineHeight,
      noWrap: true,
      maxWidth: null,
    });

    const layoutId = cx.requestMeasurableLayout(
      {
        paddingLeft: paddingX,
        paddingRight: paddingX,
        paddingTop: paddingY + 4, // Extra top padding for labels
        paddingBottom: paddingY,
        width: "100%",
      },
      measureId
    );

    return { layoutId, requestState: { layoutId, measureId } };
  }

  prepaint(
    _cx: PrepaintContext,
    bounds: Bounds,
    _requestState: DropdownLabelRequestState
  ): DropdownLabelPrepaintState {
    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = (this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y) / 2;

    const textBounds: Bounds = {
      x: bounds.x + paddingX,
      y: bounds.y + paddingY + 4,
      width: bounds.width - paddingX * 2,
      height: bounds.height - paddingY * 2 - 4,
    };

    return { textBounds, hitTestNode: null };
  }

  paint(cx: PaintContext, _bounds: Bounds, prepaintState: DropdownLabelPrepaintState): void {
    const labelTextColor = this.context?.labelText ?? DEFAULT_LABEL_TEXT;
    const fontSize = this.context?.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE;

    cx.paintGlyphs(this.labelText, prepaintState.textBounds, labelTextColor, {
      fontSize,
      fontFamily: "Inter",
      fontWeight: 500,
    });
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================
// DropdownMenuContent (built by PopoverManager)
// ============================================================================

type MenuItemElement = FlashDropdownItem | FlashDropdownSeparator | FlashDropdownLabel;

type DropdownMenuContentRequestState = {
  layoutId: LayoutId;
  childLayoutIds: LayoutId[];
  childElementIds: GlobalElementId[];
  childRequestStates: unknown[];
};

type DropdownMenuContentPrepaintState = {
  childElementIds: GlobalElementId[];
  childPrepaintStates: unknown[];
  childBounds: Bounds[];
  hitTestNode: HitTestNode;
};

/**
 * Internal container for menu items. Built by PopoverManager.
 */
export class FlashDropdownMenuContent extends FlashContainerElement<
  DropdownMenuContentRequestState,
  DropdownMenuContentPrepaintState
> {
  private menuItems: MenuItemElement[] = [];
  private context: DropdownMenuContext | null = null;

  setItems(items: MenuItemElement[]): void {
    this.menuItems = items;
  }

  setContext(context: DropdownMenuContext): void {
    this.context = context;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownMenuContentRequestState> {
    const menuPadding = this.context?.menuPadding ?? DEFAULT_MENU_PADDING;

    const childLayoutIds: LayoutId[] = [];
    const childElementIds: GlobalElementId[] = [];
    const childRequestStates: unknown[] = [];

    for (const item of this.menuItems) {
      const childId = cx.allocateChildId();
      childElementIds.push(childId);

      // Set context on each item
      if (item instanceof FlashDropdownItem) {
        item.setContext(this.context!);
      } else if (item instanceof FlashDropdownSeparator) {
        item.setContext(this.context!);
      } else if (item instanceof FlashDropdownLabel) {
        item.setContext(this.context!);
      }

      const childCx: RequestLayoutContext = { ...cx, elementId: childId };
      const result = item.requestLayout(childCx);
      childLayoutIds.push(result.layoutId);
      childRequestStates.push(result.requestState);
    }

    const layoutId = cx.requestLayout(
      {
        display: "flex",
        flexDirection: "column",
        paddingTop: menuPadding,
        paddingBottom: menuPadding,
        paddingLeft: menuPadding,
        paddingRight: menuPadding,
        minWidth: DEFAULT_MENU_MIN_WIDTH,
      },
      childLayoutIds
    );

    return {
      layoutId,
      requestState: { layoutId, childLayoutIds, childElementIds, childRequestStates },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DropdownMenuContentRequestState
  ): DropdownMenuContentPrepaintState {
    const { layoutId, childLayoutIds, childElementIds, childRequestStates } = requestState;

    // Compute delta between passed bounds and layout bounds
    // This accounts for anchored positioning offsets
    const originalBounds = cx.getBounds(layoutId);
    const deltaX = bounds.x - originalBounds.x;
    const deltaY = bounds.y - originalBounds.y;

    const childLayoutBounds = cx.getChildLayouts(bounds, childLayoutIds);
    const childPrepaintStates: unknown[] = [];
    const childBounds: Bounds[] = [];
    const childHitTestNodes: HitTestNode[] = [];

    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i]!;
      const childId = childElementIds[i]!;
      const childLayoutBound = childLayoutBounds[i]!;
      const childRequestState = childRequestStates[i]!;

      // Apply delta to child bounds
      const adjustedChildBound: Bounds = {
        x: childLayoutBound.x + deltaX,
        y: childLayoutBound.y + deltaY,
        width: childLayoutBound.width,
        height: childLayoutBound.height,
      };

      childBounds.push(adjustedChildBound);

      const childCx = cx.withElementId(childId);

      // Type-safe prepaint calls
      let prepaintState: unknown;
      if (item instanceof FlashDropdownItem) {
        prepaintState = item.prepaint(
          childCx,
          adjustedChildBound,
          childRequestState as DropdownItemRequestState
        );
      } else if (item instanceof FlashDropdownSeparator) {
        prepaintState = item.prepaint(
          childCx,
          adjustedChildBound,
          childRequestState as DropdownSeparatorRequestState
        );
      } else if (item instanceof FlashDropdownLabel) {
        prepaintState = item.prepaint(
          childCx,
          adjustedChildBound,
          childRequestState as DropdownLabelRequestState
        );
      }
      childPrepaintStates.push(prepaintState);

      const childHitTest = (prepaintState as { hitTestNode?: HitTestNode } | undefined)
        ?.hitTestNode;
      if (childHitTest) {
        childHitTestNodes.push(childHitTest);
      }
    }

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: childHitTestNodes,
    };

    return { childElementIds, childPrepaintStates, childBounds, hitTestNode };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DropdownMenuContentPrepaintState): void {
    const menuBg = this.context?.menuBg ?? DEFAULT_MENU_BG;
    const menuBorder = this.context?.menuBorder ?? DEFAULT_MENU_BORDER;
    const menuBorderRadius = this.context?.menuBorderRadius ?? DEFAULT_MENU_BORDER_RADIUS;

    // Paint menu background with border
    cx.paintRect(bounds, {
      backgroundColor: menuBg,
      borderRadius: menuBorderRadius,
      borderColor: menuBorder,
      borderWidth: 1,
    });

    // Paint children
    const { childElementIds, childPrepaintStates, childBounds } = prepaintState;

    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i]!;
      const childId = childElementIds[i]!;
      const childBound = childBounds[i]!;
      const childPrepaintState = childPrepaintStates[i]!;

      const childCx = cx.withElementId(childId);

      // Type-safe paint calls
      if (item instanceof FlashDropdownItem) {
        item.paint(childCx, childBound, childPrepaintState as DropdownItemPrepaintState);
      } else if (item instanceof FlashDropdownSeparator) {
        item.paint(childCx, childBound, childPrepaintState as DropdownSeparatorPrepaintState);
      } else if (item instanceof FlashDropdownLabel) {
        item.paint(childCx, childBound, childPrepaintState as DropdownLabelPrepaintState);
      }
    }
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };
  }
}

// ============================================================================
// Dropdown (main element - only layouts trigger)
// ============================================================================

type DropdownRequestState = {
  layoutId: LayoutId;
  triggerLayoutId: LayoutId;
  triggerElementId: GlobalElementId;
  triggerRequestState: unknown;
};

type DropdownPrepaintState = {
  triggerElementId: GlobalElementId;
  triggerPrepaintState: unknown;
  triggerBounds: Bounds;
  hitTestNode: HitTestNode;
};

let dropdownIdCounter = 0;

/**
 * A dropdown menu container that manages open state and renders a trigger.
 * The menu is rendered separately via PopoverManager.
 */
export class FlashDropdown extends FlashContainerElement<
  DropdownRequestState,
  DropdownPrepaintState
> {
  private dropdownId: string;
  private openValue = false;
  private onOpenChangeHandler: DropdownOpenChangeHandler | null = null;
  private disabledValue = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private triggerElement: FlashElement<any, any> | null = null;
  private menuItems: MenuItemElement[] = [];

  // Positioning
  private sideValue: DropdownSide = "bottom";
  private alignValue: DropdownAlign = "start";
  private sideOffsetValue = 4;
  private windowMarginValue = 8;

  // Styling
  private menuBgColor: Color = DEFAULT_MENU_BG;
  private menuBorderColor: Color = DEFAULT_MENU_BORDER;
  private menuBorderRadiusValue = DEFAULT_MENU_BORDER_RADIUS;
  private menuPaddingValue = DEFAULT_MENU_PADDING;
  private itemBgColor: Color = DEFAULT_ITEM_BG;
  private itemHoverBgColor: Color = DEFAULT_ITEM_HOVER_BG;
  private itemTextColor: Color = DEFAULT_ITEM_TEXT;
  private itemHoverTextColor: Color = DEFAULT_ITEM_HOVER_TEXT;
  private itemDisabledTextColor: Color = DEFAULT_ITEM_DISABLED_TEXT;
  private labelTextColor: Color = DEFAULT_LABEL_TEXT;
  private separatorColorValue: Color = DEFAULT_SEPARATOR_COLOR;
  private destructiveTextColor: Color = DEFAULT_DESTRUCTIVE_TEXT;
  private destructiveHoverBgColor: Color = DEFAULT_DESTRUCTIVE_HOVER_BG;
  private fontSizeValue = DEFAULT_FONT_SIZE;
  private labelFontSizeValue = DEFAULT_LABEL_FONT_SIZE;
  private itemPaddingXValue = DEFAULT_ITEM_PADDING_X;
  private itemPaddingYValue = DEFAULT_ITEM_PADDING_Y;

  constructor() {
    super();
    this.dropdownId = `dropdown-${dropdownIdCounter++}`;
  }

  // ============ State ============

  /**
   * Set the open state (controlled mode).
   */
  open(v: boolean): this {
    this.openValue = v;
    return this;
  }

  /**
   * Set the open change handler.
   */
  onOpenChange(handler: DropdownOpenChangeHandler): this {
    this.onOpenChangeHandler = handler;
    return this;
  }

  /**
   * Disable the dropdown.
   */
  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  // ============ Trigger ============

  /**
   * Set the trigger element.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger(element: FlashElement<any, any>): this {
    this.triggerElement = element;
    return this;
  }

  // ============ Items ============

  /**
   * Add menu items.
   */
  items(...items: MenuItemElement[]): this {
    this.menuItems.push(...items);
    return this;
  }

  // ============ Positioning ============

  /**
   * Set the preferred side for menu placement.
   */
  side(v: DropdownSide): this {
    this.sideValue = v;
    return this;
  }

  /**
   * Set alignment along the side.
   */
  align(v: DropdownAlign): this {
    this.alignValue = v;
    return this;
  }

  /**
   * Set offset from the trigger.
   */
  sideOffset(v: number): this {
    this.sideOffsetValue = v;
    return this;
  }

  /**
   * Set margin from window edges.
   */
  windowMargin(v: number): this {
    this.windowMarginValue = v;
    return this;
  }

  // ============ Styling ============

  menuBg(c: Color): this {
    this.menuBgColor = c;
    return this;
  }

  menuBorder(c: Color): this {
    this.menuBorderColor = c;
    return this;
  }

  menuBorderRadius(v: number): this {
    this.menuBorderRadiusValue = v;
    return this;
  }

  menuPadding(v: number): this {
    this.menuPaddingValue = v;
    return this;
  }

  itemBg(c: Color): this {
    this.itemBgColor = c;
    return this;
  }

  itemHoverBg(c: Color): this {
    this.itemHoverBgColor = c;
    return this;
  }

  itemText(c: Color): this {
    this.itemTextColor = c;
    return this;
  }

  itemHoverText(c: Color): this {
    this.itemHoverTextColor = c;
    return this;
  }

  itemDisabledText(c: Color): this {
    this.itemDisabledTextColor = c;
    return this;
  }

  labelText(c: Color): this {
    this.labelTextColor = c;
    return this;
  }

  separatorColor(c: Color): this {
    this.separatorColorValue = c;
    return this;
  }

  fontSize(v: number): this {
    this.fontSizeValue = v;
    return this;
  }

  itemPaddingX(v: number): this {
    this.itemPaddingXValue = v;
    return this;
  }

  itemPaddingY(v: number): this {
    this.itemPaddingYValue = v;
    return this;
  }

  // ============ Internal ============

  private buildMenuContext(): DropdownMenuContext {
    return {
      onOpenChange: this.onOpenChangeHandler,
      disabled: this.disabledValue,
      menuBg: this.menuBgColor,
      menuBorder: this.menuBorderColor,
      menuBorderRadius: this.menuBorderRadiusValue,
      menuPadding: this.menuPaddingValue,
      itemBg: this.itemBgColor,
      itemHoverBg: this.itemHoverBgColor,
      itemText: this.itemTextColor,
      itemHoverText: this.itemHoverTextColor,
      itemDisabledText: this.itemDisabledTextColor,
      labelText: this.labelTextColor,
      separatorColor: this.separatorColorValue,
      destructiveText: this.destructiveTextColor,
      destructiveHoverBg: this.destructiveHoverBgColor,
      fontSize: this.fontSizeValue,
      labelFontSize: this.labelFontSizeValue,
      itemPaddingX: this.itemPaddingXValue,
      itemPaddingY: this.itemPaddingYValue,
    };
  }

  private buildPopoverConfig(): PopoverConfig {
    return {
      side: this.sideValue,
      align: this.alignValue,
      sideOffset: this.sideOffsetValue,
      windowMargin: this.windowMarginValue,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildMenuElement(_cx: FlashContext): FlashElement<any, any> {
    const menuContent = new FlashDropdownMenuContent();
    menuContent.setItems([...this.menuItems]);
    menuContent.setContext(this.buildMenuContext());
    return menuContent;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownRequestState> {
    if (!this.triggerElement) {
      const layoutId = cx.requestLayout({ width: 0, height: 0 }, []);
      return {
        layoutId,
        requestState: {
          layoutId,
          triggerLayoutId: layoutId,
          triggerElementId: cx.elementId,
          triggerRequestState: undefined,
        },
      };
    }

    // Only layout the trigger - menu is handled by PopoverManager
    const triggerElementId = cx.allocateChildId();
    const triggerCx: RequestLayoutContext = { ...cx, elementId: triggerElementId };
    const triggerResult = this.triggerElement.requestLayout(triggerCx);

    // Wrap trigger in a simple container
    const layoutId = cx.requestLayout(
      {
        display: "flex",
        flexDirection: "column",
      },
      [triggerResult.layoutId]
    );

    return {
      layoutId,
      requestState: {
        layoutId,
        triggerLayoutId: triggerResult.layoutId,
        triggerElementId,
        triggerRequestState: triggerResult.requestState,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DropdownRequestState
  ): DropdownPrepaintState {
    const { triggerLayoutId, triggerElementId, triggerRequestState } = requestState;

    // Get trigger bounds
    const triggerBounds = cx.getBounds(triggerLayoutId);

    // Prepaint trigger
    let triggerPrepaintState: unknown = null;
    let triggerHitTestNode: HitTestNode | null = null;

    if (this.triggerElement) {
      const triggerCx = cx.withElementId(triggerElementId);
      triggerPrepaintState = this.triggerElement.prepaint(
        triggerCx,
        triggerBounds,
        triggerRequestState
      );

      triggerHitTestNode =
        (triggerPrepaintState as { hitTestNode?: HitTestNode } | undefined)?.hitTestNode ?? null;
    }

    // Create click handler for trigger
    const isDisabled = this.disabledValue;
    const onOpenChange = this.onOpenChangeHandler;
    const currentOpen = this.openValue;

    const triggerClickHandler: ClickHandler = (_event, _window, _cx) => {
      if (isDisabled) return;
      if (onOpenChange) {
        onOpenChange(!currentOpen);
      }
    };

    // Insert hitbox for trigger click
    const hitbox = cx.insertHitbox(
      triggerBounds,
      HitboxBehavior.Normal,
      isDisabled ? "not-allowed" : "pointer"
    );

    // Wrap trigger's hit test node with our click handler
    const wrappedTriggerHitTest: HitTestNode = {
      bounds: triggerBounds,
      handlers: {
        click: triggerClickHandler,
        ...(triggerHitTestNode?.handlers ?? {}),
      },
      focusHandle: triggerHitTestNode?.focusHandle ?? null,
      scrollHandle: triggerHitTestNode?.scrollHandle ?? null,
      keyContext: triggerHitTestNode?.keyContext ?? null,
      children: triggerHitTestNode?.children ?? [],
    };

    // Register with PopoverManager if open
    if (this.openValue && this.menuItems.length > 0) {
      const menuItems = [...this.menuItems];
      const menuContext = this.buildMenuContext();

      cx.registerPopover({
        id: this.dropdownId,
        hitboxId: hitbox.id,
        triggerBounds,
        builder: (_flashCx: FlashContext) => {
          const menuContent = new FlashDropdownMenuContent();
          menuContent.setItems(menuItems);
          menuContent.setContext(menuContext);
          return menuContent;
        },
        config: this.buildPopoverConfig(),
        open: true,
        onClose: onOpenChange ? () => onOpenChange(false) : null,
      });
    }

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [wrappedTriggerHitTest],
    };

    return {
      triggerElementId,
      triggerPrepaintState,
      triggerBounds,
      hitTestNode,
    };
  }

  paint(cx: PaintContext, _bounds: Bounds, prepaintState: DropdownPrepaintState): void {
    const { triggerElementId, triggerPrepaintState, triggerBounds } = prepaintState;

    // Paint trigger only - menu is painted by PopoverManager in deferred pass
    if (this.triggerElement) {
      const triggerCx = cx.withElementId(triggerElementId);
      this.triggerElement.paint(triggerCx, triggerBounds, triggerPrepaintState);
    }
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a dropdown menu.
 *
 * @example
 * dropdown()
 *   .open(isMenuOpen)
 *   .onOpenChange(setIsMenuOpen)
 *   .trigger(button().child(text("Open Menu")))
 *   .items(
 *     dropdownLabel("Actions"),
 *     dropdownItem("Edit").onSelect(() => handleEdit()),
 *     dropdownItem("Duplicate").onSelect(() => handleDuplicate()),
 *     dropdownSeparator(),
 *     dropdownItem("Delete").destructive(true).onSelect(() => handleDelete())
 *   )
 */
export function dropdown(): FlashDropdown {
  return new FlashDropdown();
}

/**
 * Create a dropdown menu item.
 *
 * @param label - The text label for the item
 *
 * @example
 * dropdownItem("Edit")
 *   .onSelect(() => console.log("Edit clicked"))
 *
 * @example
 * dropdownItem("Delete")
 *   .destructive(true)
 *   .onSelect(() => handleDelete())
 */
export function dropdownItem(label: string): FlashDropdownItem {
  return new FlashDropdownItem(label);
}

/**
 * Create a dropdown separator.
 *
 * @example
 * dropdown().items(
 *   dropdownItem("Copy"),
 *   dropdownItem("Paste"),
 *   dropdownSeparator(),
 *   dropdownItem("Delete")
 * )
 */
export function dropdownSeparator(): FlashDropdownSeparator {
  return new FlashDropdownSeparator();
}

/**
 * Create a dropdown label (non-interactive section header).
 *
 * @param label - The text label
 *
 * @example
 * dropdown().items(
 *   dropdownLabel("Actions"),
 *   dropdownItem("Edit"),
 *   dropdownItem("Delete")
 * )
 */
export function dropdownLabel(label: string): FlashDropdownLabel {
  return new FlashDropdownLabel(label);
}
