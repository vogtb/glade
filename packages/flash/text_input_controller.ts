import type { FocusHandle } from "./entity.ts";
import {
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
  setFocused,
  setPreferredCaretX,
  setSelection,
  startPointerSelection,
  undo,
  updateComposition,
  updatePointerSelection,
  type PointerSelectionSession,
  type SelectionRange,
  type TextHitTestResult,
  type TextInputState,
  type TextInputStateInit,
} from "./text.ts";

export class TextInputController {
  readonly state: TextInputState;
  focusHandle: FocusHandle | null;
  pointerSelection: PointerSelectionSession | null;

  constructor(init: TextInputStateInit = {}) {
    this.state = createTextInputState(init);
    this.focusHandle = null;
    this.pointerSelection = null;
  }

  setValue(value: string): void {
    this.state.value = value;
    this.state.selection = { start: value.length, end: value.length };
    this.state.composition = null;
    this.state.preferredCaretX = null;
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
  }

  deleteBackward(): void {
    deleteBackward(this.state);
  }

  deleteForward(): void {
    deleteForward(this.state);
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
    return undo(this.state);
  }

  redo(): boolean {
    return redo(this.state);
  }

  beginComposition(): void {
    beginComposition(this.state);
  }

  updateComposition(text: string): void {
    updateComposition(this.state, text);
  }

  commitComposition(text: string): void {
    commitComposition(this.state, text);
  }

  cancelComposition(): void {
    cancelComposition(this.state);
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
