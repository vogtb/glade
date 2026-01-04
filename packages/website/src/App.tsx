import { ALL_DEMOS } from "@glade/demos/library";
import { useState } from "react";

import { DemoShowcase } from "./components/DemoShowcase";

export default function App() {
  const [currentDemo, setCurrentDemo] = useState(ALL_DEMOS[0]?.name ?? "Button");

  return (
    <div className="flex flex-col items-center gap-6 p-8 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-900">Glade Demos</h1>

      <div className="flex flex-wrap justify-center gap-2 max-w-4xl">
        {ALL_DEMOS.map((demo) => (
          <button
            key={demo.name}
            onClick={() => setCurrentDemo(demo.name)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              currentDemo === demo.name
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
            }`}
          >
            {demo.name}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <DemoShowcase demoName={currentDemo} width={600} height={400} />
      </div>

      <p className="text-sm text-gray-500">
        Currently viewing: <span className="font-medium">{currentDemo}</span>
      </p>
    </div>
  );
}
