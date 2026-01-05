import { Copy } from "lucide-react";
import { useState } from "react";

import { DemoShowcase } from "./DemoShowcase";

type LiveDemoProps = {
  code: string;
  selectedDemo?: string;
  gladeDemoName?: string;
};

export function LiveDemo({ code, selectedDemo, gladeDemoName }: LiveDemoProps) {
  const [activeTab, setActiveTab] = useState<"demo" | "code">("demo");

  const copyToClipboard = () => {
    const textarea = document.createElement("textarea");
    textarea.value = code;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
    document.body.removeChild(textarea);
  };

  return (
    <div className="w-full overflow-hidden rounded-lg bg-[#ff6b35] aspect-square md:aspect-auto">
      <div
        className="h-full w-full flex flex-col rounded-lg overflow-hidden md:aspect-video"
        style={{ border: "3px solid #ff6b35" }}
      >
        <div className="flex-1 relative overflow-hidden rounded-xl bg-white">
          {activeTab === "demo" ? (
            gladeDemoName ? (
              <div className="h-full w-full flex items-center justify-center">
                <DemoShowcase demoName={gladeDemoName} width={600} height={400} />
              </div>
            ) : (
              <div className="h-full w-full scale-108 bg-linear-to-br from-gray-100 to-gray-300 blur-sm"></div>
            )
          ) : (
            <div className="h-full w-full overflow-auto p-4 bg-gray-50">
              <pre className="font-mono text-[13px] leading-relaxed">
                <code className="bg-transparent shadow-none border-none">{code}</code>
              </pre>
            </div>
          )}
        </div>

        <div className="pt-1 grid grid-cols-3 items-center w-full">
          <div className="bg-[rgb(216,75,31)] rounded-[7px] w-fit inline-flex items-center gap-1 p-0.75">
            <button
              onClick={() => setActiveTab("demo")}
              className="h-6 px-2 rounded-[5px] flex items-center gap-2 cursor-pointer border-none bg-transparent hover:text-white"
              style={{
                backgroundColor: activeTab === "demo" ? "rgba(255, 255, 255, 0.2)" : "transparent",
              }}
            >
              <span
                className={
                  "font-mono text-[13px] flex items-center " +
                  (activeTab === "demo" ? "text-white" : "text-white/68")
                }
              >
                {
                  <span
                    className="text-[16px] mr-2 text-yellow-400"
                    style={{
                      animation:
                        activeTab === "demo" ? "pulse-scale 2200ms ease-in-out infinite" : "",
                      display: "inline-block",
                      transformOrigin: "center",
                    }}
                  >
                    ●
                  </span>
                }
                <span>LIVE DEMO</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab("code")}
              className="h-6 py-1 px-2 rounded-[5px] flex items-center cursor-pointer border-none bg-transparent hover:text-white"
              style={{
                backgroundColor: activeTab === "code" ? "rgba(255, 255, 255, 0.2)" : "transparent",
              }}
            >
              <span
                className={
                  "font-mono text-[13px] " + (activeTab === "code" ? "text-white" : "text-white/68")
                }
              >
                CODE
              </span>
            </button>
          </div>

          {selectedDemo && (
            <div className="hidden md:flex justify-center px-3 py-1">
              <span className="font-mono font-medium text-[15px] text-white">{selectedDemo}</span>
            </div>
          )}
          {!selectedDemo && <div className="hidden md:block"></div>}

          <div className="flex justify-end">
            <div className="bg-[rgb(216,75,31)] rounded-[7px] w-fit inline-flex items-center gap-1 p-0.75">
              <button
                onClick={copyToClipboard}
                className="h-6 py-1 px-2 rounded-[5px] flex items-center gap-2 cursor-pointer border-none bg-transparent text-white/68 hover:text-white"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="font-mono text-[13px]">Copy code</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
