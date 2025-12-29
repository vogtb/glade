/**
 * Dropdown menu components for Flash.
 *
 * Provides a full-featured dropdown menu system with:
 * - Keyboard navigation (arrow keys, Enter, Escape, type-ahead)
 * - Submenus with hover/keyboard support
 * - Checkbox and radio items
 * - Shortcut display
 * - Proper focus management
 *
 * API inspired by basecn/shadcn dropdown-menu patterns.
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
import type { Bounds, Color, Size, WindowId } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode, ClickHandler, KeyHandler, MouseHandler } from "./dispatch.ts";
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
const DEFAULT_SHORTCUT_TEXT: Color = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
const DEFAULT_CHECK_COLOR: Color = { r: 0.9, g: 0.9, b: 0.9, a: 1 };

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_LABEL_FONT_SIZE = 12;
const DEFAULT_SHORTCUT_FONT_SIZE = 12;
const DEFAULT_ITEM_PADDING_X = 12;
const DEFAULT_ITEM_PADDING_Y = 8;
const DEFAULT_MENU_PADDING = 4;
const DEFAULT_MENU_BORDER_RADIUS = 6;
const DEFAULT_MENU_MIN_WIDTH = 160;
const DEFAULT_SEPARATOR_HEIGHT = 1;
const DEFAULT_SEPARATOR_MARGIN = 4;
const DEFAULT_INDICATOR_WIDTH = 20;
const DEFAULT_SUBMENU_DELAY = 150;
const DEFAULT_SUBMENU_CLOSE_DELAY = 100;

// ============================================================================
// Global Submenu State Registry (Hierarchical)
// ============================================================================
// Since dropdown elements are recreated each frame, we need persistent storage
// for submenu open state. This uses a path-based hierarchy to support nested submenus.

/**
 * Path represents the chain of open submenus from root.
 * e.g., ["submenu-Open Recent", "submenu-More Files"] means
 * "Open Recent" is open, and within it "More Files" is open.
 */
type SubmenuPath = string[];

/**
 * Hierarchical state for a dropdown, tracking the full open submenu chain.
 */
type DropdownSubmenuState = {
  /** Unique session id for this dropdown open lifecycle */
  sessionId: number;
  /** Currently open submenu path from root */
  openPath: SubmenuPath;
  /** Cached bounds for safe polygon calculation, keyed by submenu ID */
  submenuBounds: Map<string, Bounds>;
  /** Cached trigger bounds for safe polygon, keyed by submenu ID */
  triggerBounds: Map<string, Bounds>;
  /** Hover timers keyed by path key */
  hoverTimers: Map<string, ReturnType<typeof setTimeout>>;
  /** Close timers keyed by path key */
  closeTimers: Map<string, ReturnType<typeof setTimeout>>;
  /** Most recent cursor position */
  lastCursorPosition: Point | null;
  /** Previous cursor position (for direction) */
  prevCursorPosition: Point | null;
  /** Timestamp of last cursor update */
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

function getDropdownState(dropdownId: string): DropdownSubmenuState {
  let state = globalDropdownState.get(dropdownId);
  if (!state) {
    state = createDropdownState();
    globalDropdownState.set(dropdownId, state);
  }
  return state;
}

function resetDropdownState(dropdownId: string): DropdownSubmenuState {
  const state = createDropdownState();
  globalDropdownState.set(dropdownId, state);
  return state;
}

function clearDropdownState(dropdownId: string): void {
  const state = globalDropdownState.get(dropdownId);
  if (state) {
    // Clear all timers
    for (const timer of state.hoverTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of state.closeTimers.values()) {
      clearTimeout(timer);
    }
  }
  globalDropdownState.delete(dropdownId);
}

/**
 * Check if a submenu at the given path should show its content.
 */
function isSubmenuContentVisible(dropdownId: string, path: SubmenuPath): boolean {
  const state = getDropdownState(dropdownId);
  const { openPath } = state;

  // The submenu content is visible if openPath length >= path length
  // AND path matches the first N elements of openPath
  if (openPath.length < path.length) return false;

  for (let i = 0; i < path.length; i++) {
    if (openPath[i] !== path[i]) return false;
  }
  return true;
}

/**
 * Open a submenu at the given path (automatically closes siblings).
 */
function openSubmenuPath(dropdownId: string, path: SubmenuPath): void {
  const state = getDropdownState(dropdownId);
  state.openPath = path;
}

/**
 * Close submenus at and below the given depth.
 */
function closeSubmenuAtDepth(dropdownId: string, depth: number): void {
  const state = getDropdownState(dropdownId);
  state.openPath = state.openPath.slice(0, depth);
}

// ============================================================================
// Centralized Timer Management
// ============================================================================

type MarkWindowDirtyFn = (windowId: WindowId) => void;

/**
 * Schedule opening a submenu after hover delay.
 */
function scheduleSubmenuOpen(
  dropdownId: string,
  path: SubmenuPath,
  delay: number,
  windowId: WindowId,
  markDirty: MarkWindowDirtyFn
): void {
  const state = getDropdownState(dropdownId);
  const sessionId = state.sessionId;
  const pathKey = path.join("/");

  // Cancel any existing open timer for this path
  const existingHoverTimer = state.hoverTimers.get(pathKey);
  if (existingHoverTimer) {
    clearTimeout(existingHoverTimer);
  }

  // Cancel any close timer for this path (user is hovering again)
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

/**
 * Schedule closing a submenu with optional safe polygon check.
 */
function scheduleSubmenuClose(
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

  // Cancel any existing close timer
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

    // Check grace conditions before closing
    if (shouldDeferClose && shouldDeferClose()) {
      scheduleSubmenuClose(dropdownId, path, delay, windowId, markDirty, shouldDeferClose);
      return;
    }

    closeSubmenuAtDepth(dropdownId, path.length - 1);
    markDirty(windowId);
  }, delay);

  state.closeTimers.set(pathKey, timer);
}

