import type { Color, Bounds } from "./types.ts";
import { rgb } from "./types.ts";
import {
  FlashElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
} from "./element.ts";
import type { LayoutId } from "./layout.ts";
import { renderTextDecorations } from "./text_input_render.ts";
import type { Hitbox } from "./hitbox.ts";
import type { FlashContext } from "./context.ts";
import type { FlashWindow } from "./window.ts";
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
import { TextInputController } from "./text_input_controller.ts";
import type { FocusHandle } from "./entity.ts";
import {
  computeCaretRect,
  cutSelectedText,
  getSelectedText,
  hitTestText,
  selectLineAtHit,
  selectWordAtHit,
  setFocused,
  setPreferredCaretX,
  valueWithComposition,
  type TextHitTestResult,
  type TextInputState,
} from "./text.ts";

export const TEXT_INPUT_CONTEXT = "flash:text-input";

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
}

interface TextInputPersistentState {
  controller: TextInputController;
}

export class FlashTextInput extends FlashElement<TextInputRequestState, TextInputPrepaintState> {
  private options: TextInputOptions;
  private controller: TextInputController;
  private fontFamily = "system-ui";
  private fontSize = 14;
  private fontWeight = 400;
  private lineHeight: number | null = null;
  private padding = { x: 8, y: 6 };
  private caretBlinkInterval = 0.8;
  private handlers: EventHandlers = {};
  private contentBounds: Bounds | null = null;

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

