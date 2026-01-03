/**
 * Shared menu primitives for dropdown and context menus.
 *
 * The code here is extracted from dropdown.ts so both dropdown and right-click
 * menus can share behavior without duplication.
 */

import {
  GladeContainerElement,
  GladeElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type GlobalElementId,
} from "./element.ts";
import { type Bounds, type Size, type WindowId } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode, ClickHandler, KeyHandler, MouseHandler } from "./dispatch.ts";
import type { Hitbox } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";
import type { ColorObject } from "@glade/utils";

export const DEFAULT_FONT_SIZE = 14;
export const DEFAULT_LABEL_FONT_SIZE = 12;
export const DEFAULT_SHORTCUT_FONT_SIZE = 12;
export const DEFAULT_ITEM_PADDING_X = 12;
export const DEFAULT_ITEM_PADDING_Y = 8;
export const DEFAULT_MENU_PADDING = 4;
export const DEFAULT_MENU_BORDER_RADIUS = 6;
export const DEFAULT_MENU_MIN_WIDTH = 160;
export const DEFAULT_SEPARATOR_HEIGHT = 1;
export const DEFAULT_SEPARATOR_MARGIN = 4;
export const DEFAULT_INDICATOR_WIDTH = 20;
export const DEFAULT_SUBMENU_DELAY = 150;
export const DEFAULT_SUBMENU_CLOSE_DELAY = 100;

// ============================================================================ //
// Global Submenu State                                                         //
// ============================================================================ //

export type SubmenuPath = string[];

export type DropdownSubmenuState = {
  sessionId: number;
  openPath: SubmenuPath;
  submenuBounds: Map<string, Bounds>;
  triggerBounds: Map<string, Bounds>;
  hoverTimers: Map<string, ReturnType<typeof setTimeout>>;
  closeTimers: Map<string, ReturnType<typeof setTimeout>>;
  lastCursorPosition: Point | null;
  prevCursorPosition: Point | null;
  lastCursorTimestamp: number;
};

let dropdownSessionCounter = 0;
const globalDropdownState = new Map<string, DropdownSubmenuState>();

function createDropdownState(): DropdownSubmenuState {
  return {
    sessionId: dropdownSessionCounter++,
    openPath: [],
    submenuBounds: new Map(),
    triggerBounds: new Map(),
    hoverTimers: new Map(),
    closeTimers: new Map(),
    lastCursorPosition: null,
    prevCursorPosition: null,
    lastCursorTimestamp: 0,
  };
}

export function getDropdownState(dropdownId: string): DropdownSubmenuState {
  let state = globalDropdownState.get(dropdownId);
  if (!state) {
    state = createDropdownState();
    globalDropdownState.set(dropdownId, state);
  }
  return state;
}

export function hasDropdownState(dropdownId: string): boolean {
  return globalDropdownState.has(dropdownId);
}

export function resetDropdownState(dropdownId: string): DropdownSubmenuState {
  const state = createDropdownState();
  globalDropdownState.set(dropdownId, state);
  return state;
}

export function clearDropdownState(dropdownId: string): void {
  const state = globalDropdownState.get(dropdownId);
  if (state) {
    for (const timer of state.hoverTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of state.closeTimers.values()) {
      clearTimeout(timer);
    }
  }
  globalDropdownState.delete(dropdownId);
}

export function isSubmenuContentVisible(dropdownId: string, path: SubmenuPath): boolean {
  const state = getDropdownState(dropdownId);
  const { openPath } = state;
  if (openPath.length < path.length) return false;
  for (let i = 0; i < path.length; i++) {
    if (openPath[i] !== path[i]) return false;
  }
  return true;
}

export function openSubmenuPath(dropdownId: string, path: SubmenuPath): void {
  const state = getDropdownState(dropdownId);
  state.openPath = path;
}

export function closeSubmenuAtDepth(dropdownId: string, depth: number): void {
  const state = getDropdownState(dropdownId);
  state.openPath = state.openPath.slice(0, depth);
}

export type MarkWindowDirtyFn = (windowId: WindowId) => void;

export function scheduleSubmenuOpen(
  dropdownId: string,
  path: SubmenuPath,
  delay: number,
  windowId: WindowId,
  markDirty: MarkWindowDirtyFn
): void {
  const state = getDropdownState(dropdownId);
  const sessionId = state.sessionId;
  const pathKey = path.join("/");

  const existingHoverTimer = state.hoverTimers.get(pathKey);
  if (existingHoverTimer) {
    clearTimeout(existingHoverTimer);
  }

  const closeTimer = state.closeTimers.get(pathKey);
  if (closeTimer) {
    clearTimeout(closeTimer);
    state.closeTimers.delete(pathKey);
  }

  const timer = setTimeout(() => {
    const latestState = getDropdownState(dropdownId);
    if (latestState.sessionId !== sessionId) {
      state.hoverTimers.delete(pathKey);
      return;
    }
    state.hoverTimers.delete(pathKey);
    openSubmenuPath(dropdownId, path);
    markDirty(windowId);
  }, delay);

  state.hoverTimers.set(pathKey, timer);
}

export function scheduleSubmenuClose(
  dropdownId: string,
  path: SubmenuPath,
  delay: number,
  windowId: WindowId,
  markDirty: MarkWindowDirtyFn,
  shouldDeferClose?: () => boolean
): void {
  const state = getDropdownState(dropdownId);
  const sessionId = state.sessionId;
  const pathKey = path.join("/");

  const existingTimer = state.closeTimers.get(pathKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    const latestState = getDropdownState(dropdownId);
    if (latestState.sessionId !== sessionId) {
      state.closeTimers.delete(pathKey);
      return;
    }

    latestState.closeTimers.delete(pathKey);

    if (shouldDeferClose && shouldDeferClose()) {
      scheduleSubmenuClose(dropdownId, path, delay, windowId, markDirty, shouldDeferClose);
      return;
    }

    closeSubmenuAtDepth(dropdownId, path.length - 1);
    markDirty(windowId);
  }, delay);

  state.closeTimers.set(pathKey, timer);
}

export function cancelSubmenuClose(dropdownId: string, path: SubmenuPath): void {
  const state = getDropdownState(dropdownId);
  const pathKey = path.join("/");
  const timer = state.closeTimers.get(pathKey);
  if (timer) {
    clearTimeout(timer);
    state.closeTimers.delete(pathKey);
  }
}

export function cancelSubmenuOpen(dropdownId: string, path: SubmenuPath): void {
  const state = getDropdownState(dropdownId);
  const pathKey = path.join("/");
  const timer = state.hoverTimers.get(pathKey);
  if (timer) {
    clearTimeout(timer);
    state.hoverTimers.delete(pathKey);
  }
}

export function updateSubmenuBounds(dropdownId: string, submenuId: string, bounds: Bounds): void {
  getDropdownState(dropdownId).submenuBounds.set(submenuId, bounds);
}

export function getSubmenuBounds(dropdownId: string, submenuId: string): Bounds | null {
  return getDropdownState(dropdownId).submenuBounds.get(submenuId) ?? null;
}

export function updateTriggerBounds(dropdownId: string, submenuId: string, bounds: Bounds): void {
  getDropdownState(dropdownId).triggerBounds.set(submenuId, bounds);
}

export function getTriggerBounds(dropdownId: string, submenuId: string): Bounds | null {
  return getDropdownState(dropdownId).triggerBounds.get(submenuId) ?? null;
}

export function updateCursorPosition(dropdownId: string, position: Point): void {
  const state = getDropdownState(dropdownId);
  state.prevCursorPosition = state.lastCursorPosition;
  state.lastCursorPosition = position;
  state.lastCursorTimestamp = Date.now();
}

export function getCursorPosition(dropdownId: string): Point | null {
  return getDropdownState(dropdownId).lastCursorPosition;
}

function getSubmenuSide(triggerBounds: Bounds, submenuBounds: Bounds): "left" | "right" {
  return submenuBounds.x >= triggerBounds.x ? "right" : "left";
}

