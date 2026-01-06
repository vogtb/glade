import { div, icon, separator, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const TOOLTIP_DEMO: Demo = {
  name: "Tooltip",
  renderElement: (cx, _state): DemoItem[] => {
    const theme = cx.getTheme();

    // Helper to create a styled tooltip container
    const tooltipBox = (content: string) =>
      div()
        .px(8)
        .py(4)
        .bg(theme.semantic.surface.muted)
        .border(1)
        .borderColor(theme.semantic.border.default)
        .rounded(4)
        .child(text(content).size(12));

    return [
      text("Tooltips provide additional information on hover"),
      separator(),

      // Basic Tooltip
      text("Basic Tooltip"),
      text("Hover over the element to see a tooltip"),
      div()
        .flex()
        .flexRow()
        .gap(16)
        .children(
          div()
            .px(16)
            .py(10)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(() => tooltipBox("This is a basic tooltip"))
            .child(text("Hover me")),

          div()
            .px(16)
            .py(10)
            .bg(theme.components.link.foreground)
            .rounded(6)
            .cursorPointer()
            .tooltip(() => tooltipBox("Button tooltip"))
            .child(text("Button with tooltip").color(theme.semantic.window.background))
        ),

      // Tooltip Positions
      text("Tooltip Positions"),
      text("Tooltips can be positioned on different sides"),
      div()
        .flex()
        .flexRow()
        .gap(16)
        .flexWrap()
        .children(
          div()
            .px(16)
            .py(10)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(
              () => tooltipBox("Tooltip on top"),
              (cfg) => cfg.position("top")
            )
            .child(text("Top")),

          div()
            .px(16)
            .py(10)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(
              () => tooltipBox("Tooltip on bottom"),
              (cfg) => cfg.position("bottom")
            )
            .child(text("Bottom")),

          div()
            .px(16)
            .py(10)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(
              () => tooltipBox("Tooltip on left"),
              (cfg) => cfg.position("left")
            )
            .child(text("Left")),

          div()
            .px(16)
            .py(10)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(
              () => tooltipBox("Tooltip on right"),
              (cfg) => cfg.position("right")
            )
            .child(text("Right")),

          div()
            .px(16)
            .py(10)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(
              () => tooltipBox("Follows cursor"),
              (cfg) => cfg.position("cursor")
            )
            .child(text("Cursor"))
        ),

      // Custom Delay
      text("Custom Delay"),
      text("Tooltips can have custom show/hide delays"),
      div()
        .flex()
        .flexRow()
        .gap(16)
        .children(
          div()
            .px(16)
            .py(10)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(
              () => tooltipBox("Instant tooltip"),
              (cfg) => cfg.delay(0)
            )
            .child(text("No delay")),

          div()
            .px(16)
            .py(10)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(
              () => tooltipBox("Slow tooltip"),
              (cfg) => cfg.delay(1000)
            )
            .child(text("1 second delay"))
        ),

      // Rich Tooltips
      text("Rich Tooltips"),
      text("Tooltips can contain complex content"),
      div()
        .flex()
        .flexRow()
        .gap(16)
        .children(
          div()
            .px(16)
            .py(10)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(() =>
              div()
                .px(8)
                .py(6)
                .bg(theme.semantic.surface.muted)
                .border(1)
                .borderColor(theme.semantic.border.default)
                .rounded(4)
                .flex()
                .flexCol()
                .gap(2)
                .children(
                  text("Save File").weight(600).size(12),
                  text("Cmd+S").size(11).color(theme.semantic.text.muted)
                )
            )
            .child(text("With shortcut")),

          div()
            .px(16)
            .py(10)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(() =>
              div()
                .px(8)
                .py(6)
                .bg(theme.semantic.surface.muted)
                .border(1)
                .borderColor(theme.semantic.border.default)
                .rounded(4)
                .flex()
                .flexRow()
                .gap(6)
                .itemsCenter()
                .children(
                  icon("info", 12).color(theme.components.link.foreground),
                  text("Information tooltip").size(12)
                )
            )
            .child(text("With icon"))
        ),

      // Icon Tooltips
      text("Icon Tooltips"),
      text("Common use case for tooltips on icon buttons"),
      div()
        .flex()
        .flexRow()
        .gap(8)
        .children(
          div()
            .p(8)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(() => tooltipBox("Home"))
            .child(icon("home", 20)),

          div()
            .p(8)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(() => tooltipBox("Settings"))
            .child(icon("settings", 20)),

          div()
            .p(8)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(() => tooltipBox("Search"))
            .child(icon("search", 20)),

          div()
            .p(8)
            .bg(theme.semantic.surface.muted)
            .rounded(6)
            .cursorPointer()
            .tooltip(() => tooltipBox("Info"))
            .child(icon("info", 20))
        ),

      div().pt(200),
    ];
  },
};
