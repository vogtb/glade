/**
 * FPS (Frames Per Second) overlay component for Glade. Displays a real-time
 * performance monitor showing bar graph of the last 80 frames (potential
 * FPS at each frame), current FPS number in monospace font.
 *
 * It is configurable corner positioning (top-left, top-right, bottom-left,
 * bottom-right).Renders as overlay on top of all content (managed by
 * GladeWindow). Does not capture hit events (click-through). Automatically
 * tracks frame times (no manual tick() call needed)
 */

import { type ColorObject, gray, red, rgb } from "@glade/utils";

import type { Bounds } from "./bounds.ts";
import type { PaintContext } from "./element.ts";

const BAR_GRAPH_WIDTH = 60;
const FPS_TEXT_WIDTH = 24;
const FPS_LABEL_WIDTH = 20;
const TEXT_GAP = 4;
const TEXT_LABEL_GAP = 2;
const TEXT_RIGHT_PADDING = 8;
const TEXT_COLUMN_WIDTH = FPS_TEXT_WIDTH + FPS_LABEL_WIDTH;
const COMPONENT_WIDTH = BAR_GRAPH_WIDTH + TEXT_GAP + TEXT_COLUMN_WIDTH + TEXT_RIGHT_PADDING;
const COMPONENT_HEIGHT = 24;
const MAX_FRAMES = 80;
const MAX_FPS = 120;
// Update the FPS number every N milliseconds, or else it blurs and is hard to
// read. Eg 120, 118, 119, 113 all blur and it's hard to read at any given
// moment what the actual value is. The bar graph gives enough info, that we
// can update this every 200ms (5x a second) and still get a sense of timing.
const MS_INTERVAL_FOR_TEXT_UPDATE = 200;

export type FpsCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface FpsConfig {
  corner: FpsCorner;
  margin: number;
}

/**
 * FPS overlay painter. Tracks frame times and paints a bar graph with
 * current FPS. This is a simple class - not a GladeElement. It is managed and
 * rendered directly by GladeWindow.
 */
export class GladeFps {
  private frameTimes: number[] = [];
  private lastFrameTime: number | null = null;
  private currentFps = 0;
  private lastFpsUpdateTime = 0;
  private latestFps = 0;

  private bgColor: ColorObject = rgb(0x000000);
  private borderColor: ColorObject = rgb(gray.x600);
  private barColor: ColorObject = rgb(0xffffff);
  private barLowColor: ColorObject = rgb(red.x500);
  private textColor: ColorObject = rgb(0xffffff);
  private labelColor: ColorObject = rgb(gray.x400);

  /**
   * Record a frame. Call this once per frame to track frame times.
   */
  recordFrame(): void {
    const now = performance.now();
    if (this.lastFrameTime !== null) {
      const delta = now - this.lastFrameTime;
      if (delta > 0) {
        const potentialFps = Math.min(1000 / delta, MAX_FPS);
        this.frameTimes.push(potentialFps);

        if (this.frameTimes.length > MAX_FRAMES) {
          this.frameTimes.shift();
        }

        this.latestFps = Math.round(potentialFps);

        if (now - this.lastFpsUpdateTime >= MS_INTERVAL_FOR_TEXT_UPDATE) {
          this.currentFps = this.latestFps;
          this.lastFpsUpdateTime = now;
        }
      }
    }
    this.lastFrameTime = now;
  }

  /**
   * Get the size of the FPS overlay.
   */
  getSize(): { width: number; height: number } {
    return { width: COMPONENT_WIDTH, height: COMPONENT_HEIGHT };
  }

  /**
   * Paint the FPS overlay at the given bounds.
   */
  paint(cx: PaintContext, bounds: Bounds): void {
    const fontFamily = cx.getWindow().getTheme().fonts.monospaced.name;
    const contentBounds = {
      x: bounds.x + 1,
      y: bounds.y + 1,
      width: bounds.width - 2,
      height: bounds.height - 2,
    };

    cx.withContentMask({ bounds, cornerRadius: 3 }, () => {
      cx.paintRect(bounds, {
        backgroundColor: this.bgColor,
        borderRadius: 3,
      });

      cx.paintBorder(bounds, {
        borderWidth: 1,
        borderColor: this.borderColor,
        borderRadius: 3,
      });

      const barAreaX = contentBounds.x;
      const barAreaY = contentBounds.y;
      const barAreaHeight = contentBounds.height;

      const barWidth = BAR_GRAPH_WIDTH / MAX_FRAMES;

      for (let i = 0; i < this.frameTimes.length; i++) {
        const fps = this.frameTimes[i] ?? 0;
        const normalizedHeight = (fps / MAX_FPS) * barAreaHeight;
        const barX = barAreaX + i * barWidth;
        const barY = barAreaY + barAreaHeight - normalizedHeight;

        const color = fps < 30 ? this.barLowColor : this.barColor;

        cx.paintRect(
          {
            x: barX,
            y: barY,
            width: barWidth,
            height: normalizedHeight,
          },
          { backgroundColor: color }
        );
      }

      const fpsText = String(this.currentFps);
      const textSize = cx.measureText(fpsText, {
        fontSize: 11,
        fontFamily,
        fontWeight: 400,
        lineHeight: 16,
      });
      const textWidth = Math.min(textSize.width, FPS_TEXT_WIDTH);
      const labelText = "fps";
      const labelSize = cx.measureText(labelText, {
        fontSize: 11,
        fontFamily,
        fontWeight: 400,
        lineHeight: 16,
      });
      const labelWidth = Math.min(labelSize.width, FPS_LABEL_WIDTH);
      const textColumnLeft = bounds.x + BAR_GRAPH_WIDTH + TEXT_GAP;
      const textColumnRight = textColumnLeft + TEXT_COLUMN_WIDTH;
      const textY = bounds.y + 4;

      const labelX = textColumnRight - labelWidth;
      const numberX = Math.max(textColumnLeft, labelX - TEXT_LABEL_GAP - textWidth);

      cx.paintGlyphs(
        fpsText,
        { x: numberX, y: textY, width: textWidth, height: 16 },
        this.textColor,
        {
          fontSize: 11,
          fontFamily,
          fontWeight: 400,
          lineHeight: 16,
        }
      );

      cx.paintGlyphs(
        labelText,
        { x: labelX, y: textY, width: labelWidth, height: 16 },
        this.labelColor,
        {
          fontSize: 11,
          fontFamily,
          fontWeight: 400,
          lineHeight: 16,
        }
      );
    });
  }
}

/**
 * Compute the position of the FPS overlay based on corner and margin.
 */
export function computeFpsBounds(
  windowWidth: number,
  windowHeight: number,
  config: FpsConfig
): Bounds {
  const size = { width: COMPONENT_WIDTH, height: COMPONENT_HEIGHT };
  let x: number;
  let y: number;

  switch (config.corner) {
    case "top-left":
      x = config.margin;
      y = config.margin;
      break;
    case "top-right":
      x = windowWidth - size.width - config.margin;
      y = config.margin;
      break;
    case "bottom-left":
      x = config.margin;
      y = windowHeight - size.height - config.margin;
      break;
    case "bottom-right":
      x = windowWidth - size.width - config.margin;
      y = windowHeight - size.height - config.margin;
      break;
  }

  return { x, y, width: size.width, height: size.height };
}
