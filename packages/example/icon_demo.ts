import { text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const ICON_DEMO: Demo = {
  name: "Icon",
  renderElement: (_cx, _state): DemoItem[] => [text("Simple icon component"), SPACER_10PX],
};
