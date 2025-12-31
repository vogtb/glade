import { text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const CHECKBOX_DEMO: Demo = {
  name: "Checkbox",
  renderElement: (_cx, _state): DemoItem[] => [text("Renders a simple checkbox."), SPACER_10PX],
};