export function isCursorInsideGracePolygon(
  dropdownId: string,
  submenuId: string,
  anchor?: Point
): boolean {
  const cursor = getCursorPosition(dropdownId);
  const triggerBounds = getTriggerBounds(dropdownId, submenuId);
  const submenuBounds = getSubmenuBounds(dropdownId, submenuId);

  if (!cursor || !triggerBounds || !submenuBounds) {
    return false;
  }

  const tip = anchor ?? getDropdownState(dropdownId).prevCursorPosition ?? cursor;
  const polygon = createSafePolygon(
    triggerBounds,
    submenuBounds,
    tip,
    getSubmenuSide(triggerBounds, submenuBounds)
  );

  return isPointInPolygon(cursor, polygon);
}

export function isCursorMovingTowardSubmenu(dropdownId: string, submenuId: string): boolean {
  const state = getDropdownState(dropdownId);
  const prev = state.prevCursorPosition;
  const current = state.lastCursorPosition;
  const submenuBounds = getSubmenuBounds(dropdownId, submenuId);

  if (!prev || !current || !submenuBounds) {
    return false;
  }

  const movement = { x: current.x - prev.x, y: current.y - prev.y };
  const movementMagnitude = Math.hypot(movement.x, movement.y);
  if (movementMagnitude < 0.5) {
    return false;
  }

  const target = {
    x: submenuBounds.x + submenuBounds.width / 2,
    y: submenuBounds.y + submenuBounds.height / 2,
  };
  const toTarget = { x: target.x - current.x, y: target.y - current.y };
  const toTargetMagnitude = Math.hypot(toTarget.x, toTarget.y);
  if (toTargetMagnitude < 0.5) {
    return true;
  }

  const dot = movement.x * toTarget.x + movement.y * toTarget.y;
  const cosTheta = dot / (movementMagnitude * toTargetMagnitude);
  return cosTheta > 0.35;
}

export function shouldDeferSubmenuClose(
  dropdownId: string,
  submenuId: string,
  anchor?: Point
): boolean {
  return (
    isCursorInsideGracePolygon(dropdownId, submenuId, anchor) ||
    isCursorMovingTowardSubmenu(dropdownId, submenuId)
  );
}

// ============================================================================ //
// Safe Polygon                                                                 //
// ============================================================================ //

export type Point = { x: number; y: number };

export function createSafePolygon(
  _triggerBounds: Bounds,
  submenuBounds: Bounds,
  cursorPosition: Point,
  side: "left" | "right"
): Point[] {
  if (side === "right") {
    return [
      cursorPosition,
      { x: submenuBounds.x, y: submenuBounds.y },
      { x: submenuBounds.x, y: submenuBounds.y + submenuBounds.height },
    ];
  }
  return [
    cursorPosition,
    { x: submenuBounds.x + submenuBounds.width, y: submenuBounds.y },
    { x: submenuBounds.x + submenuBounds.width, y: submenuBounds.y + submenuBounds.height },
  ];
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;

    if (
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x
    ) {
      inside = !inside;
    }
  }

  return inside;
}

// ============================================================================ //
// Types                                                                         //
// ============================================================================ //

export type DropdownOpenChangeHandler = (open: boolean) => void;
export type DropdownSelectHandler = () => void;
export type DropdownCheckedChangeHandler = (checked: boolean) => void;
export type DropdownValueChangeHandler = (value: string) => void;
export type DropdownSide = "top" | "bottom" | "left" | "right";
export type DropdownAlign = "start" | "center" | "end";

export type DropdownMenuState = {
  focusedIndex: number;
  openSubmenuId: string | null;
  typeaheadBuffer: string;
  typeaheadTimestamp: number;
};

export type DropdownMenuContext = {
  dropdownId: string;
  onOpenChange: DropdownOpenChangeHandler | null;
  disabled: boolean;
  state: DropdownMenuState;
  setFocusedIndex: (index: number) => void;
  currentPath: SubmenuPath;
  openChildSubmenu: (childId: string) => void;
  closeThisSubmenu: () => void;
  isChildSubmenuOpen: (childId: string) => boolean;
  closeAllMenus: () => void;
  itemCount: number;
  depth: number;
  parentContext: DropdownMenuContext | null;
  radioValue?: string;
  onRadioChange?: DropdownValueChangeHandler;
  menuBg: ColorObject;
  menuBorder: ColorObject;
  menuBorderRadius: number;
  menuPadding: number;
  itemBg: ColorObject;
  itemHoverBg: ColorObject;
  itemText: ColorObject;
  itemHoverText: ColorObject;
  itemDisabledText: ColorObject;
  labelText: ColorObject;
  separatorColor: ColorObject;
  destructiveText: ColorObject;
  destructiveHoverBg: ColorObject;
  shortcutText: ColorObject;
  checkColor: ColorObject;
  fontSize: number;
  labelFontSize: number;
  shortcutFontSize: number;
  itemPaddingX: number;
  itemPaddingY: number;
  indicatorWidth: number;
};

// ============================================================================ //
// Menu Items                                                                   //
// ============================================================================ //

export interface DropdownMenuItem {
  isFocusable(): boolean;
  getLabel(): string | null;
  setItemIndex(index: number): void;
  setContext(context: DropdownMenuContext): void;
}

type DropdownItemRequestState = {
  layoutId: LayoutId;
  labelSize: Size;
  shortcutSize: Size | null;
  labelFontFamily: string;
  shortcutFontFamily: string;
};

type DropdownItemPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  labelBounds: Bounds;
  shortcutBounds: Bounds | null;
  labelFontFamily: string;
  shortcutFontFamily: string;
};

type DropdownMenuChildRequestState =
  | DropdownItemRequestState
  | DropdownCheckboxRequestState
  | DropdownRadioRequestState
  | DropdownSubRequestState
  | DropdownSeparatorRequestState
  | DropdownLabelRequestState;

type DropdownMenuChildPrepaintEntry =
  | { kind: "item"; state: DropdownItemPrepaintState }
  | { kind: "checkbox"; state: DropdownCheckboxPrepaintState }
  | { kind: "radio"; state: DropdownRadioPrepaintState }
  | { kind: "sub"; state: DropdownSubPrepaintState }
  | { kind: "separator"; state: DropdownSeparatorPrepaintState }
  | { kind: "label"; state: DropdownLabelPrepaintState };

function getMenuItemKind(item: MenuItemElement): DropdownMenuItemKind {
  if (item instanceof GladeDropdownItem) return "item";
  if (item instanceof GladeDropdownCheckbox) return "checkbox";
  if (item instanceof GladeDropdownRadio) return "radio";
  if (item instanceof GladeDropdownSub) return "sub";
  if (item instanceof GladeDropdownSeparator) return "separator";
  return "label";
}

function prepaintMenuItem(
  item: MenuItemElement,
  childCx: PrepaintContext,
  bounds: Bounds,
  requestState: DropdownMenuChildRequestState,
  kind: DropdownMenuItemKind
): DropdownMenuChildPrepaintEntry | null {
  switch (kind) {
    case "item":
      if (item instanceof GladeDropdownItem && isDropdownItemRequestState(requestState)) {
        return { kind, state: item.prepaint(childCx, bounds, requestState) };
      }
      break;
    case "checkbox":
      if (item instanceof GladeDropdownCheckbox && isDropdownCheckboxRequestState(requestState)) {
        return { kind, state: item.prepaint(childCx, bounds, requestState) };
      }
      break;
    case "radio":
      if (item instanceof GladeDropdownRadio && isDropdownRadioRequestState(requestState)) {
        return { kind, state: item.prepaint(childCx, bounds, requestState) };
      }
      break;
    case "sub":
      if (item instanceof GladeDropdownSub && isDropdownSubRequestState(requestState)) {
        return { kind, state: item.prepaint(childCx, bounds, requestState) };
      }
      break;
    case "separator":
      if (item instanceof GladeDropdownSeparator && isDropdownSeparatorRequestState(requestState)) {
        return { kind, state: item.prepaint(childCx, bounds, requestState) };
      }
      break;
    case "label":
      if (item instanceof GladeDropdownLabel && isDropdownLabelRequestState(requestState)) {
        return { kind, state: item.prepaint(childCx, bounds, requestState) };
      }
      break;
  }
  return null;
}

