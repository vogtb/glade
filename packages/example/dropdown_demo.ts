import { text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const DROPDOWN_DEMO: Demo = {
  name: "Dropdown Menu",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Dropdown menu is like a file menu."),
    SPACER_10PX,
  ],
};
