import { useStore } from "@nanostores/react";

import { selectedGladeDemo } from "../../stores/demo";
import { DemoShowcase } from "./DemoShowcase";

export function GladeDemoShowcase() {
  const demoName = useStore(selectedGladeDemo);

  return (
    <div className="w-full flex justify-center">
      <DemoShowcase demoName={demoName} width={700} height={500} />
    </div>
  );
}
