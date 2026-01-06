import { colors, div, rgb, text } from "@glade/glade";

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
    div().p(10),
    text("Font fallback. 🐠 When no glyph exists for a font, we fallback to other fonts. 🐠"),
    div().p(10),
    text("The quick brown fox jumps over the lazy dog."),
    text("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
    text("abcdefghijklmnopqrstuvwxyz"),
    text("0123456789 !@#$%^&*()_+-=[]{}|;':\",./<>?"),
    div().p(10),
    ...DEMO_SENTENCES.map((t) => text(t.value).size(36).lineHeight(48)),
    div().p(10),
    ...[55, 44, 33, 28, 26, 24, 22, 16, 14, 12, 11, 10, 8].map((size) =>
      div().child(text(`Font Size ${size}`).size(size))
    ),
    div().p(10),
    ...[55, 44, 33, 28, 26, 24, 22, 16, 14, 12].map((height) =>
      div().child(text(`Line Height ${height} (14px)`).lineHeight(height))
    ),
    div().p(10),
    ...[100, 200, 300, 400, 500, 600, 700, 800].map((weight) =>
      div().child(text(`Font Weight ${weight}`).size(22).weight(weight))
    ),
    div().p(10),
    text("Normal style text").size(22),
    text("Italic style text").size(22).italic(),
    text("Bold italic text").size(22).weight(700).italic(),
    ...[100, 200, 300, 400, 500, 600, 700, 800].map((weight) =>
      div().child(text(`Italic Weight ${weight}`).size(22).weight(weight).italic())
    ),
    div().p(10),
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
    div().p(10),
    ...[1, 0.9, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1].map((alpha) =>
      div().child(
        text(`Font Opacity ${alpha}`)
          .size(22)
          .color({ ...rgb(colors.white.default), a: alpha })
      )
    ),
    div().p(10),
    ...DEMO_SENTENCES.map((s) => div().pb(30).child(text(s.value).weight(s.weight).size(72))),
  ],
};