/**
 * Cancel pending close for a submenu (user re-entered).
 */
function cancelSubmenuClose(dropdownId: string, path: SubmenuPath): void {
  const state = getDropdownState(dropdownId);
  const pathKey = path.join("/");

  const timer = state.closeTimers.get(pathKey);
  if (timer) {
    clearTimeout(timer);
    state.closeTimers.delete(pathKey);
  }
}

/**
 * Cancel pending open for a submenu (user left before delay).
 */
function cancelSubmenuOpen(dropdownId: string, path: SubmenuPath): void {
  const state = getDropdownState(dropdownId);
  const pathKey = path.join("/");

  const timer = state.hoverTimers.get(pathKey);
  if (timer) {
    clearTimeout(timer);
    state.hoverTimers.delete(pathKey);
  }
}

// ============================================================================
// Bounds Storage for Safe Polygon
// ============================================================================

/**
 * Update cached bounds for a submenu (for safe polygon calculation).
 */
function updateSubmenuBounds(dropdownId: string, submenuId: string, bounds: Bounds): void {
  getDropdownState(dropdownId).submenuBounds.set(submenuId, bounds);
}

/**
 * Get cached submenu bounds.
 */
function getSubmenuBounds(dropdownId: string, submenuId: string): Bounds | null {
  return getDropdownState(dropdownId).submenuBounds.get(submenuId) ?? null;
}

/**
 * Update cached trigger bounds for a submenu.
 */
function updateTriggerBounds(dropdownId: string, submenuId: string, bounds: Bounds): void {
  getDropdownState(dropdownId).triggerBounds.set(submenuId, bounds);
}

/**
 * Get cached trigger bounds.
 */
function getTriggerBounds(dropdownId: string, submenuId: string): Bounds | null {
  return getDropdownState(dropdownId).triggerBounds.get(submenuId) ?? null;
}

/**
 * Update cursor position for safe polygon calculation.
 */
function updateCursorPosition(dropdownId: string, position: Point): void {
  const state = getDropdownState(dropdownId);
  state.prevCursorPosition = state.lastCursorPosition;
  state.lastCursorPosition = position;
  state.lastCursorTimestamp = Date.now();
}

/**
 * Get last known cursor position.
 */
function getCursorPosition(dropdownId: string): Point | null {
  return getDropdownState(dropdownId).lastCursorPosition;
}

function getSubmenuSide(triggerBounds: Bounds, submenuBounds: Bounds): "left" | "right" {
  return submenuBounds.x >= triggerBounds.x ? "right" : "left";
}

function isCursorInsideGracePolygon(
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

function isCursorMovingTowardSubmenu(dropdownId: string, submenuId: string): boolean {
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
  return cosTheta > 0.35; // ~69 degrees cone toward submenu
}

function shouldDeferSubmenuClose(dropdownId: string, submenuId: string, anchor?: Point): boolean {
  return (
    isCursorInsideGracePolygon(dropdownId, submenuId, anchor) ||
    isCursorMovingTowardSubmenu(dropdownId, submenuId)
  );
}

// ============================================================================
// Safe Polygon for Submenu Navigation
// ============================================================================

/**
 * A point in 2D space.
 */
type Point = { x: number; y: number };

/**
 * Creates a safe polygon that allows diagonal cursor movement from
 * the trigger to the submenu without accidentally closing it.
 *
 * The polygon is a triangle formed by:
 * - The cursor position
 * - Two corners of the submenu (top and bottom on the side closest to trigger)
 */
function createSafePolygon(
  _triggerBounds: Bounds,
  submenuBounds: Bounds,
  cursorPosition: Point,
  side: "left" | "right"
): Point[] {
  if (side === "right") {
    // Submenu is to the right of trigger
    // Triangle: cursor -> submenu top-left -> submenu bottom-left
    return [
      cursorPosition,
      { x: submenuBounds.x, y: submenuBounds.y },
      { x: submenuBounds.x, y: submenuBounds.y + submenuBounds.height },
    ];
  } else {
    // Submenu is to the left of trigger
    // Triangle: cursor -> submenu top-right -> submenu bottom-right
    return [
      cursorPosition,
      { x: submenuBounds.x + submenuBounds.width, y: submenuBounds.y },
      { x: submenuBounds.x + submenuBounds.width, y: submenuBounds.y + submenuBounds.height },
    ];
  }
}

/**
 * Tests if a point is inside a polygon using ray casting algorithm.
 */
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
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
 * Handler called when checkbox state changes.
 */
export type DropdownCheckedChangeHandler = (checked: boolean) => void;

/**
 * Handler called when radio value changes.
 */
export type DropdownValueChangeHandler = (value: string) => void;

/**
 * Side preference for menu positioning.
 */
export type DropdownSide = "top" | "bottom" | "left" | "right";

/**
 * Alignment along the side.
 */
export type DropdownAlign = "start" | "center" | "end";

/**
 * State for dropdown menu (persisted across frames).
 */
type DropdownMenuState = {
  focusedIndex: number;
  openSubmenuId: string | null; // Currently open submenu at this level
  typeaheadBuffer: string;
  typeaheadTimestamp: number;
};

/**
 * Context passed from Dropdown to menu items.
 */
type DropdownMenuContext = {
  dropdownId: string; // Stable ID for the root dropdown (used for global state)
  onOpenChange: DropdownOpenChangeHandler | null;
  disabled: boolean;
  state: DropdownMenuState;
  setFocusedIndex: (index: number) => void;
  // Path-based submenu control (replaces flat setOpenSubmenu)
  currentPath: SubmenuPath; // Path to THIS menu level
  openChildSubmenu: (childId: string) => void; // Open a child submenu
  closeThisSubmenu: () => void; // Close this submenu level (and all children)
  isChildSubmenuOpen: (childId: string) => boolean; // Check if a child is open
  closeAllMenus: () => void; // Close entire menu hierarchy
  itemCount: number;
  // Hierarchy tracking
  depth: number; // 0 for root menu, 1+ for submenus
  parentContext: DropdownMenuContext | null;
  // Radio group context (if inside one)
  radioValue?: string;
  onRadioChange?: DropdownValueChangeHandler;
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
  shortcutText: Color;
  checkColor: Color;
  fontSize: number;
  labelFontSize: number;
  shortcutFontSize: number;
  itemPaddingX: number;
  itemPaddingY: number;
  indicatorWidth: number;
};

// ============================================================================
// Menu Item Base Interface
// ============================================================================

/**
 * Common interface for all menu items.
 */
interface DropdownMenuItem {
  /**
   * Whether this item can receive focus.
   */
  isFocusable(): boolean;

  /**
   * Get the label text for type-ahead matching.
   */
  getLabel(): string | null;

  /**
   * Set the item index (for focus tracking).
   */
  setItemIndex(index: number): void;

  /**
   * Set the menu context.
   */
  setContext(context: DropdownMenuContext): void;
}

// ============================================================================
// DropdownItem
// ============================================================================

type DropdownItemRequestState = {
  layoutId: LayoutId;
  labelSize: Size;
  shortcutSize: Size | null;
};

type DropdownItemPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  labelBounds: Bounds;
  shortcutBounds: Bounds | null;
};

