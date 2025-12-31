import { text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const BUTTON_DEMO: Demo = {
  name: "Button",
  renderElement: (_cx, _state): DemoItem[] => [text("TODO: this"), SPACER_10PX],
};
