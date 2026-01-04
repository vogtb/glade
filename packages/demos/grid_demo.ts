import { colors, div, text } from "@glade/glade";

import { SPACER_10PX } from "./common";
import type { Demo, DemoItem } from "./demo";

export const GRID_DEMO: Demo = {
  name: "Grid",
  renderElement: (_cx, _state): DemoItem[] => {
    return [
      text("Taffy-powered CSS Grid with Tailwind-like API").size(16),

      // Example 1: Simple 3-column grid
      SPACER_10PX,
      text("Simple 3-Column Grid").size(18),
      text(".grid().gridCols(3).gap(8)").font("JetBrains Mono").size(12),
      div()
        .grid()
        .gridCols(3)
        .gap(8)
        .children(
          div()
            .h(60)
            .rounded(8)
            .bg(colors.red.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("1").size(16)),
          div()
            .h(60)
            .rounded(8)
            .bg(colors.green.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("2").size(16)),
          div()
            .h(60)
            .rounded(8)
            .bg(colors.blue.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("3").size(16)),
          div()
            .h(60)
            .rounded(8)
            .bg(colors.purple.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("4").size(16)),
          div()
            .h(60)
            .rounded(8)
            .bg(colors.orange.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("5").size(16)),
          div()
            .h(60)
            .rounded(8)
            .bg(colors.teal.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("6").size(16))
        ),

      // Example 2: Column spans
      SPACER_10PX,
      text("Column Spans").size(18),
      text(".colSpan(2) and .colSpanFull()").font("JetBrains Mono").size(12),
      div()
        .grid()
        .gridCols(3)
        .gap(8)
        .children(
          div()
            .colSpanFull()
            .h(50)
            .rounded(8)
            .bg(colors.pink.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("Full Width (colSpanFull)")),
          div()
            .colSpan(2)
            .h(50)
            .rounded(8)
            .bg(colors.blue.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("Span 2")),
          div()
            .h(50)
            .rounded(8)
            .bg(colors.green.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("1")),
          div()
            .h(50)
            .rounded(8)
            .bg(colors.orange.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("1")),
          div()
            .colSpan(2)
            .h(50)
            .rounded(8)
            .bg(colors.purple.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("Span 2"))
        ),

      // Example 3: 4-column grid with varied content
      SPACER_10PX,
      text("4-Column Responsive Grid").size(18),
      text(".gridCols(4).gap(12)").font("JetBrains Mono").size(12),
      div()
        .grid()
        .gridCols(4)
        .gap(12)
        .children(
          div()
            .h(80)
            .rounded(8)
            .bg(colors.red.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("A").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.green.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("B").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.blue.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("C").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.purple.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("D").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.orange.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("E").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.teal.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("F").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.pink.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("G").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.yellow.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("H").size(20).weight(700))
        ),

      // Example 4: Grid area placement
      SPACER_10PX,
      text("Explicit Grid Placement").size(18),
      text(".gridCell(col, row) and .gridArea()").font("JetBrains Mono").size(12),
      div()
        .h(300)
        .w(300)
        .child(
          div()
            .grid()
            .gridCols(4)
            .gridRows(3)
            .gap(8)
            .h(180)
            .children(
              div()
                .gridArea(1, 1, 3, 3)
                .rounded(8)
                .bg(colors.blue.x500)
                .itemsCenter()
                .justifyCenter()
                .child(text("Feature (2x2)")),
              div()
                .gridCell(3, 1)
                .rounded(8)
                .bg(colors.green.x500)
                .itemsCenter()
                .justifyCenter()
                .child(text("A")),
              div()
                .gridCell(4, 1)
                .rounded(8)
                .bg(colors.orange.x500)
                .itemsCenter()
                .justifyCenter()
                .child(text("B")),
              div()
                .gridCell(3, 2)
                .rounded(8)
                .bg(colors.purple.x500)
                .itemsCenter()
                .justifyCenter()
                .child(text("C")),
              div()
                .gridCell(4, 2)
                .rounded(8)
                .bg(colors.pink.x500)
                .itemsCenter()
                .justifyCenter()
                .child(text("D")),
              div()
                .colSpanFull()
                .rounded(8)
                .bg(colors.slate.x600)
                .itemsCenter()
                .justifyCenter()
                .child(text("Bottom Bar (row 3)"))
            )
        ),
    ];
  },
};
