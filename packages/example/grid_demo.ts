import { div, text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";
import { colors } from "@glade/utils";

export const GRID_DEMO: Demo = {
  name: "Grid",
  renderElement: (_cx, _state): DemoItem[] => {
    return [
      text("Taffy-powered CSS Grid with Tailwind-like API").font("Inter").size(16),

      // Example 1: Simple 3-column grid
      SPACER_10PX,
      text("Simple 3-Column Grid").font("Inter").size(18),
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
            .child(text("1").font("Inter").size(16)),
          div()
            .h(60)
            .rounded(8)
            .bg(colors.green.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("2").font("Inter").size(16)),
          div()
            .h(60)
            .rounded(8)
            .bg(colors.blue.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("3").font("Inter").size(16)),
          div()
            .h(60)
            .rounded(8)
            .bg(colors.purple.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("4").font("Inter").size(16)),
          div()
            .h(60)
            .rounded(8)
            .bg(colors.orange.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("5").font("Inter").size(16)),
          div()
            .h(60)
            .rounded(8)
            .bg(colors.teal.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("6").font("Inter").size(16))
        ),

      // Example 2: Column spans
      SPACER_10PX,
      text("Column Spans").font("Inter").size(18),
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
            .child(text("Full Width (colSpanFull)").font("Inter").size(14)),
          div()
            .colSpan(2)
            .h(50)
            .rounded(8)
            .bg(colors.blue.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("Span 2").font("Inter").size(14)),
          div()
            .h(50)
            .rounded(8)
            .bg(colors.green.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("1").font("Inter").size(14)),
          div()
            .h(50)
            .rounded(8)
            .bg(colors.orange.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("1").font("Inter").size(14)),
          div()
            .colSpan(2)
            .h(50)
            .rounded(8)
            .bg(colors.purple.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("Span 2").font("Inter").size(14))
        ),

      // Example 3: 4-column grid with varied content
      SPACER_10PX,
      text("4-Column Responsive Grid").font("Inter").size(18),
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
            .child(text("A").font("Inter").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.green.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("B").font("Inter").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.blue.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("C").font("Inter").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.purple.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("D").font("Inter").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.orange.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("E").font("Inter").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.teal.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("F").font("Inter").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.pink.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("G").font("Inter").size(20).weight(700)),
          div()
            .h(80)
            .rounded(8)
            .bg(colors.yellow.x500)
            .itemsCenter()
            .justifyCenter()
            .child(text("H").font("Inter").size(20).weight(700))
        ),

      // Example 4: Grid area placement
      SPACER_10PX,
      text("Explicit Grid Placement").font("Inter").size(18),
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
                .child(text("Feature (2x2)").font("Inter").size(14)),
              div()
                .gridCell(3, 1)
                .rounded(8)
                .bg(colors.green.x500)
                .itemsCenter()
                .justifyCenter()
                .child(text("A").font("Inter").size(14)),
              div()
                .gridCell(4, 1)
                .rounded(8)
                .bg(colors.orange.x500)
                .itemsCenter()
                .justifyCenter()
                .child(text("B").font("Inter").size(14)),
              div()
                .gridCell(3, 2)
                .rounded(8)
                .bg(colors.purple.x500)
                .itemsCenter()
                .justifyCenter()
                .child(text("C").font("Inter").size(14)),
              div()
                .gridCell(4, 2)
                .rounded(8)
                .bg(colors.pink.x500)
                .itemsCenter()
                .justifyCenter()
                .child(text("D").font("Inter").size(14)),
              div()
                .colSpanFull()
                .rounded(8)
                .bg(colors.slate.x600)
                .itemsCenter()
                .justifyCenter()
                .child(text("Bottom Bar (row 3)").font("Inter").size(14))
            )
        ),
    ];
  },
};
