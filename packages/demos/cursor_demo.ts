import { type CursorStyle, div, separator, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const CURSOR_DEMO: Demo = {
  name: "Cursor",
  renderElement: (cx, _state): DemoItem[] => {
    const theme = cx.getTheme();

    const cursorBox = (cursorType: CursorStyle, label: string) =>
      div()
        .w(120)
        .h(80)
        .bg(theme.semantic.surface.muted)
        .border(1)
        .borderColor(theme.semantic.border.default)
        .rounded(8)
        .flex()
        .flexCol()
        .itemsCenter()
        .justifyCenter()
        .gap(8)
        .cursor(cursorType)
        .children(text(label).weight(500), text(cursorType).color(theme.semantic.text.muted));

    return [
      text("Cursor styles change the mouse pointer when hovering over elements"),
      separator(),

      text("Available Cursor Styles"),
      text("Hover over each box to see the cursor change"),

      div()
        .flex()
        .flexRow()
        .flexWrap()
        .gap(16)
        .children(
          cursorBox("default", "Default"),
          cursorBox("pointer", "Pointer"),
          cursorBox("text", "Text"),
          cursorBox("grab", "Grab"),
          cursorBox("grabbing", "Grabbing"),
          cursorBox("not-allowed", "Not Allowed"),
          cursorBox("move", "Move")
        ),

      div().h(32),

      text("Common Use Cases"),

      div()
        .flex()
        .flexCol()
        .gap(12)
        .children(
          div()
            .flex()
            .flexRow()
            .gap(16)
            .itemsCenter()
            .children(
              div()
                .px(16)
                .py(10)
                .bg(theme.components.link.foreground)
                .rounded(6)
                .cursor("pointer")
                .child(text("Click Me").color(theme.semantic.window.background)),
              text("Buttons use pointer cursor").color(theme.semantic.text.muted)
            ),

          div()
            .flex()
            .flexRow()
            .gap(16)
            .itemsCenter()
            .children(
              div()
                .px(12)
                .py(8)
                .bg(theme.semantic.surface.muted)
                .border(1)
                .borderColor(theme.semantic.border.default)
                .rounded(4)
                .cursor("text")
                .child(text("Select this text...")),
              text("Text inputs use text cursor").color(theme.semantic.text.muted)
            ),

          div()
            .flex()
            .flexRow()
            .gap(16)
            .itemsCenter()
            .children(
              div()
                .w(100)
                .h(60)
                .bg(theme.semantic.surface.muted)
                .border(1)
                .borderColor(theme.semantic.border.default)
                .rounded(4)
                .flex()
                .itemsCenter()
                .justifyCenter()
                .cursor("grab")
                .child(text("Drag me")),
              text("Draggable items use grab cursor").color(theme.semantic.text.muted)
            ),

          div()
            .flex()
            .flexRow()
            .gap(16)
            .itemsCenter()
            .children(
              div()
                .px(16)
                .py(10)
                .bg(theme.semantic.surface.muted)
                .rounded(6)
                .cursor("not-allowed")
                .opacity(0.5)
                .child(text("Disabled").color(theme.semantic.text.muted)),
              text("Disabled elements use not-allowed cursor").color(theme.semantic.text.muted)
            )
        ),

      div().pt(200),
    ];
  },
};
