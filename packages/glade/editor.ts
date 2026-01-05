/**
 * Ideal Text Editor System
 *
 * A clean, well-architected text editing system inspired by GPUI (Zed),
 * Monaco Editor, IntelliJ, and Core Text.
 *
 * Key principles:
 * 1. Single source of truth: TextDocument with cached layout
 * 2. Character indices directly in glyphs (not UTF-8 byte offsets)
 * 3. Three explicit coordinate types: DocumentOffset, DocumentPosition, VisualPoint
 * 4. Immutable TextSelection with anchor/focus semantics
 * 5. Clean event flow with gesture tracking
 *
 * COORDINATE SPACES
 * =================
 *
 * DocumentOffset: Absolute character position in text (0 to text.length)
 * DocumentPosition: Line + column position (both 0-based)
 * VisualPoint: Pixel coordinates relative to document origin (TEXT-LOCAL space)
 */

import { type FontStyle, type ShapedGlyph, type TextShaper } from "@glade/shaper";

import { getSharedTextShaper } from "./text.ts";

// ============================================================================
// Coordinate Types
// ============================================================================

/**
 * Absolute character position in text (0 to text.length).
 * This is the primary way to reference positions in text.
 * Branded type for type safety.
 */
export type DocumentOffset = number & { readonly __brand: "DocumentOffset" };

/**
 * Create a DocumentOffset from a number.
 */
export function offset(n: number): DocumentOffset {
  return n as DocumentOffset;
}

/**
 * Line + column position (both 0-based).
 * Useful for display and user-facing operations.
 */
export type DocumentPosition = {
  readonly line: number;
  readonly column: number;
};

/**
 * Pixel coordinates relative to document origin (TEXT-LOCAL space).
 * Used for hit testing and rendering.
 */
export type VisualPoint = {
  readonly x: number;
  readonly y: number;
};

// ============================================================================
// Glyph and Line Types
// ============================================================================

/**
 * A positioned glyph with character indices (not byte offsets).
 * Character indices are computed once during layout.
 */
export type PositionedGlyph = {
  readonly glyphId: number;
  readonly fontId: number;
  /** X position relative to line start */
  readonly x: number;
  /** Width to next glyph */
  readonly advance: number;
  /** Character index where this glyph starts (UTF-16) */
  readonly charStart: number;
  /** Character index where this glyph ends (UTF-16, exclusive) */
  readonly charEnd: number;
  /** Original shaped glyph for rendering */
  readonly shaped: ShapedGlyph;
};

/**
 * A line of text with positioned glyphs.
 */
export type TextLine = {
  /** Line number (0-based) */
  readonly index: number;
  /** Y position from document top */
  readonly y: number;
  /** Line height */
  readonly height: number;
  /** Actual content width */
  readonly width: number;
  /** Positioned glyphs with character indices */
  readonly glyphs: ReadonlyArray<PositionedGlyph>;
  /** Character offset where line starts */
  readonly startOffset: DocumentOffset;
  /** Character offset where line ends (exclusive) */
  readonly endOffset: DocumentOffset;
};

// ============================================================================
// TextDocument
// ============================================================================

/**
 * Immutable snapshot of text with its computed layout.
 *
 * Compute layout ONCE when text changes, then use it for:
 * - Hit testing (point → index)
 * - Caret positioning (index → point)
 * - Selection rendering
 * - Glyph rendering
 */
export type TextDocument = {
  /** The text content */
  readonly text: string;
  /** Font size used for layout */
  readonly fontSize: number;
  /** Line height used for layout */
  readonly lineHeight: number;
  /** Font family used for layout */
  readonly fontFamily: string;
  /** Max width for wrapping (undefined for single-line) */
  readonly maxWidth: number | undefined;
  /** Font style options */
  readonly style: FontStyle | undefined;
  /** Computed lines with positioned glyphs */
  readonly lines: ReadonlyArray<TextLine>;
  /** Total document width */
  readonly totalWidth: number;
  /** Total document height */
  readonly totalHeight: number;
};

// ============================================================================
// TextSelection
// ============================================================================

/**
 * Immutable text selection with anchor/focus semantics.
 *
 * The anchor is where selection started (fixed).
 * The focus is the current caret position (moving end).
 * start/end are derived as min/max of anchor/focus.
 */
export type TextSelection = {
  /** Where selection started (fixed end) */
  readonly anchor: DocumentOffset;
  /** Current caret position (moving end) */
  readonly focus: DocumentOffset;
  /** min(anchor, focus) */
  readonly start: DocumentOffset;
  /** max(anchor, focus) */
  readonly end: DocumentOffset;
  /** True if anchor === focus (no selection, just caret) */
  readonly isEmpty: boolean;
  /** True if focus < anchor (selection extends backwards) */
  readonly isReversed: boolean;
};

/**
 * Create a selection from anchor and optional focus.
 * If focus is not provided, creates a collapsed selection (caret).
 */
export function createSelection(anchor: DocumentOffset, focus?: DocumentOffset): TextSelection {
  const f = focus ?? anchor;
  const start = Math.min(anchor, f) as DocumentOffset;
  const end = Math.max(anchor, f) as DocumentOffset;
  return {
    anchor,
    focus: f,
    start,
    end,
    isEmpty: anchor === f,
    isReversed: f < anchor,
  };
}

/**
 * Collapse selection to the focus position (caret at focus).
 */
export function collapseToFocus(selection: TextSelection): TextSelection {
  return createSelection(selection.focus);
}

