import { log } from "@glade/logging";
import type { FontStyleOptions } from "@glade/shaper";
import { type Color, type ColorObject, toColorObject } from "@glade/utils";

import type { Bounds } from "./bounds.ts";
import type { GladeContext } from "./context.ts";
import type {
  ClickHandler,
  CompositionHandler,
  EventHandlers,
  HitTestNode,
  KeyHandler,
  MouseHandler,
  TextInputHandler,
} from "./dispatch.ts";
import {
  caretRect as editorCaretRect,
  type CompositionState,
  createSelection,
  type DocumentOffset,
  type HitTestResult,
  offset,
  pointToOffset,
  selectionRects,
  type TextDocument,
  TextEditor,
  type TextSelection,
} from "./editor.ts";
import {
  GladeElement,
  type PaintContext,
  type PrepaintContext,
  type RequestLayoutContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { FocusHandle, ScrollHandle } from "./entity.ts";
import type { Hitbox } from "./hitbox.ts";
import { Key } from "./keyboard.ts";
import type { LayoutId } from "./layout.ts";
import { GladeScene } from "./scene.ts";
import type { SelectionRange } from "./text.ts";
import type { GladeWindow } from "./window.ts";

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
  caretBlinkIntervalSeconds?: number;
  width?: number;
  scrollHandle?: ScrollHandle;
  scrollViewport?: Bounds;
  scrollPadding?: number;
  onCaretMove?: (caret: Bounds) => void;
}

interface TextInputRequestState {
  layoutId: LayoutId;
  placeholderLayoutId: LayoutId | null;
  fontFamily: string;
}

interface TextInputPrepaintState {
  layoutId: LayoutId;
  placeholderLayoutId: LayoutId | null;
  bounds: Bounds;
  hitbox: Hitbox | null;
  hitTestNode: HitTestNode;
  fontFamily: string;
  colors: {
    text: ColorObject;
    placeholder: ColorObject;
    selection: ColorObject;
    composition: ColorObject;
    caret: ColorObject;
  };
}

interface TextInputPersistentState {
  controller: TextInputController;
}

/**
 * State initialization options for TextInputController.
 */
export type TextInputStateInit = {
  value?: string;
  selectionStart?: number;
  selectionEnd?: number;
  isFocused?: boolean;
  multiline?: boolean;
  historyLimit?: number;
};

/**
 * Compatibility state object that mimics the old TextInputState interface.
 * Used by GladeTextInput and renderTextDecorations.
 */
export type TextInputState = {
  value: string;
  selection: SelectionRange;
  composition: CompositionState;
  isFocused: boolean;
  multiline: boolean;
  preferredCaretX: number | null;
};

/**
 * TextInputController wraps TextEditor to provide text input functionality.
 * This is an adapter that bridges the old API with the new TextEditor implementation.
 */
export class TextInputController {
  readonly editor: TextEditor;
  focusHandle: FocusHandle | null = null;
  contentBounds: Bounds | null = null;

  private _fontSize = 14;
  private _lineHeight = 16.8;
  private _fontFamily = "Inter";
  private _maxWidth: number | undefined;

  constructor(init: TextInputStateInit = {}) {
    const text = init.value ?? "";
    this.editor = new TextEditor({
      text,
      fontSize: 14,
      lineHeight: 16.8,
      fontFamily: "Inter",
      multiline: init.multiline ?? false,
      historyLimit: init.historyLimit,
    });

    // Set initial selection if provided
    if (init.selectionStart !== undefined || init.selectionEnd !== undefined) {
      const start = init.selectionStart ?? text.length;
      const end = init.selectionEnd ?? start;
      this.editor.setSelection(createSelection(offset(start), offset(end)));
    }

    if (init.isFocused) {
      this.editor.setFocused(true);
    }
  }

  /**
   * Compatibility getter that returns a state object matching the old TextInputState interface.
   */
  get state(): TextInputState {
    const sel = this.editor.selection;
    return {
      value: this.editor.text,
      selection: { start: sel.start, end: sel.end },
      composition: this.editor.composition,
      isFocused: this.editor.isFocused,
      multiline: this.editor.multiline,
      preferredCaretX: this.editor.preferredCaretX,
    };
  }

  /**
   * Get the TextDocument for layout and hit testing.
   */
  get document(): TextDocument {
    return this.editor.document;
  }

