import type { Color } from "./types.ts";
import { FlashScene } from "./scene.ts";
import type { FontStyle } from "@glade/shaper";
import type { TextInputState } from "./text.ts";
import { selectionPrimitives, compositionUnderlines, caretPrimitive } from "./text.ts";

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
}

/**
 * Add caret, selection highlights, and composition underlines to the scene for a text input.
 * Offsets are applied using the provided x/y origin (usually the text baseline origin).
 */
export function renderTextDecorations(
  scene: FlashScene,
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
  } = options;

  if (selectionColor) {
    const rects = selectionPrimitives(state, selectionColor, fontSize, lineHeight, fontFamily, {
      maxWidth,
      style,
    });
    for (const rect of rects) {
      scene.addRect({
        ...rect,
        x: rect.x + x,
        y: rect.y + y,
      });
    }
  }

  if (compositionColor) {
    const underlines = compositionUnderlines(
      state,
      compositionColor,
      fontSize,
      lineHeight,
      fontFamily,
      { maxWidth, style }
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
    const caret = caretPrimitive(state, caretColor, fontSize, lineHeight, fontFamily, {
      maxWidth,
      style,
      thickness: caretThickness,
      time,
      blinkInterval: caretBlinkInterval,
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
