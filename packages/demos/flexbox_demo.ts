import { colors, div, text } from "@glade/glade";

import { SPACER_10PX } from "./common";
import type { Demo, DemoItem } from "./demo";

function flexBox(label: string) {
  return div().p(8).bg(colors.blue.x600).rounded(4).child(text(label).color(colors.white.default));
}

function flexBoxTall(label: string, height: number) {
  return div()
    .p(8)
    .h(height)
    .bg(colors.blue.x600)
    .rounded(4)
    .flex()
    .flexCol()
    .itemsCenter()
    .justifyCenter()
    .child(text(label).color(colors.white.default));
}

export const FLEXBOX_DEMO: Demo = {
  name: "Flexbox",
  renderElement: (cx, _state): DemoItem[] => [
    text("Row/column alignment, wrapping, and spacing helpers.").size(16),

    // ============ Flexbox: Justify Content ============
    SPACER_10PX,
    text("justifyContent (horizontal distribution)").size(16).weight(600),
    SPACER_10PX,

    text("justifyStart"),
    div()
      .flexRow()
      .justifyStart()
      .gap(8)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),
    SPACER_10PX,

    text("justifyCenter"),
    div()
      .flexRow()
      .justifyCenter()
      .gap(8)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),
    SPACER_10PX,

    text("justifyEnd"),
    div()
      .flexRow()
      .justifyEnd()
      .gap(8)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),
    SPACER_10PX,

    text("justifyBetween"),
    div()
      .flexRow()
      .justifyBetween()
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),
    SPACER_10PX,

    text("justifyAround"),
    div()
      .flexRow()
      .justifyAround()
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),
    SPACER_10PX,

    text("justifyEvenly"),
    div()
      .flexRow()
      .justifyEvenly()
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),

    // ============ Flexbox: Align Items ============
    SPACER_10PX,
    text("alignItems (cross-axis alignment)").size(16).weight(600),
    SPACER_10PX,

    text("itemsStart"),
    div()
      .flexRow()
      .itemsStart()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(flexBoxTall("1", 30))
      .child(flexBoxTall("2", 50))
      .child(flexBoxTall("3", 40)),
    SPACER_10PX,

    text("itemsCenter"),
    div()
      .flexRow()
      .itemsCenter()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(flexBoxTall("1", 30))
      .child(flexBoxTall("2", 50))
      .child(flexBoxTall("3", 40)),
    SPACER_10PX,

    text("itemsEnd"),
    div()
      .flexRow()
      .itemsEnd()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(flexBoxTall("1", 30))
      .child(flexBoxTall("2", 50))
      .child(flexBoxTall("3", 40)),
    SPACER_10PX,

    text("itemsStretch"),
    div()
      .flexRow()
      .itemsStretch()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(
        div().p(8).bg(colors.blue.x600).rounded(4).child(text("1").color(colors.white.default))
      )
      .child(
        div().p(8).bg(colors.blue.x600).rounded(4).child(text("2").color(colors.white.default))
      )
      .child(
        div().p(8).bg(colors.blue.x600).rounded(4).child(text("3").color(colors.white.default))
      ),
    SPACER_10PX,

    text("itemsBaseline"),
    div()
      .flexRow()
      .itemsBaseline()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(
        div()
          .p(8)
          .pt(20)
          .bg(colors.blue.x600)
          .rounded(4)
          .child(text("1").color(colors.white.default))
      )
      .child(
        div()
          .p(8)
          .bg(colors.blue.x600)
          .rounded(4)
          .child(text("2").color(colors.white.default).size(24))
      )
      .child(
        div()
          .p(8)
          .pt(10)
          .bg(colors.blue.x600)
          .rounded(4)
          .child(text("3").color(colors.white.default))
      ),

    // ============ Flexbox: Align Self ============
    SPACER_10PX,
    text("alignSelf (individual item alignment)").size(16).weight(600),
    SPACER_10PX,

    text("selfStart, selfCenter, selfEnd, selfStretch"),
    div()
      .flexRow()
      .itemsStretch()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().semantic.surface.muted)
      .rounded(4)
      .child(
        div()
          .selfStart()
          .p(8)
          .bg(colors.blue.x600)
          .rounded(4)
          .child(text("selfStart").color(colors.white.default))
      )
      .child(
        div()
          .selfCenter()
          .p(8)
          .bg(colors.green.x600)
          .rounded(4)
          .child(text("selfCenter").color(colors.white.default))
      )
      .child(
        div()
          .selfEnd()
          .p(8)
          .bg(colors.orange.x600)
          .rounded(4)
          .child(text("selfEnd").color(colors.white.default))
      )
      .child(
        div()
          .selfStretch()
          .p(8)
          .bg(colors.purple.x600)
          .rounded(4)
          .child(text("selfStretch").color(colors.white.default))
      ),
  ],
};
