import { div, text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { colors } from "@glade/utils";

export const MULTI_SELECTION_DEMO: Demo = {
  name: "Multi Selection",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Select text across multiple paragraphs by clicking and dragging.").size(16),
    div()
      .flex()
      .flexCol()
      .gap(16)
      .bg(colors.black.x800)
      .rounded(4)
      .p(20)
      .border(1)
      .borderColor(colors.gray.x700)
      .children(
        text(
          "First paragraph: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        )
          .size(16)
          .lineHeight(24)
          .selectable(),
        text(
          "Second paragraph: Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
        )
          .size(16)
          .lineHeight(24)
          .selectable(),
        text(
          "Third paragraph: Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."
        )
          .size(16)
          .lineHeight(24)
          .selectable(),
        text("Non-selectable text (should be skipped in selection).").size(16).lineHeight(24),
        text(
          "Fourth paragraph: Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
        )
          .size(16)
          .lineHeight(24)
          .selectable(),
        text(
          "Fifth paragraph: Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores."
        )
          .size(16)
          .lineHeight(24)
          .selectable()
      ),
    div()
      .flex()
      .flexCol()
      .gap(8)
      .bg(colors.black.x700)
      .rounded(10)
      .p(14)
      .border(1)
      .borderColor(colors.gray.x700)
      .children(
        text("Try:").size(14).weight(600),
        text("- Click and drag to select text across paragraphs").size(13),
        text("- Cmd+C to copy selected text to clipboard").size(13),
        text("- Cmd+A to select all text in all selectable elements").size(13),
        text("- Notice non-selectable text is skipped").size(13),
        text("- Selected text is joined with newlines when copied").size(13)
      ),
  ],
};