  /**
   * Get the display document (includes composition text).
   * Use for hit testing and caret/selection rendering.
   * Note: Layout params must be set via updateLayoutParams() before accessing this.
   */
  get displayDocument(): TextDocument {
    return this.editor.displayDocument;
  }

  /**
   * Update layout parameters. Call this when font size, line height, etc. change.
   */
  updateLayoutParams(
    fontSize: number,
    lineHeight: number,
    fontFamily: string,
    maxWidth?: number,
    style?: FontStyleOptions
  ): void {
    this._fontSize = fontSize;
    this._lineHeight = lineHeight;
    this._fontFamily = fontFamily;
    this._maxWidth = maxWidth;
    this.editor.setLayoutParams({ fontSize, lineHeight, fontFamily, maxWidth, style });
  }

  setValue(value: string): void {
    this.editor.setText(value);
  }

  setSelection(range: SelectionRange): void {
    this.editor.setSelection(createSelection(offset(range.start), offset(range.end)));
  }

  setFocused(focused: boolean): void {
    this.editor.setFocused(focused);
  }

  setPreferredCaretX(x: number | null): void {
    this.editor.setPreferredCaretX(x);
  }

  insertText(text: string): void {
    this.editor.insertText(text);
  }

  deleteBackward(): void {
    this.editor.deleteBackward();
  }

  deleteForward(): void {
    this.editor.deleteForward();
  }

  moveLeft(extendSelection: boolean): void {
    this.editor.moveLeft(extendSelection);
  }

  moveRight(extendSelection: boolean): void {
    this.editor.moveRight(extendSelection);
  }

  moveWordLeft(extendSelection: boolean): void {
    this.editor.moveWordLeft(extendSelection);
  }

  moveWordRight(extendSelection: boolean): void {
    this.editor.moveWordRight(extendSelection);
  }

  moveToStart(extendSelection: boolean): void {
    this.editor.moveToStart(extendSelection);
  }

  moveToEnd(extendSelection: boolean): void {
    this.editor.moveToEnd(extendSelection);
  }

  moveUp(extendSelection: boolean): void {
    this.editor.moveUp(extendSelection);
  }

  moveDown(extendSelection: boolean): void {
    this.editor.moveDown(extendSelection);
  }

  selectAll(): void {
    this.editor.selectAll();
  }

  undo(): boolean {
    return this.editor.undo();
  }

  redo(): boolean {
    return this.editor.redo();
  }

  beginComposition(): void {
    this.editor.beginComposition();
  }

  updateComposition(text: string): void {
    this.editor.updateComposition(text);
  }

  commitComposition(text: string): void {
    this.editor.commitComposition(text);
  }

  cancelComposition(): void {
    this.editor.cancelComposition();
  }

  /**
   * Start a pointer selection gesture.
   */
  startPointerSelection(
    hit: HitTestResult,
    opts: { shiftExtend: boolean; clickCount: number }
  ): void {
    const mode = opts.clickCount >= 3 ? "line" : opts.clickCount === 2 ? "word" : "caret";

    if (opts.shiftExtend) {
      // Shift+click: extend from existing anchor to hit position
      const anchor = this.editor.selection.anchor;
      this.editor.setSelection(createSelection(anchor, hit.offset));
      // Still set up gesture for potential drag
      this._gesture = { mode: "caret", anchorOffset: anchor };
    } else if (mode === "caret") {
      // Single click: set caret at hit position
      this.editor.setSelection(createSelection(hit.offset));
      this._gesture = { mode: "caret", anchorOffset: hit.offset };
    } else if (mode === "word") {
      // Double click: select word
      const wordStartOffset = this.findWordStart(hit.offset);
      const wordEndOffset = this.findWordEnd(hit.offset);
      this.editor.setSelection(createSelection(wordStartOffset, wordEndOffset));
      this._gesture = { mode: "word", anchorStart: wordStartOffset, anchorEnd: wordEndOffset };
    } else {
      // Triple click: select line
      const lineStart = hit.line.startOffset;
      const lineEnd = hit.line.endOffset;
      this.editor.setSelection(createSelection(lineStart, lineEnd));
      this._gesture = { mode: "line", anchorStart: lineStart, anchorEnd: lineEnd };
    }
  }

