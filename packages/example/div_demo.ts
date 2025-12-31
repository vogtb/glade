import { div, text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SEPARATOR_10PX } from "./common";
import { colors } from "@glade/utils";

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

export const DIV_DEMO: Demo = {
  name: "Div",
  renderElement: (cx): DemoItem[] => [
    text("They're basically like an HTML <div />").size(16),
    SEPARATOR_10PX,
    div()
      .p(20)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(4)
      .child(text("p=20, border 2px, rounded 2px")),
    SEPARATOR_10PX,
    div()
      .p(20)
      .m(20)
      .border(4)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(10)
      .child(text("p=20, m=20, border 4px, rounded 10px")),
    SEPARATOR_10PX,
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

    // TODO: found a bug in flexbox layouts. we're not taking into account the
    // size of the items. we should shift them up/down by their size for
    // most cases.

    SEPARATOR_10PX,
    text("justifyContent (horizontal distribution)").size(16).weight(600),
    SEPARATOR_10PX,

    text("justifyStart").size(14),
    div()
      .flexRow()
      .justifyStart()
      .gap(8)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),
    SEPARATOR_10PX,

    text("justifyCenter").size(14),
    div()
      .flexRow()
      .justifyCenter()
      .gap(8)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),
    SEPARATOR_10PX,

    text("justifyEnd").size(14),
    div()
      .flexRow()
      .justifyEnd()
      .gap(8)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),
    SEPARATOR_10PX,

    text("justifyBetween").size(14),
    div()
      .flexRow()
      .justifyBetween()
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),
    SEPARATOR_10PX,

    text("justifyAround").size(14),
    div()
      .flexRow()
      .justifyAround()
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),
    SEPARATOR_10PX,

    text("justifyEvenly").size(14),
    div()
      .flexRow()
      .justifyEvenly()
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(4)
      .child(flexBox("1"))
      .child(flexBox("2"))
      .child(flexBox("3")),

    // ============ Flexbox: Align Items ============
    SEPARATOR_10PX,
    text("alignItems (cross-axis alignment)").size(16).weight(600),
    SEPARATOR_10PX,

    text("itemsStart").size(14),
    div()
      .flexRow()
      .itemsStart()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(4)
      .child(flexBoxTall("1", 30))
      .child(flexBoxTall("2", 50))
      .child(flexBoxTall("3", 40)),
    SEPARATOR_10PX,

    text("itemsCenter").size(14),
    div()
      .flexRow()
      .itemsCenter()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(4)
      .child(flexBoxTall("1", 30))
      .child(flexBoxTall("2", 50))
      .child(flexBoxTall("3", 40)),
    SEPARATOR_10PX,

    text("itemsEnd").size(14),
    div()
      .flexRow()
      .itemsEnd()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
      .rounded(4)
      .child(flexBoxTall("1", 30))
      .child(flexBoxTall("2", 50))
      .child(flexBoxTall("3", 40)),
    SEPARATOR_10PX,

    text("itemsStretch").size(14),
    div()
      .flexRow()
      .itemsStretch()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
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
    SEPARATOR_10PX,

    text("itemsBaseline").size(14),
    div()
      .flexRow()
      .itemsBaseline()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
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
    SEPARATOR_10PX,
    text("alignSelf (individual item alignment)").size(16).weight(600),
    SEPARATOR_10PX,

    text("selfStart, selfCenter, selfEnd, selfStretch").size(14),
    div()
      .flexRow()
      .itemsStretch()
      .gap(8)
      .h(100)
      .border(2)
      .borderColor(colors.gray.x700)
      .bg(cx.getTheme().surfaceMuted)
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
