import { colors, div, divider, icon, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const DEBUG_MODE_DEMO: Demo = {
  name: "Debug Mode",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Debug Mode / Inspector").size(32),
    text("Visual debugging tools for inspecting elements").size(16),
    divider().color(colors.gray.x500),

    // Activation
    text("Activation").size(18),
    div()
      .flex()
      .flexRow()
      .gap(12)
      .p(16)
      .bg(colors.gray.x800)
      .rounded(8)
      .children(
        div()
          .flex()
          .flexRow()
          .gap(8)
          .itemsCenter()
          .children(
            div()
              .w(32)
              .h(32)
              .flex()
              .justifyCenter()
              .itemsCenter()
              .bg(colors.gray.x700)
              .rounded(6)
              .border(1)
              .borderColor(colors.gray.x600)
              .children(text("I").color(colors.white.default)),
            text("Press 'I' to toggle inspector mode")
          )
      ),

    // Features
    text("Features").size(18),
    div()
      .flex()
      .flexCol()
      .gap(8)
      .p(16)
      .bg(colors.gray.x800)
      .rounded(8)
      .children(
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            icon("check", 18).color(colors.green.x500),
            text("Element bounds visualization with colored outlines")
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            icon("check", 18).color(colors.green.x500),
            text("Element selection for inspection (click to select)")
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            icon("check", 18).color(colors.green.x500),
            text("Hover highlighting with element info tooltips")
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            icon("check", 18).color(colors.green.x500),
            text("Element tree navigation and bounds display")
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            icon("check", 18).color(colors.green.x500),
            text("Computed styles display for selected elements")
          )
      ),

    // Inspector Colors
    text("Inspector Colors").size(18),
    div()
      .flex()
      .flexCol()
      .gap(8)
      .p(16)
      .bg(colors.gray.x800)
      .rounded(8)
      .children(
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            div().w(24).h(24).rounded(4).bg({ r: 0.2, g: 0.6, b: 1.0, a: 0.8 }),
            text("Bounds - Default element outline")
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            div().w(24).h(24).rounded(4).bg({ r: 1.0, g: 0.4, b: 0.2, a: 0.9 }),
            text("Hover - Highlighted when hovering")
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            div().w(24).h(24).rounded(4).bg({ r: 0.2, g: 1.0, b: 0.4, a: 1.0 }),
            text("Selected - Currently selected element")
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            div().w(24).h(24).rounded(4).bg({ r: 0.2, g: 0.8, b: 0.4, a: 0.3 }),
            text("Padding - Padding visualization")
          ),
        div()
          .flex()
          .flexRow()
          .gap(12)
          .itemsCenter()
          .children(
            div().w(24).h(24).rounded(4).bg({ r: 1.0, g: 0.6, b: 0.2, a: 0.3 }),
            text("Margin - Margin visualization")
          )
      ),

    // Sample Elements
    text("Sample Elements to Inspect").size(18),
    div()
      .flex()
      .flexWrap()
      .gap(16)
      .p(16)
      .bg(colors.gray.x800)
      .rounded(8)
      .children(
        div()
          .flex()
          .flexCol()
          .gap(8)
          .p(16)
          .bg(colors.blue.x700)
          .rounded(8)
          .debugLabel("Blue Container")
          .children(
            text("Container A").color(colors.white.default),
            div()
              .p(8)
              .bg(colors.blue.x500)
              .rounded(4)
              .debugLabel("Nested Child")
              .children(text("Nested child").size(12).color(colors.white.default))
          ),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .p(16)
          .bg(colors.green.x700)
          .rounded(8)
          .debugLabel("Green Container")
          .children(
            text("Container B").color(colors.white.default),
            div()
              .flex()
              .flexRow()
              .gap(4)
              .debugLabel("Button Row")
              .children(
                div()
                  .px(8)
                  .py(4)
                  .bg(colors.green.x500)
                  .rounded(4)
                  .children(text("Btn 1").size(11).color(colors.white.default)),
                div()
                  .px(8)
                  .py(4)
                  .bg(colors.green.x500)
                  .rounded(4)
                  .children(text("Btn 2").size(11).color(colors.white.default))
              )
          ),
        div()
          .flex()
          .flexCol()
          .gap(8)
          .p(16)
          .m(8)
          .bg(colors.purple.x700)
          .rounded(8)
          .debugLabel("Purple Container with Margin")
          .children(
            text("Container C").color(colors.white.default),
            text("Has margin").size(12).color(colors.purple.x200)
          )
      ),

    // Usage Tips
    text("Usage Tips").size(18),
    div()
      .flex()
      .flexCol()
      .gap(8)
      .p(16)
      .bg(colors.gray.x800)
      .rounded(8)
      .children(
        text("1. Press 'I' to enable the inspector overlay"),
        text("2. Hover over elements to see their bounds highlighted"),
        text("3. Click an element to select it and view details"),
        text("4. Use .debugLabel('name') on elements for easier identification"),
        text("5. Press 'I' again to disable inspector mode")
      ),
  ],
};
