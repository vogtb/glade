import { text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const TOOLTIP_DEMO: Demo = {
  name: "Tooltip",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Renders like a popover, but usually triggered by hover"),
    SPACER_10PX,
  ],
};
