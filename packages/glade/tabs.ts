/**
 * Tabs components - a set of layered content sections, known as tab panels,
 * that display one panel at a time based on the selected tab trigger.
 *
 * The Tabs component is the parent container that manages selection state.
 * Tab components define individual tabs with triggers and content.
 *
 * Follows accessibility and API patterns similar to Radix UI / Base UI tabs.
 */

import { type Color, type ColorObject, toColorObject } from "@glade/utils";

import type { Bounds } from "./bounds.ts";
import type { ClickHandler, HitTestNode } from "./dispatch.ts";
import {
  type AnyGladeElement,
  GladeContainerElement,
  GladeElement,
  type GlobalElementId,
  type PaintContext,
  type PrepaintContext,
  type RequestLayoutContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { FocusHandle } from "./entity.ts";
import type { Hitbox } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";
import type { LayoutId } from "./layout.ts";
import type { Styles } from "./styles.ts";
import { StyleBuilder } from "./styles.ts";
import type { Theme } from "./theme.ts";

const DEFAULT_DISABLED_OPACITY = 0.5;

const DEFAULT_TRIGGER_FONT_SIZE = 14;
const DEFAULT_TRIGGER_PADDING_X = 16;
const DEFAULT_TRIGGER_PADDING_Y = 10;
const DEFAULT_INDICATOR_HEIGHT = 2;

/**
 * Handler called when tab selection changes.
 */
export type TabValueChangeHandler = (value: string) => void;

/**
 * Context passed from Tabs to Tab.
 * Used internally to communicate selection state and styling.
 */
type TabsContext = {
  value: string | null;
  onValueChange: TabValueChangeHandler | null;
  disabled: boolean;
  triggerBg: ColorObject;
  triggerActiveBg: ColorObject;
  triggerHoverBg: ColorObject;
  triggerText: ColorObject;
  triggerActiveText: ColorObject;
  triggerHoverText: ColorObject;
  triggerDisabledText: ColorObject;
  indicatorColor: ColorObject;
  indicatorHover: ColorObject;
  triggerFontSize: number;
  triggerPaddingX: number;
  triggerPaddingY: number;
  indicatorHeight: number;
};

// ============================================================================
// Tab (individual tab with trigger and content)
// ============================================================================

/**
 * Request layout state for tab trigger.
 */
type TabTriggerRequestState = {
  layoutId: LayoutId;
  measureId: number;
  fontFamily: string;
};

/**
 * Prepaint state for tab trigger.
 */
type TabTriggerPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  textBounds: Bounds;
  fontFamily: string;
};

/**
 * Internal element for rendering a tab trigger (the clickable label).
 */
class GladeTabTrigger extends GladeElement<TabTriggerRequestState, TabTriggerPrepaintState> {
  private tabValue: string;
  private labelText: string;
  private disabledValue: boolean = false;
  private focusHandleRef: FocusHandle | null = null;
  private hoverStyles: Partial<Styles> | null = null;
  private focusedStyles: Partial<Styles> | null = null;

  private context: TabsContext | null = null;

  constructor(value: string, label: string) {
    super();
    this.tabValue = value;
    this.labelText = label;
  }

  getValue(): string {
    return this.tabValue;
  }

  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  trackFocus(handle: FocusHandle): this {
    this.focusHandleRef = handle;
    return this;
  }

  hover(f: (s: StyleBuilder) => StyleBuilder): this {
    this.hoverStyles = f(new StyleBuilder()).build();
    return this;
  }

  focused(f: (s: StyleBuilder) => StyleBuilder): this {
    this.focusedStyles = f(new StyleBuilder()).build();
    return this;
  }

