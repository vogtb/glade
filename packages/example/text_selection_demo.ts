import { div, text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";

export const TEXT_SELECTION_DEMO: Demo = {
  name: "Text Selection",
  renderElement: (_cx, _state): DemoItem[] => {
    return [
      text("Standard selectable text and cross-element selection in one view.").size(16),
      div()
        .flex()
        .flexCol()
        .children(
          text(
            [
              "Click and drag to select inside this paragraph.",
              "Double-click selects words; triple-click selects the full line.",
              "Even if text is wrapped, you can still select multiple lines.",
            ].join(" ")
          )
            .size(14)
            .lineHeight(22)
            .selectable()
        ),
    ];
  },
};
