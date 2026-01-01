import type { Bounds } from "./types.ts";
import {
  GladeElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
} from "./element.ts";
import type { LayoutId } from "./layout.ts";
import type { GladeContext } from "./context.ts";
import type { GladeWindow } from "./window.ts";
import type { Hitbox } from "./hitbox.ts";
import type {
  EventHandlers,
  HitTestNode,
  KeyHandler,
  MouseHandler,
  TextInputHandler,
  CompositionHandler,
  ClickHandler,
} from "./dispatch.ts";
import { Key } from "./keyboard.ts";
import type { FocusHandle, ScrollHandle } from "./entity.ts";

import {
  computeCaretRectWithLayout,
  createCachedTextLayout,
  cutSelectedText,
  getSelectedText,
  hitTestWithLayout,
  selectLineAtHit,
  selectWordAtHit,
  setFocused,
  setPreferredCaretX,
  valueWithComposition,
  beginComposition,
  cancelComposition,
  commitComposition,
  createTextInputState,
  deleteBackward,
  deleteForward,
  insertText,
  moveLeft,
  moveRight,
  moveToEnd,
  moveToStart,
  moveWordLeft,
  moveWordRight,
  redo,
  selectAll,
  setSelection,
  startPointerSelection,
  undo,
  updateComposition,
  updatePointerSelection,
  selectionPrimitivesWithLayout,
  compositionUnderlinesWithLayout,
  caretPrimitiveWithLayout,
  type CachedTextLayout,
  type PointerSelectionSession,
  type SelectionRange,
  type TextHitTestResult,
  type TextInputState,
  type TextInputStateInit,
} from "./text.ts";
import type { FontStyle } from "@glade/shaper";
import { GladeScene } from "./scene.ts";
import { inputColors } from "./theme.ts";
import type { Color } from "@glade/utils";

export const TEXT_INPUT_CONTEXT = "glade:text-input";

export interface TextInputOptions {
  value?: string;
  placeholder?: string;
  multiline?: boolean;
  readonly?: boolean;
  maxLength?: number;
  caretColor?: Color;
  selectionColor?: Color;
  compositionColor?: Color;
  caretThickness?: number;
  onSubmit?: (text: string) => void;
  onCancel?: () => void;
  onChange?: (text: string) => void;
  onComposition?: (event: { type: "start" | "update" | "end"; text: string }) => void;
  controller?: TextInputController;
  focusHandle?: FocusHandle;
  tabIndex?: number;
  padding?: { x: number; y: number };
  caretBlinkInterval?: number;
  width?: number;
  scrollHandle?: ScrollHandle;
  scrollViewport?: Bounds;
  scrollPadding?: number;
  onCaretMove?: (caret: Bounds) => void;
}

interface TextInputRequestState {
  layoutId: LayoutId;
  placeholderLayoutId: LayoutId | null;
}

interface TextInputPrepaintState {
  layoutId: LayoutId;
  placeholderLayoutId: LayoutId | null;
  bounds: Bounds;
  hitbox: Hitbox | null;
  hitTestNode: HitTestNode;
  colors: {
    text: Color;
    placeholder: Color;
    selection: Color;
    composition: Color;
    caret: Color;
  };
}

interface TextInputPersistentState {
  controller: TextInputController;
}

export class TextInputController {
  readonly state: TextInputState;
  focusHandle: FocusHandle | null;
  pointerSelection: PointerSelectionSession | null;

  // Layout cache - avoids recomputing layout multiple times per frame
  private cachedLayout: CachedTextLayout | null = null;
  private layoutCacheKey: string = "";

  // Content bounds from last prepaint - used for multiline height calculation
  contentBounds: Bounds | null = null;

  constructor(init: TextInputStateInit = {}) {
    this.state = createTextInputState(init);
    this.focusHandle = null;
    this.pointerSelection = null;
  }

