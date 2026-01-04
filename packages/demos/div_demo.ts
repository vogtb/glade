import { colors, div, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const DIV_DEMO: Demo = {
  name: "Div",
  renderElement: (cx, _state): DemoItem[] => [
    text("They're basically like an HTML <div />").size(16),
    div().p(10),
    div()
      .p(20)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(text("p=20, border 2px, rounded 2px")),
    div().p(10),
    div()
      .p(20)
      .m(20)
      .border(4)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(10)
      .child(text("p=20, m=20, border 4px, rounded 10px")),
    div().p(10),
    div().child(
      div()
        .p(10)
        .border(2)
        .borderColor(colors.gray.x700)
        .bg(cx.getTheme().semantic.surface.muted)
        .rounded(4)
        .w(200)
        .h(110)
        .flex()
        .itemsCenter()
        .justifyCenter()
        .child(text("p=20, w=200px, h=110px"))
    ),
  ],
};
