/**
 * Monospace text helpers that mimic HTML <code> and <pre> semantics.
 *
 * - Inline code mirrors HTML's inline behavior: whitespace collapses and wraps.
 * - Block pre mirrors HTML's preformatted behavior: whitespace and newlines are preserved,
 *   tabs expand to the next tab stop, and wrapping is optional.
 *
 * Tabs are expanded to spaces to match the browser's default tab-size: 8 rule,
 * and CRLF/CR newlines are normalized to LF to mirror the DOM's line break handling.
 */

import {
  FlashElement,
  text,
  type FlashTextElement,
  type GlobalElementId,
  type PaintContext,
  type PrepaintContext,
  type RequestLayoutContext,
  type RequestLayoutResult,
} from "./element.ts";
import { div, type FlashDiv } from "./div.ts";
import type { HitTestNode } from "./dispatch.ts";
import type { Bounds, Color } from "./types.ts";
import { toColorObject } from "./types.ts";
import type { ColorObject } from "@glade/utils";

// TODO: clean up. This is bad.
const DEFAULT_MONO_FONT_FAMILY =
  'JetBrains Mono, ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const GENERIC_FAMILY_NAMES = new Set([
  "ui-monospace",
  "monospace",
  "sans-serif",
  "serif",
  "system-ui",
]);

