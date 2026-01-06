import { FontFamily, FontVariant, GladeApp, type GladeContext } from "@glade/glade";
import { createGladePlatform } from "@glade/glade/platform";
import { ALL_DEMOS, MainView } from "@glade/library";
import { useEffect, useRef, useState } from "react";

function Spinner() {
  return (
    <svg
      className="h-5 w-5 text-gray-400"
      style={{ animation: "spin 0.6s linear infinite" }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

async function loadFonts(): Promise<FontFamily[]> {
  const [inter, interItalic, jetbrains, emoji] = await Promise.all([
    fetch(`/fonts/InterVariable.ttf`).then((r) => r.arrayBuffer()),
    fetch(`/fonts/InterVariable-Italic.ttf`).then((r) => r.arrayBuffer()),
    fetch(`/fonts/JetBrainsMono-Regular.ttf`).then((r) => r.arrayBuffer()),
    fetch(`/fonts/NotoColorEmoji-Regular.ttf`).then((r) => r.arrayBuffer()),
  ]);

  return [
    new FontFamily({
      name: "Inter",
      upright: FontVariant.fromBytes(new Uint8Array(inter)),
      italic: FontVariant.fromBytes(new Uint8Array(interItalic)),
    }),
    new FontFamily({
      name: "JetBrains Mono",
      upright: FontVariant.fromBytes(new Uint8Array(jetbrains)),
    }),
    new FontFamily({
      name: "Noto Color Emoji",
      upright: FontVariant.fromBytes(new Uint8Array(emoji)),
    }),
  ];
}

const MIN_LOADING_TIME_MS = 2000;

type LiveDemoProps = {
  standalone?: boolean;
};

export function LiveDemo({ standalone = false }: LiveDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<GladeApp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let destroyed = false;
    const startTime = Date.now();

    async function init() {
      if (!canvas) {
        return;
      }

      const platform = await createGladePlatform({
        canvas,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      });
      const fonts = await loadFonts();

      if (destroyed) {
        return;
      }

      const app = new GladeApp({ platform, fonts });
      await app.initialize();

      if (destroyed) {
        app.stop();
        return;
      }

      appRef.current = app;
      const mainView = new MainView({
        showTitlebar: false,
        demos: ALL_DEMOS,
      });
      await app.openWindow(
        { width: canvas.clientWidth, height: canvas.clientHeight, title: "Glade Demo" },
        (cx: GladeContext) => cx.newView(() => mainView)
      );

      app.run();
      platform.runRenderLoop(() => !destroyed);

      const elapsed = Date.now() - startTime;
      const remaining = MIN_LOADING_TIME_MS - elapsed;
      if (remaining > 0) {
        setTimeout(() => setLoading(false), remaining);
      } else {
        setLoading(false);
      }
    }

    init();

    return () => {
      destroyed = true;
      appRef.current?.stop();
    };
  }, []);

  if (standalone) {
    return (
      <div className="w-full h-full relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 z-10">
            <Spinner />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: "crisp-edges" }}
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-md bg-[#155dfc] aspect-square md:aspect-auto">
      <div className="h-full w-full flex flex-col rounded-md overflow-hidden md:aspect-video border-3 border-[#155dfc]">
        <div className="flex-1 relative overflow-hidden rounded bg-black">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <Spinner />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{ imageRendering: "crisp-edges" }}
          />
        </div>

        <div className="pt-1 grid grid-cols-2 items-center w-full">
          <div className="bg-[#1447e6] rounded-[5px] w-fit inline-flex items-center gap-1 p-0.75">
            <div className="h-6 px-2 rounded-[3px] flex items-center gap-2 border-none bg-transparent hover:text-white">
              <span className={"font-mono text-[13px] flex items-center text-white"}>
                <span
                  className="text-[16px] mr-2 text-blue-200 pulse-scale 2200ms ease-in-out infinite"
                  style={{
                    display: "inline-block",
                    transformOrigin: "center",
                  }}
                >
                  ●
                </span>
                <span>LIVE DEMO</span>
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#155dfc] rounded-[7px] w-fit inline-flex items-center gap-1 p-0.75">
              <a
                href="/demo"
                target="_blank"
                className="h-6 py-1 px-2 rounded-[5px] flex items-center gap-2 cursor-pointer border-none bg-transparent text-white/68 hover:text-white"
              >
                <span className="font-mono text-[13px]">Open in new tab {"->"}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
