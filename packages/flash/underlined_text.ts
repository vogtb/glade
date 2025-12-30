import type { Bounds } from "./types.ts";
import {
  FlashElement,
  type PaintContext,
  type PrepaintContext,
  type RequestLayoutContext,
  type RequestLayoutResult,
} from "./element.ts";

/**
 * Custom element that renders text with an underline.
 */
class UnderlinedTextElement extends FlashElement<{ textWidth: number; textHeight: number }, void> {
  private textContent: string;
  private underlineStyle: "solid" | "wavy";
  private textColor: { r: number; g: number; b: number; a: number };
  private underlineColor: { r: number; g: number; b: number; a: number };
  private fontSize: number;
  private fontFamily: string;
  private thickness: number;
  private wavelength?: number;
  private amplitude?: number;

  constructor(
    text: string,
    options: {
      style: "solid" | "wavy";
      textColor: { r: number; g: number; b: number; a: number };
      underlineColor?: { r: number; g: number; b: number; a: number };
      fontSize?: number;
      fontFamily?: string;
      thickness?: number;
      wavelength?: number;
      amplitude?: number;
    }
  ) {
    super();
    this.textContent = text;
    this.underlineStyle = options.style;
    this.textColor = options.textColor;
    this.underlineColor = options.underlineColor ?? options.textColor;
    this.fontSize = options.fontSize ?? 14;
    this.fontFamily = options.fontFamily ?? "Inter";
    this.thickness = options.thickness ?? 1;
    this.wavelength = options.wavelength;
    this.amplitude = options.amplitude;
  }

  requestLayout(
    cx: RequestLayoutContext
  ): RequestLayoutResult<{ textWidth: number; textHeight: number }> {
    const metrics = cx.measureText(this.textContent, {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: 400,
    });
    const underlineSpace =
      this.underlineStyle === "wavy"
        ? this.thickness + (this.amplitude ?? 1) * 2 + 2
        : this.thickness + 2;
    const layoutId = cx.requestLayout(
      { width: metrics.width, height: metrics.height + underlineSpace },
      []
    );
    return { layoutId, requestState: { textWidth: metrics.width, textHeight: metrics.height } };
  }

  prepaint(
    _cx: PrepaintContext,
    _bounds: Bounds,
    _requestState: { textWidth: number; textHeight: number }
  ): void {}

  paint(cx: PaintContext, bounds: Bounds, _prepaintState: void): void {
    cx.paintGlyphs(this.textContent, bounds, this.textColor, {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: 400,
    });

    const underlineY = bounds.y + this.fontSize * 1.1;
    cx.paintUnderline(
      bounds.x,
      underlineY,
      bounds.width,
      this.thickness,
      this.underlineColor,
      this.underlineStyle,
      { wavelength: this.wavelength, amplitude: this.amplitude }
    );
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): null {
    return null;
  }
}

export function underlinedText(
  textContent: string,
  options: {
    style: "solid" | "wavy";
    textColor: { r: number; g: number; b: number; a: number };
    underlineColor?: { r: number; g: number; b: number; a: number };
    fontSize?: number;
    fontFamily?: string;
    thickness?: number;
    wavelength?: number;
    amplitude?: number;
  }
): UnderlinedTextElement {
  return new UnderlinedTextElement(textContent, options);
}
