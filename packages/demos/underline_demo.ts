import { text } from "@glade/glade";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const UNDERLINE_DEMO: Demo = {
  name: "Underline",
  renderElement: (cx, _state): DemoItem[] => {
    const theme = cx.getTheme();

    return [
      text("Solid and wavy underlines for text decoration").size(16),
      SPACER_10PX,
      text("Hyperlink")
        .size(16)
        .color(theme.semantic.text.default)
        .underlined({ style: "solid", color: theme.components.link.foreground, thickness: 1 }),
      SPACER_10PX,
      text("Important")
        .size(16)
        .color(theme.semantic.text.default)
        .underlined({ style: "solid", color: theme.semantic.status.success, thickness: 2 }),
      SPACER_10PX,
      text("Speling Error").size(16).color(theme.semantic.text.default).underlined({
        style: "wavy",
        color: theme.semantic.status.danger,
        thickness: 1.5,
        wavelength: 4,
        amplitude: 1.5,
      }),
      SPACER_10PX,
      text("Grammer Issue").size(16).color(theme.semantic.text.default).underlined({
        style: "wavy",
        color: theme.components.link.foreground,
        thickness: 1.5,
        wavelength: 5,
        amplitude: 1.5,
      }),
      SPACER_10PX,
      text("Larger Text").size(18),
      SPACER_10PX,
      text("Title Text")
        .size(24)
        .color(theme.semantic.text.default)
        .underlined({ style: "solid", color: theme.components.link.foreground, thickness: 2 }),
      SPACER_10PX,
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