  private _gesture: {
    mode: "caret" | "word" | "line";
    anchorOffset?: DocumentOffset;
    anchorStart?: DocumentOffset;
    anchorEnd?: DocumentOffset;
  } | null = null;

  private findWordStart(off: DocumentOffset): DocumentOffset {
    const text = this.editor.text;
    let pos = off as number;
    while (pos > 0 && this.isWordChar(text[pos - 1] ?? "")) {
      pos--;
    }
    return offset(pos);
  }

  private findWordEnd(off: DocumentOffset): DocumentOffset {
    const text = this.editor.text;
    let pos = off as number;
    while (pos < text.length && this.isWordChar(text[pos] ?? "")) {
      pos++;
    }
    return offset(pos);
  }

  private isWordChar(char: string): boolean {
    if (char.length === 0) {
      return false;
    }
    const code = char.codePointAt(0);
    if (code === undefined) {
      return false;
    }
    // Alphanumeric
    if (code >= 48 && code <= 57) {
      return true;
    }
    if (code >= 65 && code <= 90) {
      return true;
    }
    if (code >= 97 && code <= 122) {
      return true;
    }
    return false;
  }

  /**
   * Update a pointer selection gesture.
   */
  updatePointerSelection(hit: HitTestResult): void {
    if (!this._gesture) {
      return;
    }

    if (this._gesture.mode === "caret") {
      // Extend from anchor to current position
      const anchor = this._gesture.anchorOffset ?? hit.offset;
      this.editor.setSelection(createSelection(anchor, hit.offset));
    } else if (this._gesture.mode === "word") {
      // Extend by word
      const focusStart = this.findWordStart(hit.offset);
      const focusEnd = this.findWordEnd(hit.offset);
      const anchorStart = this._gesture.anchorStart ?? focusStart;
      const anchorEnd = this._gesture.anchorEnd ?? focusEnd;
      const start = Math.min(anchorStart, focusStart) as DocumentOffset;
      const end = Math.max(anchorEnd, focusEnd) as DocumentOffset;
      if (hit.offset < anchorStart) {
        this.editor.setSelection(createSelection(anchorEnd, start));
      } else {
        this.editor.setSelection(createSelection(anchorStart, end));
      }
    } else if (this._gesture.mode === "line") {
      // Extend by line
      const lineStart = hit.line.startOffset;
      const lineEnd = hit.line.endOffset;
      const anchorStart = this._gesture.anchorStart ?? lineStart;
      const anchorEnd = this._gesture.anchorEnd ?? lineEnd;
      const start = Math.min(anchorStart, lineStart) as DocumentOffset;
      const end = Math.max(anchorEnd, lineEnd) as DocumentOffset;
      if (hit.offset < anchorStart) {
        this.editor.setSelection(createSelection(anchorEnd, start));
      } else {
        this.editor.setSelection(createSelection(anchorStart, end));
      }
    }
  }

  /**
   * End a pointer selection gesture.
   */
  endPointerSelection(): void {
    this._gesture = null;
  }

  /**
   * Check if a pointer selection gesture is active.
   */
  hasActiveGesture(): boolean {
    return this._gesture !== null;
  }

  /**
   * Get the selected text.
   */
  getSelectedText(): string {
    return this.editor.getSelectedText();
  }

  /**
   * Cut the selected text and return it.
   */
  cutSelectedText(): string {
    return this.editor.cutSelectedText();
  }

  /**
   * Hit test a point in content-local coordinates.
   */
  hitTest(point: { x: number; y: number }): HitTestResult {
    return pointToOffset(this.displayDocument, point);
  }
}

export interface TextDecorationOptions {
  x: number;
  y: number;
  document: TextDocument;
  selection: TextSelection;
  composition: CompositionState;
  selectionColor?: ColorObject;
  compositionColor?: ColorObject;
  caretColor?: ColorObject;
  caretThickness?: number;
  caretBlinkIntervalSeconds?: number;
  time?: number;
}

const TRANSPARENT: ColorObject = { r: 0, g: 0, b: 0, a: 0 };

