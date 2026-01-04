import { colors, div, text } from "@glade/glade";

import { SPACER_10PX } from "./common";
import type { Demo, DemoItem } from "./demo";

export const BORDER_DEMO: Demo = {
  name: "Border",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Border widths, colors, and radius options.").size(16),

    // Border widths
    SPACER_10PX,
    text("Border Widths").size(18).weight(600),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .children(
        div()
          .w(100)
          .h(60)
          .bg(colors.black.x700)
          .border(1)
          .borderColor(colors.blue.x500)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("1px").size(12)),
        div()
          .w(100)
          .h(60)
          .bg(colors.black.x700)
          .border(2)
          .borderColor(colors.blue.x500)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("2px").size(12)),
        div()
          .w(100)
          .h(60)
          .bg(colors.black.x700)
          .border(4)
          .borderColor(colors.blue.x500)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("4px").size(12)),
        div()
          .w(100)
          .h(60)
          .bg(colors.black.x700)
          .border(8)
          .borderColor(colors.blue.x500)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("8px").size(12))
      ),

    // Border colors
    SPACER_10PX,
    text("Border Colors").size(18).weight(600),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .children(
        div()
          .w(100)
          .h(60)
          .bg(colors.black.x700)
          .border(3)
          .borderColor(colors.red.x500)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("Red").size(12)),
        div()
          .w(100)
          .h(60)
          .bg(colors.black.x700)
          .border(3)
          .borderColor(colors.green.x500)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("Green").size(12)),
        div()
          .w(100)
          .h(60)
          .bg(colors.black.x700)
          .border(3)
          .borderColor(colors.purple.x500)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("Purple").size(12)),
        div()
          .w(100)
          .h(60)
          .bg(colors.black.x700)
          .border(3)
          .borderColor(colors.orange.x500)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("Orange").size(12))
      ),

    // Border radius
    SPACER_10PX,
    text("Border Radius").size(18).weight(600),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .children(
        div()
          .w(80)
          .h(80)
          .bg(colors.blue.x600)
          .rounded(0)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("0").size(12)),
        div()
          .w(80)
          .h(80)
          .bg(colors.blue.x600)
          .rounded(4)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("4").size(12)),
        div()
          .w(80)
          .h(80)
          .bg(colors.blue.x600)
          .rounded(12)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("12").size(12)),
        div()
          .w(80)
          .h(80)
          .bg(colors.blue.x600)
          .rounded(24)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("24").size(12)),
        div()
          .w(80)
          .h(80)
          .bg(colors.blue.x600)
          .roundedFull()
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("full").size(12))
      ),

    // Combined border + radius
    SPACER_10PX,
    text("Border + Radius Combined").size(18).weight(600),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .children(
        div()
          .w(100)
          .h(60)
          .bg(colors.black.x800)
          .border(2)
          .borderColor(colors.teal.x500)
          .rounded(8)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("r=8").size(12)),
        div()
          .w(100)
          .h(60)
          .bg(colors.black.x800)
          .border(3)
          .borderColor(colors.pink.x500)
          .rounded(16)
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("r=16").size(12)),
        div()
          .w(80)
          .h(80)
          .bg(colors.black.x800)
          .border(4)
          .borderColor(colors.amber.x500)
          .roundedFull()
          .flex()
          .itemsCenter()
          .justifyCenter()
          .child(text("circle").size(11))
      ),
  ],
};