  /**
   * Get or create cached layout for current text and parameters.
   * The layout is cached and reused until text or parameters change.
   */
  getLayout(
    fontSize: number,
    lineHeight: number,
    fontFamily: string,
    maxWidth?: number,
    style?: FontStyle
  ): CachedTextLayout {
    const text = valueWithComposition(this.state);
    const key = `${text}|${fontSize}|${lineHeight}|${fontFamily}|${maxWidth ?? ""}`;

    if (this.cachedLayout && this.layoutCacheKey === key) {
      return this.cachedLayout;
    }

    this.cachedLayout = createCachedTextLayout(
      text,
      fontSize,
      lineHeight,
      fontFamily,
      maxWidth,
      style
    );
    this.layoutCacheKey = key;
    return this.cachedLayout;
  }

  /**
   * Invalidate the cached layout. Call after text changes.
   */
  invalidateLayout(): void {
    this.cachedLayout = null;
    this.layoutCacheKey = "";
  }

  setValue(value: string): void {
    this.state.value = value;
    this.state.selection = { start: value.length, end: value.length };
    this.state.composition = null;
    this.state.preferredCaretX = null;
    this.invalidateLayout();
  }

  setSelection(range: SelectionRange): void {
    setSelection(this.state, range);
  }

  setFocused(focused: boolean): void {
    setFocused(this.state, focused);
  }

  setPreferredCaretX(x: number | null): void {
    setPreferredCaretX(this.state, x);
  }

  insertText(text: string): void {
    insertText(this.state, text);
    this.invalidateLayout();
  }

  deleteBackward(): void {
    deleteBackward(this.state);
    this.invalidateLayout();
  }

  deleteForward(): void {
    deleteForward(this.state);
    this.invalidateLayout();
  }

  moveLeft(extendSelection: boolean): void {
    moveLeft(this.state, extendSelection);
  }

  moveRight(extendSelection: boolean): void {
    moveRight(this.state, extendSelection);
  }

  moveWordLeft(extendSelection: boolean): void {
    moveWordLeft(this.state, extendSelection);
  }

  moveWordRight(extendSelection: boolean): void {
    moveWordRight(this.state, extendSelection);
  }

  moveToStart(extendSelection: boolean): void {
    moveToStart(this.state, extendSelection);
  }

  moveToEnd(extendSelection: boolean): void {
    moveToEnd(this.state, extendSelection);
  }

  selectAll(): void {
    selectAll(this.state);
  }

  undo(): boolean {
    const result = undo(this.state);
    if (result) {
      this.invalidateLayout();
    }
    return result;
  }

  redo(): boolean {
    const result = redo(this.state);
    if (result) {
      this.invalidateLayout();
    }
    return result;
  }

  beginComposition(): void {
    beginComposition(this.state);
    this.invalidateLayout();
  }

  updateComposition(text: string): void {
    updateComposition(this.state, text);
    this.invalidateLayout();
  }

  commitComposition(text: string): void {
    commitComposition(this.state, text);
    this.invalidateLayout();
  }

  cancelComposition(): void {
    cancelComposition(this.state);
    this.invalidateLayout();
  }

  startPointerSelection(
    text: string,
    hit: TextHitTestResult,
    opts: { shiftExtend: boolean; clickCount: number }
  ): void {
    this.pointerSelection = startPointerSelection(this.state, text, hit, opts);
  }

  updatePointerSelection(text: string, hit: TextHitTestResult): void {
    if (!this.pointerSelection) {
      return;
    }
    updatePointerSelection(this.state, text, hit, this.pointerSelection);
  }

  endPointerSelection(): void {
    this.pointerSelection = null;
  }
}

export interface TextDecorationOptions {
  x: number;
  y: number;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  maxWidth?: number;
  style?: FontStyle;
  selectionColor?: Color;
  compositionColor?: Color;
  caretColor?: Color;
  caretThickness?: number;
  caretBlinkInterval?: number;
  time?: number;
  /** Optional cached layout to use for decoration positioning */
  layout?: CachedTextLayout;
}

