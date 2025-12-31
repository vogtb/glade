import { div, text } from "@glade/flash";
import { colors, rgb } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const TEXT_DEMO: Demo = {
  name: "Text",
  renderElement: (_cx, _state): DemoItem[] => [
    text("GPU-accelerated text rendering with cosmic-text shaping").size(16),
    SPACER_10PX,
    text("The quick brown fox jumps over the lazy dog.").size(14),
    text("ABCDEFGHIJKLMNOPQRSTUVWXYZ").size(14),
    text("abcdefghijklmnopqrstuvwxyz").size(14),
    text("0123456789 !@#$%^&*()_+-=[]{}|;':\",./<>?").size(14),
    SPACER_10PX,
    ...[
      "Humongous Apple",
      "41 Sunset Avenue",
      "Gorilla Lake",
      "We Found River Man!",
      "The 100th Lunch",
    ].map((t) => text(t).size(36).lineHeight(48)),
    SPACER_10PX,
    ...[55, 44, 33, 28, 26, 24, 22, 16, 14, 12, 11, 10, 8].map((size) =>
      div().child(text(`Font Size ${size}`).size(size))
    ),
    SPACER_10PX,
    ...[55, 44, 33, 28, 26, 24, 22, 16, 14, 12].map((height) =>
      div().child(text(`Line Height ${height} (14px)`).size(14).lineHeight(height))
    ),
    SPACER_10PX,
    ...[100, 200, 300, 400, 500, 600, 700, 800].map((weight) =>
      div().child(text(`Font Weight ${weight}`).size(22).weight(weight))
    ),
    SPACER_10PX,
    text("It does colors too!").size(16),
    div(),
    ...[
      colors.red.default,
      colors.amber.default,
      colors.yellow.default,
      colors.green.default,
      colors.blue.default,
      colors.purple.default,
      colors.cyan.default,
      colors.emerald.default,
      colors.fuchsia.default,
      colors.violet.default,
      colors.teal.default,
    ].map((color) =>
      div().child(
        text(`Font Color #${color.toString(16).padStart(6, "0")}`)
          .size(22)
          .color(color)
      )
    ),
    SPACER_10PX,
    ...[1, 0.9, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1].map((alpha) =>
      div().child(
        text(`Font Opacity ${alpha}`)
          .size(22)
          .color({ ...rgb(colors.white.default), a: alpha })
      )
    ),
    div(),
    div(),
  ],
};
