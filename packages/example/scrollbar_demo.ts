import { div, text } from "@glade/flash";
import { colors } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

const sampleItems = Array.from({ length: 30 }, (_, i) => `Item ${i + 1}: Sample content line`);

export const SCROLLBAR_DEMO: Demo = {
  name: "Scrollbars",
  renderElement: (_cx, state): DemoItem[] => [
    text("Draggable scrollbars with visual scroll position indication").size(16),
    SPACER_10PX,
    text("Interactions:").size(14),
    text("- Scroll with mouse wheel or trackpad").size(12),
    text("- Drag the scrollbar thumb to scroll").size(12),
    text("- Click the track to jump to that position").size(12),
    text("- Hover over scrollbar for highlight effect").size(12),
    SPACER_10PX,
    div()
      .flex()
      .flexRow()
      .gap(24)
      .children(
        div()
          .flex()
          .flexCol()
          .gap(8)
          .children(
            text("Default (Auto)").size(14),
            text("Scrollbar appears when content overflows").size(12),
            div()
              .w(220)
              .h(200)
              .bg(colors.black.x900)
              .rounded(8)
              .border(1)
              .borderColor(colors.black.x700)
              .overflowAuto()
              .trackScroll(state.scrollbarHandle1!)
              .p(8)
              .flex()
              .flexCol()
              .gap(4)
              .children(
                ...sampleItems.map((item) =>
                  div().h(20).flexShrink0().child(text(item).size(12).color(colors.black.x300))
                )
              )
          ),

        div()
          .flex()
          .flexCol()
          .gap(8)
          .children(
            text("Always Visible").size(14),
            text("Scrollbar is always shown").size(12),
            div()
              .w(220)
              .h(200)
              .bg(colors.black.x900)
              .rounded(8)
              .border(1)
              .borderColor(colors.black.x700)
              .overflowScroll()
              .trackScroll(state.scrollbarHandle2!)
              .scrollbarAlways()
              .p(8)
              .flex()
              .flexCol()
              .gap(4)
              .children(
                ...sampleItems.map((item) =>
                  div().h(20).flexShrink0().child(text(item).size(12).color(colors.black.x300))
                )
              )
          ),

        div()
          .flex()
          .flexCol()
          .gap(8)
          .children(
            text("Custom Style").size(14),
            text("Custom colors and width").size(12),
            div()
              .w(220)
              .h(200)
              .bg(colors.black.x900)
              .rounded(8)
              .border(1)
              .borderColor(colors.black.x700)
              .overflowAuto()
              .trackScroll(state.scrollbarHandle3!)
              .scrollbar({
                width: 12,
                thumbColor: { r: 0.4, g: 0.6, b: 0.9, a: 0.8 },
                thumbHoverColor: { r: 0.5, g: 0.7, b: 1, a: 0.9 },
                thumbActiveColor: { r: 0.6, g: 0.8, b: 1, a: 1 },
                trackColor: { r: 0.15, g: 0.15, b: 0.2, a: 0.5 },
              })
              .scrollbarAlways()
              .p(8)
              .flex()
              .flexCol()
              .gap(4)
              .children(
                ...sampleItems.map((item) =>
                  div().h(20).flexShrink0().child(text(item).size(12).color(colors.black.x300))
                )
              )
          )
      ),
  ],
};
