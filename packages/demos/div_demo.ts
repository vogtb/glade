import { div, text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";
import { colors } from "@glade/utils";

export const DIV_DEMO: Demo = {
  name: "Div",
  renderElement: (cx, _state): DemoItem[] => [
    text("They're basically like an HTML <div />").size(16),
    SPACER_10PX,
    div()
      .p(20)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(4)
      .child(text("p=20, border 2px, rounded 2px")),
    SPACER_10PX,
    div()
      .p(20)
      .m(20)
      .border(4)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(10)
      .child(text("p=20, m=20, border 4px, rounded 10px")),
    SPACER_10PX,
    div().child(
      div()
        .p(10)
        .border(2)
        .borderColor(colors.gray.x700)
        .bg(cx.getTheme().surfaceMuted)
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
