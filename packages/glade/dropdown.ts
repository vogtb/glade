import {
  GladeContainerElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type GlobalElementId,
} from "./element.ts";
import { type Bounds } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode, ClickHandler } from "./dispatch.ts";
import { HitboxBehavior } from "./hitbox.ts";
import type { PopoverConfig } from "./popover.ts";
import type { GladeContext } from "./context.ts";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_INDICATOR_WIDTH,
  DEFAULT_ITEM_PADDING_X,
  DEFAULT_ITEM_PADDING_Y,
  DEFAULT_LABEL_FONT_SIZE,
  DEFAULT_MENU_BORDER_RADIUS,
  DEFAULT_MENU_PADDING,
  DEFAULT_SHORTCUT_FONT_SIZE,
  GladeDropdownCheckbox,
  GladeDropdownItem,
  GladeDropdownLabel,
  GladeDropdownMenuContent,
  GladeDropdownRadio,
  GladeDropdownRadioGroup,
  GladeDropdownSeparator,
  GladeDropdownSub,
  buildRootMenuContext,
  clearDropdownState,
  hasDropdownState,
  resetDropdownState,
  type DropdownMenuContentPrepaintState,
  type DropdownMenuContentRequestState,
  type DropdownMenuContext,
  type DropdownMenuState,
  type DropdownOpenChangeHandler,
  type DropdownSelectHandler,
  type DropdownCheckedChangeHandler,
  type DropdownValueChangeHandler,
  type DropdownSide,
  type DropdownAlign,
  type MenuItemElement,
} from "./menu.ts";
import { menuColors } from "./theme.ts";
import { toColorObject, type Color, type ColorObject } from "@glade/utils";

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

export class GladeDropdown extends GladeContainerElement<
  DropdownRequestState,
  DropdownPrepaintState
> {
  private dropdownId: string;
  private openValue = false;
  private onOpenChangeHandler: DropdownOpenChangeHandler | null = null;
  private disabledValue = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private triggerElement: GladeContainerElement<any, any> | null = null;
  private menuItems: MenuItemElement[] = [];

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
    this.dropdownId = `dropdown-${dropdownIdCounter++}`;
  }

  id(stableId: string): this {
    this.dropdownId = stableId;
    return this;
  }

  open(v: boolean): this {
    this.openValue = v;
    if (v) {
      if (!hasDropdownState(this.dropdownId)) {
        resetDropdownState(this.dropdownId);
      }
    } else {
      clearDropdownState(this.dropdownId);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger(element: GladeContainerElement<any, any>): this {
    this.triggerElement = element;
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

  private buildMenuContext(theme: import("./theme.ts").Theme): DropdownMenuContext {
    const base = menuColors(theme);
    return buildRootMenuContext(
      this.dropdownId,
      this.menuItems,
      this.disabledValue,
      this.onOpenChangeHandler,
      {
        menuBg: this.menuBgColor ?? base.menuBg,
        menuBorder: this.menuBorderColor ?? base.menuBorder,
        menuBorderRadius: this.menuBorderRadiusValue,
        menuPadding: this.menuPaddingValue,
        itemBg: this.itemBgColor ?? base.itemBg,
        itemHoverBg: this.itemHoverBgColor ?? base.itemHoverBg,
        itemText: this.itemTextColor ?? base.itemText,
        itemHoverText: this.itemHoverTextColor ?? base.itemHoverText,
        itemDisabledText: this.itemDisabledTextColor ?? base.itemDisabledText,
        labelText: this.labelTextColor ?? base.labelText,
        separatorColor: this.separatorColorValue ?? base.separatorColor,
        destructiveText: this.destructiveTextColor ?? base.destructiveText,
        destructiveHoverBg: this.destructiveHoverBgColor ?? base.destructiveHoverBg,
        shortcutText: this.shortcutTextColor ?? base.shortcutText,
        checkColor: this.checkColorValue ?? base.checkColor,
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

    const triggerElementId = cx.allocateChildId();
    const triggerCx: RequestLayoutContext = { ...cx, elementId: triggerElementId };
    const triggerResult = this.triggerElement.requestLayout(triggerCx);

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
    const { layoutId, triggerLayoutId, triggerElementId, triggerRequestState } = requestState;

    const originalBounds = cx.getBounds(layoutId);
    const deltaX = bounds.x - originalBounds.x;
    const deltaY = bounds.y - originalBounds.y;

    const originalTriggerBounds = cx.getBounds(triggerLayoutId);
    const triggerBounds: Bounds = {
      x: originalTriggerBounds.x + deltaX,
      y: originalTriggerBounds.y + deltaY,
      width: originalTriggerBounds.width,
      height: originalTriggerBounds.height,
    };

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

    const isDisabled = this.disabledValue;
    const onOpenChange = this.onOpenChangeHandler;
    const currentOpen = this.openValue;

    const triggerClickHandler: ClickHandler = (_event, _window, _cx) => {
      if (isDisabled) return;
      if (onOpenChange) {
        onOpenChange(!currentOpen);
      }
    };

    const hitbox = cx.insertHitbox(
      triggerBounds,
      HitboxBehavior.Normal,
      isDisabled ? "not-allowed" : "pointer"
    );

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

    if (this.openValue && this.menuItems.length > 0) {
      const menuItems = [...this.menuItems];
      const theme = cx.getWindow().getTheme();
      const menuContext = this.buildMenuContext(theme);

      cx.registerPopover({
        id: this.dropdownId,
        hitboxId: hitbox.id,
        triggerBounds,
        builder: (_gladeCx: GladeContext) => {
          const menuContent = new GladeDropdownMenuContent();
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

export function dropdown(): GladeDropdown {
  return new GladeDropdown();
}

export function dropdownItem(label: string): GladeDropdownItem {
  return new GladeDropdownItem(label);
}

export function dropdownSeparator(): GladeDropdownSeparator {
  return new GladeDropdownSeparator();
}

export function dropdownLabel(label: string): GladeDropdownLabel {
  return new GladeDropdownLabel(label);
}

export function dropdownCheckbox(label: string): GladeDropdownCheckbox {
  return new GladeDropdownCheckbox(label);
}

export function dropdownRadio(label: string, value: string): GladeDropdownRadio {
  return new GladeDropdownRadio(label, value);
}

export function dropdownRadioGroup(): GladeDropdownRadioGroup {
  return new GladeDropdownRadioGroup();
}

export function dropdownSub(label: string): GladeDropdownSub {
  return new GladeDropdownSub(label);
}

export {
  GladeDropdownItem,
  GladeDropdownSeparator,
  GladeDropdownLabel,
  GladeDropdownCheckbox,
  GladeDropdownRadio,
  GladeDropdownRadioGroup,
  GladeDropdownSub,
  GladeDropdownMenuContent,
};

export type {
  DropdownMenuContentPrepaintState,
  DropdownMenuContentRequestState,
  DropdownMenuContext,
  DropdownMenuState,
  DropdownOpenChangeHandler,
  DropdownSelectHandler,
  DropdownCheckedChangeHandler,
  DropdownValueChangeHandler,
  DropdownSide,
  DropdownAlign,
  MenuItemElement,
};