/**
 * Collapse selection to the anchor position (caret at anchor).
 */
export function collapseToAnchor(selection: TextSelection): TextSelection {
  return createSelection(selection.anchor);
}

/**
 * Collapse selection to start (leftmost position).
 */
export function collapseToStart(selection: TextSelection): TextSelection {
  return createSelection(selection.start);
}

/**
 * Collapse selection to end (rightmost position).
 */
export function collapseToEnd(selection: TextSelection): TextSelection {
  return createSelection(selection.end);
}

/**
 * Extend selection to a new focus position, keeping anchor fixed.
 */
export function extendTo(selection: TextSelection, focus: DocumentOffset): TextSelection {
  return createSelection(selection.anchor, focus);
}

/**
 * Create a selection covering the entire text.
 */
export function selectAll(textLength: number): TextSelection {
  return createSelection(offset(0), offset(textLength));
}

// ============================================================================
// Composition State
// ============================================================================

/**
 * IME composition state.
 */
export type CompositionState = {
  /** Start of composition in original text */
  readonly start: DocumentOffset;
  /** End of composition in original text (before composition text) */
  readonly end: DocumentOffset;
  /** The composition text being entered */
  readonly text: string;
} | null;

// ============================================================================
// Selection Gesture
// ============================================================================

/**
 * Selection mode for mouse gestures.
 */
export type SelectionMode = "caret" | "word" | "line";

/**
 * Active selection gesture state.
 */
export type SelectionGesture = {
  /** The mode of selection (caret, word, line) */
  readonly mode: SelectionMode;
  /** The anchor range (for word/line selection, this is the initial word/line) */
  readonly anchorStart: DocumentOffset;
  readonly anchorEnd: DocumentOffset;
};

// ============================================================================
// UTF-8 to UTF-16 Mapping Utilities
// ============================================================================

function utf8Length(codePoint: number): number {
  if (codePoint <= 0x7f) {
    return 1;
  }
  if (codePoint <= 0x7ff) {
    return 2;
  }
  if (codePoint <= 0xffff) {
    return 3;
  }
  return 4;
}

/**
 * Build a map from UTF-8 byte offsets to UTF-16 character indices.
 */
function buildByteToCharMap(text: string): Map<number, number> {
  const map = new Map<number, number>();
  let byteOffset = 0;
  for (let i = 0; i < text.length; ) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) {
      break;
    }
    const byteLength = utf8Length(codePoint);
    for (let b = 0; b < byteLength; b++) {
      map.set(byteOffset + b, i);
    }
    byteOffset += byteLength;
    i += codePoint > 0xffff ? 2 : 1;
  }
  map.set(byteOffset, text.length);
  return map;
}

// ============================================================================
// Grapheme Utilities
// ============================================================================

/**
 * Get grapheme cluster boundaries in text.
 */
function graphemeBreaks(text: string): number[] {
  const breaks: number[] = [0];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    for (const segment of segmenter.segment(text)) {
      if (segment.index !== undefined) {
        breaks.push(segment.index);
      }
    }
  } else {
    let pos = 0;
    for (const char of Array.from(text)) {
      pos += char.length;
      breaks.push(pos);
    }
  }
  const last = breaks[breaks.length - 1];
  if (last !== text.length) {
    breaks.push(text.length);
  }
  return breaks;
}

/**
 * Find the previous grapheme boundary.
 */
export function prevGrapheme(text: string, index: number): DocumentOffset {
  const breaks = graphemeBreaks(text);
  for (let i = breaks.length - 1; i >= 0; i--) {
    if (breaks[i] !== undefined && breaks[i]! < index) {
      return offset(breaks[i]!);
    }
  }
  return offset(0);
}

/**
 * Find the next grapheme boundary.
 */
export function nextGrapheme(text: string, index: number): DocumentOffset {
  const breaks = graphemeBreaks(text);
  for (let i = 0; i < breaks.length; i++) {
    if (breaks[i] !== undefined && breaks[i]! > index) {
      return offset(breaks[i]!);
    }
  }
  return offset(text.length);
}

// ============================================================================
// Word Boundary Utilities
// ============================================================================

