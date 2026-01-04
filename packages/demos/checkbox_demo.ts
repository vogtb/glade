import { checkbox, colors, div, divider, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const CHECKBOX_DEMO: Demo = {
  name: "Checkbox",
  renderElement: (cx, state): DemoItem[] => [
    text("Checkbox").size(32),
    text("A control that allows toggling between checked and unchecked states").size(16),
    divider().color(colors.gray.x500),

    // Basic checkbox
    text("Basic Checkbox").size(18),
    div()
      .flex()
      .flexRow()
      .gap(12)
      .itemsCenter()
      .children(
        checkbox()
          .checked(state.checkboxChecked)
          .onCheckedChange((checked) => {
            state.setCheckboxChecked(checked);
            cx.notify();
          }),
        text("Accept terms and conditions")
      ),

    // Indeterminate checkbox
    text("Indeterminate State").size(18),
    div()
      .flex()
      .flexRow()
      .gap(12)
      .itemsCenter()
      .children(
        checkbox()
          .indeterminate(state.checkboxIndeterminate)
          .checked(!state.checkboxIndeterminate && state.checkboxChecked)
          .onCheckedChange(() => {
            if (state.checkboxIndeterminate) {
              state.setCheckboxIndeterminate(false);
              state.setCheckboxChecked(true);
            } else {
              state.setCheckboxChecked(!state.checkboxChecked);
            }
            cx.notify();
          }),
        text("Select all items (indeterminate when partial)")
      ),
    div()
      .flex()
      .flexRow()
      .gap(8)
      .children(
        div()
          .cursorPointer()
          .px(8)
          .py(4)
          .bg(colors.gray.x700)
          .rounded(4)
          .onClick(() => {
            state.setCheckboxIndeterminate(true);
            cx.notify();
            return { stopPropagation: true };
          })
          .child(text("Set Indeterminate").size(12)),
        div()
          .cursorPointer()
          .px(8)
          .py(4)
          .bg(colors.gray.x700)
          .rounded(4)
          .onClick(() => {
            state.setCheckboxIndeterminate(false);
            state.setCheckboxChecked(false);
            cx.notify();
            return { stopPropagation: true };
          })
          .child(text("Reset").size(12))
      ),

    // Disabled checkbox
    text("Disabled").size(18),
    div()
      .flex()
      .flexRow()
      .gap(12)
      .itemsCenter()
      .children(checkbox().checked(true).disabled(true), text("Disabled (checked)")),

    // Custom styled checkbox
    text("Custom Styled").size(18),
    div()
      .flex()
      .flexRow()
      .gap(12)
      .itemsCenter()
      .children(
        checkbox()
          .size(24)
          .checked(state.checkboxChecked)
          .checkedBg(colors.green.x500)
          .rounded(6)
          .onCheckedChange((checked) => {
            state.setCheckboxChecked(checked);
            cx.notify();
          }),
        text("Custom styled (green, larger)")
      ),
  ],
};
