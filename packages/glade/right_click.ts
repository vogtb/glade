import { type Color, type ColorObject, toColorObject } from "@glade/utils";

import { AnchoredElement } from "./anchored.ts";
import { DeferredElement } from "./deferred.ts";
import type { HitTestNode } from "./dispatch.ts";
import { GladeDiv } from "./div.ts";
import {
  GladeContainerElement,
  GladeElement,
  type GlobalElementId,
  type PaintContext,
  type PrepaintContext,
  type RequestLayoutContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { LayoutId } from "./layout.ts";
import {
  buildRootMenuContext,
  clearDropdownState,
  DEFAULT_FONT_SIZE,
  DEFAULT_INDICATOR_WIDTH,
  DEFAULT_ITEM_PADDING_X,
  DEFAULT_ITEM_PADDING_Y,
  DEFAULT_LABEL_FONT_SIZE,
  DEFAULT_MENU_BORDER_RADIUS,
  DEFAULT_MENU_PADDING,
  DEFAULT_SHORTCUT_FONT_SIZE,
  type DropdownAlign,
  type DropdownMenuContentPrepaintState,
  type DropdownMenuContentRequestState,
  type DropdownMenuContext,
  type DropdownMenuState,
  type DropdownOpenChangeHandler,
  type DropdownSide,
  GladeDropdownCheckbox,
  GladeDropdownItem,
  GladeDropdownLabel,
  GladeDropdownMenuContent,
  GladeDropdownRadio,
  GladeDropdownRadioGroup,
  GladeDropdownSeparator,
  GladeDropdownSub,
  hasDropdownState,
  type MenuItemElement,
  resetDropdownState,
} from "./menu.ts";
import type { Theme } from "./theme.ts";
import type { Bounds } from "./types.ts";

type RightClickRequestState = {
  layoutId: LayoutId;
  // Menu state (when open)
  menuLayoutId: LayoutId | null;
  menuElementId: GlobalElementId | null;
  menuRequestState: unknown;
  menuElement: GladeElement<unknown, unknown> | null;
  anchoredElement: AnchoredElement | null;
  backdropElement: GladeDiv | null;
};

type RightClickPrepaintState = {
  hitTestNode: HitTestNode;
};

type Position = { x: number; y: number };

let rightClickIdCounter = 0;

export class GladeRightClickMenu extends GladeContainerElement<
  RightClickRequestState,
  RightClickPrepaintState
> {
  private menuId: string;
  private openValue = false;
  private onOpenChangeHandler: DropdownOpenChangeHandler | null = null;
  private disabledValue = false;
  private menuItems: MenuItemElement[] = [];
  private positionValue: Position = { x: 0, y: 0 };

  private menuState: DropdownMenuState = {
    focusedIndex: -1,
    openSubmenuId: null,
    typeaheadBuffer: "",
    typeaheadTimestamp: 0,
  };

  private sideValue: DropdownSide = "bottom";
  private alignValue: DropdownAlign = "start";
  private sideOffsetValue = 4;
  private windowMarginValue = 8;

  private menuBgColor: ColorObject | null = null;
  private menuBorderColor: ColorObject | null = null;
  private menuBorderRadiusValue = DEFAULT_MENU_BORDER_RADIUS;
  private menuPaddingValue = DEFAULT_MENU_PADDING;
  private itemBgColor: ColorObject | null = null;
  private itemHoverBgColor: ColorObject | null = null;
  private itemTextColor: ColorObject | null = null;
  private itemHoverTextColor: ColorObject | null = null;
  private itemDisabledTextColor: ColorObject | null = null;
  private labelTextColor: ColorObject | null = null;
  private separatorColorValue: ColorObject | null = null;
  private destructiveTextColor: ColorObject | null = null;
  private destructiveHoverBgColor: ColorObject | null = null;
  private shortcutTextColor: ColorObject | null = null;
  private checkColorValue: ColorObject | null = null;
  private fontSizeValue = DEFAULT_FONT_SIZE;
  private labelFontSizeValue = DEFAULT_LABEL_FONT_SIZE;
  private shortcutFontSizeValue = DEFAULT_SHORTCUT_FONT_SIZE;
  private itemPaddingXValue = DEFAULT_ITEM_PADDING_X;
  private itemPaddingYValue = DEFAULT_ITEM_PADDING_Y;
  private indicatorWidthValue = DEFAULT_INDICATOR_WIDTH;

  constructor() {
    super();
    this.menuId = `rightclick-${rightClickIdCounter++}`;
  }

  id(stableId: string): this {
    this.menuId = stableId;
    return this;
  }

  open(v: boolean): this {
    this.openValue = v;
    if (v) {
      if (!hasDropdownState(this.menuId)) {
        resetDropdownState(this.menuId);
      }
    } else {
      clearDropdownState(this.menuId);
    }
    return this;
  }

  onOpenChange(handler: DropdownOpenChangeHandler): this {
    this.onOpenChangeHandler = handler;
    return this;
  }

  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  position(pos: Position): this {
    this.positionValue = pos;
    return this;
  }

  items(...items: Array<MenuItemElement | GladeDropdownRadioGroup>): this {
    for (const item of items) {
      if (item instanceof GladeDropdownRadioGroup) {
        this.menuItems.push(...item.getRadios());
      } else {
        this.menuItems.push(item);
      }
    }
    return this;
  }

  side(v: DropdownSide): this {
    this.sideValue = v;
    return this;
  }

  align(v: DropdownAlign): this {
    this.alignValue = v;
    return this;
  }

  sideOffset(v: number): this {
    this.sideOffsetValue = v;
    return this;
  }

  windowMargin(v: number): this {
    this.windowMarginValue = v;
    return this;
  }

  menuBg(c: Color): this {
    this.menuBgColor = toColorObject(c);
    return this;
  }

  menuBorder(c: Color): this {
    this.menuBorderColor = toColorObject(c);
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
    this.itemBgColor = toColorObject(c);
    return this;
  }

  itemHoverBg(c: Color): this {
    this.itemHoverBgColor = toColorObject(c);
    return this;
  }

  itemText(c: Color): this {
    this.itemTextColor = toColorObject(c);
    return this;
  }

  itemHoverText(c: Color): this {
    this.itemHoverTextColor = toColorObject(c);
    return this;
  }

  itemDisabledText(c: Color): this {
    this.itemDisabledTextColor = toColorObject(c);
    return this;
  }

  labelText(c: Color): this {
    this.labelTextColor = toColorObject(c);
    return this;
  }

  separatorColor(c: Color): this {
    this.separatorColorValue = toColorObject(c);
    return this;
  }

  shortcutText(c: Color): this {
    this.shortcutTextColor = toColorObject(c);
    return this;
  }

  checkColor(c: Color): this {
    this.checkColorValue = toColorObject(c);
    return this;
  }

  fontSize(v: number): this {
    this.fontSizeValue = v;
    return this;
  }

  shortcutFontSize(v: number): this {
    this.shortcutFontSizeValue = v;
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

  indicatorWidth(v: number): this {
    this.indicatorWidthValue = v;
    return this;
  }

  private buildMenuContext(theme: Theme): DropdownMenuContext {
    const menu = theme.components.menu;
    const item = menu.item;
    return buildRootMenuContext(
      this.menuId,
      this.menuItems,
      this.disabledValue,
      this.onOpenChangeHandler,
      {
        menuBg: this.menuBgColor ?? menu.background,
        menuBorder: this.menuBorderColor ?? menu.border,
        menuBorderRadius: this.menuBorderRadiusValue,
        menuPadding: this.menuPaddingValue,
        itemBg: this.itemBgColor ?? item.background,
        itemHoverBg: this.itemHoverBgColor ?? item.hover.background,
        itemText: this.itemTextColor ?? item.foreground,
        itemHoverText: this.itemHoverTextColor ?? item.hover.foreground,
        itemDisabledText: this.itemDisabledTextColor ?? item.disabled.foreground,
        labelText: this.labelTextColor ?? item.labelForeground,
        separatorColor: this.separatorColorValue ?? menu.separator,
        destructiveText: this.destructiveTextColor ?? item.destructiveForeground,
        destructiveHoverBg: this.destructiveHoverBgColor ?? item.destructiveHoverBackground,
        shortcutText: this.shortcutTextColor ?? item.shortcutForeground,
        checkColor: this.checkColorValue ?? menu.checkmark,
        fontSize: this.fontSizeValue,
        labelFontSize: this.labelFontSizeValue,
        shortcutFontSize: this.shortcutFontSizeValue,
        itemPaddingX: this.itemPaddingXValue,
        itemPaddingY: this.itemPaddingYValue,
        indicatorWidth: this.indicatorWidthValue,
      }
    );
  }

  /**
   * Build the menu element wrapped in anchored + deferred.
   * For right-click menus, we use the click position directly.
   */
  private buildMenuElement(theme: Theme): {
    deferred: DeferredElement;
    anchored: AnchoredElement;
    backdrop: GladeDiv;
  } {
    const menuContent = new GladeDropdownMenuContent();
    menuContent.setItems([...this.menuItems]);
    menuContent.setContext(this.buildMenuContext(theme));

    // Wrap in anchored for positioning at click location
    const anchoredMenu = new AnchoredElement();
    anchoredMenu
      .anchor("top-left")
      .position(this.positionValue)
      .snapToWindowWithMargin(this.windowMarginValue)
      .child(menuContent);

    // Create a full-window transparent backdrop for click-outside-to-close
    const onOpenChange = this.onOpenChangeHandler;
    const backdrop = new GladeDiv();
    backdrop
      .absolute()
      .inset(0)
      .occludeMouse()
      .onClick(() => {
        if (onOpenChange) {
          onOpenChange(false);
        }
      })
      .child(anchoredMenu);

    // Wrap in deferred for z-ordering (priority 1 = menus)
    const deferredMenu = new DeferredElement(backdrop);
    deferredMenu.priority(1);

    return { deferred: deferredMenu, anchored: anchoredMenu, backdrop };
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<RightClickRequestState> {
    // Layout menu if open
    let menuLayoutId: LayoutId | null = null;
    let menuElementId: GlobalElementId | null = null;
    let menuRequestState: unknown = null;
    let menuElement: GladeElement<unknown, unknown> | null = null;
    let anchoredElement: AnchoredElement | null = null;
    let backdropElement: GladeDiv | null = null;

    if (this.openValue && this.menuItems.length > 0) {
      const theme = cx.getTheme();
      const { deferred, anchored, backdrop } = this.buildMenuElement(theme);
      menuElement = deferred;
      anchoredElement = anchored;
      backdropElement = backdrop;
      menuElementId = cx.allocateChildId();
      const menuCx: RequestLayoutContext = { ...cx, elementId: menuElementId };
      const menuResult = menuElement.requestLayout(menuCx);
      menuLayoutId = menuResult.layoutId;
      menuRequestState = menuResult.requestState;
    }

    // The right-click menu has zero size (it only renders the deferred menu)
    const layoutId = cx.requestLayout({ width: 0, height: 0 }, []);
    return {
      layoutId,
      requestState: {
        layoutId,
        menuLayoutId,
        menuElementId,
        menuRequestState,
        menuElement,
        anchoredElement,
        backdropElement,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: RightClickRequestState
  ): RightClickPrepaintState {
    const { menuLayoutId, menuElementId, menuRequestState, menuElement } = requestState;

    // Prepaint menu if open - this registers it with the deferred draw system
    if (
      menuElement &&
      menuLayoutId !== null &&
      menuElementId !== null &&
      requestState.anchoredElement
    ) {
      const windowSize = cx.getWindowSize?.() ?? { width: 0, height: 0 };

      // Set window size on the anchored element
      requestState.anchoredElement.setWindowSize(windowSize);

      // Set backdrop to cover the full window
      if (requestState.backdropElement) {
        requestState.backdropElement.w(windowSize.width).h(windowSize.height);
      }

      const menuBounds = cx.getBounds(menuLayoutId);
      const menuCx = cx.withElementId(menuElementId);
      // Prepaint will cause the DeferredElement to register itself via registerDeferredDraw
      menuElement.prepaint(menuCx, menuBounds, menuRequestState);
    }

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };

    return { hitTestNode };
  }

  paint(_cx: PaintContext, _bounds: Bounds, _prepaintState: RightClickPrepaintState): void {
    // Nothing to paint; popover content handles visuals.
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

export function rightClickMenu(): GladeRightClickMenu {
  return new GladeRightClickMenu();
}

export function rightClickItem(label: string): GladeDropdownItem {
  return new GladeDropdownItem(label);
}

export function rightClickSeparator(): GladeDropdownSeparator {
  return new GladeDropdownSeparator();
}

export function rightClickLabel(label: string): GladeDropdownLabel {
  return new GladeDropdownLabel(label);
}

export function rightClickCheckbox(label: string): GladeDropdownCheckbox {
  return new GladeDropdownCheckbox(label);
}

export function rightClickRadio(label: string, value: string): GladeDropdownRadio {
  return new GladeDropdownRadio(label, value);
}

export function rightClickRadioGroup(): GladeDropdownRadioGroup {
  return new GladeDropdownRadioGroup();
}

export function rightClickSub(label: string): GladeDropdownSub {
  return new GladeDropdownSub(label);
}

export type {
  DropdownAlign,
  DropdownMenuContentPrepaintState,
  DropdownMenuContentRequestState,
  DropdownMenuContext,
  DropdownMenuState,
  DropdownOpenChangeHandler,
  DropdownSide,
  MenuItemElement,
};
