import { text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const DEFERRED_DEMO: Demo = {
  name: "Deferred Components",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Renders on top after all other components are rendered"),
    SPACER_10PX,
  ],
};