  setContext(context: TabsContext): void {
    this.context = context;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<TabTriggerRequestState> {
    const fontSize = this.context?.triggerFontSize ?? DEFAULT_TRIGGER_FONT_SIZE;
    const paddingX = this.context?.triggerPaddingX ?? DEFAULT_TRIGGER_PADDING_X;
    const paddingY = this.context?.triggerPaddingY ?? DEFAULT_TRIGGER_PADDING_Y;
    const lineHeight = fontSize * 1.2;
    const fontFamily = cx.getTheme().fonts.sans.name;

    const measureId = cx.registerTextMeasure({
      text: this.labelText,
      fontSize,
      fontFamily,
      fontWeight: 500,
      fontStyle: "normal",
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
        flexShrink: 0,
      },
      measureId
    );

    return { layoutId, requestState: { layoutId, measureId, fontFamily } };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: TabTriggerRequestState
  ): TabTriggerPrepaintState {
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);
    const cursor = isDisabled ? "not-allowed" : "pointer";
    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal, cursor);

    const tabValue = this.tabValue;
    const context = this.context;

    const clickHandler: ClickHandler = (_event, _window, _cx) => {
      if (isDisabled) return;
      if (context?.onValueChange) {
        context.onValueChange(tabValue);
      }
    };

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {
        click: clickHandler,
      },
      focusHandle: this.focusHandleRef,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };

    const paddingX = this.context?.triggerPaddingX ?? DEFAULT_TRIGGER_PADDING_X;
    const paddingY = this.context?.triggerPaddingY ?? DEFAULT_TRIGGER_PADDING_Y;

    const textBounds: Bounds = {
      x: bounds.x + paddingX,
      y: bounds.y + paddingY,
      width: bounds.width - paddingX * 2,
      height: bounds.height - paddingY * 2,
    };

    return { hitbox, hitTestNode, textBounds, fontFamily: requestState.fontFamily };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: TabTriggerPrepaintState): void {
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.focusHandleRef ? cx.isFocused(this.focusHandleRef) : false;
    const isActive = this.context?.value === this.tabValue;
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);
    const context = this.context;
    if (!context) {
      return;
    }

    const triggerBg = context.triggerBg;
    const triggerActiveBg = context.triggerActiveBg;
    const triggerHoverBg = context.triggerHoverBg;
    const triggerText = context.triggerText;
    const triggerActiveText = context.triggerActiveText;
    const triggerHoverText = context.triggerHoverText;
    const triggerDisabledText = context.triggerDisabledText;
    const indicatorColor = context.indicatorColor;
    const indicatorHover = context.indicatorHover;
    const indicatorHeight = context.indicatorHeight ?? DEFAULT_INDICATOR_HEIGHT;
    const fontSize = context.triggerFontSize ?? DEFAULT_TRIGGER_FONT_SIZE;
    const fontFamily = prepaintState.fontFamily;

    let bgColor = isActive ? triggerActiveBg : triggerBg;
    let textColor = isActive ? triggerActiveText : triggerText;
    let opacity = isDisabled ? DEFAULT_DISABLED_OPACITY : 1;

    if (isDisabled) {
      textColor = triggerDisabledText;
    }

    // Apply hover styles
    if (isHovered && !isDisabled) {
      if (this.hoverStyles?.backgroundColor) {
        bgColor = this.hoverStyles.backgroundColor;
      } else {
        bgColor = isActive ? triggerActiveBg : triggerHoverBg;
      }
      textColor = triggerHoverText;
      if (this.hoverStyles?.opacity !== undefined) {
        opacity = this.hoverStyles.opacity;
      }
    }

    // Apply focused styles
    if (isFocused && this.focusedStyles) {
      if (this.focusedStyles.backgroundColor) {
        bgColor = this.focusedStyles.backgroundColor;
      }
    }

    // Paint background
    cx.paintRect(bounds, {
      backgroundColor: { ...bgColor, a: bgColor.a * opacity },
    });

    // Paint text in the padded content area
    cx.paintGlyphs(
      this.labelText,
      prepaintState.textBounds,
      { ...textColor, a: textColor.a * opacity },
      {
        fontSize,
        fontFamily,
        fontWeight: 500,
      }
    );

    // Paint active indicator (bottom border)
    if (isActive) {
      const indicatorBounds: Bounds = {
        x: bounds.x,
        y: bounds.y + bounds.height - indicatorHeight,
        width: bounds.width,
        height: indicatorHeight,
      };
      const indicator = isHovered ? indicatorHover : indicatorColor;
      cx.paintRect(indicatorBounds, {
        backgroundColor: { ...indicator, a: indicator.a * opacity },
      });
    }
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode {
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);
    const tabValue = this.tabValue;
    const context = this.context;

    return {
      bounds,
      handlers: {
        click: (_event, _window, _cx) => {
          if (isDisabled) return;
          if (context?.onValueChange) {
            context.onValueChange(tabValue);
          }
        },
      },
      focusHandle: this.focusHandleRef,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };
  }
}

