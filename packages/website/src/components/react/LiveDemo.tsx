import { useState } from "react";

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

const demoCode = `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'div',
  padding: { top: 20, right: 15, bottom: 20, left: 15 },
  children: [
    { type: 'text', content: 'Hello with padding!' }
  ]
});`;

export function LiveDemo() {
  const [activeTab, setActiveTab] = useState<"demo" | "code">("demo");

  const copyToClipboard = () => {
    const textarea = document.createElement("textarea");
    textarea.value = demoCode;
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
    <div className="w-full overflow-hidden rounded-lg bg-[#155dfc] aspect-square md:aspect-auto">
      <div
        className="h-full w-full flex flex-col rounded-lg overflow-hidden md:aspect-video"
        style={{ border: "3px solid #155dfc" }}
      >
        <div className="flex-1 relative overflow-hidden rounded-xl bg-white">
          {activeTab === "demo" ? (
            <div className="h-full w-full scale-108 bg-gradient-to-br from-gray-900 to-black blur-sm"></div>
          ) : (
            <div className="h-full w-full overflow-auto p-4 bg-gray-50">
              <pre className="font-mono text-[13px] leading-relaxed">
                <code className="bg-transparent shadow-none border-none">{demoCode}</code>
              </pre>
            </div>
          )}
        </div>

        <div className="pt-1 grid grid-cols-3 items-center w-full">
          <div className="bg-[rgb(18,84,220)] rounded-[7px] w-fit inline-flex items-center gap-1 p-0.75">
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
                <span
                  className="text-[16px] mr-2 text-blue-200"
                  style={{
                    animation:
                      activeTab === "demo" ? "pulse-scale 2200ms ease-in-out infinite" : "",
                    display: "inline-block",
                    transformOrigin: "center",
                  }}
                >
                  ●
                </span>
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

          <div className="hidden md:flex justify-center px-3 py-1">
            <span className="font-mono font-medium text-[15px] text-white">Demo</span>
          </div>

          <div className="flex justify-end">
            <div className="bg-[rgb(18,84,220)] rounded-[7px] w-fit inline-flex items-center gap-1 p-0.75">
              <button
                onClick={copyToClipboard}
                className="h-6 py-1 px-2 rounded-[5px] flex items-center gap-2 cursor-pointer border-none bg-transparent text-white/68 hover:text-white"
              >
                <CopyIcon className="w-3.5 h-3.5" />
                <span className="font-mono text-[13px]">Copy code</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
