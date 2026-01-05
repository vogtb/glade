import { Copy } from "lucide-react";

export function QuickLinks() {
  const handleCopy = () => {
    const text = "curl -fsSL https://glade.graphics/install.sh | sh";

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Failed to copy:", err);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-2 rounded-lg border border-black/4 bg-gray-50 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
            <h3 className="text-sm">Install macOS demos</h3>
            <a
              href="https://github.com/vogtb/glade/blob/main/install.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors hover:text-orange-600 text-[14px] text-[rgb(255,105,0)]"
            >
              See install.sh in GitHub →
            </a>
          </div>
          <div className="relative">
            <pre className="relative overflow-x-auto rounded-lg bg-gray-800 px-1.75 py-0.75 text-[rgb(255,134,37)] font-medium after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-full after:w-16 after:bg-linear-to-l after:from-gray-900 after:to-transparent md:after:hidden">
              <code className="bg-transparent text-xs shadow-none">
                curl -fsSL https://glade.graphics/install.sh | sh
              </code>
            </pre>
            <button
              onClick={handleCopy}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded text-[rgb(199,205,216)] transition-colors hover:bg-gray-800 hover:text-gray-200 p-1"
              title="Copy to clipboard"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="col-span-1 flex flex-col gap-2 rounded-lg border border-black/4 bg-gray-50 p-4">
          <h3 className="text-sm">See browser demo</h3>
          <div className="flex flex-1 items-center justify-start">
            <button
              onClick={() => window.open("#demos", "_self")}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-orange-500 px-3 py-1 text-sm text-white transition-colors hover:bg-orange-600"
            >
              <span className="text-[rgb(255,255,255)]">Open Demo</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
