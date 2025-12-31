import { div, text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";
import { colors } from "@glade/utils";

export const PADDING_DEMO: Demo = {
  name: "Padding",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Padding creates space inside an element.").size(16),

    // Uniform padding
    SPACER_10PX,
    text("Uniform Padding (p)").size(18).weight(600),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .children(
        div()
          .bg(colors.blue.x600)
          .p(4)
          .child(div().bg(colors.black.x700).child(text("p=4").size(11))),
        div()
          .bg(colors.blue.x600)
          .p(12)
          .child(div().bg(colors.black.x700).child(text("p=12").size(11))),
        div()
          .bg(colors.blue.x600)
          .p(20)
          .child(div().bg(colors.black.x700).child(text("p=20").size(11))),
        div()
          .bg(colors.blue.x600)
          .p(32)
          .child(div().bg(colors.black.x700).child(text("p=32").size(11)))
      ),

    // Horizontal padding
    SPACER_10PX,
    text("Horizontal Padding (px)").size(18).weight(600),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .children(
        div()
          .bg(colors.green.x600)
          .px(8)
          .py(4)
          .child(div().bg(colors.black.x700).child(text("px=8").size(11))),
        div()
          .bg(colors.green.x600)
          .px(20)
          .py(4)
          .child(div().bg(colors.black.x700).child(text("px=20").size(11))),
        div()
          .bg(colors.green.x600)
          .px(40)
          .py(4)
          .child(div().bg(colors.black.x700).child(text("px=40").size(11)))
      ),

    // Vertical padding
    SPACER_10PX,
    text("Vertical Padding (py)").size(18).weight(600),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .children(
        div()
          .bg(colors.purple.x600)
          .px(4)
          .py(8)
          .child(div().bg(colors.black.x700).child(text("py=8").size(11))),
        div()
          .bg(colors.purple.x600)
          .px(4)
          .py(20)
          .child(div().bg(colors.black.x700).child(text("py=20").size(11))),
        div()
          .bg(colors.purple.x600)
          .px(4)
          .py(40)
          .child(div().bg(colors.black.x700).child(text("py=40").size(11)))
      ),

    // Individual padding
    SPACER_10PX,
    text("Individual Padding (pt, pr, pb, pl)").size(18).weight(600),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .children(
        div()
          .bg(colors.orange.x600)
          .pt(20)
          .pr(4)
          .pb(4)
          .pl(4)
          .child(div().bg(colors.black.x700).child(text("pt=20").size(11))),
        div()
          .bg(colors.orange.x600)
          .pt(4)
          .pr(20)
          .pb(4)
          .pl(4)
          .child(div().bg(colors.black.x700).child(text("pr=20").size(11))),
        div()
          .bg(colors.orange.x600)
          .pt(4)
          .pr(4)
          .pb(20)
          .pl(4)
          .child(div().bg(colors.black.x700).child(text("pb=20").size(11))),
        div()
          .bg(colors.orange.x600)
          .pt(4)
          .pr(4)
          .pb(4)
          .pl(20)
          .child(div().bg(colors.black.x700).child(text("pl=20").size(11)))
      ),

    // Mixed padding
    SPACER_10PX,
    text("Asymmetric Padding").size(18).weight(600),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .children(
        div()
          .bg(colors.teal.x600)
          .pt(8)
          .pr(24)
          .pb(16)
          .pl(12)
          .child(div().bg(colors.black.x700).p(4).child(text("8/24/16/12").size(11))),
        div()
          .bg(colors.pink.x600)
          .pt(20)
          .pr(8)
          .pb(4)
          .pl(32)
          .child(div().bg(colors.black.x700).p(4).child(text("20/8/4/32").size(11)))
      ),
  ],
};
