import { canvas, div, text } from "@glade/glade";
import type { Bounds, PrepaintContext } from "@glade/glade";
import type { Demo, DemoItem } from "./demo";

type CanvasBarsState = {
  values: number[];
  padding: number;
  startX: number;
  endX: number;
  baseY: number;
  amplitude: number;
};

export const CANVAS_DEMO: Demo = {
  name: "Canvas",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Direct access to low-level paint APIs without defining a custom element.").size(16),
    div().h(1).bg({ r: 0.4, g: 0.4, b: 0.5, a: 0.5 }),
    text("Bars via canvas()").size(18),
    canvas<CanvasBarsState>({
      styles: { width: "100%", height: 260 },
      prepaint: (bounds: Bounds, _cx: PrepaintContext): CanvasBarsState => {
        const padding = 16;
        const barCount = 28;
        const startX = bounds.x + padding;
        const endX = bounds.x + bounds.width - padding;
        const baseY = bounds.y + bounds.height - padding;
        const amplitude = bounds.height * 0.55;

        const values = Array.from({ length: barCount }, (_v, i) => {
          const t = i / Math.max(1, barCount - 1);
          const sin1 = Math.sin(t * Math.PI * 2);
          const sin2 = Math.sin(t * Math.PI * 4 + 0.6);
          const envelope = Math.sin(t * Math.PI);
          const v = 0.55 + 0.35 * sin1 * envelope + 0.2 * sin2 * envelope;
          return Math.max(0.05, Math.min(1, v));
        });

        return { values, padding, startX, endX, baseY, amplitude };
      },
      paint: (cx, bounds, state: CanvasBarsState) => {
        const scene = cx.scene;
        const { values, padding, startX, endX, baseY, amplitude } = state;

        scene.addRect({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          color: { r: 0.14, g: 0.14, b: 0.18, a: 1 },
          cornerRadius: 0,
          borderWidth: 1,
          borderColor: { r: 0.22, g: 0.22, b: 0.28, a: 1 },
        });

        const gridCount = 4;
        for (let i = 1; i <= gridCount; i++) {
          const y = bounds.y + (bounds.height / (gridCount + 1)) * i;
          scene.addRect({
            x: bounds.x + padding / 2,
            y,
            width: bounds.width - padding,
            height: 1,
            color: { r: 0.2, g: 0.25, b: 0.35, a: 0.4 },
            cornerRadius: 0,
            borderWidth: 0,
            borderColor: { r: 0, g: 0, b: 0, a: 0 },
          });
        }

        const barGap = 6;
        const barCount = values.length;
        const usableWidth = Math.max(0, endX - startX - barGap * (barCount - 1));
        const barWidth = Math.max(3, usableWidth / Math.max(1, barCount));

        values.forEach((value: number, idx: number) => {
          const x = startX + idx * (barWidth + barGap);
          const height = Math.max(6, amplitude * value);
          scene.addRect({
            x,
            y: baseY - height,
            width: barWidth,
            height,
            color: { r: 0.3, g: 0.78, b: 0.55, a: 0.9 },
            cornerRadius: 0,
            borderWidth: 0,
            borderColor: { r: 0, g: 0, b: 0, a: 0 },
          });
        });
      },
    }),
    text(
      "canvas() feeds prepaint -> paint so you can push custom primitives directly into the scene."
    ),
  ],
};
