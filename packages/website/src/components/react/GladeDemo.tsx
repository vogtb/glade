import { ALL_DEMOS } from "@glade/library";
import { useState } from "react";

import { DemoShowcase } from "./DemoShowcase";

export function GladeDemo() {
  const [selectedDemo, setSelectedDemo] = useState("Button");

  return (
    <div className="flex flex-col gap-6">
      {/* Demo Buttons */}
      <div className="flex flex-wrap gap-2">
        {ALL_DEMOS.map((demo) => (
          <button
            key={demo.name}
            onClick={() => setSelectedDemo(demo.name)}
            className={
              "px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer " +
              (selectedDemo === demo.name
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200")
            }
          >
            {demo.name}
          </button>
        ))}
      </div>

      {/* Demo Showcase */}
      <div className="w-full flex justify-center">
        <DemoShowcase demoName={selectedDemo} width={700} height={500} />
      </div>
    </div>
  );
}
