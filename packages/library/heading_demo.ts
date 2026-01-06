import { div, h1, h2, h3, h4, h5, h6, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const HEADING_DEMO: Demo = {
  name: "Headings",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Headings like HTML h1, h2, and so on").size(16),
    div().p(10),
    div().child(h1("H1 Text")),
    div().p(10),
    div().child(h2("H2 Text")),
    div().p(10),
    div().child(h3("H3 Text")),
    div().p(10),
    div().child(h4("H4 Text")),
    div().p(10),
    div().child(h5("H5 Text")),
    div().p(10),
    div().child(h6("H6 Text")),
  ],
};
