import { div, divider, radioGroup, radioItem, text } from "@glade/glade";
import { colors } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";

export const RADIO_INPUT_DEMO: Demo = {
  name: "Radio Input",
  renderElement: (cx, state): DemoItem[] => [
    text("Radio Group").size(32),
    text("A set of checkable buttons where only one can be checked at a time").size(16),
    divider().color(colors.gray.x500),

    // Vertical layout
    text("Vertical Layout").size(18),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .children(
        radioGroup()
          .flexCol()
          .gap(12)
          .value(state.radioValue)
          .onValueChange((value) => {
            state.setRadioValue(value);
            cx.notify();
          })
          .items(radioItem("option1"), radioItem("option2"), radioItem("option3")),
        div()
          .flex()
          .flexCol()
          .gap(12)
          .children(
            text("Option 1 - Default").size(13),
            text("Option 2 - Alternative").size(13),
            text("Option 3 - Another choice").size(13)
          )
      ),

    // Horizontal layout
    text("Horizontal Layout").size(18),
    radioGroup()
      .flexRow()
      .gap(16)
      .value(state.radioValue)
      .onValueChange((value) => {
        state.setRadioValue(value);
        cx.notify();
      })
      .items(radioItem("option1"), radioItem("option2"), radioItem("option3")),

    // Selected value
    text(`Selected: ${state.radioValue}`).size(13).color(colors.gray.x400),

    // Custom styled
    text("Custom Styled").size(18),
    radioGroup()
      .flexRow()
      .gap(16)
      .itemSize(22)
      .checkedBg(colors.green.x500)
      .indicatorColor(colors.white.default)
      .value(state.radioValue)
      .onValueChange((value) => {
        state.setRadioValue(value);
        cx.notify();
      })
      .items(radioItem("option1"), radioItem("option2"), radioItem("option3")),

    // Disabled
    text("Disabled").size(18),
    radioGroup()
      .flexRow()
      .gap(16)
      .disabled(true)
      .value("option2")
      .items(radioItem("option1"), radioItem("option2"), radioItem("option3")),
  ],
};