/**
 * A tab panel containing both a trigger (label) and content.
 * Used as a child of Tabs to define individual tabs.
 */
export class GladeTab {
  private tabValue: string;
  private labelText: string;

  private contentElement: AnyGladeElement | null = null;
  private disabledValue: boolean = false;

  constructor(value: string, label: string) {
    this.tabValue = value;
    this.labelText = label;
  }

  /**
   * Get the value of this tab.
   */
  getValue(): string {
    return this.tabValue;
  }

  /**
   * Get the label text.
   */
  getLabel(): string {
    return this.labelText;
  }

  /**
   * Set the content element to display when this tab is active.
   */

  content(element: AnyGladeElement): this {
    this.contentElement = element;
    return this;
  }

  /**
   * Get the content element.
   */

  getContent(): AnyGladeElement | null {
    return this.contentElement;
  }

  /**
   * Disable this tab.
   */
  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  /**
   * Check if disabled.
   */
  isDisabled(): boolean {
    return this.disabledValue;
  }

  /**
   * Create the trigger element for this tab.
   * @internal
   */
  createTrigger(): GladeTabTrigger {
    const trigger = new GladeTabTrigger(this.tabValue, this.labelText);
    if (this.disabledValue) {
      trigger.disabled(true);
    }
    return trigger;
  }
}

// ============================================================================
// Tabs (container)
// ============================================================================

/**
 * Request layout state for tabs container.
 */
type TabsRequestState = {
  layoutId: LayoutId;
  triggerListLayoutId: LayoutId;
  contentLayoutId: LayoutId | null;
  triggerLayoutIds: LayoutId[];
  triggerElementIds: GlobalElementId[];
  triggerRequestStates: TabTriggerRequestState[];
  contentElementId: GlobalElementId | null;
  contentRequestState: unknown;
};

/**
 * Prepaint state for tabs container.
 */
type TabsPrepaintState = {
  triggerElementIds: GlobalElementId[];
  triggerPrepaintStates: TabTriggerPrepaintState[];
  triggerBounds: Bounds[];
  contentElementId: GlobalElementId | null;
  contentPrepaintState: unknown;
  contentBounds: Bounds | null;
  hitTestNode: HitTestNode;
  context: TabsContext;
  colors: ResolvedTabsColors;
};

type ResolvedTabsColors = {
  triggerBg: ColorObject;
  triggerActiveBg: ColorObject;
  triggerHoverBg: ColorObject;
  triggerText: ColorObject;
  triggerActiveText: ColorObject;
  triggerHoverText: ColorObject;
  triggerDisabledText: ColorObject;
  indicator: ColorObject;
  indicatorHover: ColorObject;
  border: ColorObject;
  contentBg: ColorObject;
};

/**
 * A tabs container that manages selection state and renders tab triggers
 * horizontally with content below.
 */
export class GladeTabs extends GladeContainerElement<TabsRequestState, TabsPrepaintState> {
  private styles: Partial<Styles> = {};
  private valueState: string | null = null;
  private onValueChangeHandler: TabValueChangeHandler | null = null;
  private disabledValue: boolean = false;

  // Tab items (not children - they're data, not elements)
  private tabItems: GladeTab[] = [];

  // Trigger elements (created from tab items)
  private triggerElements: GladeTabTrigger[] = [];

  // Styling configuration
  private triggerBgColor: ColorObject | null = null;
  private triggerActiveBgColor: ColorObject | null = null;
  private triggerTextColor: ColorObject | null = null;
  private triggerActiveTextColor: ColorObject | null = null;
  private indicatorColorValue: ColorObject | null = null;
  private borderColorValue: ColorObject | null = null;
  private contentBgColor: ColorObject | null = null;

