import { div, h1, h2, h3, h4, h5, h6, text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const HEADING_DEMO: Demo = {
  name: "Headings",
  renderElement: (_cx): DemoItem[] => [
    text("Headings like HTML h1, h2, and so on").size(16),
    SPACER_10PX,
    div().child(h1("H1 Text")),
    SPACER_10PX,
    div().child(h2("H2 Text")),
    SPACER_10PX,
    div().child(h3("H3 Text")),
    SPACER_10PX,
    div().child(h4("H4 Text")),
    SPACER_10PX,
    div().child(h5("H5 Text")),
    SPACER_10PX,
    div().child(h6("H6 Text")),
  ],
};