/**
 * A selectable item in the dropdown menu.
 */
export class FlashDropdownItem
  extends FlashElement<DropdownItemRequestState, DropdownItemPrepaintState>
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
   * Set keyboard shortcut display text.
   */
  shortcut(text: string): this {
    this.shortcutText = text;
    return this;
  }

  /**
   * Set selection handler.
   */
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
    // Focus is scoped to this menu level
    return this.context?.state.focusedIndex === this.itemIndex;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownItemRequestState> {
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const shortcutFontSize = this.context?.shortcutFontSize ?? DEFAULT_SHORTCUT_FONT_SIZE;
    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y;
    const lineHeight = fontSize * 1.2;

    // Measure text in requestLayout
    const labelSize = cx.measureText(this.labelText, {
      fontSize,
      fontFamily: "Inter",
      fontWeight: 400,
      lineHeight,
    });

    let shortcutSize: Size | null = null;
    if (this.shortcutText) {
      shortcutSize = cx.measureText(this.shortcutText, {
        fontSize: shortcutFontSize,
        fontFamily: "Inter",
        fontWeight: 400,
        lineHeight: shortcutFontSize * 1.2,
      });
    }

    // Calculate total width needed
    const contentWidth = labelSize.width + (shortcutSize ? shortcutSize.width + 24 : 0);

    const layoutId = cx.requestLayout(
      {
        paddingLeft: paddingX,
        paddingRight: paddingX,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        width: "100%",
        minWidth: contentWidth + paddingX * 2,
        height: lineHeight + paddingY * 2,
      },
      []
    );

    return {
      layoutId,
      requestState: {
        layoutId,
        labelSize,
        shortcutSize,
      },
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

    const clickHandler: ClickHandler = (_event, _window, _cx) => {
      if (isDisabled) return;
      if (onSelectHandler) {
        onSelectHandler();
      }
      if (context?.onOpenChange) {
        context.onOpenChange(false);
      }
    };

    const mouseEnterHandler: MouseHandler = (_event, _window, _cx) => {
      if (!isDisabled && context) {
        context.setFocusedIndex(itemIndex);
      }
    };

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: { click: clickHandler, mouseEnter: mouseEnterHandler },
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };

    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const lineHeight = fontSize * 1.2;

    // Use sizes from requestState
    const { labelSize, shortcutSize } = requestState;

    // Calculate text bounds
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

    return { hitbox, hitTestNode, labelBounds, shortcutBounds };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DropdownItemPrepaintState): void {
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.isCurrentlyFocused();
    const isHighlighted = isHovered || isFocused;
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
    const shortcutTextColor = this.context?.shortcutText ?? DEFAULT_SHORTCUT_TEXT;
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const shortcutFontSize = this.context?.shortcutFontSize ?? DEFAULT_SHORTCUT_FONT_SIZE;

    const bgColor = isHighlighted && !isDisabled ? itemHoverBg : itemBg;
    const textColor = isDisabled ? itemDisabledText : isHighlighted ? itemHoverText : itemText;

    // Paint background
    if (bgColor.a > 0) {
      cx.paintRect(bounds, {
        backgroundColor: bgColor,
        borderRadius: 4,
      });
    }

    // Paint label text
    cx.paintGlyphs(this.labelText, prepaintState.labelBounds, textColor, {
      fontSize,
      fontFamily: "Inter",
      fontWeight: 400,
    });

    // Paint shortcut text
    if (this.shortcutText && prepaintState.shortcutBounds) {
      cx.paintGlyphs(this.shortcutText, prepaintState.shortcutBounds, shortcutTextColor, {
        fontSize: shortcutFontSize,
        fontFamily: "Inter",
        fontWeight: 400,
      });
    }
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================
// DropdownCheckbox
// ============================================================================

type DropdownCheckboxRequestState = {
  layoutId: LayoutId;
  labelSize: Size;
};

type DropdownCheckboxPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  indicatorBounds: Bounds;
  labelBounds: Bounds;
};

