export function LiveDemo() {
  return (
    <div className="w-full overflow-hidden rounded-md bg-[#155dfc] aspect-square md:aspect-auto">
      <div
        className="h-full w-full flex flex-col rounded-md overflow-hidden md:aspect-video"
        style={{ border: "3px solid #155dfc" }}
      >
        <div className="flex-1 relative overflow-hidden rounded bg-white">
          <div className="h-full w-full scale-108 bg-linear-to-br from-gray-900 to-black blur-sm"></div>
        </div>

        <div className="pt-1 grid grid-cols-3 items-center w-full">
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

          <div className="hidden md:flex justify-center px-3 py-1"> </div>

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