function getHitTestFromPrepaint(entry: DropdownMenuChildPrepaintEntry): HitTestNode | null {
  switch (entry.kind) {
    case "item":
    case "checkbox":
    case "radio":
    case "sub":
      return entry.state.hitTestNode;
    case "separator":
      return entry.state.hitTestNode;
    case "label":
      return entry.state.hitTestNode;
  }
}

function paintMenuItem(
  item: MenuItemElement,
  childCx: PaintContext,
  bounds: Bounds,
  entry: DropdownMenuChildPrepaintEntry
): void {
  switch (entry.kind) {
    case "item":
      if (item instanceof GladeDropdownItem) {
        item.paint(childCx, bounds, entry.state);
      }
      break;
    case "checkbox":
      if (item instanceof GladeDropdownCheckbox) {
        item.paint(childCx, bounds, entry.state);
      }
      break;
    case "radio":
      if (item instanceof GladeDropdownRadio) {
        item.paint(childCx, bounds, entry.state);
      }
      break;
    case "sub":
      if (item instanceof GladeDropdownSub) {
        item.paint(childCx, bounds, entry.state);
      }
      break;
    case "separator":
      if (item instanceof GladeDropdownSeparator) {
        item.paint(childCx, bounds, entry.state);
      }
      break;
    case "label":
      if (item instanceof GladeDropdownLabel) {
        item.paint(childCx, bounds, entry.state);
      }
      break;
  }
}

function hasLayoutId(state: unknown): state is { layoutId: LayoutId } {
  return typeof state === "object" && state !== null && "layoutId" in state;
}

function isDropdownItemRequestState(state: unknown): state is DropdownItemRequestState {
  return hasLayoutId(state) && "labelSize" in state && "shortcutSize" in state;
}

function isDropdownCheckboxRequestState(state: unknown): state is DropdownCheckboxRequestState {
  return hasLayoutId(state) && "labelSize" in state && !("shortcutSize" in state);
}

function isDropdownRadioRequestState(state: unknown): state is DropdownRadioRequestState {
  return hasLayoutId(state) && "labelSize" in state && !("shortcutSize" in state);
}

function isDropdownSubRequestState(state: unknown): state is DropdownSubRequestState {
  return (
    hasLayoutId(state) &&
    "submenuContentRequestState" in state &&
    "submenuContentElementId" in state
  );
}

function isDropdownSeparatorRequestState(state: unknown): state is DropdownSeparatorRequestState {
  return hasLayoutId(state) && Object.keys(state).length === 1;
}

function isDropdownLabelRequestState(state: unknown): state is DropdownLabelRequestState {
  return hasLayoutId(state) && "measureId" in state;
}