export function renderTextDecorations(scene: GladeScene, options: TextDecorationOptions): void {
  const {
    x,
    y,
    document,
    selection,
    composition,
    selectionColor,
    compositionColor,
    caretColor,
    caretThickness = 2,
    caretBlinkIntervalSeconds = 1.2,
    time = 0,
  } = options;

  // Render selection rectangles
  if (selectionColor && !selection.isEmpty) {
    const rects = selectionRects(document, selection);
    for (const rect of rects) {
      scene.addRect({
        x: rect.x + x,
        y: rect.y + y,
        width: rect.width,
        height: rect.height,
        color: selectionColor,
        cornerRadius: 2,
        borderWidth: 0,
        borderColor: TRANSPARENT,
      });
    }
  }

  // Render composition underline
  if (compositionColor && composition) {
    const compSelection = createSelection(
      composition.start,
      offset(composition.start + composition.text.length)
    );
    const rects = selectionRects(document, compSelection);
    for (const rect of rects) {
      scene.addUnderline({
        x: rect.x + x,
        y: rect.y + y + rect.height - 2,
        width: rect.width,
        color: compositionColor,
        thickness: 1,
        style: "solid",
      });
    }
  }

  // Render caret with blinking
  if (caretColor) {
    const blinkPhase = (time % caretBlinkIntervalSeconds) / caretBlinkIntervalSeconds;
    const visible = blinkPhase < 0.5;
    if (visible) {
      const caret = editorCaretRect(document, selection.focus, caretThickness);
      scene.addRect({
        x: caret.x + x,
        y: caret.y + y,
        width: caret.width,
        height: caret.height,
        color: caretColor,
        cornerRadius: 0,
        borderWidth: 0,
        borderColor: TRANSPARENT,
      });
    }
  }
}

export class GladeTextInput extends GladeElement<TextInputRequestState, TextInputPrepaintState> {
  private options: TextInputOptions;
  private controller: TextInputController;
  private fontFamily: string | null = null;
  private resolvedFontFamily: string | null = null;
  private fontSize = 14;
  private fontWeight = 400;
  private lineHeight: number | null = null;
  private padding = { x: 8, y: 6 };
  private caretBlinkIntervalSeconds = 1.2;
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
    if (options.caretBlinkIntervalSeconds !== undefined) {
      this.caretBlinkIntervalSeconds = options.caretBlinkIntervalSeconds;
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
    this.controller.editor.multiline = enabled;
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
    this.caretBlinkIntervalSeconds = interval;
    return this;
  }

  private effectiveFontFamily(): string {
    // resolvedFontFamily is set during prepaint from the theme
    // fontFamily is the explicit override
    // "Inter" is a fallback - in practice, resolvedFontFamily should always be set
    return this.resolvedFontFamily ?? this.fontFamily ?? "Inter";
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
    if (this.options.multiline !== undefined) {
      this.controller.editor.multiline = this.options.multiline;
    }
    cx.setPersistentState<TextInputPersistentState>({ controller: this.controller });
  }

  private contentMaxWidth(): number | undefined {
    if (!this.controller.contentBounds || !this.getState().multiline) {
      return undefined;
    }
    return Math.max(this.controller.contentBounds.width, 1);
  }

