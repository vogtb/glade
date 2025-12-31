import { text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const RADIO_INPUT_DEMO: Demo = {
  name: "Radio Input",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Renders radio group, and radio inputs"),
    SPACER_10PX,
  ],
};