export function renderTextDecorations(
  scene: GladeScene,
  state: TextInputState,
  options: TextDecorationOptions
): void {
  const {
    x,
    y,
    fontSize,
    lineHeight,
    fontFamily,
    maxWidth,
    style,
    selectionColor,
    compositionColor,
    caretColor,
    caretThickness,
    caretBlinkInterval,
    time,
    layout,
  } = options;

  if (selectionColor) {
    const rects = selectionPrimitivesWithLayout(
      state,
      selectionColor,
      fontSize,
      lineHeight,
      fontFamily,
      { maxWidth, style, layout }
    );
    for (const rect of rects) {
      scene.addRect({
        ...rect,
        x: rect.x + x,
        y: rect.y + y,
      });
    }
  }

  if (compositionColor) {
    const underlines = compositionUnderlinesWithLayout(
      state,
      compositionColor,
      fontSize,
      lineHeight,
      fontFamily,
      { maxWidth, style, layout }
    );
    for (const underline of underlines) {
      scene.addUnderline({
        ...underline,
        x: underline.x + x,
        y: underline.y + y,
      });
    }
  }

  if (caretColor) {
    const caret = caretPrimitiveWithLayout(state, caretColor, fontSize, lineHeight, fontFamily, {
      maxWidth,
      style,
      thickness: caretThickness,
      time,
      blinkInterval: caretBlinkInterval,
      layout,
    });
    if (caret) {
      scene.addRect({
        ...caret,
        x: caret.x + x,
        y: caret.y + y,
      });
    }
  }
}

export class GladeTextInput extends GladeElement<TextInputRequestState, TextInputPrepaintState> {
  private options: TextInputOptions;
  private controller: TextInputController;
  private fontFamily = "Inter";
  private fontSize = 14;
  private fontWeight = 400;
  private lineHeight: number | null = null;
  private padding = { x: 8, y: 6 };
  private caretBlinkInterval = 0.8;
  private handlers: EventHandlers = {};

  private scrollPadding = 8;

  constructor(initialValue = "", options: TextInputOptions = {}) {
    super();
    this.options = options;
    this.controller =
      options.controller ??
      new TextInputController({ value: initialValue, multiline: options.multiline });
    if (options.padding) {
      this.padding = options.padding;
    }
    if (options.caretBlinkInterval !== undefined) {
      this.caretBlinkInterval = options.caretBlinkInterval;
    }
    if (options.scrollPadding !== undefined) {
      this.scrollPadding = options.scrollPadding;
    }
  }

  value(text: string): this {
    this.controller.setValue(text);
    return this;
  }

  placeholder(text: string): this {
    this.options.placeholder = text;
    return this;
  }

  multiline(enabled: boolean): this {
    this.options.multiline = enabled;
    this.controller.state.multiline = enabled;
    return this;
  }

  font(family: string): this {
    this.fontFamily = family;
    return this;
  }

  size(px: number): this {
    this.fontSize = px;
    return this;
  }

  weight(w: number): this {
    this.fontWeight = w;
    return this;
  }

  lineHeightPx(px: number): this {
    this.lineHeight = px;
    return this;
  }

  pad(v: number): this {
    this.padding = { x: v, y: v };
    return this;
  }

  caretBlink(interval: number): this {
    this.caretBlinkInterval = interval;
    return this;
  }

  onSubmit(callback: (text: string) => void): this {
    this.options.onSubmit = callback;
    return this;
  }

  onCancel(callback: () => void): this {
    this.options.onCancel = callback;
    return this;
  }

  onChange(callback: (text: string) => void): this {
    this.options.onChange = callback;
    return this;
  }

  private getState(): TextInputState {
    return this.controller.state;
  }

  private getLineHeight(): number {
    return this.lineHeight ?? this.fontSize * 1.2;
  }

  private markDirty(cx: GladeContext, window: GladeWindow): void {
    cx.markWindowDirty(window.id);
  }

  private ensureFocusHandle(cx: GladeContext, window: GladeWindow): void {
    if (this.controller.focusHandle) {
      return;
    }
    const handle = cx.newFocusHandle(window.id);
    this.controller.focusHandle = handle;
    this.markDirty(cx, window);
  }