function pickFontFamily(fontFamily: string): string {
  const candidates = fontFamily
    .split(",")
    .map((candidate) => candidate.trim().replace(/^["'](.+)["']$/, "$1"))
    .filter((candidate) => candidate.length > 0);

  for (const candidate of candidates) {
    if (!GENERIC_FAMILY_NAMES.has(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? "system-ui";
}

export type MonoVariant = "code" | "pre";

type MonoConfig = {
  variant: MonoVariant;
  wrap?: boolean;
  tabSize?: number;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  maxWidth?: number;
  selectable?: boolean;
  padding?: number;
  background?: Color;
  borderRadius?: number;
  scrollable?: boolean;
};

type NormalizedMonoOptions = {
  variant: MonoVariant;
  wrap: boolean;
  tabSize: number;
  fontFamily: string;
  fontSize?: number;
  lineHeight?: number;
  maxWidth?: number;
  selectable: boolean;
  padding?: number;
  background?: ColorObject;
  borderRadius?: number;
  scrollable: boolean;
};

function normalizeMonoOptions(options: MonoConfig): NormalizedMonoOptions {
  const wrap = options.wrap ?? options.variant === "code";
  const tabSize = options.tabSize ?? 8;
  const selectable = options.selectable ?? true;
  const scrollable = options.scrollable ?? (options.variant === "pre" && !wrap);

  return {
    variant: options.variant,
    wrap,
    tabSize: tabSize > 0 ? tabSize : 1,
    fontFamily: options.fontFamily ?? DEFAULT_MONO_FONT_FAMILY,
    fontSize: options.fontSize,
    lineHeight: options.lineHeight,
    maxWidth: options.maxWidth,
    selectable,
    padding: options.padding,
    background: options.background ? toColorObject(options.background) : undefined,
    borderRadius: options.borderRadius,
    scrollable,
  };
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Collapse whitespace the same way the browser handles inline code:
 * tabs/newlines become spaces and consecutive spaces collapse.
 */
function collapseInlineWhitespace(content: string): string {
  const newlineNormalized = normalizeLineEndings(content);
  const tabsToSpaces = newlineNormalized.replace(/[\t\v\f]/g, " ");
  const newlinesToSpaces = tabsToSpaces.replace(/\n/g, " ");
  return newlinesToSpaces.replace(/ {2,}/g, " ");
}

/**
 * Expand tabs to the next tab stop using the provided tab size.
 * Newlines reset the column counter.
 */
function expandTabsToSpaces(content: string, tabSize: number): string {
  const normalizedTabSize = tabSize > 0 ? tabSize : 1;
  let column = 0;
  let result = "";

  for (const char of content) {
    if (char === "\n") {
      result += char;
      column = 0;
      continue;
    }
    if (char === "\t") {
      const offset = normalizedTabSize - (column % normalizedTabSize);
      result += " ".repeat(offset);
      column += offset;
      continue;
    }
    result += char;
    column += 1;
  }

  return result;
}

function normalizeContentForVariant(content: string, options: NormalizedMonoOptions): string {
  if (options.variant === "pre") {
    return expandTabsToSpaces(normalizeLineEndings(content), options.tabSize);
  }
  return collapseInlineWhitespace(content);
}

function createMonoTextElement(
  normalizedContent: string,
  options: NormalizedMonoOptions,
  whitespaceMode: "pre" | "pre-wrap"
): FlashTextElement {
  const element = text(normalizedContent)
    .font(pickFontFamily(options.fontFamily))
    .whitespace(whitespaceMode);

  if (options.selectable) {
    element.selectable();
  }
  if (options.fontSize !== undefined) {
    element.size(options.fontSize);
  }
  if (options.lineHeight !== undefined) {
    element.lineHeight(options.lineHeight);
  }
  if (options.maxWidth !== undefined) {
    element.maxWidth(options.maxWidth);
  }

  return element;
}

function createPreLines(normalizedContent: string, options: NormalizedMonoOptions): FlashDiv {
  const lines = normalizedContent.split("\n");
  const family = pickFontFamily(options.fontFamily);
  const container = div().flex().flexCol().gap(0);

  for (const line of lines) {
    const lineEl = text(line).font(family).whitespace("pre");
    if (options.selectable) {
      lineEl.selectable();
    }
    if (options.fontSize !== undefined) {
      lineEl.size(options.fontSize);
    }
    if (options.lineHeight !== undefined) {
      lineEl.lineHeight(options.lineHeight);
    }
    container.child(lineEl);
  }

  return container;
}

function wrapPreBlock(
  textElement: FlashTextElement | FlashDiv,
  options: NormalizedMonoOptions
): FlashDiv {
  const container = div().block().wFull();

  if (!options.wrap && options.scrollable) {
    container.overflowAuto();
  }
  if (options.padding !== undefined) {
    container.p(options.padding);
  }
  if (options.background) {
    container.bg(options.background);
  }
  if (options.borderRadius !== undefined) {
    container.rounded(options.borderRadius);
  }

  container.child(textElement);
  return container;
}

type MonoRequestLayoutState = {
  childElementId: GlobalElementId;
  childRequestState: unknown;
};

type MonoPrepaintState = {
  childElementId: GlobalElementId;
  childPrepaintState: unknown;
  hitTestNode: HitTestNode | null;
};

function hasHitTestNode(value: unknown): value is { hitTestNode?: HitTestNode | null } {
  return typeof value === "object" && value !== null && "hitTestNode" in value;
}

export class MonoElement extends FlashElement<MonoRequestLayoutState, MonoPrepaintState> {
  private wrapValue: boolean | undefined;
  private tabSizeValue = 8;
  private fontFamilyValue = DEFAULT_MONO_FONT_FAMILY;
  private fontSizeValue: number | undefined;
  private lineHeightValue: number | undefined;
  private maxWidthValue: number | undefined;
  private selectableValue = true;
  private paddingValue: number | undefined;
  private backgroundValue: ColorObject | undefined;
  private borderRadiusValue: number | undefined;
  private scrollableValue: boolean | undefined;
  private childElement: FlashElement<unknown, unknown> | null = null;
  private hitTestNodeValue: HitTestNode | null = null;

  constructor(
    private readonly content: string,
    private variantValue: MonoVariant
  ) {
    super();
  }

  variant(value: MonoVariant): this {
    this.variantValue = value;
    return this;
  }

  wrap(enabled = true): this {
    this.wrapValue = enabled;
    return this;
  }

  noWrap(): this {
    this.wrapValue = false;
    return this;
  }

  tabSize(size: number): this {
    this.tabSizeValue = size;
    return this;
  }

  font(family: string): this {
    this.fontFamilyValue = family;
    return this;
  }

  size(value: number): this {
    this.fontSizeValue = value;
    return this;
  }

  lineHeight(value: number): this {
    this.lineHeightValue = value;
    return this;
  }

  maxWidth(value: number): this {
    this.maxWidthValue = value;
    return this;
  }

  selectable(enabled = true): this {
    this.selectableValue = enabled;
    return this;
  }

  padding(value: number): this {
    this.paddingValue = value;
    return this;
  }

  bg(value: Color): this {
    this.backgroundValue = toColorObject(value);
    return this;
  }

  rounded(value: number): this {
    this.borderRadiusValue = value;
    return this;
  }

  scrollable(enabled = true): this {
    this.scrollableValue = enabled;
    return this;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<MonoRequestLayoutState> {
    const child = this.buildChild();
    const childElementId = cx.allocateChildId();
    const childCx: RequestLayoutContext = { ...cx, elementId: childElementId };
    const { layoutId, requestState } = child.requestLayout(childCx);

    return {
      layoutId,
      requestState: {
        childElementId,
        childRequestState: requestState,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: MonoRequestLayoutState
  ): MonoPrepaintState {
    const child = this.getChildOrThrow();
    const childCx = cx.withElementId(requestState.childElementId);
    const childPrepaintState = child.prepaint(childCx, bounds, requestState.childRequestState);
    const hitTestNode = hasHitTestNode(childPrepaintState)
      ? (childPrepaintState.hitTestNode ?? null)
      : null;

    this.hitTestNodeValue = hitTestNode;

    return {
      childElementId: requestState.childElementId,
      childPrepaintState,
      hitTestNode,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: MonoPrepaintState): void {
    const child = this.getChildOrThrow();
    child.paint(cx, bounds, prepaintState.childPrepaintState);
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return this.hitTestNodeValue;
  }

  private getNormalizedOptions(): NormalizedMonoOptions {
    return normalizeMonoOptions({
      variant: this.variantValue,
      wrap: this.wrapValue,
      tabSize: this.tabSizeValue,
      fontFamily: this.fontFamilyValue,
      fontSize: this.fontSizeValue,
      lineHeight: this.lineHeightValue,
      maxWidth: this.maxWidthValue,
      selectable: this.selectableValue,
      padding: this.paddingValue,
      background: this.backgroundValue,
      borderRadius: this.borderRadiusValue,
      scrollable: this.scrollableValue,
    });
  }

  private buildChild(): FlashElement<unknown, unknown> {
    const normalizedOptions = this.getNormalizedOptions();
    const normalizedContent = normalizeContentForVariant(this.content, normalizedOptions);

    if (normalizedOptions.variant === "pre" && !normalizedOptions.wrap) {
      const preLines = createPreLines(normalizedContent, normalizedOptions);
      const wrapped = wrapPreBlock(preLines, normalizedOptions);
      this.childElement = wrapped;
      return wrapped;
    }

    const whitespaceMode = normalizedOptions.wrap ? "pre-wrap" : "pre";
    const textElement = createMonoTextElement(normalizedContent, normalizedOptions, whitespaceMode);

    if (normalizedOptions.variant === "pre") {
      const wrapped = wrapPreBlock(textElement, normalizedOptions);
      this.childElement = wrapped;
      return wrapped;
    }

    this.childElement = textElement;
    return textElement;
  }

  private getChildOrThrow(): FlashElement<unknown, unknown> {
    if (this.childElement === null) {
      throw new Error("MonoElement child is missing before rendering");
    }
    return this.childElement;
  }
}

/**
 * General monospace helper. Defaults to inline code semantics.
 */
export function mono(content: string): MonoElement {
  return new MonoElement(content, "code");
}

/**
 * Inline monospace text, equivalent to HTML <code>.
 */
export function code(content: string): MonoElement {
  return new MonoElement(content, "code");
}

/**
 * Block monospace text, equivalent to HTML <pre>.
 */
export function pre(content: string): MonoElement {
  return new MonoElement(content, "pre");
}