  private triggerFontSizeValue: number = DEFAULT_TRIGGER_FONT_SIZE;
  private triggerPaddingXValue: number = DEFAULT_TRIGGER_PADDING_X;
  private triggerPaddingYValue: number = DEFAULT_TRIGGER_PADDING_Y;
  private indicatorHeightValue: number = DEFAULT_INDICATOR_HEIGHT;
  private contentPaddingValue: number = 16;
  private borderRadiusValue: number = 0;

  // ============ Layout Styles ============

  /**
   * Set width.
   */
  w(v: number | string): this {
    this.styles.width = v;
    return this;
  }

  /**
   * Set width to 100%.
   */
  wFull(): this {
    this.styles.width = "100%";
    return this;
  }

  /**
   * Set height.
   */
  h(v: number | string): this {
    this.styles.height = v;
    return this;
  }

  /**
   * Set flex grow.
   */
  grow(): this {
    this.styles.flexGrow = 1;
    return this;
  }

  /**
   * Set border radius for the content area.
   */
  rounded(v: number): this {
    this.borderRadiusValue = v;
    return this;
  }

  // ============ Tabs Specific ============

  /**
   * Set the currently selected tab value (controlled mode).
   */
  value(v: string): this {
    this.valueState = v;
    return this;
  }

  /**
   * Set the change handler.
   */
  onValueChange(handler: TabValueChangeHandler): this {
    this.onValueChangeHandler = handler;
    return this;
  }

  /**
   * Disable all tabs.
   */
  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  /**
   * Add tab items to this tabs container.
   */
  items(...items: GladeTab[]): this {
    for (const item of items) {
      this.tabItems.push(item);
    }
    return this;
  }

  // ============ Trigger Styling ============

  /**
   * Set the background color for inactive triggers.
   */
  triggerBg(c: Color): this {
    this.triggerBgColor = toColorObject(c);
    return this;
  }

  /**
   * Set the background color for active trigger.
   */
  triggerActiveBg(c: Color): this {
    this.triggerActiveBgColor = toColorObject(c);
    return this;
  }

  /**
   * Set the text color for inactive triggers.
   */
  triggerText(c: Color): this {
    this.triggerTextColor = toColorObject(c);
    return this;
  }

  /**
   * Set the text color for active trigger.
   */
  triggerActiveText(c: Color): this {
    this.triggerActiveTextColor = toColorObject(c);
    return this;
  }

  /**
   * Set the indicator color (active tab underline).
   */
  indicatorColor(c: Color): this {
    this.indicatorColorValue = toColorObject(c);
    return this;
  }

  /**
   * Set the trigger font size.
   */
  triggerFontSize(v: number): this {
    this.triggerFontSizeValue = v;
    return this;
  }

  /**
   * Set horizontal padding for triggers.
   */
  triggerPaddingX(v: number): this {
    this.triggerPaddingXValue = v;
    return this;
  }

  /**
   * Set vertical padding for triggers.
   */
  triggerPaddingY(v: number): this {
    this.triggerPaddingYValue = v;
    return this;
  }

  /**
   * Set the indicator height.
   */
  indicatorHeight(v: number): this {
    this.indicatorHeightValue = v;
    return this;
  }

  // ============ Content Styling ============

  /**
   * Set the border color.
   */
  borderColor(c: Color): this {
    this.borderColorValue = toColorObject(c);
    return this;
  }

  /**
   * Set the content area background color.
   */
  contentBg(c: Color): this {
    this.contentBgColor = toColorObject(c);
    return this;
  }

  /**
   * Set the content area padding.
   */
  contentPadding(v: number): this {
    this.contentPaddingValue = v;
    return this;
  }