  private syncController(cx: RequestLayoutContext): void {
    const persisted = cx.getPersistentState<TextInputPersistentState>();
    if (!this.options.controller && persisted?.controller) {
      this.controller = persisted.controller;
    } else if (this.options.controller) {
      this.controller = this.options.controller;
    }
    this.controller.focusHandle = this.options.focusHandle ?? this.controller.focusHandle ?? null;
    const state = this.getState();
    if (this.options.value !== undefined && this.options.value !== state.value) {
      this.controller.setValue(this.options.value);
    }
    state.multiline = this.options.multiline ?? state.multiline;
    cx.setPersistentState<TextInputPersistentState>({ controller: this.controller });
  }

  private contentMaxWidth(): number | undefined {
    if (!this.controller.contentBounds || !this.getState().multiline) {
      return undefined;
    }
    return Math.max(this.controller.contentBounds.width, 1);
  }

  private hitTestPoint(point: { x: number; y: number }): TextHitTestResult | null {
    if (!this.controller.contentBounds) {
      return null;
    }
    // Clamp to the content bounds so drags just outside still hit-test to edges.
    const localX = Math.max(
      0,
      Math.min(
        point.x - this.controller.contentBounds.x,
        Math.max(this.controller.contentBounds.width, 0)
      )
    );
    const localY = Math.max(
      0,
      Math.min(
        point.y - this.controller.contentBounds.y,
        Math.max(this.controller.contentBounds.height, 0)
      )
    );
    const local = { x: localX, y: localY };
    const maxWidth = this.contentMaxWidth();
    // Use cached layout for efficient hit testing
    const layout = this.controller.getLayout(
      this.fontSize,
      this.getLineHeight(),
      this.fontFamily,
      maxWidth
    );
    return hitTestWithLayout(layout, local);
  }

  private exceedsMaxLength(text: string): boolean {
    if (this.options.maxLength === undefined) {
      return false;
    }
    const state = this.getState();
    const target = state.composition ?? state.selection;
    const nextLength = state.value.length - (target.end - target.start) + text.length;
    return nextLength > this.options.maxLength;
  }

  private caretRect(): Bounds | null {
    if (!this.controller.contentBounds) {
      return null;
    }
    const state = this.getState();
    const maxWidth = this.contentMaxWidth();
    // Use cached layout for efficient caret computation
    const layout = this.controller.getLayout(
      this.fontSize,
      this.getLineHeight(),
      this.fontFamily,
      maxWidth
    );
    const caret = computeCaretRectWithLayout(layout, state.selection.end, state.value.length);
    if (!caret) {
      return null;
    }
    return {
      x: this.controller.contentBounds.x + caret.x,
      y: this.controller.contentBounds.y + caret.y,
      width: caret.width,
      height: caret.height,
    };
  }

  private revealCaret(window: GladeWindow, cx: GladeContext): void {
    const caret = this.caretRect();
    if (!caret) {
      return;
    }
    this.options.onCaretMove?.(caret);
    if (!this.options.scrollHandle) {
      return;
    }
    const viewport = this.options.scrollViewport ?? cx.getScrollViewport(this.options.scrollHandle);
    if (!viewport) {
      return;
    }
    const offset = cx.getScrollOffset(this.options.scrollHandle);
    const viewportTop = viewport.y;
    const viewportBottom = viewportTop + viewport.height;
    const padding = this.scrollPadding;
    let nextOffsetY = offset.y;

    if (caret.y < viewportTop + padding) {
      nextOffsetY = Math.max(0, offset.y - (viewportTop + padding - caret.y));
    } else if (caret.y + caret.height > viewportBottom - padding) {
      nextOffsetY = offset.y + (caret.y + caret.height - (viewportBottom - padding));
    }

    if (nextOffsetY !== offset.y) {
      cx.setScrollOffset(this.options.scrollHandle, { x: offset.x, y: nextOffsetY });
    }
  }

