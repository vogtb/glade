import { useEffect, useRef, useState } from "react";

import { DemoRenderer } from "../lib/DemoRenderer";

type DemoShowcaseProps = {
  demoName: string;
  width: number;
  height: number;
};

export function DemoShowcase({ demoName, width, height }: DemoShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<DemoRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let mounted = true;
    let currentRenderer: DemoRenderer | null = null;

    DemoRenderer.create(canvas, width, height)
      .then((r) => {
        if (mounted) {
          currentRenderer = r;
          setRenderer(r);
        } else {
          r.destroy();
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      mounted = false;
      if (currentRenderer) {
        currentRenderer.destroy();
      }
    };
  }, [width, height]);

  useEffect(() => {
    if (renderer) {
      renderer.showDemo(demoName);
    }
  }, [demoName, renderer]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-red-100 text-red-700 rounded"
        style={{ width, height }}
      >
        <p>Failed to initialize WebGPU: {error}</p>
      </div>
    );
  }

  return (
    <canvas ref={canvasRef} style={{ width, height }} className="rounded border border-gray-300" />
  );
}
