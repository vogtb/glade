import { useStore } from "@nanostores/react";

import { componentDemos } from "../../data/demos";
import { selectedDemo } from "../../stores/demo";

export function DemoButtons() {
  const selected = useStore(selectedDemo);

  return (
    <div className="flex flex-wrap gap-2">
      {componentDemos.map((demo) => (
        <button
          key={demo.name}
          onClick={() => selectedDemo.set(demo.name)}
          className={
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer " +
            (selected === demo.name
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200")
          }
        >
          {demo.name}
        </button>
      ))}
    </div>
  );
}
