export type WhitespaceMode = "normal" | "nowrap" | "pre" | "pre-wrap" | "pre-line";

/**
 * Normalize whitespace in text according to CSS white-space rules.
 * - "normal" / "nowrap": Collapse all whitespace (including newlines) to single spaces
 * - "pre" / "pre-wrap": Preserve all whitespace as-is
 * - "pre-line": Preserve newlines, collapse other whitespace
 */
export function normalizeWhitespace(text: string, mode: WhitespaceMode): string {
  switch (mode) {
    case "pre":
    case "pre-wrap":
      // Preserve all whitespace as-is
      return text;

    case "pre-line":
      // Preserve newlines, collapse other whitespace (spaces/tabs) to single space
      // Handle \r\n as single newline, \r alone as newline
      return text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .join("\n");

    case "normal":
    case "nowrap":
    default:
      // Collapse all whitespace (including newlines) to single spaces
      // Handle \r\n as single newline, \r alone as newline first
      return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\s+/g, " ").trim();
  }
}

// Returns true if every character in `pattern` appears in order in `text`
export function fuzzyMatch(pattern: string, text: string): boolean {
  pattern = pattern.toLowerCase();
  text = text.toLowerCase();

  let pIdx = 0;
  let tIdx = 0;

  while (pIdx < pattern.length && tIdx < text.length) {
    if (pattern[pIdx] === text[tIdx]) {
      pIdx++;
    }
    tIdx++;
  }

  return pIdx === pattern.length;
}
