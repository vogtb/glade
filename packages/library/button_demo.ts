import { button, colors, div, icon, separator, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const BUTTON_DEMO: Demo = {
  name: "Button",
  renderElement: (_cx, _state): DemoItem[] => [
    text("An interactive control that triggers actions when clicked"),
    separator(),

    // Variants
    text("Variants"),
    div()
      .flex()
      .flexRow()
      .flexWrap()
      .gap(12)
      .itemsCenter()
      .children(
        button("Default").primary(),
        button("Secondary").secondary(),
        button("Destructive").destructive(),
        button("Outline").outline(),
        button("Ghost").ghost(),
        button("Link").link()
      ),

    // Sizes
    text("Sizes"),
    div()
      .flex()
      .flexRow()
      .flexWrap()
      .gap(12)
      .itemsCenter()
      .children(
        button("Small").sm(),
        button("Default"),
        button("Large").lg(),
        button().iconSize().ghost().child(icon("close"))
      ),

    // With Icons
    text("With Icons"),
    div()
      .flex()
      .flexRow()
      .flexWrap()
      .gap(12)
      .itemsCenter()
      .children(
        button("Settings").secondary().child(icon("settings")),
        button("Download").child(icon("download")),
        button("Delete").destructive().child(icon("trash"))
      ),

    // Disabled
    text("Disabled"),
    div()
      .flex()
      .flexRow()
      .flexWrap()
      .gap(12)
      .itemsCenter()
      .children(
        button("Disabled Primary").primary().disabled(true),
        button("Disabled Secondary").secondary().disabled(true),
        button("Disabled Outline").outline().disabled(true)
      ),

    // Rounded variants
    text("Rounded"),
    div()
      .flex()
      .flexRow()
      .flexWrap()
      .gap(12)
      .itemsCenter()
      .children(
        button("Default Rounded").rounded(6),
        button("More Rounded").rounded(12),
        button("Pill Shape").roundedFull()
      ),

    // Custom styled
    text("Custom Styled"),
    div()
      .flex()
      .flexRow()
      .flexWrap()
      .gap(12)
      .itemsCenter()
      .children(
        button("Purple").bg(colors.purple.x500).textColor(colors.white.default).rounded(8),
        button("Green").bg(colors.green.x500).textColor(colors.white.default).roundedFull(),
        button("Orange Outline")
          .outline()
          .borderColor(colors.orange.x500)
          .textColor(colors.orange.x500)
      ),
  ],
};
