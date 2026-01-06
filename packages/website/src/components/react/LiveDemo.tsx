import { FontFamily, FontVariant, GladeApp, type GladeContext } from "@glade/glade";
import { createGladePlatform } from "@glade/glade/platform";
import { ALL_DEMOS, MainView } from "@glade/library";
import { useEffect, useRef } from "react";

const FONT_BASE_URL = "/fonts";

async function loadFonts(): Promise<FontFamily[]> {
  const [inter, interItalic, jetbrains, emoji] = await Promise.all([
    fetch(`${FONT_BASE_URL}/InterVariable.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${FONT_BASE_URL}/InterVariable-Italic.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${FONT_BASE_URL}/JetBrainsMono-Regular.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${FONT_BASE_URL}/NotoColorEmoji-Regular.ttf`).then((r) => r.arrayBuffer()),
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

export function LiveDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<GladeApp | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let destroyed = false;

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
    }

    init();

    return () => {
      destroyed = true;
      appRef.current?.stop();
    };
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-md bg-[#155dfc] aspect-square md:aspect-auto">
      <div className="h-full w-full flex flex-col rounded-md overflow-hidden md:aspect-video border-3 border-[#155dfc]">
        <div className="flex-1 relative overflow-hidden rounded bg-white">
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
            <div className="bg-[##155dfc] rounded-[7px] w-fit inline-flex items-center gap-1 p-0.75">
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
