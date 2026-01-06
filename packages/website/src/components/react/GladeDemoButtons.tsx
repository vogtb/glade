import { ALL_DEMOS } from "@glade/library";
import { useStore } from "@nanostores/react";

import { selectedGladeDemo } from "../../stores/demo";

export function GladeDemoButtons() {
  const selected = useStore(selectedGladeDemo);

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_DEMOS.map((demo) => (
        <button
          key={demo.name}
          onClick={() => selectedGladeDemo.set(demo.name)}
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
