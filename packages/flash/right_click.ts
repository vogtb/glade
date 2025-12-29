import {
  FlashContainerElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { Bounds, Color } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode } from "./dispatch.ts";
import { HitboxBehavior } from "./hitbox.ts";
import type { PopoverConfig } from "./popover.ts";
import type { FlashContext } from "./context.ts";
import {
  DEFAULT_CHECK_COLOR,
  DEFAULT_DESTRUCTIVE_HOVER_BG,
  DEFAULT_DESTRUCTIVE_TEXT,
  DEFAULT_FONT_SIZE,
  DEFAULT_INDICATOR_WIDTH,
  DEFAULT_ITEM_BG,
  DEFAULT_ITEM_DISABLED_TEXT,
  DEFAULT_ITEM_HOVER_BG,
  DEFAULT_ITEM_HOVER_TEXT,
  DEFAULT_ITEM_PADDING_X,
  DEFAULT_ITEM_PADDING_Y,
  DEFAULT_ITEM_TEXT,
  DEFAULT_LABEL_FONT_SIZE,
  DEFAULT_LABEL_TEXT,
  DEFAULT_MENU_BG,
  DEFAULT_MENU_BORDER,
  DEFAULT_MENU_BORDER_RADIUS,
  DEFAULT_MENU_PADDING,
  DEFAULT_SEPARATOR_COLOR,
  DEFAULT_SHORTCUT_FONT_SIZE,
  DEFAULT_SHORTCUT_TEXT,
  FlashDropdownCheckbox,
  FlashDropdownItem,
  FlashDropdownLabel,
  FlashDropdownMenuContent,
  FlashDropdownRadio,
  FlashDropdownRadioGroup,
  FlashDropdownSeparator,
  FlashDropdownSub,
  buildRootMenuContext,
  clearDropdownState,
  hasDropdownState,
  resetDropdownState,
  type DropdownMenuContentPrepaintState,
  type DropdownMenuContentRequestState,
  type DropdownMenuContext,
  type DropdownMenuState,
  type DropdownOpenChangeHandler,
  type DropdownSide,
  type DropdownAlign,
  type MenuItemElement,
} from "./menu.ts";

type RightClickRequestState = {
  layoutId: LayoutId;
};

type RightClickPrepaintState = {
  hitTestNode: HitTestNode;
};

type Position = { x: number; y: number };

let rightClickIdCounter = 0;

export class FlashRightClickMenu extends FlashContainerElement<
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
  private shortcutTextColor: Color = DEFAULT_SHORTCUT_TEXT;
  private checkColorValue: Color = DEFAULT_CHECK_COLOR;
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

  items(...items: Array<MenuItemElement | FlashDropdownRadioGroup>): this {
    for (const item of items) {
      if (item instanceof FlashDropdownRadioGroup) {
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

  shortcutText(c: Color): this {
    this.shortcutTextColor = c;
    return this;
  }

  checkColor(c: Color): this {
    this.checkColorValue = c;
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

  private buildMenuContext(): DropdownMenuContext {
    return buildRootMenuContext(
      this.menuId,
      this.menuItems,
      this.disabledValue,
      this.onOpenChangeHandler,
      {
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
        shortcutText: this.shortcutTextColor,
        checkColor: this.checkColorValue,
        fontSize: this.fontSizeValue,
        labelFontSize: this.labelFontSizeValue,
        shortcutFontSize: this.shortcutFontSizeValue,
        itemPaddingX: this.itemPaddingXValue,
        itemPaddingY: this.itemPaddingYValue,
        indicatorWidth: this.indicatorWidthValue,
      }
    );
  }

  private buildPopoverConfig(): PopoverConfig {
    return {
      side: this.sideValue,
      align: this.alignValue,
      sideOffset: this.sideOffsetValue,
      windowMargin: this.windowMarginValue,
    };
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<RightClickRequestState> {
    const layoutId = cx.requestLayout({ width: 0, height: 0 }, []);
    return {
      layoutId,
      requestState: { layoutId },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    _requestState: RightClickRequestState
  ): RightClickPrepaintState {
    const triggerBounds: Bounds = {
      x: this.positionValue.x,
      y: this.positionValue.y,
      width: 1,
      height: 1,
    };

    if (this.openValue && this.menuItems.length > 0) {
      const menuItems = [...this.menuItems];
      const menuContext = this.buildMenuContext();

      // We still need a hitbox for PopoverManager to handle outside click.
      const hitbox = cx.insertHitbox(triggerBounds, HitboxBehavior.Normal, "default");

      cx.registerPopover({
        id: this.menuId,
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
        onClose: this.onOpenChangeHandler ? () => this.onOpenChangeHandler?.(false) : null,
      });
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

export function rightClickMenu(): FlashRightClickMenu {
  return new FlashRightClickMenu();
}

export function rightClickItem(label: string): FlashDropdownItem {
  return new FlashDropdownItem(label);
}

export function rightClickSeparator(): FlashDropdownSeparator {
  return new FlashDropdownSeparator();
}

export function rightClickLabel(label: string): FlashDropdownLabel {
  return new FlashDropdownLabel(label);
}

export function rightClickCheckbox(label: string): FlashDropdownCheckbox {
  return new FlashDropdownCheckbox(label);
}

export function rightClickRadio(label: string, value: string): FlashDropdownRadio {
  return new FlashDropdownRadio(label, value);
}

export function rightClickRadioGroup(): FlashDropdownRadioGroup {
  return new FlashDropdownRadioGroup();
}

export function rightClickSub(label: string): FlashDropdownSub {
  return new FlashDropdownSub(label);
}

export type {
  DropdownMenuContentPrepaintState,
  DropdownMenuContentRequestState,
  DropdownMenuContext,
  DropdownMenuState,
  DropdownOpenChangeHandler,
  DropdownSide,
  DropdownAlign,
  MenuItemElement,
};