/**
 * A checkbox item in the dropdown menu.
 */
export class FlashDropdownCheckbox
  extends FlashElement<DropdownCheckboxRequestState, DropdownCheckboxPrepaintState>
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

  /**
   * Set the checked state.
   */
  checked(v: boolean): this {
    this.checkedValue = v;
    return this;
  }

  /**
   * Disable this item.
   */
  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  /**
   * Set checked change handler.
   */
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

    const labelSize = cx.measureText(this.labelText, {
      fontSize,
      fontFamily: "Inter",
      fontWeight: 400,
      lineHeight,
    });

    const layoutId = cx.requestLayout(
      {
        paddingLeft: paddingX + indicatorWidth,
        paddingRight: paddingX,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        width: "100%",
        minWidth: labelSize.width + paddingX * 2 + indicatorWidth,
        height: lineHeight + paddingY * 2,
      },
      []
    );

    return {
      layoutId,
      requestState: { layoutId, labelSize },
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

    const clickHandler: ClickHandler = (_event, _window, _cx) => {
      if (isDisabled) return;
      if (onCheckedChangeHandler) {
        onCheckedChangeHandler(!currentChecked);
      }
    };

    const mouseEnterHandler: MouseHandler = (_event, _window, _cx) => {
      if (!isDisabled && context) {
        context.setFocusedIndex(itemIndex);
      }
    };

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: { click: clickHandler, mouseEnter: mouseEnterHandler },
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
      y: bounds.y + (bounds.height - lineHeight) / 2,
      width: indicatorWidth,
      height: lineHeight,
    };

    const labelBounds: Bounds = {
      x: bounds.x + paddingX + indicatorWidth,
      y: bounds.y + (bounds.height - lineHeight) / 2,
      width: labelSize.width,
      height: lineHeight,
    };

    return { hitbox, hitTestNode, indicatorBounds, labelBounds };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DropdownCheckboxPrepaintState): void {
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.isCurrentlyFocused();
    const isHighlighted = isHovered || isFocused;
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);

    const itemBg = this.context?.itemBg ?? DEFAULT_ITEM_BG;
    const itemHoverBg = this.context?.itemHoverBg ?? DEFAULT_ITEM_HOVER_BG;
    const itemText = this.context?.itemText ?? DEFAULT_ITEM_TEXT;
    const itemHoverText = this.context?.itemHoverText ?? DEFAULT_ITEM_HOVER_TEXT;
    const itemDisabledText = this.context?.itemDisabledText ?? DEFAULT_ITEM_DISABLED_TEXT;
    const checkColor = this.context?.checkColor ?? DEFAULT_CHECK_COLOR;
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;

    const bgColor = isHighlighted && !isDisabled ? itemHoverBg : itemBg;
    const textColor = isDisabled ? itemDisabledText : isHighlighted ? itemHoverText : itemText;

    // Paint background
    if (bgColor.a > 0) {
      cx.paintRect(bounds, {
        backgroundColor: bgColor,
        borderRadius: 4,
      });
    }

    // Paint checkmark if checked
    if (this.checkedValue) {
      const checkBounds: Bounds = {
        x: prepaintState.indicatorBounds.x,
        y: prepaintState.indicatorBounds.y,
        width: prepaintState.indicatorBounds.width,
        height: prepaintState.indicatorBounds.height,
      };
      cx.paintGlyphs("✓", checkBounds, isDisabled ? itemDisabledText : checkColor, {
        fontSize: fontSize - 2,
        fontFamily: "Inter",
        fontWeight: 600,
      });
    }

    // Paint label text
    cx.paintGlyphs(this.labelText, prepaintState.labelBounds, textColor, {
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
// DropdownRadio
// ============================================================================

type DropdownRadioRequestState = {
  layoutId: LayoutId;
  labelSize: Size;
};

type DropdownRadioPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  indicatorBounds: Bounds;
  labelBounds: Bounds;
};

/**
 * A radio item in the dropdown menu (use inside DropdownRadioGroup).
 */
export class FlashDropdownRadio
  extends FlashElement<DropdownRadioRequestState, DropdownRadioPrepaintState>
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

  /**
   * Disable this item.
   */
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

    const labelSize = cx.measureText(this.labelText, {
      fontSize,
      fontFamily: "Inter",
      fontWeight: 400,
      lineHeight,
    });

    const layoutId = cx.requestLayout(
      {
        paddingLeft: paddingX + indicatorWidth,
        paddingRight: paddingX,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        width: "100%",
        minWidth: labelSize.width + paddingX * 2 + indicatorWidth,
        height: lineHeight + paddingY * 2,
      },
      []
    );

    return {
      layoutId,
      requestState: { layoutId, labelSize },
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

    const clickHandler: ClickHandler = (_event, _window, _cx) => {
      if (isDisabled) return;
      if (context?.onRadioChange) {
        context.onRadioChange(radioValue);
      }
    };

    const mouseEnterHandler: MouseHandler = (_event, _window, _cx) => {
      if (!isDisabled && context) {
        context.setFocusedIndex(itemIndex);
      }
    };

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: { click: clickHandler, mouseEnter: mouseEnterHandler },
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
      y: bounds.y + (bounds.height - lineHeight) / 2,
      width: indicatorWidth,
      height: lineHeight,
    };

    const labelBounds: Bounds = {
      x: bounds.x + paddingX + indicatorWidth,
      y: bounds.y + (bounds.height - lineHeight) / 2,
      width: labelSize.width,
      height: lineHeight,
    };

    return { hitbox, hitTestNode, indicatorBounds, labelBounds };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DropdownRadioPrepaintState): void {
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.isCurrentlyFocused();
    const isHighlighted = isHovered || isFocused;
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);
    const isSelected = this.isSelected();

    const itemBg = this.context?.itemBg ?? DEFAULT_ITEM_BG;
    const itemHoverBg = this.context?.itemHoverBg ?? DEFAULT_ITEM_HOVER_BG;
    const itemText = this.context?.itemText ?? DEFAULT_ITEM_TEXT;
    const itemHoverText = this.context?.itemHoverText ?? DEFAULT_ITEM_HOVER_TEXT;
    const itemDisabledText = this.context?.itemDisabledText ?? DEFAULT_ITEM_DISABLED_TEXT;
    const checkColor = this.context?.checkColor ?? DEFAULT_CHECK_COLOR;
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;

    const bgColor = isHighlighted && !isDisabled ? itemHoverBg : itemBg;
    const textColor = isDisabled ? itemDisabledText : isHighlighted ? itemHoverText : itemText;

    // Paint background
    if (bgColor.a > 0) {
      cx.paintRect(bounds, {
        backgroundColor: bgColor,
        borderRadius: 4,
      });
    }

    // Paint radio indicator if selected
    if (isSelected) {
      const dotBounds: Bounds = {
        x: prepaintState.indicatorBounds.x,
        y: prepaintState.indicatorBounds.y,
        width: prepaintState.indicatorBounds.width,
        height: prepaintState.indicatorBounds.height,
      };
      cx.paintGlyphs("●", dotBounds, isDisabled ? itemDisabledText : checkColor, {
        fontSize: fontSize - 4,
        fontFamily: "Inter",
        fontWeight: 400,
      });
    }

    // Paint label text
    cx.paintGlyphs(this.labelText, prepaintState.labelBounds, textColor, {
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
// DropdownRadioGroup
// ============================================================================

/**
 * A radio group that wraps radio items for exclusive selection.
 * This is a logical container - it provides context to child radios.
 */
export class FlashDropdownRadioGroup {
  private valueInternal: string = "";
  private onValueChangeHandler: DropdownValueChangeHandler | null = null;
  private radioItems: FlashDropdownRadio[] = [];

  /**
   * Set the current selected value.
   */
  value(v: string): this {
    this.valueInternal = v;
    return this;
  }

  /**
   * Set value change handler.
   */
  onValueChange(handler: DropdownValueChangeHandler): this {
    this.onValueChangeHandler = handler;
    return this;
  }

  /**
   * Add radio items.
   */
  items(...radios: FlashDropdownRadio[]): this {
    this.radioItems.push(...radios);
    return this;
  }

  /**
   * Get the current value.
   */
  getValue(): string {
    return this.valueInternal;
  }

  /**
   * Get the value change handler.
   */
  getOnValueChange(): DropdownValueChangeHandler | null {
    return this.onValueChangeHandler;
  }

  /**
   * Get the radio items.
   */
  getRadios(): FlashDropdownRadio[] {
    return this.radioItems;
  }
}

// ============================================================================
// DropdownSub (Submenu)
// ============================================================================

type DropdownSubRequestState = {
  layoutId: LayoutId;
  labelSize: Size;
  submenuContentRequestState: DropdownMenuContentRequestState | null;
  submenuContentElementId: GlobalElementId | null;
};

type DropdownSubPrepaintState = {
  hitbox: Hitbox;
  hitTestNode: HitTestNode;
  labelBounds: Bounds;
  chevronBounds: Bounds;
  submenuContentPrepaintState: DropdownMenuContentPrepaintState | null;
  submenuContentBounds: Bounds | null;
  submenuContentElementId: GlobalElementId | null;
};

/**
 * A submenu trigger item that opens a nested menu.
 * Unlike the main dropdown, submenus are rendered INLINE within the parent menu's
 * element tree (not as separate popovers), to avoid conflicts with PopoverManager
 * which only supports one active popover at a time.
 */
export class FlashDropdownSub
  extends FlashElement<DropdownSubRequestState, DropdownSubPrepaintState>
  implements DropdownMenuItem
{
  private submenuId: string;
  private labelText: string;
  private disabledValue = false;
  private menuItems: MenuItemElement[] = [];
  private context: DropdownMenuContext | null = null;
  private itemIndex = -1;
  // The submenu content element - rendered inline, not as popover
  private submenuContent: FlashDropdownMenuContent | null = null;

  constructor(label: string) {
    super();
    this.labelText = label;
    // Use label as stable ID - this ensures the same submenu has the same ID across frames
    // The label should be unique within a menu level
    this.submenuId = `submenu-${label}`;
  }

  /**
   * Disable this submenu.
   */
  disabled(v: boolean): this {
    this.disabledValue = v;
    return this;
  }

  /**
   * Add items to the submenu.
   */
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

  /**
   * Get the full path for this submenu in the hierarchy.
   */
  private getSubmenuPath(): SubmenuPath {
    if (!this.context) return [this.submenuId];
    return [...this.context.currentPath, this.submenuId];
  }

  /**
   * Check if THIS submenu's content should be rendered.
   */
  private isSubmenuOpen(): boolean {
    // Use parent context to check if THIS child is open
    return this.context?.isChildSubmenuOpen(this.submenuId) ?? false;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownSubRequestState> {
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;
    const paddingX = this.context?.itemPaddingX ?? DEFAULT_ITEM_PADDING_X;
    const paddingY = this.context?.itemPaddingY ?? DEFAULT_ITEM_PADDING_Y;
    const lineHeight = fontSize * 1.2;

    const labelSize = cx.measureText(this.labelText, {
      fontSize,
      fontFamily: "Inter",
      fontWeight: 400,
      lineHeight,
    });

    // Add space for chevron
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

    // If submenu is open, also request layout for the submenu content
    // This is done outside the normal layout tree since it will be absolutely positioned
    let submenuContentRequestState: DropdownMenuContentRequestState | null = null;
    let submenuContentElementId: GlobalElementId | null = null;

    const isOpen = this.isSubmenuOpen();

    if (isOpen && this.menuItems.length > 0 && this.context) {
      // Create submenu content element if needed
      if (!this.submenuContent) {
        this.submenuContent = new FlashDropdownMenuContent();
      }

      // Set up submenu context with path-based methods
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
        // Path-based methods for this submenu level
        currentPath: submenuPath,
        openChildSubmenu: (childId: string) => {
          const childPath = [...submenuPath, childId];
          openSubmenuPath(dropdownId, childPath);
        },
        closeThisSubmenu: () => {
          // Close this submenu level (returns to parent)
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

      // Request layout for submenu content
      submenuContentElementId = cx.allocateChildId();
      const submenuCx: RequestLayoutContext = { ...cx, elementId: submenuContentElementId };
      const submenuResult = this.submenuContent.requestLayout(submenuCx);
      submenuContentRequestState = submenuResult.requestState;
    } else {
      // Clear submenu content when closed
      this.submenuContent = null;
    }

    return {
      layoutId,
      requestState: { layoutId, labelSize, submenuContentRequestState, submenuContentElementId },
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

        // Cancel any pending close for this submenu
        cancelSubmenuClose(dropdownId, submenuPath);

        // Update cursor position in global state
        updateCursorPosition(dropdownId, { x: event.x, y: event.y });

        // Schedule submenu open after delay using centralized timer
        scheduleSubmenuOpen(dropdownId, submenuPath, DEFAULT_SUBMENU_DELAY, window.id, (winId) =>
          handlerCx.markWindowDirty(winId)
        );
      }
    };

    const mouseMoveHandler: MouseHandler = (event, _window, _cx) => {
      // Update cursor position in global state for safe polygon calculation
      if (dropdownId) {
        updateCursorPosition(dropdownId, { x: event.x, y: event.y });
      }
    };

    const mouseLeaveHandler: MouseHandler = (event, window, handlerCx) => {
      if (!context || !dropdownId) return;

      const winId = window.id;
      const cursor = { x: event.x, y: event.y };

      // Cancel any pending open
      cancelSubmenuOpen(dropdownId, submenuPath);
      updateCursorPosition(dropdownId, cursor);

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
        // Open immediately on click
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

    // Store trigger bounds in global state for safe polygon calculation
    if (dropdownId) {
      updateTriggerBounds(dropdownId, submenuId, bounds);
    }

    // Prepaint submenu content if open (rendered inline, not as popover)
    let submenuContentPrepaintState: DropdownMenuContentPrepaintState | null = null;
    let submenuContentBounds: Bounds | null = null;
    let submenuHitTestNode: HitTestNode | null = null;

    if (
      this.isSubmenuOpen() &&
      this.submenuContent &&
      submenuContentRequestState &&
      submenuContentElementId
    ) {
      // Compute layout for the floating submenu (separate from main layout tree)
      // This is necessary because the submenu layout was created but not computed
      const windowSize = cx.getWindowSize?.() ?? { width: 1920, height: 1080 };
      const submenuLayoutBounds =
        cx.computeFloatingLayout?.(
          submenuContentRequestState.layoutId,
          windowSize.width,
          windowSize.height
        ) ?? cx.getBounds(submenuContentRequestState.layoutId);

      // Position submenu to the right of parent menu item
      submenuContentBounds = {
        x: bounds.x + bounds.width, // Right edge of trigger
        y: bounds.y, // Align top with trigger
        width: submenuLayoutBounds.width,
        height: submenuLayoutBounds.height,
      };

      // Store submenu bounds in global state for safe polygon calculation
      if (dropdownId) {
        updateSubmenuBounds(dropdownId, submenuId, submenuContentBounds);
      }

      // Prepaint the submenu content
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
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DropdownSubPrepaintState): void {
    const isHovered = cx.isHitboxHovered(prepaintState.hitbox);
    const isFocused = this.isCurrentlyFocused();
    const isHighlighted = this.isSubmenuOpen() ? true : isHovered || isFocused;
    const isDisabled = this.disabledValue || (this.context?.disabled ?? false);

    const itemBg = this.context?.itemBg ?? DEFAULT_ITEM_BG;
    const itemHoverBg = this.context?.itemHoverBg ?? DEFAULT_ITEM_HOVER_BG;
    const itemText = this.context?.itemText ?? DEFAULT_ITEM_TEXT;
    const itemHoverText = this.context?.itemHoverText ?? DEFAULT_ITEM_HOVER_TEXT;
    const itemDisabledText = this.context?.itemDisabledText ?? DEFAULT_ITEM_DISABLED_TEXT;
    const fontSize = this.context?.fontSize ?? DEFAULT_FONT_SIZE;

    const bgColor = isHighlighted && !isDisabled ? itemHoverBg : itemBg;
    const textColor = isDisabled ? itemDisabledText : isHighlighted ? itemHoverText : itemText;

    // Paint background
    if (bgColor.a > 0) {
      cx.paintRect(bounds, {
        backgroundColor: bgColor,
        borderRadius: 4,
      });
    }

    // Paint label text
    cx.paintGlyphs(this.labelText, prepaintState.labelBounds, textColor, {
      fontSize,
      fontFamily: "Inter",
      fontWeight: 400,
    });

    // Paint chevron
    cx.paintGlyphs("›", prepaintState.chevronBounds, textColor, {
      fontSize: fontSize + 2,
      fontFamily: "Inter",
      fontWeight: 400,
    });

    // Paint submenu content if open
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
export class FlashDropdownSeparator
  extends FlashElement<DropdownSeparatorRequestState, DropdownSeparatorPrepaintState>
  implements DropdownMenuItem
{
  private context: DropdownMenuContext | null = null;

  isFocusable(): boolean {
    return false;
  }

  getLabel(): string | null {
    return null;
  }

  setItemIndex(_index: number): void {
    // Separators don't track index
  }

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
export class FlashDropdownLabel
  extends FlashElement<DropdownLabelRequestState, DropdownLabelPrepaintState>
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

  setItemIndex(_index: number): void {
    // Labels don't track index
  }

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
        paddingTop: paddingY + 4,
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
// Menu Item Union Type
// ============================================================================

type MenuItemElement =
  | FlashDropdownItem
  | FlashDropdownSeparator
  | FlashDropdownLabel
  | FlashDropdownCheckbox
  | FlashDropdownRadio
  | FlashDropdownSub;

// ============================================================================
// DropdownMenuContent
// ============================================================================

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

  // Callback for parent submenu to get bounds for safe polygon calculation
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

    // Reset buffer if too much time has passed
    if (now - this.context.state.typeaheadTimestamp > TYPEAHEAD_TIMEOUT) {
      this.context.state.typeaheadBuffer = "";
    }

    this.context.state.typeaheadBuffer += char.toLowerCase();
    this.context.state.typeaheadTimestamp = now;

    // Find matching item
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

    // Simulate a click on the focused item
    if (item instanceof FlashDropdownItem) {
      // The onSelect handler is private, so we close the menu
      // The actual activation happens through the click handler
      if (this.context.onOpenChange) {
        this.context.onOpenChange(false);
      }
    } else if (item instanceof FlashDropdownCheckbox) {
      // Toggle checkbox - this is a workaround since we can't access private handlers
      // In practice, the user will click or the handler should be accessible
    } else if (item instanceof FlashDropdownRadio) {
      // Select radio - similar workaround
    } else if (item instanceof FlashDropdownSub) {
      // Open submenu
      this.context.openChildSubmenu((item as FlashDropdownSub)["submenuId"]);
    }
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DropdownMenuContentRequestState> {
    const menuPadding = this.context?.menuPadding ?? DEFAULT_MENU_PADDING;

    const childLayoutIds: LayoutId[] = [];
    const childElementIds: GlobalElementId[] = [];
    const childRequestStates: unknown[] = [];

    // Set context and index on each item
    let itemIndex = 0;
    for (const item of this.menuItems) {
      const childId = cx.allocateChildId();
      childElementIds.push(childId);

      (item as DropdownMenuItem).setContext(this.context!);
      (item as DropdownMenuItem).setItemIndex(itemIndex);
      itemIndex++;

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

    // Report bounds to parent for safe polygon calculation
    if (this.onBoundsKnown) {
      this.onBoundsKnown(bounds);
    }

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

      const adjustedChildBound: Bounds = {
        x: childLayoutBound.x + deltaX,
        y: childLayoutBound.y + deltaY,
        width: childLayoutBound.width,
        height: childLayoutBound.height,
      };

      childBounds.push(adjustedChildBound);

      const childCx = cx.withElementId(childId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prepaintState = item.prepaint(childCx, adjustedChildBound, childRequestState as any);
      childPrepaintStates.push(prepaintState);

      const childHitTest = (prepaintState as { hitTestNode?: HitTestNode } | undefined)
        ?.hitTestNode;
      if (childHitTest) {
        childHitTestNodes.push(childHitTest);
      }
    }

    // Create keyboard handler for menu navigation
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
          // If we're in a submenu (depth > 0), close it and return to parent
          if (context.depth > 0) {
            context.closeThisSubmenu();
          } else if (context.onOpenChange) {
            // At root level - close the entire dropdown
            context.onOpenChange(false);
          }
          return { stopPropagation: true, preventDefault: true };
        }
        case "ArrowRight": {
          // Open submenu if focused on one
          const focusedItem = menuItems[context.state.focusedIndex];
          if (focusedItem instanceof FlashDropdownSub) {
            context.openChildSubmenu(focusedItem["submenuId"]);
            return { stopPropagation: true, preventDefault: true };
          }
          break;
        }
        case "ArrowLeft": {
          // If we're in a submenu (depth > 0), close it and return to parent
          if (context.depth > 0) {
            context.closeThisSubmenu();
            return { stopPropagation: true, preventDefault: true };
          }
          // At root level, ArrowLeft does nothing
          break;
        }
        default: {
          // Type-ahead search for single printable characters
          if (event.key.length === 1 && !event.modifiers.ctrl && !event.modifiers.meta) {
            handleTypeahead(event.key);
            return { stopPropagation: true, preventDefault: true };
          }
        }
      }

      return;
    };

    // Mouse enter handler to cancel pending close timers when entering submenu content
    const mouseEnterHandler: MouseHandler = (event, _window, _handlerCx) => {
      if (context) {
        updateCursorPosition(context.dropdownId, { x: event.x, y: event.y });
      }
      if (context && context.depth > 0) {
        // We're in a submenu - cancel any pending close for this submenu's path
        const dropdownId = context.dropdownId;
        cancelSubmenuClose(dropdownId, context.currentPath);
      }

      // When entering this menu's content, clear focus on the parent level
      // so only the active submenu trigger (which stays highlighted via isSubmenuOpen)
      // remains visually active.
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      item.paint(childCx, childBound, childPrepaintState as any);
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
// Dropdown (main element)
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

  // Menu state (persisted across frames via closure)
  private menuState: DropdownMenuState = {
    focusedIndex: -1,
    openSubmenuId: null,
    typeaheadBuffer: "",
    typeaheadTimestamp: 0,
  };

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
    this.dropdownId = `dropdown-${dropdownIdCounter++}`;
  }

  /**
   * Set a stable ID for this dropdown. Required for submenu state to persist across frames.
   */
  id(stableId: string): this {
    this.dropdownId = stableId;
    return this;
  }

  // ============ State ============

  /**
   * Set the open state (controlled mode).
   */
  open(v: boolean): this {
    this.openValue = v;
    const hasState = globalDropdownState.has(this.dropdownId);
    if (v && !hasState) {
      resetDropdownState(this.dropdownId);
      this.menuState.focusedIndex = -1;
      this.menuState.openSubmenuId = null;
      this.menuState.typeaheadBuffer = "";
      this.menuState.typeaheadTimestamp = 0;
    } else if (!v && hasState) {
      clearDropdownState(this.dropdownId);
    }
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
  items(...items: Array<MenuItemElement | FlashDropdownRadioGroup>): this {
    for (const item of items) {
      if (item instanceof FlashDropdownRadioGroup) {
        // Flatten radio group into individual radio items
        this.menuItems.push(...item.getRadios());
      } else {
        this.menuItems.push(item);
      }
    }
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

  // ============ Internal ============

  private buildMenuContext(): DropdownMenuContext {
    const menuState = this.menuState;

    // Find radio groups and set up their context
    let radioValue: string | undefined;
    let onRadioChange: DropdownValueChangeHandler | undefined;

    // Check if any items need radio context
    for (const item of this.menuItems) {
      if (item instanceof FlashDropdownRadio) {
        // Radio items get their context from parent group
        // For now, we'll need the user to pass the group
      }
    }

    const onOpenChangeHandler = this.onOpenChangeHandler;

    const dropdownId = this.dropdownId;
    const currentPath: SubmenuPath = []; // Root level has empty path

    return {
      dropdownId,
      onOpenChange: onOpenChangeHandler,
      disabled: this.disabledValue,
      state: menuState,
      setFocusedIndex: (index: number) => {
        menuState.focusedIndex = index;
      },
      // Path-based submenu control
      currentPath,
      openChildSubmenu: (childId: string) => {
        const childPath = [...currentPath, childId];
        openSubmenuPath(dropdownId, childPath);
      },
      closeThisSubmenu: () => {
        // At root level, just close all submenus
        closeSubmenuAtDepth(dropdownId, 0);
      },
      isChildSubmenuOpen: (childId: string) => {
        const childPath = [...currentPath, childId];
        return isSubmenuContentVisible(dropdownId, childPath);
      },
      closeAllMenus: () => {
        // Close entire menu hierarchy and dropdown
        clearDropdownState(dropdownId);
        if (onOpenChangeHandler) {
          onOpenChangeHandler(false);
        }
      },
      itemCount: this.menuItems.length,
      depth: 0, // Root menu is depth 0
      parentContext: null, // Root has no parent
      radioValue,
      onRadioChange,
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

    // Compute delta between passed bounds and original layout bounds.
    // This delta accounts for scroll offsets from ancestor scroll containers.
    const originalBounds = cx.getBounds(layoutId);
    const deltaX = bounds.x - originalBounds.x;
    const deltaY = bounds.y - originalBounds.y;

    // Get trigger layout bounds and apply the scroll delta
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
 *     dropdownItem("Edit").shortcut("⌘E").onSelect(() => handleEdit()),
 *     dropdownItem("Duplicate").onSelect(() => handleDuplicate()),
 *     dropdownSeparator(),
 *     dropdownCheckbox("Show Hidden").checked(showHidden).onCheckedChange(setShowHidden),
 *     dropdownSeparator(),
 *     dropdownSub("More Options").items(
 *       dropdownItem("Option A"),
 *       dropdownItem("Option B"),
 *     ),
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
 *   .shortcut("⌘E")
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

/**
 * Create a dropdown checkbox item.
 *
 * @param label - The text label for the checkbox
 *
 * @example
 * dropdownCheckbox("Show Hidden Files")
 *   .checked(showHidden)
 *   .onCheckedChange(setShowHidden)
 */
export function dropdownCheckbox(label: string): FlashDropdownCheckbox {
  return new FlashDropdownCheckbox(label);
}

/**
 * Create a dropdown radio item.
 *
 * @param label - The text label for the radio
 * @param value - The value for this radio option
 *
 * @example
 * dropdownRadioGroup()
 *   .value(viewMode)
 *   .onValueChange(setViewMode)
 *   .items(
 *     dropdownRadio("List", "list"),
 *     dropdownRadio("Grid", "grid"),
 *   )
 */
export function dropdownRadio(label: string, value: string): FlashDropdownRadio {
  return new FlashDropdownRadio(label, value);
}

/**
 * Create a dropdown radio group for exclusive selection.
 *
 * @example
 * dropdownRadioGroup()
 *   .value(viewMode)
 *   .onValueChange(setViewMode)
 *   .items(
 *     dropdownRadio("List View", "list"),
 *     dropdownRadio("Grid View", "grid"),
 *     dropdownRadio("Compact View", "compact"),
 *   )
 */
export function dropdownRadioGroup(): FlashDropdownRadioGroup {
  return new FlashDropdownRadioGroup();
}

/**
 * Create a dropdown submenu.
 *
 * @param label - The text label for the submenu trigger
 *
 * @example
 * dropdownSub("More Options")
 *   .items(
 *     dropdownItem("Option A").onSelect(handleA),
 *     dropdownItem("Option B").onSelect(handleB),
 *   )
 */
export function dropdownSub(label: string): FlashDropdownSub {
  return new FlashDropdownSub(label);
}
