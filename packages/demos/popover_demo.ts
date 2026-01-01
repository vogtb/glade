import { text } from "@glade/glade";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const POPOVER_DEMO: Demo = {
  name: "Popover",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Renders popover, usually triggered on click"),
    SPACER_10PX,
  ],
};
