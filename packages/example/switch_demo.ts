import { text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const SWITCH_DEMO: Demo = {
  name: "Switch",
  renderElement: (_cx, _state): DemoItem[] => [
    text("A switch is like a checkbox, but more fun."),
    SPACER_10PX,
  ],
};
