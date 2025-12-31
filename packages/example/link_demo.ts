import { text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const LINK_DEMO: Demo = {
  name: "Link",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Link similar to an HTML <a> tag, opens a URL"),
    SPACER_10PX,
  ],
};
