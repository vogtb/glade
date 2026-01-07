# Multi-line Pre-formatted Text Rendering Bug

## Problem Summary

Multi-line code blocks in `hotkeys_demo.ts` render with all lines overlapping on a single line. The text content contains `\n` newlines, but the rendered output shows all lines stacked on top of each other at the same Y position, creating garbled/unreadable text.

**Visual symptom**: Instead of seeing:
```
keymap.bind("meta+s", {
  name: "file:save",
  label: "Save File",
  handler: (cx, window) => save()
});
```

The user sees all 5 lines rendered on top of each other, creating illegible overlapping characters.

## Root Cause Analysis

**The issue is NOT with glyph shaping or caching.** Diagnostic logging confirmed:
- Characters are correctly identified (correct char codes)
- Glyph IDs are stable and correct
- X positions are correct for monospace layout (7.2px spacing)

**The issue IS with vertical layout** - specifically, the text layout system is not allocating vertical space for multiple lines when `maxWidth` is undefined (the `whitespace: pre` / no-wrap case).

## Architecture Overview

### Text Rendering Pipeline

1. **`mono.ts`** - Creates mono/code/pre elements
   - `MonoElement.buildChild()` creates child text elements
   - For `variant="pre"` with `wrap=false`, it uses `whitespace="pre"` mode

2. **`element.ts`** - `GladeTextElement` handles text layout
   - `requestLayout()` registers text for measurement via Taffy
   - `paint()` calls `cx.paintGlyphs()` for rendering
   - Uses `whitespaceMode` to determine wrapping behavior

3. **`text.ts`** - `TextSystem` handles shaping and rendering
   - `measureText()` - returns `{width, height}` for layout
   - `prepareGlyphInstances()` - creates GPU glyph instances for rendering
   - Both call into the WASM shaper

4. **`packages/shaper/src/lib.rs`** - Rust/WASM text shaper using cosmic-text
   - `shape_line()` - shapes single-line text
   - `measure_text()` - measures text dimensions
   - `layout_text()` - multi-line layout with word wrapping

### The Bug Location

When `maxWidth` is undefined (no word wrapping):
- `measureText()` returns height for only ONE line
- `prepareGlyphInstances()` renders all content at y=0

The shaper's `measure_text` and `shape_line` functions use `Wrap::None` and don't properly handle embedded `\n` characters to create multiple lines.

## What Has Been Tried

### 1. Cache Key Fix (text.ts)
Added `char` to the glyph cache key to prevent cache collisions. This was a valid fix for a separate issue but didn't solve the multi-line problem.

### 2. Line Splitting in prepareGlyphInstances (text.ts)
Added code to split text by `\n` and shape each line separately with proper Y offsets:
```typescript
const textLines = text.split("\n");
let currentY = 0;
for (const lineText of textLines) {
  // shape each line, adjust byte offsets, increment currentY
}
```
**Result**: Rendering showed lines at different Y positions, but the container height was still wrong (only 1 line tall).

### 3. Buffer Size in Shaper (lib.rs)
Added `buffer.set_size(&mut self.font_system, Some(f32::MAX), None)` to both `shape_line` and `measure_text` to allow cosmic-text to process newlines.

**Result**: No change - cosmic-text with `Wrap::None` still doesn't create multiple layout runs for newlines.

## Recommended Fix Approach

The fix needs to happen in **measurement**, not just rendering. The layout system (Taffy) needs to know the correct height for multi-line text.

### Option A: Fix in TextSystem.measureText()

When `maxWidth` is undefined and text contains `\n`, split by newlines and calculate:
- `width` = max width of all lines
- `height` = lineHeight * numberOfLines

```typescript
measureText(text, fontSize, lineHeight, maxWidth?, style?) {
  if (maxWidth === undefined && text.includes("\n")) {
    const lines = text.split("\n");
    let maxWidth = 0;
    for (const line of lines) {
      const measured = this.shaper.measureText(line, fontSize, lineHeight, undefined, style);
      maxWidth = Math.max(maxWidth, measured.width);
    }
    return { width: maxWidth, height: lineHeight * lines.length };
  }
  // ... existing code
}
```

### Option B: Fix in Shaper (Rust)

Modify `measure_text` in `lib.rs` to handle newlines explicitly:
```rust
pub fn measure_text(&mut self, text: &str, ...) {
  if max_width.is_none() && text.contains('\n') {
    // Split by newlines, measure each, return combined dimensions
  }
  // ... existing code
}
```

### Option C: Fix in element.ts requestLayout

The `GladeTextElement.requestLayout()` could detect multi-line pre-formatted text and adjust the measurement callback.

## Key Files

- `packages/glade/text.ts` - `TextSystem.measureText()` (line ~723), `prepareGlyphInstances()` (line ~830)
- `packages/glade/element.ts` - `GladeTextElement.requestLayout()` (line ~913)
- `packages/shaper/src/lib.rs` - `measure_text()` (line ~355), `shape_line()` (line ~227)
- `packages/glade/mono.ts` - `MonoElement.buildChild()` (line ~390)

## Testing

After fix, verify:
1. Code blocks in `hotkeys_demo.ts` render with proper line breaks
2. Container height accommodates all lines
3. Lines don't overlap
4. Other text rendering (single-line, wrapped) still works

Run the demo:
```bash
cd packages/demos && bun run:demos:macos
```

## Current State of Code

The following changes have been made but NOT reverted:
1. `text.ts`: `char` added to cache key (good fix, keep it)
2. `text.ts`: Line splitting in `prepareGlyphInstances` (rendering fix, needs measurement fix to work)
3. `lib.rs`: `buffer.set_size()` added (may or may not help, harmless)

The core issue remains: **measurement doesn't account for newlines when maxWidth is undefined**.
