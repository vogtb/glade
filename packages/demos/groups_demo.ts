import { colors, div, type GladeDiv, rgb, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

function groupButton(
  label: string,
  groupName: string,
  baseColor: number,
  hoverColor: number,
  activeColor: number
): GladeDiv {
  return div()
    .w(80)
    .h(44)
    .bg(rgb(baseColor))
    .rounded(8)
    .border(2)
    .borderColor(colors.black.x600)
    .cursorPointer()
    .group(groupName)
    .groupHover(groupName, (s) => s.bg(rgb(hoverColor)).borderColor(colors.indigo.x500))
    .groupActive(groupName, (s) => s.bg(rgb(activeColor)).borderColor(colors.indigo.x300))
    .hover((s) => s.bg(rgb(hoverColor)).borderColor(colors.indigo.x400).shadow("md"))
    .active((s) => s.bg(rgb(activeColor)).borderColor(colors.indigo.x200))
    .flex()
    .itemsCenter()
    .justifyCenter()
    .child(text(label).size(13).color(colors.white.default));
}

export const GROUPS_DEMO: Demo = {
  name: "Groups",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Coordinated hover and active effects across related elements"),
    div().p(10),
    text("Hover or click any button in a group to see coordinated effects"),
    div().p(10),
    div()
      .flex()
      .flexRow()
      .gap(12)
      .itemsCenter()
      .children(
        text("Group A:").size(13),
        groupButton("One", "group-a", 0x3730a3, 0x4338ca, 0x6366f1),
        groupButton("Two", "group-a", 0x3730a3, 0x4338ca, 0x6366f1),
        groupButton("Three", "group-a", 0x3730a3, 0x4338ca, 0x6366f1)
      ),
    div().p(10),
    div()
      .flex()
      .flexRow()
      .gap(12)
      .itemsCenter()
      .children(
        text("Group B:").size(13),
        groupButton("Alpha", "group-b", 0x166534, 0x15803d, 0x22c55e),
        groupButton("Beta", "group-b", 0x166534, 0x15803d, 0x22c55e),
        groupButton("Gamma", "group-b", 0x166534, 0x15803d, 0x22c55e)
      ),
    div().p(10),
    div()
      .flex()
      .flexRow()
      .gap(12)
      .itemsCenter()
      .children(
        text("Group C:").size(13),
        groupButton("Red", "group-c", 0x991b1b, 0xb91c1c, 0xef4444),
        groupButton("Green", "group-c", 0x166534, 0x15803d, 0x22c55e),
        groupButton("Blue", "group-c", 0x1e40af, 0x1d4ed8, 0x3b82f6)
      ),
  ],
};
