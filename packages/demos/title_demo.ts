import { button, div, divider, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const TITLE_DEMO: Demo = {
  name: "Title",
  renderElement: (cx, _state): DemoItem[] => {
    const theme = cx.getTheme();
    const window = cx.window;
    const setTitle = (title: string) => window.setTitle(title);

    return [
      text("Change the window title dynamically"),
      divider().color(theme.semantic.border.default),

      text("Click a button to change the window title"),

      div()
        .flex()
        .flexRow()
        .flexWrap()
        .gap(12)
        .children(
          button("Glade Demo").onClick(() => setTitle("Glade Demo")),
          button("Hello World").onClick(() => setTitle("Hello World")),
          button("My Application").onClick(() => setTitle("My Application")),
          button("Custom Title")
            .secondary()
            .onClick(() => setTitle("Custom Title - Glade"))
        ),

      div().h(16),

      text("Use Cases").weight(600),
      div()
        .flex()
        .flexCol()
        .gap(8)
        .pl(16)
        .children(
          text("Show document name in title bar"),
          text("Indicate unsaved changes with an asterisk"),
          text("Display current view or section"),
          text("Show notification counts")
        ),

      div().h(16),

      text("Example: Document Editing"),
      div()
        .flex()
        .flexRow()
        .gap(12)
        .children(
          button("Untitled.txt")
            .outline()
            .onClick(() => setTitle("Untitled.txt - Editor")),
          button("* Modified")
            .outline()
            .onClick(() => setTitle("* Untitled.txt - Editor")),
          button("Saved")
            .outline()
            .onClick(() => setTitle("Untitled.txt - Editor"))
        ),
    ];
  },
};
