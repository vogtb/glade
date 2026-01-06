import { div, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const UNDERLINE_DEMO: Demo = {
  name: "Underline",
  renderElement: (cx, _state): DemoItem[] => {
    const theme = cx.getTheme();

    return [
      text("Solid and wavy underlines for text decoration").size(16),
      div().p(10),
      text("Hyperlink")
        .size(16)
        .color(theme.semantic.text.default)
        .underlined({ style: "solid", color: theme.components.link.foreground, thickness: 1 }),
      div().p(10),
      text("Important")
        .size(16)
        .color(theme.semantic.text.default)
        .underlined({ style: "solid", color: theme.semantic.status.success, thickness: 2 }),
      div().p(10),
      text("Speling Error").size(16).color(theme.semantic.text.default).underlined({
        style: "wavy",
        color: theme.semantic.status.danger,
        thickness: 1.5,
        wavelength: 4,
        amplitude: 1.5,
      }),
      div().p(10),
      text("Grammer Issue").size(16).color(theme.semantic.text.default).underlined({
        style: "wavy",
        color: theme.components.link.foreground,
        thickness: 1.5,
        wavelength: 5,
        amplitude: 1.5,
      }),
      div().p(10),
      text("Larger Text").size(18),
      div().p(10),
      text("Title Text")
        .size(24)
        .color(theme.semantic.text.default)
        .underlined({ style: "solid", color: theme.components.link.foreground, thickness: 2 }),
      div().p(10),
      text("Code Identifier")
        .font("JetBrains Mono")
        .size(18)
        .color(theme.semantic.text.default)
        .underlined({
          style: "wavy",
          color: theme.semantic.status.warning,
          thickness: 2,
          wavelength: 6,
          amplitude: 2,
        }),
    ];
  },
};