  private hitTestPoint(point: { x: number; y: number }): HitTestResult | null {
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
    return this.controller.hitTest({ x: localX, y: localY });
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
    const caret = editorCaretRect(
      this.controller.displayDocument,
      this.controller.editor.selection.focus
    );
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

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<TextInputRequestState> {
    this.syncController(cx);
    const state = this.getState();
    const lineHeight = this.getLineHeight();
    const themeFonts = cx.getTheme().fonts;
    const fontFamily = this.fontFamily ?? themeFonts.sans.name;
    this.resolvedFontFamily = fontFamily;

    // Update editor layout parameters
    const maxWidth = this.contentMaxWidth();
    this.controller.updateLayoutParams(this.fontSize, lineHeight, fontFamily, maxWidth);

    // Height calculation: for multiline, we need to measure actual content height
    // For single-line, it's just one line of text
    let layoutHeight: number;
    if (state.multiline) {
      const displayText = this.controller.editor.displayText;
      if (
        displayText.length > 0 &&
        this.controller.contentBounds &&
        this.controller.contentBounds.width > 0
      ) {
        // Use document from editor to get line count
        const doc = this.controller.document;
        const lineCount = doc.lines.length;
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
    if (this.options.placeholder && this.controller.editor.displayText.length === 0) {
      placeholderLayoutId = cx.requestLayout({ height: layoutHeight }, []);
    }

    return {
      layoutId,
      requestState: {
        layoutId,
        placeholderLayoutId,
        fontFamily,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: TextInputRequestState
  ): TextInputPrepaintState {
    this.resolvedFontFamily = requestState.fontFamily;
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
    const inputTheme = theme.components.input;
    const colors = {
      text: inputTheme.foreground,
      placeholder: inputTheme.placeholder,
      selection: this.options.selectionColor
        ? toColorObject(this.options.selectionColor)
        : inputTheme.selection.background,
      composition: this.options.compositionColor
        ? toColorObject(this.options.compositionColor)
        : inputTheme.composition,
      caret: this.options.caretColor ? toColorObject(this.options.caretColor) : inputTheme.caret,
    };

    return {
      layoutId: requestState.layoutId,
      placeholderLayoutId: requestState.placeholderLayoutId,
      bounds,
      hitbox,
      hitTestNode,
      fontFamily: this.effectiveFontFamily(),
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
    if (!this.getState().multiline) {
      return;
    }
    if (direction === -1) {
      this.controller.moveUp(extendSelection);
    } else {
      this.controller.moveDown(extendSelection);
    }
    this.markDirty(cx, window);
  }

  private copySelection(window: GladeWindow): boolean {
    const text = this.controller.getSelectedText();
    if (!text) {
      return false;
    }
    const clipboard = window.getClipboard();
    if (!clipboard.supportsWriteText) {
      return false;
    }
    clipboard.writeText(text).catch((err) => {
      log.warn("Clipboard write failed:", err);
    });
    return true;
  }

  private cutSelection(window: GladeWindow): boolean {
    const text = this.controller.cutSelectedText();
    if (!text) {
      return false;
    }
    const clipboard = window.getClipboard();
    if (!clipboard.supportsWriteText) {
      return false;
    }
    clipboard.writeText(text).catch((err) => {
      log.warn("Clipboard write failed:", err);
    });
    this.options.onChange?.(this.getState().value);
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
        log.warn("Clipboard read failed:", err);
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
    this.controller.setFocused(true);
    const hit = this.hitTestPoint({ x: event.x, y: event.y });
    if (hit) {
      this.controller.startPointerSelection(hit, {
        shiftExtend: event.modifiers.shift,
        clickCount: 1,
      });
      this.revealCaret(window, cx);
    }
    this.markDirty(cx, window);
    return { stopPropagation: true, preventDefault: true };
  };

  private handleMouseMove: MouseHandler = (event, window, cx) => {
    const hit = this.hitTestPoint({ x: event.x, y: event.y });
    if (!hit || !this.controller.hasActiveGesture()) {
      return;
    }
    this.controller.updatePointerSelection(hit);
    this.revealCaret(window, cx);
    this.markDirty(cx, window);
    return { stopPropagation: true, preventDefault: true };
  };

  private handleMouseUp: MouseHandler = (_event, window, cx) => {
    if (this.controller.hasActiveGesture()) {
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
    // For double/triple click, use the editor's gesture system
    this.controller.startPointerSelection(hit, {
      shiftExtend: false,
      clickCount: event.clickCount,
    });
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
    this.controller.setFocused(focused);

    const colors = prepaintState.colors;
    const textColor = colors.text;
    const placeholderColor = colors.placeholder;
    const selectionColor = colors.selection;
    const compositionColor = colors.composition;
    const caretColor = colors.caret;

    const lineHeight = this.getLineHeight();
    const fontFamily = prepaintState.fontFamily;
    const contentX = bounds.x + this.padding.x;
    const contentY = bounds.y + this.padding.y;

    const displayValue = this.controller.editor.displayText;
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
      fontFamily,
      fontWeight: this.fontWeight,
      lineHeight,
      maxWidth,
    });

    const doc = this.controller.displayDocument;

    renderTextDecorations(cx.scene, {
      x: contentX,
      y: contentY,
      document: doc,
      selection: this.controller.editor.selection,
      composition: this.controller.editor.composition,
      selectionColor,
      compositionColor,
      caretColor: focused ? caretColor : undefined,
      caretThickness: this.options.caretThickness,
      caretBlinkIntervalSeconds: this.caretBlinkIntervalSeconds,
      time: performance.now() / 1000,
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
