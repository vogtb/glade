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

import { text, type FlashTextElement } from "./element.ts";
import { div, type FlashDiv } from "./div.ts";
import type { Color } from "./types.ts";

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

export type MonoOptions = {
  /** Choose inline code-like rendering or block preformatted rendering. Defaults to "code". */
  variant?: MonoVariant;
  /** Allow soft-wrapping. Defaults to true for inline code, false for block pre. */
  wrap?: boolean;
  /** Tab width in spaces for block/pre text. Defaults to 8 to match CSS tab-size. */
  tabSize?: number;
  /** Override the monospace font stack. */
  fontFamily?: string;
  /** Optional font size override. */
  fontSize?: number;
  /** Optional line height override. */
  lineHeight?: number;
  /** Maximum width for wrapping calculations. */
  maxWidth?: number;
  /** Whether the text can be selected. Defaults to true to match the DOM. */
  selectable?: boolean;
  /** Optional padding for block/pre containers. */
  padding?: number;
  /** Optional background color for block/pre containers. */
  background?: Color;
  /** Optional border radius for block/pre containers. */
  borderRadius?: number;
  /**
   * Enable scrolling when wrapping is disabled.
   * Defaults to true for block/pre when wrap is false to prevent layout blowout.
   */
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
  background?: Color;
  borderRadius?: number;
  scrollable: boolean;
};

function normalizeMonoOptions(options?: MonoOptions): NormalizedMonoOptions {
  const variant = options?.variant ?? "code";
  const wrap = options?.wrap ?? variant === "code";
  const tabSize = options?.tabSize ?? 8;
  const selectable = options?.selectable ?? true;
  const scrollable = options?.scrollable ?? (variant === "pre" && !wrap);

  return {
    variant,
    wrap,
    tabSize: tabSize > 0 ? tabSize : 1,
    fontFamily: options?.fontFamily ?? DEFAULT_MONO_FONT_FAMILY,
    fontSize: options?.fontSize,
    lineHeight: options?.lineHeight,
    maxWidth: options?.maxWidth,
    selectable,
    padding: options?.padding,
    background: options?.background,
    borderRadius: options?.borderRadius,
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
    // No maxWidth so lines stay on one row.
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

/**
 * High-level monospace helper. Defaults to inline code semantics.
 */
export function mono(content: string, options?: MonoOptions): FlashTextElement | FlashDiv {
  const normalizedOptions = normalizeMonoOptions(options);
  const normalizedContent = normalizeContentForVariant(content, normalizedOptions);

  if (normalizedOptions.variant === "pre" && !normalizedOptions.wrap) {
    const preLines = createPreLines(normalizedContent, normalizedOptions);
    return wrapPreBlock(preLines, normalizedOptions);
  }

  const whitespaceMode = normalizedOptions.wrap ? "pre-wrap" : "pre";
  const textElement = createMonoTextElement(normalizedContent, normalizedOptions, whitespaceMode);

  if (normalizedOptions.variant === "pre") {
    return wrapPreBlock(textElement, normalizedOptions);
  }

  return textElement;
}

/**
 * Inline monospace text, equivalent to HTML <code>.
 */
export function monoCode(
  content: string,
  options?: Omit<MonoOptions, "variant">
): FlashTextElement {
  const normalizedOptions = normalizeMonoOptions({ ...options, variant: "code" });
  const normalizedContent = normalizeContentForVariant(content, normalizedOptions);
  return createMonoTextElement(normalizedContent, normalizedOptions, "pre-wrap");
}

/**
 * Block monospace text, equivalent to HTML <pre>.
 */
export function monoPre(content: string, options?: Omit<MonoOptions, "variant">): FlashDiv {
  const normalizedOptions = normalizeMonoOptions({ ...options, variant: "pre" });
  const normalizedContent = normalizeContentForVariant(content, normalizedOptions);

  if (!normalizedOptions.wrap) {
    const preLines = createPreLines(normalizedContent, normalizedOptions);
    return wrapPreBlock(preLines, normalizedOptions);
  }

  const textElement = createMonoTextElement(normalizedContent, normalizedOptions, "pre-wrap");
  return wrapPreBlock(textElement, normalizedOptions);
}
