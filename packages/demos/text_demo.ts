import { div, text } from "@glade/glade";
import { colors, rgb } from "@glade/utils";

import { SPACER_10PX } from "./common";
import type { Demo, DemoItem } from "./demo";

const DEMO_SENTENCES = [
  {
    value: "Humongous Apple",
    weight: 600,
  },
  {
    value: "41 Sunset Avenue",
    weight: 400,
  },
  {
    value: "Parts Per Billion",
    weight: 800,
  },
  {
    value: "We Found River Man!",
    weight: 100,
  },
  {
    value: "Terraform Dust",
    weight: 400,
  },
  {
    value: "The 100th Lunch",
    weight: 600,
  },
  {
    value: "Silhouette Ford",
    weight: 200,
  },
  {
    value: "Part Chandelier",
    weight: 700,
  },
  {
    value: "Sphinx Lightly",
    weight: 800,
  },
  {
    value: "Fjord Inspection",
    weight: 200,
  },

  {
    value: "Regolith Storm",
    weight: 700,
  },
  {
    value: "Transnational Soletta",
    weight: 900,
  },
];

export const TEXT_DEMO: Demo = {
  name: "Text",
  renderElement: (_cx, _state): DemoItem[] => [
    text("GPU-accelerated text rendering with cosmic-text shaping"),
    SPACER_10PX,
    text("Font fallback. 🐠 When no glyph exists for a font, we fallback to other fonts. 🐠"),
    SPACER_10PX,
    text("The quick brown fox jumps over the lazy dog."),
    text("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
    text("abcdefghijklmnopqrstuvwxyz"),
    text("0123456789 !@#$%^&*()_+-=[]{}|;':\",./<>?"),
    SPACER_10PX,
    ...DEMO_SENTENCES.map((t) => text(t.value).size(36).lineHeight(48)),
    SPACER_10PX,
    ...[55, 44, 33, 28, 26, 24, 22, 16, 14, 12, 11, 10, 8].map((size) =>
      div().child(text(`Font Size ${size}`).size(size))
    ),
    SPACER_10PX,
    ...[55, 44, 33, 28, 26, 24, 22, 16, 14, 12].map((height) =>
      div().child(text(`Line Height ${height} (14px)`).lineHeight(height))
    ),
    SPACER_10PX,
    ...[100, 200, 300, 400, 500, 600, 700, 800].map((weight) =>
      div().child(text(`Font Weight ${weight}`).size(22).weight(weight))
    ),
    SPACER_10PX,
    text("Normal style text").size(22),
    text("Italic style text").size(22).italic(),
    text("Bold italic text").size(22).weight(700).italic(),
    ...[100, 200, 300, 400, 500, 600, 700, 800].map((weight) =>
      div().child(text(`Italic Weight ${weight}`).size(22).weight(weight).italic())
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
    SPACER_10PX,
    ...DEMO_SENTENCES.map((s) => div().pb(30).child(text(s.value).weight(s.weight).size(72))),
  ],
};