  requestLayout(
    cx: RequestLayoutContext
  ): import("./element.ts").RequestLayoutResult<TextInputRequestState> {
    this.syncController(cx);
    const state = this.getState();
    const lineHeight = this.getLineHeight();

    // Height calculation: for multiline, we need to measure actual content height
    // For single-line, it's just one line of text
    let layoutHeight: number;
    if (state.multiline) {
      const displayText = valueWithComposition(state);
      if (
        displayText.length > 0 &&
        this.controller.contentBounds &&
        this.controller.contentBounds.width > 0
      ) {
        // Use cached layout from previous frame to estimate line count
        const layout = this.controller.getLayout(
          this.fontSize,
          lineHeight,
          this.fontFamily,
          this.controller.contentBounds.width
        );
        // Calculate height from actual line layout
        const lineCount = layout.lines.length;
        layoutHeight = lineCount * lineHeight + this.padding.y * 2;
      } else {
        // Empty multiline or first frame - use single line height
        // The height will adjust on the next frame once we have contentBounds
        layoutHeight = lineHeight + this.padding.y * 2;
      }
    } else {
      // Single-line: always one line of text
      layoutHeight = lineHeight + this.padding.y * 2;
    }

    // Build layout style - only set width if explicitly specified
    // When no width is set, use widthPercent: 100 to fill parent width
    const layoutStyle: { width?: number; widthPercent?: number; height: number } = {
      height: layoutHeight,
    };
    if (this.options.width !== undefined) {
      layoutStyle.width = this.options.width;
    } else {
      // Fill parent width when no explicit width is specified
      layoutStyle.widthPercent = 100;
    }

    const layoutId = cx.requestLayout(layoutStyle, []);

    // Handle placeholder layout if needed
    let placeholderLayoutId: LayoutId | null = null;
    if (this.options.placeholder && valueWithComposition(state).length === 0) {
      placeholderLayoutId = cx.requestLayout({ height: layoutHeight }, []);
    }

    return {
      layoutId,
      requestState: {
        layoutId,
        placeholderLayoutId,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: TextInputRequestState
  ): TextInputPrepaintState {
    const handlers = this.buildHandlers();
    this.controller.contentBounds = {
      x: bounds.x + this.padding.x,
      y: bounds.y + this.padding.y,
      width: bounds.width - this.padding.x * 2,
      height: bounds.height - this.padding.y * 2,
    };
    const hitbox = cx.insertHitbox(bounds, undefined, "text");
    if (cx.registerTabStop && this.controller.focusHandle) {
      cx.registerTabStop(this.controller.focusHandle.id, bounds, {
        index: this.options.tabIndex ?? 0,
      });
    }
    const hitTestNode = {
      bounds,
      handlers,
      focusHandle: this.controller.focusHandle ?? null,
      scrollHandle: null,
      keyContext: TEXT_INPUT_CONTEXT,
      children: [],
    };

    const theme = cx.getWindow().getTheme();
    const defaults = inputColors(theme);
    const colors = {
      text: defaults.text,
      placeholder: defaults.placeholder,
      selection: this.options.selectionColor ?? defaults.selection,
      composition: this.options.compositionColor ?? defaults.composition,
      caret: this.options.caretColor ?? defaults.caret,
    };

    return {
      layoutId: requestState.layoutId,
      placeholderLayoutId: requestState.placeholderLayoutId,
      bounds,
      hitbox,
      hitTestNode,
      colors,
    };
  }

  private handleTextInput: TextInputHandler = (event, window, cx) => {
    if (this.options.readonly) {
      return;
    }
    if (this.exceedsMaxLength(event.text)) {
      return;
    }
    if (event.isComposing) {
      if (event.text.length === 0 && this.getState().composition) {
        this.controller.cancelComposition();
      } else {
        this.controller.commitComposition(event.text);
      }
      this.options.onComposition?.({ type: "end", text: event.text });
      this.options.onChange?.(this.getState().value);
      this.markDirty(cx, window);
      this.revealCaret(window, cx);
      return { stopPropagation: true, preventDefault: true };
    }
    this.controller.insertText(event.text);
    this.options.onChange?.(this.getState().value);
    this.markDirty(cx, window);
    this.revealCaret(window, cx);
    return { stopPropagation: true, preventDefault: true };
  };

  private handleCompositionStart: CompositionHandler = (event, window, cx) => {
    if (this.options.readonly) {
      return;
    }
    this.controller.beginComposition();
    this.options.onComposition?.({ type: "start", text: event.text });
    this.markDirty(cx, window);
    this.revealCaret(window, cx);
    return { stopPropagation: true, preventDefault: true };
  };

  private handleCompositionUpdate: CompositionHandler = (event, window, cx) => {
    if (this.options.readonly) {
      return;
    }
    this.controller.updateComposition(event.text);
    this.options.onComposition?.({ type: "update", text: event.text });
    this.markDirty(cx, window);
    this.revealCaret(window, cx);
    return { stopPropagation: true, preventDefault: true };
  };

  private handleCompositionEnd: CompositionHandler = (event, window, cx) => {
    if (this.options.readonly) {
      return;
    }
    if (!this.getState().composition) {
      return { stopPropagation: true, preventDefault: true };
    }
    if (event.text.length === 0) {
      this.controller.cancelComposition();
      this.markDirty(cx, window);
      this.revealCaret(window, cx);
      return { stopPropagation: true, preventDefault: true };
    }
    this.controller.commitComposition(event.text);
    this.options.onComposition?.({ type: "end", text: event.text });
    this.options.onChange?.(this.getState().value);
    this.markDirty(cx, window);
    this.revealCaret(window, cx);
    return { stopPropagation: true, preventDefault: true };
  };

  private moveVertical(
    direction: -1 | 1,
    extendSelection: boolean,
    window: GladeWindow,
    cx: GladeContext
  ): void {
    const state = this.getState();
    if (!state.multiline) {
      return;
    }
    const maxWidth = this.contentMaxWidth();
    // Use cached layout for efficient caret computation
    const layout = this.controller.getLayout(
      this.fontSize,
      this.getLineHeight(),
      this.fontFamily,
      maxWidth
    );
    const caret = computeCaretRectWithLayout(layout, state.selection.end, state.value.length);
    if (!caret) {
      return;
    }
    const targetX = state.preferredCaretX ?? caret.x;
    const targetY = direction === -1 ? caret.y - 1 : caret.y + caret.height + 1;
    const hit = this.hitTestPoint({
      x: (this.controller.contentBounds?.x ?? 0) + targetX,
      y: (this.controller.contentBounds?.y ?? 0) + targetY,
    });
    if (!hit) {
      return;
    }
    const anchor = extendSelection ? state.selection.start : hit.index;
    state.selection = { start: anchor, end: hit.index };
    state.composition = null;
    state.preferredCaretX = targetX;
    this.markDirty(cx, window);
  }

  private copySelection(window: GladeWindow): boolean {
    const text = getSelectedText(this.getState());
    if (!text) {
      return false;
    }
    const clipboard = window.getClipboard();
    if (!clipboard.supportsWriteText) {
      return false;
    }
    clipboard.writeText(text).catch((err) => {
      console.warn("Clipboard write failed:", err);
    });
    return true;
  }

  private cutSelection(window: GladeWindow): boolean {
    const state = this.getState();
    const text = cutSelectedText(state);
    if (!text) {
      return false;
    }
    const clipboard = window.getClipboard();
    if (!clipboard.supportsWriteText) {
      return false;
    }
    clipboard.writeText(text).catch((err) => {
      console.warn("Clipboard write failed:", err);
    });
    this.options.onChange?.(state.value);
    return true;
  }

  private pasteFromClipboard(window: GladeWindow, cx: GladeContext): boolean {
    const clipboard = window.getClipboard();
    if (!clipboard.supportsReadText || this.options.readonly) {
      return false;
    }
    clipboard
      .readText()
      .then((text) => {
        if (!text || this.exceedsMaxLength(text)) {
          return;
        }
        this.controller.insertText(text);
        this.options.onChange?.(this.getState().value);
        this.markDirty(cx, window);
        this.revealCaret(window, cx);
      })
      .catch((err) => {
        console.warn("Clipboard read failed:", err);
      });
    return true;
  }

  private handleKeyDown: KeyHandler = (event, window, cx) => {
    const state = this.getState();
    const focused = this.controller.focusHandle
      ? cx.isFocused(this.controller.focusHandle)
      : state.isFocused;
    if (!focused) {
      return;
    }
    const code = Number(event.code);
    const mods = event.modifiers;
    const extendSelection = mods.shift;

    if (mods.meta && !mods.alt && !mods.ctrl) {
      if (code === Key.A) {
        this.controller.selectAll();
        this.markDirty(cx, window);
        this.revealCaret(window, cx);
        return { stopPropagation: true, preventDefault: true };
      }
      if (code === Key.Z) {
        if (mods.shift) {
          if (this.controller.redo()) {
            this.options.onChange?.(state.value);
          }
        } else {
          if (this.controller.undo()) {
            this.options.onChange?.(state.value);
          }
        }
        this.markDirty(cx, window);
        this.revealCaret(window, cx);
        return { stopPropagation: true, preventDefault: true };
      }
      if (code === Key.C) {
        if (this.copySelection(window)) {
          return { stopPropagation: true, preventDefault: true };
        }
      }
      if (code === Key.X) {
        if (!this.options.readonly && this.cutSelection(window)) {
          this.markDirty(cx, window);
          this.revealCaret(window, cx);
          return { stopPropagation: true, preventDefault: true };
        }
      }
      if (code === Key.V) {
        if (this.pasteFromClipboard(window, cx)) {
          return { stopPropagation: true, preventDefault: true };
        }
      }
    }

    if (code === Key.Enter) {
      if (state.multiline) {
        if (!this.options.readonly && !this.exceedsMaxLength("\n")) {
          this.controller.insertText("\n");
          this.options.onChange?.(state.value);
          this.markDirty(cx, window);
          this.revealCaret(window, cx);
        }
        return { stopPropagation: true, preventDefault: true };
      }
      this.options.onSubmit?.(state.value);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Escape) {
      this.options.onCancel?.();
      return { stopPropagation: true, preventDefault: true };
    }

    if (this.options.readonly) {
      return;
    }

    if (code === Key.Backspace) {
      this.controller.deleteBackward();
      this.options.onChange?.(state.value);
      this.markDirty(cx, window);
      this.revealCaret(window, cx);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Delete) {
      this.controller.deleteForward();
      this.options.onChange?.(state.value);
      this.markDirty(cx, window);
      this.revealCaret(window, cx);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Left) {
      if (mods.alt || mods.ctrl) {
        this.controller.moveWordLeft(extendSelection);
      } else {
        this.controller.moveLeft(extendSelection);
      }
      this.markDirty(cx, window);
      this.revealCaret(window, cx);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Right) {
      if (mods.alt || mods.ctrl) {
        this.controller.moveWordRight(extendSelection);
      } else {
        this.controller.moveRight(extendSelection);
      }
      this.markDirty(cx, window);
      this.revealCaret(window, cx);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Home) {
      this.controller.moveToStart(extendSelection);
      this.markDirty(cx, window);
      this.revealCaret(window, cx);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.End) {
      this.controller.moveToEnd(extendSelection);
      this.markDirty(cx, window);
      this.revealCaret(window, cx);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Up) {
      this.moveVertical(-1, extendSelection, window, cx);
      this.revealCaret(window, cx);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Down) {
      this.moveVertical(1, extendSelection, window, cx);
      this.revealCaret(window, cx);
      return { stopPropagation: true, preventDefault: true };
    }

    return undefined;
  };

  private handleMouseDown: MouseHandler = (event, window, cx) => {
    this.ensureFocusHandle(cx, window);
    if (this.controller.focusHandle) {
      cx.focus(this.controller.focusHandle);
    }
    const state = this.getState();
    setFocused(state, true);
    const hit = this.hitTestPoint({ x: event.x, y: event.y });
    if (hit) {
      this.controller.startPointerSelection(valueWithComposition(state), hit, {
        shiftExtend: event.modifiers.shift,
        clickCount: 1,
      });
      setPreferredCaretX(state, hit.caretX);
      this.revealCaret(window, cx);
    }
    this.markDirty(cx, window);
    return { stopPropagation: true, preventDefault: true };
  };

  private handleMouseMove: MouseHandler = (event, window, cx) => {
    const hit = this.hitTestPoint({ x: event.x, y: event.y });
    if (!hit || !this.controller.pointerSelection) {
      return;
    }
    this.controller.updatePointerSelection(valueWithComposition(this.getState()), hit);
    setPreferredCaretX(this.getState(), hit.caretX);
    this.revealCaret(window, cx);
    this.markDirty(cx, window);
    return { stopPropagation: true, preventDefault: true };
  };

  private handleMouseUp: MouseHandler = (_event, window, cx) => {
    if (this.controller.pointerSelection) {
      this.controller.endPointerSelection();
      this.revealCaret(window, cx);
      this.markDirty(cx, window);
      return { stopPropagation: true, preventDefault: true };
    }
    return undefined;
  };

  private handleClick: ClickHandler = (event, window, cx) => {
    if (event.clickCount < 2) {
      return;
    }
    const hit = this.hitTestPoint({ x: event.x, y: event.y });
    if (!hit) {
      return;
    }
    const text = valueWithComposition(this.getState());
    if (event.clickCount >= 3) {
      selectLineAtHit(this.getState(), hit);
    } else {
      selectWordAtHit(this.getState(), text, hit);
    }
    setPreferredCaretX(this.getState(), hit.caretX);
    this.controller.endPointerSelection();
    this.revealCaret(window, cx);
    this.markDirty(cx, window);
    return { stopPropagation: true, preventDefault: true };
  };

  private buildHandlers(): EventHandlers {
    const handlers: EventHandlers = {
      keyDown: this.handleKeyDown,
      mouseDown: this.handleMouseDown,
      mouseMove: this.handleMouseMove,
      mouseUp: this.handleMouseUp,
      click: this.handleClick,
      textInput: this.handleTextInput,
      compositionStart: this.handleCompositionStart,
      compositionUpdate: this.handleCompositionUpdate,
      compositionEnd: this.handleCompositionEnd,
    };
    this.handlers = handlers;
    return handlers;
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: TextInputPrepaintState): void {
    const state = this.getState();
    const focused = this.controller.focusHandle
      ? cx.isFocused(this.controller.focusHandle)
      : state.isFocused;
    setFocused(state, focused);

    const colors = prepaintState.colors;
    const textColor = colors.text;
    const placeholderColor = colors.placeholder;
    const selectionColor = colors.selection;
    const compositionColor = colors.composition;
    const caretColor = colors.caret;

    const lineHeight = this.getLineHeight();
    const contentX = bounds.x + this.padding.x;
    const contentY = bounds.y + this.padding.y;

    const displayValue = valueWithComposition(state);
    const textToRender = displayValue.length > 0 ? displayValue : (this.options.placeholder ?? "");
    const isPlaceholder = displayValue.length === 0 && !!this.options.placeholder;

    const textBounds: Bounds = {
      x: contentX,
      y: contentY,
      width: bounds.width - this.padding.x * 2,
      height: bounds.height - this.padding.y * 2,
    };

    const maxWidth = state.multiline ? textBounds.width : undefined;

    cx.paintGlyphs(textToRender, textBounds, isPlaceholder ? placeholderColor : textColor, {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      lineHeight,
      maxWidth,
    });

    // Get cached layout for consistent decoration positioning
    const layout = this.controller.getLayout(
      this.fontSize,
      this.getLineHeight(),
      this.fontFamily,
      maxWidth
    );

    renderTextDecorations(cx.scene, state, {
      x: contentX,
      y: contentY,
      fontSize: this.fontSize,
      lineHeight,
      fontFamily: this.fontFamily,
      maxWidth,
      selectionColor,
      compositionColor,
      caretColor: focused ? caretColor : undefined,
      caretThickness: this.options.caretThickness,
      caretBlinkInterval: this.caretBlinkInterval,
      time: performance.now() / 1000,
      layout,
    });
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    const handlers = this.buildHandlers();
    return {
      bounds,
      handlers,
      focusHandle: this.controller.focusHandle ?? null,
      scrollHandle: null,
      keyContext: TEXT_INPUT_CONTEXT,
      children: [],
    };
  }
}

export function textInput(initialValue = "", options: TextInputOptions = {}): GladeTextInput {
  return new GladeTextInput(initialValue, options);
}
