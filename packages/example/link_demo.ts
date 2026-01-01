import { div, divider, link, text } from "@glade/flash";
import { colors } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";

export const LINK_DEMO: Demo = {
  name: "Link",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Link").size(32),
    text("Clickable text links that open URLs in the browser").size(16),
    divider().color(colors.gray.x500),

    // Basic links
    text("Basic Links").size(18),
    div()
      .flex()
      .flexCol()
      .gap(12)
      .p(16)
      .rounded(8)
      .children(
        link("Visit GitHub", "https://github.com"),
        link("Anthropic Homepage", "https://anthropic.com"),
        link("TypeScript Documentation", "https://www.typescriptlang.org/docs/")
      ),

    // Styled links
    text("Styled Links").size(18),
    div()
      .flex()
      .flexCol()
      .gap(12)
      .p(16)
      .rounded(8)
      .children(
        link("Large Link (18px)", "https://example.com").size(18),
        link("Small Link (12px)", "https://example.com").size(12),
        link("Custom Color", "https://example.com")
          .color(colors.orange.x400)
          .hoverColor(colors.orange.x300),
        link("Green Link", "https://example.com")
          .color(colors.green.x400)
          .hoverColor(colors.green.x300)
      ),

    // Underline variants
    text("Underline Variants").size(18),
    div()
      .flex()
      .flexRow()
      .gap(8)
      .itemsCenter()
      .children(
        text("Default (underline on hover):").size(13),
        link("Hover me", "https://example.com")
      ),
    div()
      .flex()
      .flexRow()
      .gap(8)
      .itemsCenter()
      .children(
        text("Always underlined:").size(13),
        link("Always underlined", "https://example.com").underline()
      ),
    div()
      .flex()
      .flexRow()
      .gap(8)
      .itemsCenter()
      .children(
        text("Never underlined:").size(13),
        link("No underline", "https://example.com").noUnderline()
      ),

    // Inline links
    text("Inline Links").size(18),
    div()
      .flex()
      .flexRow()
      .flexWrap()
      .gap(4)
      .p(16)
      .rounded(8)
      .itemsBaseline()
      .children(
        text("Check out the").size(14),
        link("documentation", "https://docs.example.com").size(14),
        text("for more information, or visit our").size(14),
        link("GitHub repository", "https://github.com").size(14),
        text("to contribute.").size(14)
      ),
  ],
};
