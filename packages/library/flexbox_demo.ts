import { colors, div, text } from "@glade/glade";

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
    div().p(10),
    text("justifyContent (horizontal distribution)").size(16).weight(600),
    div().p(10),

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
    div().p(10),

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
    div().p(10),

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
    div().p(10),

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
    div().p(10),

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
    div().p(10),

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
    div().p(10),
    text("alignItems (cross-axis alignment)").size(16).weight(600),
    div().p(10),

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
    div().p(10),

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
    div().p(10),

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
    div().p(10),

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
    div().p(10),

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
    div().p(10),
    text("alignSelf (individual item alignment)").size(16).weight(600),
    div().p(10),

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