export class GladeDropdownItem
  extends GladeElement<DropdownItemRequestState, DropdownItemPrepaintState>
  implements DropdownMenuItem
{
  private labelText: string;
  private disabledValue = false;
  private destructiveValue = false;
  private shortcutText: string | null = null;
  private onSelectHandler: DropdownSelectHandler | null = null;
  private context: DropdownMenuContext | null = null;
  private itemIndex = -1;

  constructor(label: string) {
    super();
    this.labelText = label;
  }

  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  destructive(v: boolean): this {
    this.destructiveValue = v;
    return this;
  }

  shortcut(text: string): this {
    this.shortcutText = text;
    return this;
  }

  onSelect(handler: DropdownSelectHandler): this {
    this.onSelectHandler = handler;
    return this;
  }

  isFocusable(): boolean {
    return !this.disabledValue && !(this.context?.disabled ?? false);
  }

  getLabel(): string | null {
    return this.labelText;
  }

  setItemIndex(index: number): void {
    this.itemIndex = index;
  }

  setContext(context: DropdownMenuContext): void {
    this.context = context;
  }

  private isCurrentlyFocused(): boolean {
    return this.context?.state.focusedIndex === this.itemIndex;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownItemRequestState> {
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const shortcutFontSize = this.context?.shortcutFontSize ?? DEFAULT_SHORTCUT_FONT_SIZE;
    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y;
    const lineHeight = fontSize * 1.2;
    const themeFonts = cx.getTheme().fonts;
    const labelFontFamily = themeFonts.sans.name;
    const shortcutFontFamily = themeFonts.monospaced.name;

    const labelSize = cx.measureText(this.labelText, {
      fontSize,
      fontFamily: labelFontFamily,
      fontWeight: 400,
      lineHeight,
    });

    let shortcutSize: Size | null = null;
    if (this.shortcutText) {
      shortcutSize = cx.measureText(this.shortcutText, {
        fontSize: shortcutFontSize,
        fontFamily: shortcutFontFamily,
        fontWeight: 500,
        lineHeight: shortcutFontSize * 1.2,
      });
    }

    const contentWidth =
      labelSize.width +
      (shortcutSize ? shortcutSize.width + paddingX : 0) +
      paddingX * 2 +
      (shortcutSize ? paddingX : 0);

    const layoutId = cx.requestLayout(
      {
        paddingLeft: paddingX,
        paddingRight: paddingX,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        width: "100%",
        minWidth: contentWidth,
        height: lineHeight + paddingY * 2,
      },
      []
    );

    return {
      layoutId,
      requestState: { layoutId, labelSize, shortcutSize, labelFontFamily, shortcutFontFamily },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DropdownItemRequestState
  ): DropdownItemPrepaintState {
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);
    const cursor = isDisabled ? "not-allowed" : "pointer";
    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal, cursor);

    const context = this.context;
    const onSelectHandler = this.onSelectHandler;
    const itemIndex = this.itemIndex;

    const clickHandler: ClickHandler = (_event, _window, handlerCx) => {
      if (!isDisabled && context) {
        if (onSelectHandler) {
          onSelectHandler();
        }
        if (context.onOpenChange) {
          context.onOpenChange(false);
        }
        handlerCx.markWindowDirty(_window.id);
      }
    };

    const mouseEnterHandler: MouseHandler = (_event, _window, _handlerCx) => {
      if (context) {
        context.setFocusedIndex(itemIndex);
      }
    };

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {
        click: clickHandler,
        mouseEnter: mouseEnterHandler,
      },
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };

    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const lineHeight = fontSize * 1.2;

    const { labelSize, shortcutSize } = requestState;

    const labelBounds: Bounds = {
      x: bounds.x + paddingX,
      y: bounds.y + (bounds.height - lineHeight) / 2,
      width: labelSize.width,
      height: lineHeight,
    };

    let shortcutBounds: Bounds | null = null;
    if (shortcutSize && this.shortcutText) {
      const shortcutFontSize = this.context?.shortcutFontSize ?? DEFAULT_SHORTCUT_FONT_SIZE;
      const shortcutLineHeight = shortcutFontSize * 1.2;
      shortcutBounds = {
        x: bounds.x + bounds.width - paddingX - shortcutSize.width,
        y: bounds.y + (bounds.height - shortcutLineHeight) / 2,
        width: shortcutSize.width,
        height: shortcutLineHeight,
      };
    }

    return {
      hitbox,
      hitTestNode,
      labelBounds,
      shortcutBounds,
      labelFontFamily: requestState.labelFontFamily,
      shortcutFontFamily: requestState.shortcutFontFamily,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DropdownItemPrepaintState): void {
    const context = this.context;
    if (!context) {
      return;
    }
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.isCurrentlyFocused();
    const isHighlighted = isHovered || isFocused;
    const isDisabled = this.disabledValue || context.disabled;

    const itemBg = context.itemBg;
    const itemHoverBg = this.destructiveValue ? context.destructiveHoverBg : context.itemHoverBg;
    const itemText = this.destructiveValue ? context.destructiveText : context.itemText;
    const itemHoverText = context.itemHoverText;
    const itemDisabledText = context.itemDisabledText;
    const shortcutTextColor = context.shortcutText;
    const fontSize = context.fontSize ?? DEFAULT_FONT_SIZE;
    const shortcutFontSize = context.shortcutFontSize ?? DEFAULT_SHORTCUT_FONT_SIZE;
    const labelFontFamily = prepaintState.labelFontFamily;
    const shortcutFontFamily = prepaintState.shortcutFontFamily;

    const bgColor = isHighlighted && !isDisabled ? itemHoverBg : itemBg;
    const textColor = isDisabled ? itemDisabledText : isHighlighted ? itemHoverText : itemText;

    if (bgColor.a > 0) {
      cx.paintRect(bounds, {
        backgroundColor: bgColor,
        borderRadius: 4,
      });
    }

    cx.paintGlyphs(this.labelText, prepaintState.labelBounds, textColor, {
      fontSize,
      fontFamily: labelFontFamily,
      fontWeight: 400,
    });

    if (prepaintState.shortcutBounds && this.shortcutText) {
      cx.paintGlyphs(this.shortcutText, prepaintState.shortcutBounds, shortcutTextColor, {
        fontSize: shortcutFontSize,
        fontFamily: shortcutFontFamily,
        fontWeight: 500,
      });
    }
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================ //
// Checkbox                                                                     //
// ============================================================================ //

type DropdownCheckboxRequestState = {
  layoutId: LayoutId;
  labelSize: Size;
  fontFamily: string;
};

type DropdownCheckboxPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  indicatorBounds: Bounds;
  labelBounds: Bounds;
  fontFamily: string;
};

export class GladeDropdownCheckbox
  extends GladeElement<DropdownCheckboxRequestState, DropdownCheckboxPrepaintState>
  implements DropdownMenuItem
{
  private labelText: string;
  private checkedValue = false;
  private disabledValue = false;
  private onCheckedChangeHandler: DropdownCheckedChangeHandler | null = null;
  private context: DropdownMenuContext | null = null;
  private itemIndex = -1;

  constructor(label: string) {
    super();
    this.labelText = label;
  }

  checked(v: boolean): this {
    this.checkedValue = v;
    return this;
  }

  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  onCheckedChange(handler: DropdownCheckedChangeHandler): this {
    this.onCheckedChangeHandler = handler;
    return this;
  }

  isFocusable(): boolean {
    return !this.disabledValue && !(this.context?.disabled ?? false);
  }

  getLabel(): string | null {
    return this.labelText;
  }

  setItemIndex(index: number): void {
    this.itemIndex = index;
  }

  setContext(context: DropdownMenuContext): void {
    this.context = context;
  }

  private isCurrentlyFocused(): boolean {
    return this.context?.state.focusedIndex === this.itemIndex;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownCheckboxRequestState> {
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y;
    const indicatorWidth = this.context?.indicatorWidth ?? DEFAULT_INDICATOR_WIDTH;
    const lineHeight = fontSize * 1.2;
    const fontFamily = cx.getTheme().fonts.sans.name;

    const labelSize = cx.measureText(this.labelText, {
      fontSize,
      fontFamily,
      fontWeight: 400,
      lineHeight,
    });

    const layoutId = cx.requestLayout(
      {
        paddingLeft: paddingX,
        paddingRight: paddingX,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        width: "100%",
        minWidth: labelSize.width + indicatorWidth + paddingX * 3,
        height: lineHeight + paddingY * 2,
      },
      []
    );

    return {
      layoutId,
      requestState: { layoutId, labelSize, fontFamily },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DropdownCheckboxRequestState
  ): DropdownCheckboxPrepaintState {
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);
    const cursor = isDisabled ? "not-allowed" : "pointer";
    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal, cursor);

    const context = this.context;
    const onCheckedChangeHandler = this.onCheckedChangeHandler;
    const currentChecked = this.checkedValue;
    const itemIndex = this.itemIndex;

    const clickHandler: ClickHandler = (_event, window, handlerCx) => {
      if (!isDisabled && context && onCheckedChangeHandler) {
        onCheckedChangeHandler(!currentChecked);
        handlerCx.markWindowDirty(window.id);
      }
    };

    const mouseEnterHandler: MouseHandler = (_event, _window, _handlerCx) => {
      if (context) {
        context.setFocusedIndex(itemIndex);
      }
    };

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {
        click: clickHandler,
        mouseEnter: mouseEnterHandler,
      },
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };

    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const indicatorWidth = this.context?.indicatorWidth ?? DEFAULT_INDICATOR_WIDTH;
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const lineHeight = fontSize * 1.2;

    const { labelSize } = requestState;

    const indicatorBounds: Bounds = {
      x: bounds.x + paddingX,
      y: bounds.y + (bounds.height - indicatorWidth) / 2,
      width: indicatorWidth,
      height: indicatorWidth,
    };

    const labelBounds: Bounds = {
      x: indicatorBounds.x + indicatorBounds.width + paddingX,
      y: bounds.y + (bounds.height - lineHeight) / 2,
      width: labelSize.width,
      height: lineHeight,
    };

    return {
      hitbox,
      hitTestNode,
      indicatorBounds,
      labelBounds,
      fontFamily: requestState.fontFamily,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DropdownCheckboxPrepaintState): void {
    const context = this.context;
    if (!context) {
      return;
    }
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.isCurrentlyFocused();
    const isHighlighted = isHovered || isFocused;
    const isDisabled = this.disabledValue || context.disabled;

    const itemBg = context.itemBg;
    const itemHoverBg = context.itemHoverBg;
    const itemText = context.itemText;
    const itemHoverText = context.itemHoverText;
    const itemDisabledText = context.itemDisabledText;
    const checkColor = context.checkColor;
    const fontSize = context.fontSize ?? DEFAULT_FONT_SIZE;

    const bgColor = isHighlighted && !isDisabled ? itemHoverBg : itemBg;
    const textColor = isDisabled ? itemDisabledText : isHighlighted ? itemHoverText : itemText;

    if (bgColor.a > 0) {
      cx.paintRect(bounds, {
        backgroundColor: bgColor,
        borderRadius: 4,
      });
    }

    const checkBounds: Bounds = {
      x: prepaintState.indicatorBounds.x + 4,
      y: prepaintState.indicatorBounds.y + 4,
      width: prepaintState.indicatorBounds.width - 8,
      height: prepaintState.indicatorBounds.height - 8,
    };

    cx.paintRect(prepaintState.indicatorBounds, {
      backgroundColor: bgColor,
      borderRadius: 3,
      borderColor: isDisabled ? itemDisabledText : checkColor,
      borderWidth: 1,
    });

    if (this.checkedValue) {
      cx.paintRect(checkBounds, {
        backgroundColor: isDisabled ? itemDisabledText : checkColor,
        borderRadius: 2,
      });
    }

    cx.paintGlyphs(this.labelText, prepaintState.labelBounds, textColor, {
      fontSize,
      fontFamily: prepaintState.fontFamily,
      fontWeight: 400,
    });
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================ //
// Radio                                                                         //
// ============================================================================ //

type DropdownRadioRequestState = {
  layoutId: LayoutId;
  labelSize: Size;
  fontFamily: string;
};

type DropdownRadioPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  indicatorBounds: Bounds;
  labelBounds: Bounds;
  fontFamily: string;
};

export class GladeDropdownRadio
  extends GladeElement<DropdownRadioRequestState, DropdownRadioPrepaintState>
  implements DropdownMenuItem
{
  private labelText: string;
  private radioValue: string;
  private disabledValue = false;
  private context: DropdownMenuContext | null = null;
  private itemIndex = -1;

  constructor(label: string, value: string) {
    super();
    this.labelText = label;
    this.radioValue = value;
  }

  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  isFocusable(): boolean {
    return !this.disabledValue && !(this.context?.disabled ?? false);
  }

  getLabel(): string | null {
    return this.labelText;
  }

  setItemIndex(index: number): void {
    this.itemIndex = index;
  }

  setContext(context: DropdownMenuContext): void {
    this.context = context;
  }

  private isCurrentlyFocused(): boolean {
    return this.context?.state.focusedIndex === this.itemIndex;
  }

  private isSelected(): boolean {
    return this.context?.radioValue === this.radioValue;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownRadioRequestState> {
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y;
    const indicatorWidth = this.context?.indicatorWidth ?? DEFAULT_INDICATOR_WIDTH;
    const lineHeight = fontSize * 1.2;
    const fontFamily = cx.getTheme().fonts.sans.name;

    const labelSize = cx.measureText(this.labelText, {
      fontSize,
      fontFamily,
      fontWeight: 400,
      lineHeight,
    });

    const layoutId = cx.requestLayout(
      {
        paddingLeft: paddingX,
        paddingRight: paddingX,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        width: "100%",
        minWidth: labelSize.width + indicatorWidth + paddingX * 3,
        height: lineHeight + paddingY * 2,
      },
      []
    );

    return {
      layoutId,
      requestState: { layoutId, labelSize, fontFamily },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DropdownRadioRequestState
  ): DropdownRadioPrepaintState {
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);
    const cursor = isDisabled ? "not-allowed" : "pointer";
    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal, cursor);

    const context = this.context;
    const radioValue = this.radioValue;
    const itemIndex = this.itemIndex;

    const clickHandler: ClickHandler = (_event, window, handlerCx) => {
      if (!isDisabled && context && context.onRadioChange) {
        context.onRadioChange(radioValue);
        handlerCx.markWindowDirty(window.id);
      }
    };

    const mouseEnterHandler: MouseHandler = (_event, _window, _handlerCx) => {
      if (context) {
        context.setFocusedIndex(itemIndex);
      }
    };

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {
        click: clickHandler,
        mouseEnter: mouseEnterHandler,
      },
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };

    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const indicatorWidth = this.context?.indicatorWidth ?? DEFAULT_INDICATOR_WIDTH;
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const lineHeight = fontSize * 1.2;

    const { labelSize } = requestState;

    const indicatorBounds: Bounds = {
      x: bounds.x + paddingX,
      y: bounds.y + (bounds.height - indicatorWidth) / 2,
      width: indicatorWidth,
      height: indicatorWidth,
    };

    const labelBounds: Bounds = {
      x: indicatorBounds.x + indicatorBounds.width + paddingX,
      y: bounds.y + (bounds.height - lineHeight) / 2,
      width: labelSize.width,
      height: lineHeight,
    };

    return {
      hitbox,
      hitTestNode,
      indicatorBounds,
      labelBounds,
      fontFamily: requestState.fontFamily,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DropdownRadioPrepaintState): void {
    const context = this.context;
    if (!context) {
      return;
    }
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.isCurrentlyFocused();
    const isHighlighted = isHovered || isFocused;
    const isDisabled = this.disabledValue || context.disabled;
    const isSelected = this.isSelected();

    const itemBg = context.itemBg;
    const itemHoverBg = context.itemHoverBg;
    const itemText = context.itemText;
    const itemHoverText = context.itemHoverText;
    const itemDisabledText = context.itemDisabledText;
    const checkColor = context.checkColor;
    const fontSize = context.fontSize ?? DEFAULT_FONT_SIZE;
    const fontFamily = prepaintState.fontFamily;

    const bgColor = isHighlighted && !isDisabled ? itemHoverBg : itemBg;
    const textColor = isDisabled ? itemDisabledText : isHighlighted ? itemHoverText : itemText;

    if (bgColor.a > 0) {
      cx.paintRect(bounds, {
        backgroundColor: bgColor,
        borderRadius: 4,
      });
    }

    const dotBounds: Bounds = {
      x: prepaintState.indicatorBounds.x + prepaintState.indicatorBounds.width / 4,
      y: prepaintState.indicatorBounds.y + prepaintState.indicatorBounds.height / 4,
      width: prepaintState.indicatorBounds.width / 2,
      height: prepaintState.indicatorBounds.height / 2,
    };

    cx.paintRect(prepaintState.indicatorBounds, {
      backgroundColor: bgColor,
      borderRadius: prepaintState.indicatorBounds.width / 2,
      borderColor: isDisabled ? itemDisabledText : checkColor,
      borderWidth: 1,
    });

    if (isSelected) {
      cx.paintRect(dotBounds, {
        backgroundColor: isDisabled ? itemDisabledText : checkColor,
        borderRadius: dotBounds.width / 2,
      });
    }

    cx.paintGlyphs(this.labelText, prepaintState.labelBounds, textColor, {
      fontSize,
      fontFamily,
      fontWeight: 400,
    });
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================ //
// Radio Group                                                                  //
// ============================================================================ //

export class GladeDropdownRadioGroup {
  private valueInternal = "";
  private onValueChangeHandler: DropdownValueChangeHandler | null = null;
  private radioItems: GladeDropdownRadio[] = [];

  value(v: string): this {
    this.valueInternal = v;
    return this;
  }

  onValueChange(handler: DropdownValueChangeHandler): this {
    this.onValueChangeHandler = handler;
    return this;
  }

  items(...radios: GladeDropdownRadio[]): this {
    this.radioItems.push(...radios);
    return this;
  }

  getValue(): string {
    return this.valueInternal;
  }

  getOnValueChange(): DropdownValueChangeHandler | null {
    return this.onValueChangeHandler;
  }

  getRadios(): GladeDropdownRadio[] {
    return this.radioItems;
  }
}

// ============================================================================ //
// Submenu                                                                      //
// ============================================================================ //

type DropdownSubRequestState = {
  layoutId: LayoutId;
  labelSize: Size;
  submenuContentRequestState: DropdownMenuContentRequestState | null;
  submenuContentElementId: GlobalElementId | null;
  fontFamily: string;
};

type DropdownSubPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  labelBounds: Bounds;
  chevronBounds: Bounds;
  submenuContentPrepaintState: DropdownMenuContentPrepaintState | null;
  submenuContentBounds: Bounds | null;
  submenuContentElementId: GlobalElementId | null;
  fontFamily: string;
};

export class GladeDropdownSub
  extends GladeElement<DropdownSubRequestState, DropdownSubPrepaintState>
  implements DropdownMenuItem
{
  private submenuId: string;
  private labelText: string;
  private disabledValue = false;
  private menuItems: MenuItemElement[] = [];
  private context: DropdownMenuContext | null = null;
  private itemIndex = -1;
  private submenuContent: GladeDropdownMenuContent | null = null;

  constructor(label: string) {
    super();
    this.labelText = label;
    this.submenuId = `submenu-${label}`;
  }

  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  items(...items: MenuItemElement[]): this {
    this.menuItems.push(...items);
    return this;
  }

  isFocusable(): boolean {
    return !this.disabledValue && !(this.context?.disabled ?? false);
  }

  getLabel(): string | null {
    return this.labelText;
  }

  setItemIndex(index: number): void {
    this.itemIndex = index;
  }

  setContext(context: DropdownMenuContext): void {
    this.context = context;
  }

  private isCurrentlyFocused(): boolean {
    return this.context?.state.focusedIndex === this.itemIndex;
  }

  private getSubmenuPath(): SubmenuPath {
    if (!this.context) return [this.submenuId];
    return [...this.context.currentPath, this.submenuId];
  }

  private isSubmenuOpen(): boolean {
    return this.context?.isChildSubmenuOpen(this.submenuId) ?? false;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownSubRequestState> {
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y;
    const lineHeight = fontSize * 1.2;
    const fontFamily = cx.getTheme().fonts.sans.name;

    const labelSize = cx.measureText(this.labelText, {
      fontSize,
      fontFamily,
      fontWeight: 400,
      lineHeight,
    });

    const chevronWidth = 16;

    const layoutId = cx.requestLayout(
      {
        paddingLeft: paddingX,
        paddingRight: paddingX,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        width: "100%",
        minWidth: labelSize.width + paddingX * 2 + chevronWidth,
        height: lineHeight + paddingY * 2,
      },
      []
    );

    let submenuContentRequestState: DropdownMenuContentRequestState | null = null;
    let submenuContentElementId: GlobalElementId | null = null;

    const isOpen = this.isSubmenuOpen();

    if (isOpen && this.menuItems.length > 0 && this.context) {
      if (!this.submenuContent) {
        this.submenuContent = new GladeDropdownMenuContent();
      }

      const parentContext = this.context;
      const submenuPath = this.getSubmenuPath();
      const dropdownId = parentContext.dropdownId;
      const submenuState: DropdownMenuState = {
        focusedIndex: -1,
        openSubmenuId: null,
        typeaheadBuffer: "",
        typeaheadTimestamp: 0,
      };

      const submenuContext: DropdownMenuContext = {
        ...parentContext,
        state: submenuState,
        depth: parentContext.depth + 1,
        parentContext: parentContext,
        currentPath: submenuPath,
        openChildSubmenu: (childId: string) => {
          const childPath = [...submenuPath, childId];
          openSubmenuPath(dropdownId, childPath);
        },
        closeThisSubmenu: () => {
          closeSubmenuAtDepth(dropdownId, parentContext.depth + 1);
        },
        isChildSubmenuOpen: (childId: string) => {
          const childPath = [...submenuPath, childId];
          return isSubmenuContentVisible(dropdownId, childPath);
        },
        setFocusedIndex: (index: number) => {
          submenuState.focusedIndex = index;
        },
        closeAllMenus: () => {
          parentContext.closeAllMenus();
        },
        itemCount: this.menuItems.length,
      };

      this.submenuContent.setItems(this.menuItems);
      this.submenuContent.setContext(submenuContext);

      submenuContentElementId = cx.allocateChildId();
      const submenuCx: RequestLayoutContext = { ...cx, elementId: submenuContentElementId };
      const submenuResult = this.submenuContent.requestLayout(submenuCx);
      submenuContentRequestState = submenuResult.requestState;
    } else {
      this.submenuContent = null;
    }

    return {
      layoutId,
      requestState: {
        layoutId,
        labelSize,
        submenuContentRequestState,
        submenuContentElementId,
        fontFamily,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DropdownSubRequestState
  ): DropdownSubPrepaintState {
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);
    const cursor = isDisabled ? "not-allowed" : "pointer";
    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal, cursor);

    const context = this.context;
    const submenuId = this.submenuId;
    const itemIndex = this.itemIndex;
    const dropdownId = context?.dropdownId;
    const submenuPath = this.getSubmenuPath();

    const mouseEnterHandler: MouseHandler = (event, window, handlerCx) => {
      if (!isDisabled && context && dropdownId) {
        context.setFocusedIndex(itemIndex);
        cancelSubmenuClose(dropdownId, submenuPath);
        updateCursorPosition(dropdownId, { x: event.x, y: event.y });
        scheduleSubmenuOpen(dropdownId, submenuPath, DEFAULT_SUBMENU_DELAY, window.id, (winId) =>
          handlerCx.markWindowDirty(winId)
        );
      }
    };

    const mouseMoveHandler: MouseHandler = (event, _window, _cx) => {
      if (dropdownId) {
        updateCursorPosition(dropdownId, { x: event.x, y: event.y });
      }
    };

    const mouseLeaveHandler: MouseHandler = (event, window, handlerCx) => {
      if (!context || !dropdownId) return;
      const winId = window.id;
      const cursor = { x: event.x, y: event.y };
      cancelSubmenuOpen(dropdownId, submenuPath);
      scheduleSubmenuClose(
        dropdownId,
        submenuPath,
        DEFAULT_SUBMENU_CLOSE_DELAY,
        winId,
        (id) => handlerCx.markWindowDirty(id),
        () => shouldDeferSubmenuClose(dropdownId, submenuId, cursor)
      );
    };

    const clickHandler: ClickHandler = (_event, window, handlerCx) => {
      if (!isDisabled && context && dropdownId) {
        openSubmenuPath(dropdownId, submenuPath);
        handlerCx.markWindowDirty(window.id);
      }
    };

    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const lineHeight = fontSize * 1.2;

    const { labelSize, submenuContentRequestState, submenuContentElementId } = requestState;

    const labelBounds: Bounds = {
      x: bounds.x + paddingX,
      y: bounds.y + (bounds.height - lineHeight) / 2,
      width: labelSize.width,
      height: lineHeight,
    };

    const chevronBounds: Bounds = {
      x: bounds.x + bounds.width - paddingX - 12,
      y: bounds.y + (bounds.height - lineHeight) / 2,
      width: 12,
      height: lineHeight,
    };

    if (dropdownId) {
      updateTriggerBounds(dropdownId, submenuId, bounds);
    }

    let submenuContentPrepaintState: DropdownMenuContentPrepaintState | null = null;
    let submenuContentBounds: Bounds | null = null;
    let submenuHitTestNode: HitTestNode | null = null;

    if (
      this.isSubmenuOpen() &&
      this.submenuContent &&
      submenuContentRequestState &&
      submenuContentElementId
    ) {
      const windowSize = cx.getWindowSize?.() ?? { width: 1920, height: 1080 };
      const submenuLayoutBounds =
        cx.computeFloatingLayout?.(
          submenuContentRequestState.layoutId,
          windowSize.width,
          windowSize.height
        ) ?? cx.getBounds(submenuContentRequestState.layoutId);

      submenuContentBounds = {
        x: bounds.x + bounds.width,
        y: bounds.y,
        width: submenuLayoutBounds.width,
        height: submenuLayoutBounds.height,
      };

      if (dropdownId) {
        updateSubmenuBounds(dropdownId, submenuId, submenuContentBounds);
      }

      const submenuCx = cx.withElementId(submenuContentElementId);
      submenuContentPrepaintState = this.submenuContent.prepaint(
        submenuCx,
        submenuContentBounds,
        submenuContentRequestState
      );

      submenuHitTestNode = submenuContentPrepaintState.hitTestNode;
    }

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {
        click: clickHandler,
        mouseEnter: mouseEnterHandler,
        mouseMove: mouseMoveHandler,
        mouseLeave: mouseLeaveHandler,
      },
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: submenuHitTestNode ? [submenuHitTestNode] : [],
      allowChildOutsideBounds: true,
    };

    return {
      hitbox,
      hitTestNode,
      labelBounds,
      chevronBounds,
      submenuContentPrepaintState,
      submenuContentBounds,
      submenuContentElementId,
      fontFamily: requestState.fontFamily,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DropdownSubPrepaintState): void {
    const context = this.context;
    if (!context) {
      return;
    }
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.isCurrentlyFocused();
    const isHighlighted = this.isSubmenuOpen() ? true : isHovered || isFocused;
    const isDisabled = this.disabledValue || context.disabled;

    const itemBg = context.itemBg;
    const itemHoverBg = context.itemHoverBg;
    const itemText = context.itemText;
    const itemHoverText = context.itemHoverText;
    const itemDisabledText = context.itemDisabledText;
    const fontSize = context.fontSize ?? DEFAULT_FONT_SIZE;
    const fontFamily = prepaintState.fontFamily;

    const bgColor = isHighlighted && !isDisabled ? itemHoverBg : itemBg;
    const textColor = isDisabled ? itemDisabledText : isHighlighted ? itemHoverText : itemText;

    if (bgColor.a > 0) {
      cx.paintRect(bounds, {
        backgroundColor: bgColor,
        borderRadius: 4,
      });
    }

    cx.paintGlyphs(this.labelText, prepaintState.labelBounds, textColor, {
      fontSize,
      fontFamily,
      fontWeight: 400,
    });

    cx.paintGlyphs("›", prepaintState.chevronBounds, textColor, {
      fontSize: fontSize + 2,
      fontFamily,
      fontWeight: 400,
    });

    if (
      this.submenuContent &&
      prepaintState.submenuContentPrepaintState &&
      prepaintState.submenuContentBounds &&
      prepaintState.submenuContentElementId
    ) {
      const submenuCx = cx.withElementId(prepaintState.submenuContentElementId);
      this.submenuContent.paint(
        submenuCx,
        prepaintState.submenuContentBounds,
        prepaintState.submenuContentPrepaintState
      );
    }
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================ //
// Separator                                                                    //
// ============================================================================ //

type DropdownSeparatorRequestState = {
  layoutId: LayoutId;
};

type DropdownSeparatorPrepaintState = {
  hitTestNode: HitTestNode | null;
};

export class GladeDropdownSeparator
  extends GladeElement<DropdownSeparatorRequestState, DropdownSeparatorPrepaintState>
  implements DropdownMenuItem
{
  private context: DropdownMenuContext | null = null;

  isFocusable(): boolean {
    return false;
  }

  getLabel(): string | null {
    return null;
  }

  setItemIndex(_index: number): void {}

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
    const context = this.context;
    if (!context) {
      return;
    }
    const separatorColor = context.separatorColor;
    cx.paintRect(bounds, { backgroundColor: separatorColor });
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================ //
// Label                                                                        //
// ============================================================================ //

type DropdownLabelRequestState = {
  layoutId: LayoutId;
  measureId: number;
  fontFamily: string;
};

type DropdownLabelPrepaintState = {
  textBounds: Bounds;
  hitTestNode: HitTestNode | null;
  fontFamily: string;
};

export class GladeDropdownLabel
  extends GladeElement<DropdownLabelRequestState, DropdownLabelPrepaintState>
  implements DropdownMenuItem
{
  private labelText: string;
  private context: DropdownMenuContext | null = null;

  constructor(label: string) {
    super();
    this.labelText = label;
  }

  isFocusable(): boolean {
    return false;
  }

  getLabel(): string | null {
    return null;
  }

  setItemIndex(_index: number): void {}

  setContext(context: DropdownMenuContext): void {
    this.context = context;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownLabelRequestState> {
    const fontSize = this.context?.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE;
    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = (this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y) / 2;
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
        paddingTop: paddingY + 4,
        paddingBottom: paddingY,
        width: "100%",
      },
      measureId
    );

    return { layoutId, requestState: { layoutId, measureId, fontFamily } };
  }

  prepaint(
    _cx: PrepaintContext,
    bounds: Bounds,
    requestState: DropdownLabelRequestState
  ): DropdownLabelPrepaintState {
    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = (this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y) / 2;

    const textBounds: Bounds = {
      x: bounds.x + paddingX,
      y: bounds.y + paddingY + 4,
      width: bounds.width - paddingX * 2,
      height: bounds.height - paddingY * 2 - 4,
    };

    return { textBounds, hitTestNode: null, fontFamily: requestState.fontFamily };
  }

  paint(cx: PaintContext, _bounds: Bounds, prepaintState: DropdownLabelPrepaintState): void {
    const context = this.context;
    if (!context) {
      return;
    }
    const labelTextColor = context.labelText;
    const fontSize = context.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE;

    cx.paintGlyphs(this.labelText, prepaintState.textBounds, labelTextColor, {
      fontSize,
      fontFamily: prepaintState.fontFamily,
      fontWeight: 500,
    });
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================ //
// Menu content                                                                 //
// ============================================================================ //

export type MenuItemElement =
  | GladeDropdownItem
  | GladeDropdownSeparator
  | GladeDropdownLabel
  | GladeDropdownCheckbox
  | GladeDropdownRadio
  | GladeDropdownSub;

type DropdownMenuItemKind = "item" | "checkbox" | "radio" | "sub" | "separator" | "label";

export type DropdownMenuContentRequestState = {
  layoutId: LayoutId;
  childLayoutIds: LayoutId[];
  childElementIds: GlobalElementId[];
  childRequestStates: DropdownMenuChildRequestState[];
  childKinds: DropdownMenuItemKind[];
};

export type DropdownMenuContentPrepaintState = {
  childElementIds: GlobalElementId[];
  childPrepaintStates: DropdownMenuChildPrepaintEntry[];
  childBounds: Bounds[];
  hitTestNode: HitTestNode;
};

export class GladeDropdownMenuContent extends GladeContainerElement<
  DropdownMenuContentRequestState,
  DropdownMenuContentPrepaintState
> {
  private menuItems: MenuItemElement[] = [];
  private context: DropdownMenuContext | null = null;
  onBoundsKnown: ((bounds: Bounds) => void) | null = null;

  setItems(items: MenuItemElement[]): void {
    this.menuItems = items;
  }

  setContext(context: DropdownMenuContext): void {
    this.context = context;
  }

  private getFocusableItems(): Array<{ index: number; item: MenuItemElement }> {
    const focusable: Array<{ index: number; item: MenuItemElement }> = [];
    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i]!;
      if ((item as DropdownMenuItem).isFocusable()) {
        focusable.push({ index: i, item });
      }
    }
    return focusable;
  }

  private findNextFocusable(currentIndex: number, direction: 1 | -1): number {
    const focusable = this.getFocusableItems();
    if (focusable.length === 0) return -1;

    if (currentIndex === -1) {
      return direction === 1 ? focusable[0]!.index : focusable[focusable.length - 1]!.index;
    }

    const currentFocusableIndex = focusable.findIndex((f) => f.index === currentIndex);
    if (currentFocusableIndex === -1) {
      return direction === 1 ? focusable[0]!.index : focusable[focusable.length - 1]!.index;
    }

    let nextFocusableIndex = currentFocusableIndex + direction;
    if (nextFocusableIndex < 0) {
      nextFocusableIndex = focusable.length - 1;
    } else if (nextFocusableIndex >= focusable.length) {
      nextFocusableIndex = 0;
    }

    return focusable[nextFocusableIndex]!.index;
  }

  private handleTypeahead(char: string): void {
    if (!this.context) return;

    const now = Date.now();
    const TYPEAHEAD_TIMEOUT = 500;

    if (now - this.context.state.typeaheadTimestamp > TYPEAHEAD_TIMEOUT) {
      this.context.state.typeaheadBuffer = "";
    }

    this.context.state.typeaheadBuffer += char.toLowerCase();
    this.context.state.typeaheadTimestamp = now;

    const searchText = this.context.state.typeaheadBuffer;
    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i]!;
      const label = (item as DropdownMenuItem).getLabel();
      if (
        label &&
        label.toLowerCase().startsWith(searchText) &&
        (item as DropdownMenuItem).isFocusable()
      ) {
        this.context.setFocusedIndex(i);
        break;
      }
    }
  }

  private activateFocusedItem(): void {
    if (!this.context) return;

    const focusedIndex = this.context.state.focusedIndex;
    if (focusedIndex === -1 || focusedIndex >= this.menuItems.length) return;

    const item = this.menuItems[focusedIndex];
    if (!item || !(item as DropdownMenuItem).isFocusable()) return;

    if (item instanceof GladeDropdownItem) {
      if (this.context.onOpenChange) {
        this.context.onOpenChange(false);
      }
    } else if (item instanceof GladeDropdownSub) {
      this.context.openChildSubmenu((item as GladeDropdownSub)["submenuId"]);
    }
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownMenuContentRequestState> {
    const menuPadding = this.context?.menuPadding ?? DEFAULT_MENU_PADDING;

    const childLayoutIds: LayoutId[] = [];
    const childElementIds: GlobalElementId[] = [];
    const childRequestStates: DropdownMenuChildRequestState[] = [];
    const childKinds: DropdownMenuItemKind[] = [];

    let itemIndex = 0;
    for (const item of this.menuItems) {
      const childId = cx.allocateChildId();
      childElementIds.push(childId);

      item.setContext(this.context!);
      item.setItemIndex(itemIndex);
      itemIndex++;

      const childCx: RequestLayoutContext = { ...cx, elementId: childId };
      const result = item.requestLayout(childCx);
      childLayoutIds.push(result.layoutId);
      childRequestStates.push(result.requestState);
      childKinds.push(getMenuItemKind(item));
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
      requestState: {
        layoutId,
        childLayoutIds,
        childElementIds,
        childRequestStates,
        childKinds,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DropdownMenuContentRequestState
  ): DropdownMenuContentPrepaintState {
    const { layoutId, childLayoutIds, childElementIds, childRequestStates, childKinds } =
      requestState;

    if (this.onBoundsKnown) {
      this.onBoundsKnown(bounds);
    }

    const originalBounds = cx.getBounds(layoutId);
    const deltaX = bounds.x - originalBounds.x;
    const deltaY = bounds.y - originalBounds.y;

    const childLayoutBounds = cx.getChildLayouts(bounds, childLayoutIds);
    const childPrepaintStates: DropdownMenuChildPrepaintEntry[] = [];
    const childBounds: Bounds[] = [];
    const childHitTestNodes: HitTestNode[] = [];

    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i]!;
      const childId = childElementIds[i]!;
      const childLayoutBound = childLayoutBounds[i]!;
      const childRequestState = childRequestStates[i]!;
      const childKind = childKinds[i]!;

      const adjustedChildBound: Bounds = {
        x: childLayoutBound.x + deltaX,
        y: childLayoutBound.y + deltaY,
        width: childLayoutBound.width,
        height: childLayoutBound.height,
      };

      childBounds.push(adjustedChildBound);

      const childCx = cx.withElementId(childId);
      const prepaintEntry = prepaintMenuItem(
        item,
        childCx,
        adjustedChildBound,
        childRequestState,
        childKind
      );
      if (prepaintEntry) {
        childPrepaintStates.push(prepaintEntry);
        const childHitTest = getHitTestFromPrepaint(prepaintEntry);
        if (childHitTest) {
          childHitTestNodes.push(childHitTest);
        }
      }
    }

    const context = this.context;
    const menuItems = this.menuItems;
    const findNextFocusable = this.findNextFocusable.bind(this);
    const handleTypeahead = this.handleTypeahead.bind(this);
    const activateFocusedItem = this.activateFocusedItem.bind(this);

    const keyDownHandler: KeyHandler = (event, _window, _cx) => {
      if (!context) return;

      const key = event.code;

      switch (key) {
        case "ArrowDown": {
          const next = findNextFocusable(context.state.focusedIndex, 1);
          context.setFocusedIndex(next);
          return { stopPropagation: true, preventDefault: true };
        }
        case "ArrowUp": {
          const prev = findNextFocusable(context.state.focusedIndex, -1);
          context.setFocusedIndex(prev);
          return { stopPropagation: true, preventDefault: true };
        }
        case "Home": {
          const first = findNextFocusable(-1, 1);
          context.setFocusedIndex(first);
          return { stopPropagation: true, preventDefault: true };
        }
        case "End": {
          const last = findNextFocusable(-1, -1);
          context.setFocusedIndex(last);
          return { stopPropagation: true, preventDefault: true };
        }
        case "Enter":
        case "Space": {
          activateFocusedItem();
          return { stopPropagation: true, preventDefault: true };
        }
        case "Escape": {
          if (context.depth > 0) {
            context.closeThisSubmenu();
          } else if (context.onOpenChange) {
            context.onOpenChange(false);
          }
          return { stopPropagation: true, preventDefault: true };
        }
        case "ArrowRight": {
          const focusedItem = menuItems[context.state.focusedIndex];
          if (focusedItem instanceof GladeDropdownSub) {
            context.openChildSubmenu(focusedItem["submenuId"]);
            return { stopPropagation: true, preventDefault: true };
          }
          break;
        }
        case "ArrowLeft": {
          if (context.depth > 0) {
            context.closeThisSubmenu();
            return { stopPropagation: true, preventDefault: true };
          }
          break;
        }
        default: {
          if (event.key.length === 1 && !event.modifiers.ctrl && !event.modifiers.meta) {
            handleTypeahead(event.key);
            return { stopPropagation: true, preventDefault: true };
          }
        }
      }

      return;
    };

    const mouseEnterHandler: MouseHandler = (event, _window, _handlerCx) => {
      if (context) {
        updateCursorPosition(context.dropdownId, { x: event.x, y: event.y });
      }
      if (context && context.depth > 0) {
        const dropdownId = context.dropdownId;
        cancelSubmenuClose(dropdownId, context.currentPath);
      }

      if (context?.parentContext) {
        context.parentContext.setFocusedIndex(-1);
      }
    };

    const mouseMoveHandler: MouseHandler = (event, _window, _handlerCx) => {
      if (context) {
        updateCursorPosition(context.dropdownId, { x: event.x, y: event.y });
      }
    };

    const mouseLeaveHandler: MouseHandler = (event, window, handlerCx) => {
      if (!context || context.depth === 0) {
        return;
      }
      const dropdownId = context.dropdownId;
      const path = context.currentPath;
      const submenuId = path[path.length - 1];
      if (!submenuId) {
        return;
      }
      updateCursorPosition(dropdownId, { x: event.x, y: event.y });
      scheduleSubmenuClose(
        dropdownId,
        path,
        DEFAULT_SUBMENU_CLOSE_DELAY,
        window.id,
        (id) => handlerCx.markWindowDirty(id),
        () => shouldDeferSubmenuClose(dropdownId, submenuId, { x: event.x, y: event.y })
      );
    };

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {
        keyDown: keyDownHandler,
        mouseEnter: mouseEnterHandler,
        mouseMove: mouseMoveHandler,
        mouseLeave: mouseLeaveHandler,
      },
      focusHandle: null,
      scrollHandle: null,
      keyContext: "dropdown-menu",
      children: childHitTestNodes,
      allowChildOutsideBounds: true,
      blocksPointerEvents: true,
    };

    return { childElementIds, childPrepaintStates, childBounds, hitTestNode };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DropdownMenuContentPrepaintState): void {
    const context = this.context;
    if (!context) {
      return;
    }
    const menuBg = context.menuBg;
    const menuBorder = context.menuBorder;
    const menuBorderRadius = context.menuBorderRadius ?? DEFAULT_MENU_BORDER_RADIUS;

    cx.paintRect(bounds, {
      backgroundColor: menuBg,
      borderRadius: menuBorderRadius,
      borderColor: menuBorder,
      borderWidth: 1,
    });

    const { childElementIds, childPrepaintStates, childBounds } = prepaintState;

    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i]!;
      const childId = childElementIds[i]!;
      const childBound = childBounds[i]!;
      const childPrepaintState = childPrepaintStates[i]!;

      const childCx = cx.withElementId(childId);
      paintMenuItem(item, childCx, childBound, childPrepaintState);
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

// ============================================================================ //
// Root Context Helper                                                          //
// ============================================================================ //

export function buildRootMenuContext(
  dropdownId: string,
  menuItems: MenuItemElement[],
  disabled: boolean,
  onOpenChange: DropdownOpenChangeHandler | null,
  style: {
    menuBg: ColorObject;
    menuBorder: ColorObject;
    menuBorderRadius: number;
    menuPadding: number;
    itemBg: ColorObject;
    itemHoverBg: ColorObject;
    itemText: ColorObject;
    itemHoverText: ColorObject;
    itemDisabledText: ColorObject;
    labelText: ColorObject;
    separatorColor: ColorObject;
    destructiveText: ColorObject;
    destructiveHoverBg: ColorObject;
    shortcutText: ColorObject;
    checkColor: ColorObject;
    fontSize: number;
    labelFontSize: number;
    shortcutFontSize: number;
    itemPaddingX: number;
    itemPaddingY: number;
    indicatorWidth: number;
  }
): DropdownMenuContext {
  const menuState: DropdownMenuState = {
    focusedIndex: -1,
    openSubmenuId: null,
    typeaheadBuffer: "",
    typeaheadTimestamp: 0,
  };

  const currentPath: SubmenuPath = [];

  return {
    dropdownId,
    onOpenChange,
    disabled,
    state: menuState,
    setFocusedIndex: (index: number) => {
      menuState.focusedIndex = index;
    },
    currentPath,
    openChildSubmenu: (childId: string) => {
      const childPath = [...currentPath, childId];
      openSubmenuPath(dropdownId, childPath);
    },
    closeThisSubmenu: () => {
      closeSubmenuAtDepth(dropdownId, 0);
    },
    isChildSubmenuOpen: (childId: string) => {
      const childPath = [...currentPath, childId];
      return isSubmenuContentVisible(dropdownId, childPath);
    },
    closeAllMenus: () => {
      clearDropdownState(dropdownId);
      if (onOpenChange) {
        onOpenChange(false);
      }
    },
    itemCount: menuItems.length,
    depth: 0,
    parentContext: null,
    radioValue: undefined,
    onRadioChange: undefined,
    menuBg: style.menuBg,
    menuBorder: style.menuBorder,
    menuBorderRadius: style.menuBorderRadius,
    menuPadding: style.menuPadding,
    itemBg: style.itemBg,
    itemHoverBg: style.itemHoverBg,
    itemText: style.itemText,
    itemHoverText: style.itemHoverText,
    itemDisabledText: style.itemDisabledText,
    labelText: style.labelText,
    separatorColor: style.separatorColor,
    destructiveText: style.destructiveText,
    destructiveHoverBg: style.destructiveHoverBg,
    shortcutText: style.shortcutText,
    checkColor: style.checkColor,
    fontSize: style.fontSize,
    labelFontSize: style.labelFontSize,
    shortcutFontSize: style.shortcutFontSize,
    itemPaddingX: style.itemPaddingX,
    itemPaddingY: style.itemPaddingY,
    indicatorWidth: style.indicatorWidth,
  };
}