  paddingPx(x: number, y: number): this {
    this.padding = { x, y };
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

  private markDirty(cx: FlashContext, window: FlashWindow): void {
    cx.markWindowDirty(window.id);
  }

  private ensureFocusHandle(cx: FlashContext, window: FlashWindow): void {
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
    if (!this.contentBounds || !this.getState().multiline) {
      return undefined;
    }
    return Math.max(this.contentBounds.width, 0);
  }

  private hitTestPoint(point: { x: number; y: number }): TextHitTestResult | null {
    if (!this.contentBounds) {
      return null;
    }
    const state = this.getState();
    const text = valueWithComposition(state);
    const local = {
      x: point.x - this.contentBounds.x,
      y: point.y - this.contentBounds.y,
    };
    const maxWidth = this.contentMaxWidth();
    return hitTestText(text, local, this.fontSize, this.getLineHeight(), this.fontFamily, maxWidth);
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

  requestLayout(
    cx: RequestLayoutContext
  ): import("./element.ts").RequestLayoutResult<TextInputRequestState> {
    this.syncController(cx);
    const state = this.getState();
    const lineHeight = this.getLineHeight();
    const displayText = valueWithComposition(state);

    const placeholderMetrics = this.options.placeholder
      ? cx.measureText(this.options.placeholder, {
          fontSize: this.fontSize,
          fontFamily: this.fontFamily,
          fontWeight: this.fontWeight,
          lineHeight,
          maxWidth: undefined,
        })
      : null;

    const defaultWidth = this.padding.x * 2 + 240;
    const baseWidth =
      this.options.width ??
      Math.max(defaultWidth, (placeholderMetrics?.width ?? 0) + this.padding.x * 2);
    const maxWidth = state.multiline ? Math.max(baseWidth - this.padding.x * 2, 0) : undefined;

    const textMetrics = cx.measureText(displayText, {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      lineHeight,
      maxWidth,
    });

    const layoutWidth =
      this.options.width ??
      Math.max(
        baseWidth,
        textMetrics.width + this.padding.x * 2,
        (placeholderMetrics?.width ?? 0) + this.padding.x * 2
      );
    const layoutHeight =
      Math.max(textMetrics.height, placeholderMetrics?.height ?? lineHeight) + this.padding.y * 2;

    const layoutId = cx.requestLayout(
      {
        width: layoutWidth,
        height: layoutHeight,
      },
      []
    );

    const placeholderLayoutId = placeholderMetrics
      ? cx.requestLayout(
          {
            width: placeholderMetrics.width,
            height: placeholderMetrics.height,
          },
          []
        )
      : null;

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
    this.contentBounds = {
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
    return {
      layoutId: requestState.layoutId,
      placeholderLayoutId: requestState.placeholderLayoutId,
      bounds,
      hitbox,
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
      return { stopPropagation: true, preventDefault: true };
    }
    this.controller.insertText(event.text);
    this.options.onChange?.(this.getState().value);
    this.markDirty(cx, window);
    return { stopPropagation: true, preventDefault: true };
  };

  private handleCompositionStart: CompositionHandler = (event, window, cx) => {
    if (this.options.readonly) {
      return;
    }
    this.controller.beginComposition();
    this.options.onComposition?.({ type: "start", text: event.text });
    this.markDirty(cx, window);
    return { stopPropagation: true, preventDefault: true };
  };

  private handleCompositionUpdate: CompositionHandler = (event, window, cx) => {
    if (this.options.readonly) {
      return;
    }
    this.controller.updateComposition(event.text);
    this.options.onComposition?.({ type: "update", text: event.text });
    this.markDirty(cx, window);
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
      return { stopPropagation: true, preventDefault: true };
    }
    this.controller.commitComposition(event.text);
    this.options.onComposition?.({ type: "end", text: event.text });
    this.options.onChange?.(this.getState().value);
    this.markDirty(cx, window);
    return { stopPropagation: true, preventDefault: true };
  };

  private moveVertical(
    direction: -1 | 1,
    extendSelection: boolean,
    window: FlashWindow,
    cx: FlashContext
  ): void {
    const state = this.getState();
    if (!state.multiline) {
      return;
    }
    const caretRect = computeCaretRect(
      state,
      this.fontSize,
      this.getLineHeight(),
      this.fontFamily,
      this.contentMaxWidth()
    );
    if (!caretRect) {
      return;
    }
    const targetX = state.preferredCaretX ?? caretRect.x;
    const targetY = direction === -1 ? caretRect.y - 1 : caretRect.y + caretRect.height + 1;
    const hit = this.hitTestPoint({
      x: (this.contentBounds?.x ?? 0) + targetX,
      y: (this.contentBounds?.y ?? 0) + targetY,
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

  private copySelection(window: FlashWindow): boolean {
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

  private cutSelection(window: FlashWindow): boolean {
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

  private pasteFromClipboard(window: FlashWindow, cx: FlashContext): boolean {
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
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Delete) {
      this.controller.deleteForward();
      this.options.onChange?.(state.value);
      this.markDirty(cx, window);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Left) {
      if (mods.alt || mods.ctrl) {
        this.controller.moveWordLeft(extendSelection);
      } else {
        this.controller.moveLeft(extendSelection);
      }
      this.markDirty(cx, window);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Right) {
      if (mods.alt || mods.ctrl) {
        this.controller.moveWordRight(extendSelection);
      } else {
        this.controller.moveRight(extendSelection);
      }
      this.markDirty(cx, window);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Home) {
      this.controller.moveToStart(extendSelection);
      this.markDirty(cx, window);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.End) {
      this.controller.moveToEnd(extendSelection);
      this.markDirty(cx, window);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Up) {
      this.moveVertical(-1, extendSelection, window, cx);
      return { stopPropagation: true, preventDefault: true };
    }

    if (code === Key.Down) {
      this.moveVertical(1, extendSelection, window, cx);
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
    this.markDirty(cx, window);
    return { stopPropagation: true, preventDefault: true };
  };

  private handleMouseUp: MouseHandler = (_event, window, cx) => {
    if (this.controller.pointerSelection) {
      this.controller.endPointerSelection();
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
    this.markDirty(cx, window);
    return { stopPropagation: true, preventDefault: true };
  };

  paint(cx: PaintContext, bounds: Bounds, _prepaintState: TextInputPrepaintState): void {
    const state = this.getState();
    const focused = this.controller.focusHandle
      ? cx.isFocused(this.controller.focusHandle)
      : state.isFocused;
    state.isFocused = focused;

    const textColor = { r: 1, g: 1, b: 1, a: 1 };
    const placeholderColor = { r: 0.6, g: 0.6, b: 0.7, a: 1 };
    const selectionColor = this.options.selectionColor ?? { ...rgb(0x3b82f6), a: 0.35 };
    const compositionColor = this.options.compositionColor ?? rgb(0x22c55e);
    const caretColor = this.options.caretColor ?? { r: 1, g: 1, b: 1, a: 1 };

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
    });
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    this.handlers = {
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
    return {
      bounds,
      handlers: this.handlers,
      focusHandle: this.controller.focusHandle ?? null,
      scrollHandle: null,
      keyContext: TEXT_INPUT_CONTEXT,
      children: [],
    };
  }
}

export function textInput(initialValue = "", options: TextInputOptions = {}): FlashTextInput {
  return new FlashTextInput(initialValue, options);
}
