import { text } from "@glade/flash";
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
        .color(theme.text)
        .underlined({ style: "solid", color: theme.primary, thickness: 1 }),
      SPACER_10PX,
      text("Important")
        .size(16)
        .color(theme.text)
        .underlined({ style: "solid", color: theme.success, thickness: 2 }),
      SPACER_10PX,
      text("Speling Error").size(16).color(theme.text).underlined({
        style: "wavy",
        color: theme.danger,
        thickness: 1.5,
        wavelength: 4,
        amplitude: 1.5,
      }),
      SPACER_10PX,
      text("Grammer Issue").size(16).color(theme.text).underlined({
        style: "wavy",
        color: theme.primary,
        thickness: 1.5,
        wavelength: 5,
        amplitude: 1.5,
      }),
      SPACER_10PX,
      text("Larger Text").size(18),
      SPACER_10PX,
      text("Title Text")
        .size(24)
        .color(theme.text)
        .underlined({ style: "solid", color: theme.primary, thickness: 2 }),
      SPACER_10PX,
      text("Code Identifier").font("JetBrains Mono").size(18).color(theme.text).underlined({
        style: "wavy",
        color: theme.warning,
        thickness: 2,
        wavelength: 6,
        amplitude: 2,
      }),
    ];
  },
};