  /**
   * Build the context to pass to triggers.
   */
  private buildContext(colors: ResolvedTabsColors): TabsContext {
    return {
      value: this.valueState,
      onValueChange: this.onValueChangeHandler,
      disabled: this.disabledValue,
      triggerBg: colors.triggerBg,
      triggerActiveBg: colors.triggerActiveBg,
      triggerHoverBg: colors.triggerHoverBg,
      triggerText: colors.triggerText,
      triggerActiveText: colors.triggerActiveText,
      triggerHoverText: colors.triggerHoverText,
      triggerDisabledText: colors.triggerDisabledText,
      indicatorColor: colors.indicator,
      indicatorHover: colors.indicatorHover,
      triggerFontSize: this.triggerFontSizeValue,
      triggerPaddingX: this.triggerPaddingXValue,
      triggerPaddingY: this.triggerPaddingYValue,
      indicatorHeight: this.indicatorHeightValue,
    };
  }

  private resolveColors(theme: Theme): ResolvedTabsColors {
    const tabsTheme = theme.components.tabs;
    const trigger = tabsTheme.trigger;
    return {
      triggerBg: this.triggerBgColor ?? trigger.background,
      triggerActiveBg: this.triggerActiveBgColor ?? trigger.active.background,
      triggerHoverBg: trigger.hover.background,
      triggerText: this.triggerTextColor ?? trigger.foreground,
      triggerActiveText: this.triggerActiveTextColor ?? trigger.active.foreground,
      triggerHoverText: trigger.active.foreground,
      triggerDisabledText: trigger.disabled.foreground,
      indicator: this.indicatorColorValue ?? tabsTheme.indicator,
      indicatorHover: tabsTheme.indicatorHover,
      border: this.borderColorValue ?? tabsTheme.border,
      contentBg: this.contentBgColor ?? tabsTheme.content.background,
    };
  }

  /**
   * Get the currently active tab's content element.
   */