function isWordChar(char: string): boolean {
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
 * Find word boundary to the left.
 */
export function wordBoundaryLeft(text: string, index: number): DocumentOffset {
  if (index <= 0) {
    return offset(0);
  }
  const breaks = graphemeBreaks(text);
  for (let i = breaks.length - 2; i >= 0; i--) {
    const pos = breaks[i]!;
    const nextPos = breaks[i + 1]!;
    if (pos >= index) {
      continue;
    }
    const currentChar = text.slice(pos, nextPos);
    const nextChar = text.slice(nextPos, breaks[i + 2] ?? text.length);
    const currentIsWord = isWordChar(currentChar);
    const nextIsWord = isWordChar(nextChar);
    if (currentIsWord !== nextIsWord) {
      return offset(nextPos);
    }
    if (!currentIsWord && currentChar.trim().length === 0) {
      if (nextChar.trim().length !== 0) {
        return offset(nextPos);
      }
    }
  }
  return offset(0);
}

/**
 * Find word boundary to the right.
 */
export function wordBoundaryRight(text: string, index: number): DocumentOffset {
  if (index >= text.length) {
    return offset(text.length);
  }
  const breaks = graphemeBreaks(text);
  for (let i = 1; i < breaks.length; i++) {
    const pos = breaks[i - 1]!;
    const nextPos = breaks[i]!;
    if (pos <= index) {
      continue;
    }
    const prevChar = text.slice(breaks[i - 2] ?? 0, pos);
    const currentChar = text.slice(pos, nextPos);
    const prevIsWord = isWordChar(prevChar);
    const currentIsWord = isWordChar(currentChar);
    if (prevIsWord !== currentIsWord) {
      return offset(pos);
    }
    if (!prevIsWord && prevChar.trim().length === 0) {
      if (currentChar.trim().length !== 0) {
        return offset(pos);
      }
    }
  }
  return offset(text.length);
}

/**
 * Find word start (for double-click word selection).
 */
export function wordStart(text: string, index: number): DocumentOffset {
  if (index <= 0) {
    return offset(0);
  }
  const breaks = graphemeBreaks(text);
  let inWord = false;
  let wordStartPos = 0;

  for (let i = 0; i < breaks.length - 1; i++) {
    const pos = breaks[i]!;
    const nextPos = breaks[i + 1]!;
    if (pos > index) {
      break;
    }
    const char = text.slice(pos, nextPos);
    const charIsWord = isWordChar(char);
    if (charIsWord && !inWord) {
      wordStartPos = pos;
      inWord = true;
    } else if (!charIsWord && inWord) {
      inWord = false;
    }
    if (pos <= index && index < nextPos) {
      if (charIsWord) {
        return offset(wordStartPos);
      }
      return offset(pos);
    }
  }
  return offset(wordStartPos);
}

/**
 * Find word end (for double-click word selection).
 */
export function wordEnd(text: string, index: number): DocumentOffset {
  if (index >= text.length) {
    return offset(text.length);
  }
  const breaks = graphemeBreaks(text);

  for (let i = 0; i < breaks.length - 1; i++) {
    const pos = breaks[i]!;
    const nextPos = breaks[i + 1]!;
    if (pos < index) {
      continue;
    }
    const char = text.slice(pos, nextPos);
    if (!isWordChar(char)) {
      return offset(pos);
    }
  }
  return offset(text.length);
}

// ============================================================================
// Shared Shaper
// ============================================================================

// Use the shared shaper from text.ts to avoid WASM re-entrancy issues.
// The WASM shaper has global state that can't handle multiple instances.
function getShaper(): TextShaper {
  return getSharedTextShaper();
}

// ============================================================================
// TextDocument Creation
// ============================================================================

/**
 * Create a TextDocument from text and layout parameters.
 * This computes the layout once, converting byte offsets to character indices.
 */
export function createTextDocument(
  text: string,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  maxWidth?: number,
  style?: FontStyle
): TextDocument {
  const shaper = getShaper();
  const safeFontSize = fontSize > 0 ? fontSize : 1;
  const safeLineHeight = lineHeight > 0 ? lineHeight : Math.max(safeFontSize, 1);
  const effectiveStyle: FontStyle = { ...style, family: fontFamily };
  const hasFiniteWidth = maxWidth !== undefined && Number.isFinite(maxWidth);
  const effectiveMaxWidth = hasFiniteWidth ? Math.max(maxWidth as number, 1) : undefined;

  // Get shaped lines from the shaper
  type ShapedLine = {
    glyphs: ShapedGlyph[];
    width: number;
    y: number;
    lineHeight: number;
  };
  let shapedLines: ShapedLine[];

  try {
    if (effectiveMaxWidth !== undefined) {
      const result = shaper.layoutText(
        text,
        safeFontSize,
        safeLineHeight,
        effectiveMaxWidth,
        effectiveStyle
      );
      shapedLines = result.lines;
    } else {
      const result = shaper.shapeLine(text, safeFontSize, safeLineHeight, effectiveStyle);
      const measured = shaper.measureText(
        text,
        safeFontSize,
        safeLineHeight,
        undefined,
        effectiveStyle
      );
      shapedLines = [
        {
          glyphs: result.glyphs,
          width: measured.width,
          y: 0,
          lineHeight: safeLineHeight,
        },
      ];
    }
  } catch {
    // Fallback for shaper errors
    shapedLines = [
      {
        glyphs: [],
        width: Math.max(text.length * safeFontSize * 0.6, 1),
        y: 0,
        lineHeight: safeLineHeight,
      },
    ];
  }

  // Normalize Y values so the first line starts at y=0.
  // cosmic-text's line_y includes baseline offset which we don't want here.
  if (shapedLines.length > 0) {
    const firstLineY = shapedLines[0]?.y ?? 0;
    if (firstLineY !== 0) {
      shapedLines = shapedLines.map((line) => ({
        ...line,
        y: line.y - firstLineY,
      }));
    }
  }

  // Build byte-to-char mapping once
  const byteToChar = buildByteToCharMap(text);

  // Convert shaped lines to TextLines with character indices
  const lines: TextLine[] = [];
  let totalWidth = 0;
  let totalHeight = 0;

  for (let lineIndex = 0; lineIndex < shapedLines.length; lineIndex++) {
    const shapedLine = shapedLines[lineIndex]!;
    const positionedGlyphs: PositionedGlyph[] = [];

    let lineStartOffset = text.length;
    let lineEndOffset = 0;

    for (const glyph of shapedLine.glyphs) {
      const charStart = byteToChar.get(glyph.start) ?? 0;
      const charEnd = byteToChar.get(glyph.end) ?? charStart;

      if (charStart < lineStartOffset) {
        lineStartOffset = charStart;
      }
      if (charEnd > lineEndOffset) {
        lineEndOffset = charEnd;
      }

      positionedGlyphs.push({
        glyphId: glyph.glyphId,
        fontId: glyph.cosmicFontId ?? 0,
        x: glyph.x,
        advance: glyph.xAdvance,
        charStart,
        charEnd,
        shaped: glyph,
      });
    }

    // Handle empty lines
    if (positionedGlyphs.length === 0) {
      lineStartOffset = lineIndex === 0 ? 0 : (lines[lineIndex - 1]?.endOffset ?? 0);
      lineEndOffset = lineStartOffset;
    }

    const line: TextLine = {
      index: lineIndex,
      y: shapedLine.y,
      height: shapedLine.lineHeight,
      width: shapedLine.width,
      glyphs: positionedGlyphs,
      startOffset: offset(lineStartOffset),
      endOffset: offset(lineEndOffset),
    };

    lines.push(line);
    totalWidth = Math.max(totalWidth, shapedLine.width);
    totalHeight = shapedLine.y + shapedLine.lineHeight;
  }

  // Handle empty text
  if (lines.length === 0) {
    lines.push({
      index: 0,
      y: 0,
      height: safeLineHeight,
      width: 0,
      glyphs: [],
      startOffset: offset(0),
      endOffset: offset(0),
    });
    totalHeight = safeLineHeight;
  }

  return {
    text,
    fontSize: safeFontSize,
    lineHeight: safeLineHeight,
    fontFamily,
    maxWidth: effectiveMaxWidth,
    style,
    lines,
    totalWidth,
    totalHeight,
  };
}

// ============================================================================
// TextPositionMapper - Position Conversion Utilities
// ============================================================================

/**
 * Find the line containing a character offset.
 */
export function lineAtOffset(doc: TextDocument, off: DocumentOffset): TextLine {
  for (const line of doc.lines) {
    if (off >= line.startOffset && off <= line.endOffset) {
      return line;
    }
  }
  // Return last line for offsets beyond text
  return doc.lines[doc.lines.length - 1] ?? doc.lines[0]!;
}

/**
 * Find the line at a Y coordinate.
 */
export function lineAtY(doc: TextDocument, y: number): TextLine {
  for (const line of doc.lines) {
    if (y >= line.y && y < line.y + line.height) {
      return line;
    }
  }
  // Clamp to first or last line
  if (y < 0 && doc.lines.length > 0) {
    return doc.lines[0]!;
  }
  return doc.lines[doc.lines.length - 1] ?? doc.lines[0]!;
}

/**
 * Convert document offset to line/column position.
 */
export function offsetToPosition(doc: TextDocument, off: DocumentOffset): DocumentPosition {
  const line = lineAtOffset(doc, off);
  const column = off - line.startOffset;
  return { line: line.index, column };
}

/**
 * Convert line/column position to document offset.
 */
export function positionToOffset(doc: TextDocument, pos: DocumentPosition): DocumentOffset {
  const lineIndex = Math.max(0, Math.min(pos.line, doc.lines.length - 1));
  const line = doc.lines[lineIndex]!;
  const maxColumn = line.endOffset - line.startOffset;
  const column = Math.max(0, Math.min(pos.column, maxColumn));
  return offset(line.startOffset + column);
}

/**
 * Convert document offset to visual point (x, y in TEXT-LOCAL space).
 */
export function offsetToPoint(doc: TextDocument, off: DocumentOffset): VisualPoint {
  const line = lineAtOffset(doc, off);
  const x = xAtOffset(line, off);
  return { x, y: line.y };
}

/**
 * Get X position at a character offset within a line.
 */
function xAtOffset(line: TextLine, off: DocumentOffset): number {
  if (line.glyphs.length === 0) {
    return 0;
  }

  for (const glyph of line.glyphs) {
    if (off <= glyph.charStart) {
      return glyph.x;
    }
    if (off <= glyph.charEnd) {
      // Interpolate within glyph for multi-char glyphs (ligatures)
      const span = glyph.charEnd - glyph.charStart;
      if (span <= 0) {
        return glyph.x;
      }
      const t = (off - glyph.charStart) / span;
      return glyph.x + glyph.advance * t;
    }
  }

  // Past all glyphs - return line width
  const lastGlyph = line.glyphs[line.glyphs.length - 1]!;
  return lastGlyph.x + lastGlyph.advance;
}

/**
 * Hit test result from pointToOffset.
 */
export type HitTestResult = {
  /** The character offset at the hit point */
  offset: DocumentOffset;
  /** Which side of the character was hit */
  affinity: "before" | "after";
  /** The line that was hit */
  line: TextLine;
};

/**
 * Convert visual point to document offset (hit testing).
 */
export function pointToOffset(doc: TextDocument, point: VisualPoint): HitTestResult {
  // Find the line
  const line = lineAtY(doc, point.y);

  if (line.glyphs.length === 0) {
    return {
      offset: line.startOffset,
      affinity: "before",
      line,
    };
  }

  // Find the glyph
  for (const glyph of line.glyphs) {
    const glyphEnd = glyph.x + glyph.advance;
    const mid = glyph.x + glyph.advance / 2;

    if (point.x < mid) {
      return {
        offset: offset(glyph.charStart),
        affinity: "before",
        line,
      };
    }
    if (point.x < glyphEnd) {
      return {
        offset: offset(glyph.charEnd),
        affinity: "after",
        line,
      };
    }
  }

  // Past all glyphs
  const lastGlyph = line.glyphs[line.glyphs.length - 1]!;
  return {
    offset: offset(lastGlyph.charEnd),
    affinity: "after",
    line,
  };
}

// ============================================================================
// Selection Geometry
// ============================================================================

/**
 * Rectangle in TEXT-LOCAL coordinates.
 */
export type TextRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Compute selection rectangles for a selection.
 */
export function selectionRects(doc: TextDocument, selection: TextSelection): TextRect[] {
  if (selection.isEmpty) {
    return [];
  }

  const rects: TextRect[] = [];

  for (const line of doc.lines) {
    // Skip lines outside selection
    if (line.endOffset <= selection.start) {
      continue;
    }
    if (line.startOffset >= selection.end) {
      break;
    }

    // Compute intersection
    const lineStart = Math.max(selection.start, line.startOffset) as DocumentOffset;
    const lineEnd = Math.min(selection.end, line.endOffset) as DocumentOffset;

    const x1 = xAtOffset(line, lineStart);
    const x2 = xAtOffset(line, lineEnd);

    rects.push({
      x: Math.min(x1, x2),
      y: line.y,
      width: Math.abs(x2 - x1),
      height: line.height,
    });
  }

  return rects;
}

/**
 * Compute caret rectangle.
 * The caret is vertically centered within the line height to align with glyph rendering.
 */
export function caretRect(
  doc: TextDocument,
  off: DocumentOffset,
  caretWidth: number = 1
): TextRect {
  const line = lineAtOffset(doc, off);
  const x = xAtOffset(line, off);
  // Position caret to align with where glyphs are rendered.
  // Glyphs are vertically centered within line height, so caret should be too.
  // The caret top = line.y + (lineHeight - fontSize) / 2
  const caretTop = line.y + (doc.lineHeight - doc.fontSize) / 2;
  return {
    x,
    y: caretTop,
    width: caretWidth,
    height: doc.fontSize, // Use fontSize for caret height, not full lineHeight
  };
}

// ============================================================================
// TextEditor - Stateful Controller
// ============================================================================

/**
 * Editor state snapshot for undo/redo.
 */
type EditorSnapshot = {
  text: string;
  selection: TextSelection;
};

/**
 * Undo/redo history.
 */
type EditorHistory = {
  past: EditorSnapshot[];
  future: EditorSnapshot[];
  limit: number;
};

/**
 * TextEditor - The main stateful controller for text editing.
 *
 * Holds document, selection, composition, and orchestrates all operations.
 */
export class TextEditor {
  private _document: TextDocument;
  private _selection: TextSelection;
  private _composition: CompositionState = null;
  private _preferredColumn: number | null = null;
  private _gesture: SelectionGesture | null = null;
  private _history: EditorHistory;
  private _multiline: boolean = false;
  private _isFocused: boolean = false;

  // Layout parameters (cached for document recreation)
  private _fontSize: number;
  private _lineHeight: number;
  private _fontFamily: string;
  private _maxWidth: number | undefined;
  private _style: FontStyle | undefined;

  constructor(options: {
    text?: string;
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    maxWidth?: number;
    style?: FontStyle;
    historyLimit?: number;
    multiline?: boolean;
  }) {
    const text = options.text ?? "";
    this._fontSize = options.fontSize;
    this._lineHeight = options.lineHeight;
    this._fontFamily = options.fontFamily;
    this._maxWidth = options.maxWidth;
    this._style = options.style;

    this._document = createTextDocument(
      text,
      this._fontSize,
      this._lineHeight,
      this._fontFamily,
      this._maxWidth,
      this._style
    );
    this._selection = createSelection(offset(text.length));
    this._history = {
      past: [],
      future: [],
      limit: options.historyLimit ?? 100,
    };
    this._multiline = options.multiline ?? false;
  }

  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------

  get document(): TextDocument {
    return this._document;
  }

  get text(): string {
    return this._document.text;
  }

  get selection(): TextSelection {
    return this._selection;
  }

  get composition(): CompositionState {
    return this._composition;
  }

  get preferredColumn(): number | null {
    return this._preferredColumn;
  }

  get gesture(): SelectionGesture | null {
    return this._gesture;
  }

  get multiline(): boolean {
    return this._multiline;
  }

  set multiline(value: boolean) {
    this._multiline = value;
  }

  get isFocused(): boolean {
    return this._isFocused;
  }

  setFocused(focused: boolean): void {
    this._isFocused = focused;
    if (!focused) {
      this._composition = null;
    }
  }

  /**
   * Alias for preferredColumn for compatibility with TextInputController.
   */
  get preferredCaretX(): number | null {
    return this._preferredColumn;
  }

  setPreferredCaretX(x: number | null): void {
    this._preferredColumn = x;
  }

  /**
   * Get the text with composition applied (for display).
   */
  get displayText(): string {
    if (!this._composition) {
      return this._document.text;
    }
    const prefix = this._document.text.slice(0, this._composition.start);
    const suffix = this._document.text.slice(this._composition.end);
    return `${prefix}${this._composition.text}${suffix}`;
  }

  /**
   * Get a TextDocument built from displayText (includes composition).
   * Use this for hit testing, caret positioning, and selection rendering.
   */
  get displayDocument(): TextDocument {
    if (!this._composition) {
      return this._document;
    }
    return createTextDocument(
      this.displayText,
      this._fontSize,
      this._lineHeight,
      this._fontFamily,
      this._maxWidth,
      this._style
    );
  }

  // --------------------------------------------------------------------------
  // Layout Parameters
  // --------------------------------------------------------------------------

  /**
   * Update layout parameters and rebuild document.
   */
  setLayoutParams(params: {
    fontSize?: number;
    lineHeight?: number;
    fontFamily?: string;
    maxWidth?: number;
    style?: FontStyle;
  }): void {
    if (params.fontSize !== undefined) {
      this._fontSize = params.fontSize;
    }
    if (params.lineHeight !== undefined) {
      this._lineHeight = params.lineHeight;
    }
    if (params.fontFamily !== undefined) {
      this._fontFamily = params.fontFamily;
    }
    if (params.maxWidth !== undefined) {
      this._maxWidth = params.maxWidth;
    }
    if (params.style !== undefined) {
      this._style = params.style;
    }
    this.rebuildDocument();
  }

  private rebuildDocument(): void {
    this._document = createTextDocument(
      this._document.text,
      this._fontSize,
      this._lineHeight,
      this._fontFamily,
      this._maxWidth,
      this._style
    );
  }

  // --------------------------------------------------------------------------
  // History
  // --------------------------------------------------------------------------

  private pushHistory(): void {
    const snapshot: EditorSnapshot = {
      text: this._document.text,
      selection: this._selection,
    };
    this._history.past.push(snapshot);
    if (this._history.past.length > this._history.limit) {
      this._history.past.shift();
    }
    this._history.future = [];
  }

  /**
   * Undo the last edit.
   */
  undo(): boolean {
    if (this._history.past.length === 0) {
      return false;
    }
    const current: EditorSnapshot = {
      text: this._document.text,
      selection: this._selection,
    };
    const previous = this._history.past.pop()!;
    this._history.future.push(current);

    this.restoreSnapshot(previous);
    return true;
  }

  /**
   * Redo the last undone edit.
   */
  redo(): boolean {
    if (this._history.future.length === 0) {
      return false;
    }
    const current: EditorSnapshot = {
      text: this._document.text,
      selection: this._selection,
    };
    const next = this._history.future.pop()!;
    this._history.past.push(current);

    this.restoreSnapshot(next);
    return true;
  }

  private restoreSnapshot(snapshot: EditorSnapshot): void {
    this._document = createTextDocument(
      snapshot.text,
      this._fontSize,
      this._lineHeight,
      this._fontFamily,
      this._maxWidth,
      this._style
    );
    this._selection = this.clampSelection(snapshot.selection);
    this._composition = null;
    this._preferredColumn = null;
  }

  // --------------------------------------------------------------------------
  // Text Mutations
  // --------------------------------------------------------------------------

  /**
   * Set the text content, replacing everything.
   */
  setText(text: string): void {
    this.pushHistory();
    this._document = createTextDocument(
      text,
      this._fontSize,
      this._lineHeight,
      this._fontFamily,
      this._maxWidth,
      this._style
    );
    this._selection = createSelection(offset(text.length));
    this._composition = null;
    this._preferredColumn = null;
  }

  /**
   * Insert text at the current selection, replacing selected text.
   */
  insertText(text: string): void {
    this.pushHistory();
    const { start, end } = this._selection;
    const before = this._document.text.slice(0, start);
    const after = this._document.text.slice(end);
    const newText = before + text + after;
    const newCaret = offset(start + text.length);

    this._document = createTextDocument(
      newText,
      this._fontSize,
      this._lineHeight,
      this._fontFamily,
      this._maxWidth,
      this._style
    );
    this._selection = createSelection(newCaret);
    this._composition = null;
    this._preferredColumn = null;
  }

  /**
   * Delete the current selection. If no selection, does nothing.
   */
  deleteSelection(): void {
    if (this._selection.isEmpty) {
      return;
    }
    this.pushHistory();
    const { start, end } = this._selection;
    const before = this._document.text.slice(0, start);
    const after = this._document.text.slice(end);
    const newText = before + after;

    this._document = createTextDocument(
      newText,
      this._fontSize,
      this._lineHeight,
      this._fontFamily,
      this._maxWidth,
      this._style
    );
    this._selection = createSelection(start);
    this._composition = null;
    this._preferredColumn = null;
  }

  /**
   * Delete backward (backspace).
   */
  deleteBackward(): void {
    if (!this._selection.isEmpty) {
      this.deleteSelection();
      return;
    }
    const prev = prevGrapheme(this._document.text, this._selection.focus);
    if (prev === this._selection.focus) {
      return;
    }
    this.pushHistory();
    const before = this._document.text.slice(0, prev);
    const after = this._document.text.slice(this._selection.focus);
    const newText = before + after;

    this._document = createTextDocument(
      newText,
      this._fontSize,
      this._lineHeight,
      this._fontFamily,
      this._maxWidth,
      this._style
    );
    this._selection = createSelection(prev);
    this._composition = null;
    this._preferredColumn = null;
  }

  /**
   * Delete forward (delete key).
   */
  deleteForward(): void {
    if (!this._selection.isEmpty) {
      this.deleteSelection();
      return;
    }
    const next = nextGrapheme(this._document.text, this._selection.focus);
    if (next === this._selection.focus) {
      return;
    }
    this.pushHistory();
    const before = this._document.text.slice(0, this._selection.focus);
    const after = this._document.text.slice(next);
    const newText = before + after;

    this._document = createTextDocument(
      newText,
      this._fontSize,
      this._lineHeight,
      this._fontFamily,
      this._maxWidth,
      this._style
    );
    // Caret stays at same position
    this._selection = this.clampSelection(this._selection);
    this._composition = null;
    this._preferredColumn = null;
  }

  // --------------------------------------------------------------------------
  // Selection
  // --------------------------------------------------------------------------

  /**
   * Set the selection.
   */
  setSelection(selection: TextSelection): void {
    this._selection = this.clampSelection(selection);
    this._preferredColumn = null;
  }

  /**
   * Select all text.
   */
  selectAll(): void {
    this._selection = selectAll(this._document.text.length);
    this._preferredColumn = null;
  }

  private clampSelection(selection: TextSelection): TextSelection {
    const len = this._document.text.length;
    const anchor = Math.max(0, Math.min(selection.anchor, len)) as DocumentOffset;
    const focus = Math.max(0, Math.min(selection.focus, len)) as DocumentOffset;
    return createSelection(anchor, focus);
  }

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------

  /**
   * Move caret left by one grapheme.
   */
  moveLeft(extend: boolean): void {
    if (!extend && !this._selection.isEmpty) {
      // Collapse to start
      this._selection = collapseToStart(this._selection);
      this._preferredColumn = null;
      return;
    }
    const prev = prevGrapheme(this._document.text, this._selection.focus);
    if (extend) {
      this._selection = extendTo(this._selection, prev);
    } else {
      this._selection = createSelection(prev);
    }
    this._preferredColumn = null;
  }

  /**
   * Move caret right by one grapheme.
   */
  moveRight(extend: boolean): void {
    if (!extend && !this._selection.isEmpty) {
      // Collapse to end
      this._selection = collapseToEnd(this._selection);
      this._preferredColumn = null;
      return;
    }
    const next = nextGrapheme(this._document.text, this._selection.focus);
    if (extend) {
      this._selection = extendTo(this._selection, next);
    } else {
      this._selection = createSelection(next);
    }
    this._preferredColumn = null;
  }

  /**
   * Move caret left by one word.
   */
  moveWordLeft(extend: boolean): void {
    const target = wordBoundaryLeft(this._document.text, this._selection.focus);
    if (extend) {
      this._selection = extendTo(this._selection, target);
    } else {
      this._selection = createSelection(target);
    }
    this._preferredColumn = null;
  }

  /**
   * Move caret right by one word.
   */
  moveWordRight(extend: boolean): void {
    const target = wordBoundaryRight(this._document.text, this._selection.focus);
    if (extend) {
      this._selection = extendTo(this._selection, target);
    } else {
      this._selection = createSelection(target);
    }
    this._preferredColumn = null;
  }

  /**
   * Move caret to start of document.
   */
  moveToStart(extend: boolean): void {
    const target = offset(0);
    if (extend) {
      this._selection = extendTo(this._selection, target);
    } else {
      this._selection = createSelection(target);
    }
    this._preferredColumn = null;
  }

  /**
   * Move caret to end of document.
   */
  moveToEnd(extend: boolean): void {
    const target = offset(this._document.text.length);
    if (extend) {
      this._selection = extendTo(this._selection, target);
    } else {
      this._selection = createSelection(target);
    }
    this._preferredColumn = null;
  }

  /**
   * Move caret to start of current line.
   */
  moveToLineStart(extend: boolean): void {
    const line = lineAtOffset(this._document, this._selection.focus);
    const target = line.startOffset;
    if (extend) {
      this._selection = extendTo(this._selection, target);
    } else {
      this._selection = createSelection(target);
    }
    this._preferredColumn = null;
  }

  /**
   * Move caret to end of current line.
   */
  moveToLineEnd(extend: boolean): void {
    const line = lineAtOffset(this._document, this._selection.focus);
    const target = line.endOffset;
    if (extend) {
      this._selection = extendTo(this._selection, target);
    } else {
      this._selection = createSelection(target);
    }
    this._preferredColumn = null;
  }

  /**
   * Move caret up by one line.
   */
  moveUp(extend: boolean): void {
    const currentLine = lineAtOffset(this._document, this._selection.focus);
    if (currentLine.index === 0) {
      // At first line, move to start
      const target = offset(0);
      if (extend) {
        this._selection = extendTo(this._selection, target);
      } else {
        this._selection = createSelection(target);
      }
      return;
    }

    const targetLine = this._document.lines[currentLine.index - 1]!;
    const currentX = this._preferredColumn ?? xAtOffset(currentLine, this._selection.focus);
    const target = offsetAtX(targetLine, currentX);

    if (this._preferredColumn === null) {
      this._preferredColumn = currentX;
    }

    if (extend) {
      this._selection = extendTo(this._selection, target);
    } else {
      this._selection = createSelection(target);
    }
  }

  /**
   * Move caret down by one line.
   */
  moveDown(extend: boolean): void {
    const currentLine = lineAtOffset(this._document, this._selection.focus);
    if (currentLine.index === this._document.lines.length - 1) {
      // At last line, move to end
      const target = offset(this._document.text.length);
      if (extend) {
        this._selection = extendTo(this._selection, target);
      } else {
        this._selection = createSelection(target);
      }
      return;
    }

    const targetLine = this._document.lines[currentLine.index + 1]!;
    const currentX = this._preferredColumn ?? xAtOffset(currentLine, this._selection.focus);
    const target = offsetAtX(targetLine, currentX);

    if (this._preferredColumn === null) {
      this._preferredColumn = currentX;
    }

    if (extend) {
      this._selection = extendTo(this._selection, target);
    } else {
      this._selection = createSelection(target);
    }
  }

  // --------------------------------------------------------------------------
  // Hit Testing
  // --------------------------------------------------------------------------

  /**
   * Hit test a point and return the offset.
   */
  hitTest(point: VisualPoint): HitTestResult {
    return pointToOffset(this._document, point);
  }

  // --------------------------------------------------------------------------
  // Selection Gestures (Mouse)
  // --------------------------------------------------------------------------

  /**
   * Start a selection gesture (mouseDown).
   */
  startSelection(point: VisualPoint, mode: SelectionMode, extend: boolean): void {
    const hit = pointToOffset(this._document, point);

    if (extend && this._selection) {
      // Shift+click: extend from anchor to new position
      this._gesture = {
        mode: "caret",
        anchorStart: this._selection.anchor,
        anchorEnd: this._selection.anchor,
      };
      this._selection = extendTo(this._selection, hit.offset);
      return;
    }

    let anchorStart: DocumentOffset;
    let anchorEnd: DocumentOffset;

    switch (mode) {
      case "word": {
        anchorStart = wordStart(this._document.text, hit.offset);
        anchorEnd = wordEnd(this._document.text, hit.offset);
        break;
      }
      case "line": {
        anchorStart = hit.line.startOffset;
        anchorEnd = hit.line.endOffset;
        break;
      }
      default: {
        anchorStart = hit.offset;
        anchorEnd = hit.offset;
      }
    }

    this._gesture = { mode, anchorStart, anchorEnd };
    this._selection = createSelection(anchorStart, anchorEnd);
    this._preferredColumn = null;
  }

  /**
   * Extend the selection gesture (mouseMove).
   */
  extendSelection(point: VisualPoint): void {
    if (!this._gesture) {
      return;
    }

    const hit = pointToOffset(this._document, point);
    let focusStart: DocumentOffset;
    let focusEnd: DocumentOffset;

    switch (this._gesture.mode) {
      case "word": {
        focusStart = wordStart(this._document.text, hit.offset);
        focusEnd = wordEnd(this._document.text, hit.offset);
        break;
      }
      case "line": {
        focusStart = hit.line.startOffset;
        focusEnd = hit.line.endOffset;
        break;
      }
      default: {
        focusStart = hit.offset;
        focusEnd = hit.offset;
      }
    }

    // Merge anchor and focus ranges
    const start = Math.min(this._gesture.anchorStart, focusStart) as DocumentOffset;
    const end = Math.max(this._gesture.anchorEnd, focusEnd) as DocumentOffset;

    // Determine anchor and focus based on direction
    if (focusEnd <= this._gesture.anchorStart) {
      // Selecting backwards
      this._selection = createSelection(this._gesture.anchorEnd, start);
    } else if (focusStart >= this._gesture.anchorEnd) {
      // Selecting forwards
      this._selection = createSelection(this._gesture.anchorStart, end);
    } else {
      // Overlap - use full range
      this._selection = createSelection(start, end);
    }

    this._preferredColumn = null;
  }

  /**
   * End the selection gesture (mouseUp).
   */
  endSelection(): void {
    this._gesture = null;
  }

  /**
   * Check if a gesture is active.
   */
  hasActiveGesture(): boolean {
    return this._gesture !== null;
  }

  // --------------------------------------------------------------------------
  // Composition (IME)
  // --------------------------------------------------------------------------

  /**
   * Begin IME composition.
   */
  beginComposition(): void {
    this._composition = {
      start: this._selection.start,
      end: this._selection.end,
      text: "",
    };
  }

  /**
   * Update IME composition text.
   */
  updateComposition(text: string): void {
    if (!this._composition) {
      this.beginComposition();
    }
    this._composition = {
      start: this._composition!.start,
      end: this._composition!.end,
      text,
    };
  }

  /**
   * Commit IME composition.
   */
  commitComposition(text: string): void {
    if (this._composition) {
      // Replace the composition range with committed text
      this.pushHistory();
      const before = this._document.text.slice(0, this._composition.start);
      const after = this._document.text.slice(this._composition.end);
      const newText = before + text + after;
      const newCaret = offset(this._composition.start + text.length);

      this._document = createTextDocument(
        newText,
        this._fontSize,
        this._lineHeight,
        this._fontFamily,
        this._maxWidth,
        this._style
      );
      this._selection = createSelection(newCaret);
      this._composition = null;
      this._preferredColumn = null;
    } else {
      this.insertText(text);
    }
  }

  /**
   * Cancel IME composition.
   */
  cancelComposition(): void {
    this._composition = null;
  }

  // --------------------------------------------------------------------------
  // Clipboard
  // --------------------------------------------------------------------------

  /**
   * Get the selected text for copying.
   */
  getSelectedText(): string {
    if (this._selection.isEmpty) {
      return "";
    }
    return this._document.text.slice(this._selection.start, this._selection.end);
  }

  /**
   * Cut the selected text.
   */
  cutSelectedText(): string {
    const text = this.getSelectedText();
    if (text.length > 0) {
      this.deleteSelection();
    }
    return text;
  }
}

// ============================================================================
// Helper: offsetAtX
// ============================================================================

/**
 * Find the character offset at a given X position within a line.
 */
function offsetAtX(line: TextLine, x: number): DocumentOffset {
  if (line.glyphs.length === 0) {
    return line.startOffset;
  }

  for (const glyph of line.glyphs) {
    const mid = glyph.x + glyph.advance / 2;
    if (x < mid) {
      return offset(glyph.charStart);
    }
  }

  const lastGlyph = line.glyphs[line.glyphs.length - 1]!;
  return offset(lastGlyph.charEnd);
}
