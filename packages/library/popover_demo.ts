import { div, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const POPOVER_DEMO: Demo = {
  name: "Popover",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Renders popover, usually triggered on click"),
    div().p(10),
  ],
};
