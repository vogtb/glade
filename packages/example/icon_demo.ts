import { div, divider, icon, text } from "@glade/flash";
import { colors } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";

const iconNames = [
  "check",
  "close",
  "menu",
  "arrowRight",
  "arrowLeft",
  "arrowUp",
  "arrowDown",
  "plus",
  "minus",
  "search",
  "settings",
  "home",
  "star",
  "starOutline",
  "heart",
  "edit",
  "trash",
  "copy",
  "folder",
  "file",
  "refresh",
  "download",
  "upload",
  "info",
  "warning",
  "error",
] as const;

export const ICON_DEMO: Demo = {
  name: "Icon",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Icon").size(32),
    text("Simple icon component wrapping SVG icons").size(16),
    divider().color(colors.gray.x500),

    // Icon grid
    text("Available Icons").size(18),
    div()
      .flex()
      .flexWrap()
      .gap(12)
      .p(16)
      .rounded(8)
      .children(
        ...iconNames.map((name) =>
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .p(8)
            .w(80)
            .rounded(6)
            .children(icon(name), text(name).size(10))
        )
      ),

    // Sizes
    text("Icon Sizes").size(18),
    div()
      .flex()
      .flexRow()
      .gap(24)
      .p(16)
      .itemsEnd()
      .rounded(8)
      .children(
        div()
          .flex()
          .flexCol()
          .gap(4)
          .itemsCenter()
          .children(icon("star", 16), text("16px").size(11)),
        div()
          .flex()
          .flexCol()
          .gap(4)
          .itemsCenter()
          .children(icon("star", 24), text("24px").size(11)),
        div()
          .flex()
          .flexCol()
          .gap(4)
          .itemsCenter()
          .children(icon("star", 32), text("32px").size(11)),
        div()
          .flex()
          .flexCol()
          .gap(4)
          .itemsCenter()
          .children(icon("star", 48), text("48px").size(11))
      ),

    // Colors
    text("Icon Colors").size(18),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .p(16)
      .rounded(8)
      .children(
        icon("heart", 32).color(colors.red.x500),
        icon("check", 32).color(colors.green.x500),
        icon("info", 32).color(colors.blue.x500),
        icon("warning", 32).color(colors.yellow.x500),
        icon("star", 32).color(colors.pink.x500),
        icon("settings", 32).color(colors.cyan.x500)
      ),

    // Usage in buttons
    text("Icons in Buttons").size(18),
    div()
      .flex()
      .flexRow()
      .gap(12)
      .p(16)
      .rounded(8)
      .children(
        div()
          .flex()
          .flexRow()
          .gap(8)
          .itemsCenter()
          .px(16)
          .py(8)
          .bg(colors.blue.x600)
          .rounded(6)
          .cursorPointer()
          .children(
            icon("download", 18).color(colors.white.default),
            text("Download").size(14).color(colors.white.default)
          ),
        div()
          .flex()
          .flexRow()
          .gap(8)
          .itemsCenter()
          .px(16)
          .py(8)
          .bg(colors.green.x600)
          .rounded(6)
          .cursorPointer()
          .children(
            icon("check", 18).color(colors.white.default),
            text("Confirm").size(14).color(colors.white.default)
          ),
        div()
          .flex()
          .flexRow()
          .gap(8)
          .itemsCenter()
          .px(16)
          .py(8)
          .bg(colors.red.x600)
          .rounded(6)
          .cursorPointer()
          .children(
            icon("trash", 18).color(colors.white.default),
            text("Delete").size(14).color(colors.white.default)
          )
      ),
  ],
};