  private getActiveContent(): AnyGladeElement | null {
    if (this.valueState === null) {
      return null;
    }
    for (const tab of this.tabItems) {
      if (tab.getValue() === this.valueState) {
        return tab.getContent();
      }
    }
    return null;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<TabsRequestState> {
    const colors = this.resolveColors(cx.getTheme());
    const context = this.buildContext(colors);

    // Create trigger elements from tab items
    this.triggerElements = [];
    for (const tabItem of this.tabItems) {
      const trigger = tabItem.createTrigger();
      trigger.setContext(context);
      this.triggerElements.push(trigger);
    }

    // Layout triggers
    const triggerLayoutIds: LayoutId[] = [];
    const triggerElementIds: GlobalElementId[] = [];
    const triggerRequestStates: TabTriggerRequestState[] = [];

    for (const trigger of this.triggerElements) {
      const childId = cx.allocateChildId();
      const childCx: RequestLayoutContext = {
        ...cx,
        elementId: childId,
      };
      const result = trigger.requestLayout(childCx);
      triggerLayoutIds.push(result.layoutId);
      triggerElementIds.push(childId);
      triggerRequestStates.push(result.requestState);
    }

    // Trigger list container (horizontal row)
    const triggerListLayoutId = cx.requestLayout(
      {
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        width: "100%",
        flexShrink: 0,
      },
      triggerLayoutIds
    );

    // Layout active content
    let contentLayoutId: LayoutId | null = null;
    let contentElementId: GlobalElementId | null = null;
    let contentRequestState: unknown = null;

    const activeContent = this.getActiveContent();
    if (activeContent) {
      contentElementId = cx.allocateChildId();
      const contentCx: RequestLayoutContext = {
        ...cx,
        elementId: contentElementId,
      };
      const contentResult = activeContent.requestLayout(contentCx);
      contentLayoutId = contentResult.layoutId;
      contentRequestState = contentResult.requestState;
    }

    // Content wrapper with padding
    const contentWrapperChildren = contentLayoutId ? [contentLayoutId] : [];
    const contentWrapperLayoutId = cx.requestLayout(
      {
        width: "100%",
        flexGrow: 1,
        paddingTop: this.contentPaddingValue,
        paddingRight: this.contentPaddingValue,
        paddingBottom: this.contentPaddingValue,
        paddingLeft: this.contentPaddingValue,
      },
      contentWrapperChildren
    );

    // Main container (vertical stack: triggers + content)
    const layoutId = cx.requestLayout(
      {
        display: "flex",
        flexDirection: "column",
        ...this.styles,
      },
      [triggerListLayoutId, contentWrapperLayoutId]
    );

    return {
      layoutId,
      requestState: {
        layoutId,
        triggerListLayoutId,
        contentLayoutId,
        triggerLayoutIds,
        triggerElementIds,
        triggerRequestStates,
        contentElementId,
        contentRequestState,
      },
    };
  }

  prepaint(cx: PrepaintContext, bounds: Bounds, requestState: TabsRequestState): TabsPrepaintState {
    const {
      layoutId,
      triggerListLayoutId,
      triggerLayoutIds,
      triggerElementIds,
      triggerRequestStates,
      contentElementId,
      contentRequestState,
    } = requestState;
    const colors = this.resolveColors(cx.getWindow().getTheme());
    const context = this.buildContext(colors);

    // Get original bounds and compute delta for scroll offset propagation
    const originalBounds = cx.getBounds(layoutId);
    const deltaX = bounds.x - originalBounds.x;
    const deltaY = bounds.y - originalBounds.y;

    // Get trigger list bounds
    const triggerListOriginalBounds = cx.getBounds(triggerListLayoutId);
    const triggerListBounds: Bounds = {
      x: triggerListOriginalBounds.x + deltaX,
      y: triggerListOriginalBounds.y + deltaY,
      width: triggerListOriginalBounds.width,
      height: triggerListOriginalBounds.height,
    };

    // Get trigger bounds
    const triggerOriginalBounds = cx.getChildLayouts(triggerListBounds, triggerLayoutIds);
    const triggerBounds: Bounds[] = [];
    const triggerPrepaintStates: TabTriggerPrepaintState[] = [];

    for (let i = 0; i < this.triggerElements.length; i++) {
      const trigger = this.triggerElements[i]!;
      const triggerId = triggerElementIds[i]!;
      let triggerBound = triggerOriginalBounds[i]!;
      const triggerRequestState = triggerRequestStates[i]!;

      // Apply delta
      triggerBound = {
        x: triggerBound.x + deltaX,
        y: triggerBound.y + deltaY,
        width: triggerBound.width,
        height: triggerBound.height,
      };

      triggerBounds.push(triggerBound);

      trigger.setContext(context);
      const triggerCx = cx.withElementId(triggerId);
      const prepaintState = trigger.prepaint(triggerCx, triggerBound, triggerRequestState);
      triggerPrepaintStates.push(prepaintState);
    }

    // Prepaint content
    let contentBounds: Bounds | null = null;
    let contentPrepaintState: unknown = null;

    const activeContent = this.getActiveContent();
    if (activeContent && contentElementId && requestState.contentLayoutId) {
      const contentOriginalBounds = cx.getBounds(requestState.contentLayoutId);
      contentBounds = {
        x: contentOriginalBounds.x + deltaX,
        y: contentOriginalBounds.y + deltaY,
        width: contentOriginalBounds.width,
        height: contentOriginalBounds.height,
      };

      const contentCx = cx.withElementId(contentElementId);

      contentPrepaintState = (activeContent as AnyGladeElement).prepaint(
        contentCx,
        contentBounds,
        contentRequestState
      );
    }

    // Build hit test node
    const triggerHitTestNodes: HitTestNode[] = [];
    for (let i = this.triggerElements.length - 1; i >= 0; i--) {
      const prepaintState = triggerPrepaintStates[i];
      if (prepaintState?.hitTestNode) {
        triggerHitTestNodes.unshift(prepaintState.hitTestNode);
      }
    }

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: triggerHitTestNodes,
    };

    return {
      triggerElementIds,
      triggerPrepaintStates,
      triggerBounds,
      contentElementId,
      contentPrepaintState,
      contentBounds,
      hitTestNode,
      context,
      colors,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: TabsPrepaintState): void {
    const {
      triggerElementIds,
      triggerPrepaintStates,
      triggerBounds,
      contentElementId,
      contentPrepaintState,
      contentBounds,
      context,
      colors,
    } = prepaintState;

    // Paint trigger list background
    let triggerListBounds: Bounds | null = null;
    if (triggerBounds.length > 0) {
      triggerListBounds = {
        x: bounds.x,
        y: triggerBounds[0]!.y,
        width: bounds.width,
        height: triggerBounds[0]!.height,
      };

      // Paint trigger list container background
      cx.paintRect(triggerListBounds, {
        backgroundColor: colors.triggerBg,
      });
    }

    // Paint triggers
    for (let i = 0; i < this.triggerElements.length; i++) {
      const trigger = this.triggerElements[i]!;
      const triggerId = triggerElementIds[i]!;
      const triggerBound = triggerBounds[i]!;
      const triggerPrepaintState = triggerPrepaintStates[i]!;

      trigger.setContext(context);
      const triggerCx = cx.withElementId(triggerId);
      trigger.paint(triggerCx, triggerBound, triggerPrepaintState);
    }

    // Paint bottom border line AFTER triggers so it's visible
    if (triggerListBounds) {
      const borderY = triggerListBounds.y + triggerListBounds.height - 1;
      cx.paintRect(
        {
          x: triggerListBounds.x,
          y: borderY,
          width: triggerListBounds.width,
          height: 1,
        },
        {
          backgroundColor: colors.border,
        }
      );
    }

    // Paint content area background
    if (contentBounds) {
      const contentAreaBounds: Bounds = {
        x: bounds.x,
        y: contentBounds.y - this.contentPaddingValue,
        width: bounds.width,
        height: bounds.height - (contentBounds.y - this.contentPaddingValue - bounds.y),
      };

      cx.paintRect(contentAreaBounds, {
        backgroundColor: colors.contentBg,
        borderRadius: this.borderRadiusValue,
      });
    }

    // Paint content
    const activeContent = this.getActiveContent();
    if (activeContent && contentElementId && contentBounds) {
      const contentCx = cx.withElementId(contentElementId);

      (activeContent as AnyGladeElement).paint(contentCx, contentBounds, contentPrepaintState);
    }
  }

  hitTest(bounds: Bounds, childBounds: Bounds[]): HitTestNode {
    const childNodes: HitTestNode[] = [];

    // Add trigger hit test nodes
    for (let i = this.triggerElements.length - 1; i >= 0; i--) {
      const trigger = this.triggerElements[i];
      const triggerBound = childBounds[i];
      if (trigger && triggerBound) {
        const childNode = trigger.hitTest(triggerBound, []);
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
}

/**
 * Factory function to create a tabs container.
 *
 * @example
 * // Basic tabs
 * tabs()
 *   .value(activeTab)
 *   .onValueChange(setActiveTab)
 *   .items(
 *     tab("account", "Account")
 *       .content(div().child(text("Account settings..."))),
 *     tab("security", "Security")
 *       .content(div().child(text("Security settings...")))
 *   )
 *
 * @example
 * // Styled tabs
 * tabs()
 *   .value("overview")
 *   .onValueChange(handleChange)
 *   .triggerActiveBg({ r: 0.2, g: 0.4, b: 0.8, a: 1 })
 *   .indicatorColor({ r: 0.3, g: 0.7, b: 1, a: 1 })
 *   .contentPadding(24)
 *   .items(
 *     tab("overview", "Overview").content(overviewContent),
 *     tab("analytics", "Analytics").content(analyticsContent),
 *     tab("reports", "Reports").content(reportsContent)
 *   )
 *
 * @example
 * // Disabled tab
 * tabs()
 *   .value("enabled")
 *   .items(
 *     tab("enabled", "Enabled").content(enabledContent),
 *     tab("disabled", "Disabled").disabled(true).content(disabledContent)
 *   )
 */
export function tabs(): GladeTabs {
  return new GladeTabs();
}

/**
 * Factory function to create a tab item.
 *
 * @param value - The unique value for this tab (used for selection matching)
 * @param label - The text label displayed in the tab trigger
 *
 * @example
 * // Basic tab with content
 * tab("settings", "Settings")
 *   .content(
 *     div()
 *       .p(16)
 *       .child(text("Settings content here"))
 *   )
 *
 * @example
 * // Disabled tab
 * tab("premium", "Premium Features")
 *   .disabled(true)
 *   .content(premiumContent)
 */
export function tab(value: string, label: string): GladeTab {
  return new GladeTab(value, label);
}
