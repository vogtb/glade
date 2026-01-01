import { div, divider, switchToggle, text } from "@glade/glade";
import { colors } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";

export const SWITCH_DEMO: Demo = {
  name: "Switch",
  renderElement: (cx, state): DemoItem[] => [
    text("Switch").size(32),
    text("A toggle control for on/off states, commonly used for settings").size(16),
    divider().color(colors.gray.x500),

    // Basic switch
    text("Basic Switch").size(18),
    div()
      .flex()
      .flexRow()
      .gap(12)
      .itemsCenter()
      .justifyBetween()
      .w(300)
      .children(
        text("Enable feature"),
        switchToggle()
          .checked(state.switchEnabled)
          .onCheckedChange((checked) => {
            state.setSwitchEnabled(checked);
            cx.notify();
          })
      ),

    // Settings-style switches
    text("Settings Style").size(18),
    div()
      .flex()
      .flexCol()
      .gap(12)
      .p(12)
      .w(320)
      .children(
        div()
          .flex()
          .flexRow()
          .itemsCenter()
          .justifyBetween()
          .children(
            div()
              .flex()
              .flexCol()
              .gap(2)
              .children(
                text("Notifications"),
                text("Receive push notifications").size(12).color(colors.gray.x400)
              ),
            switchToggle()
              .checked(state.notificationsEnabled)
              .checkedTrack(colors.green.x500)
              .onCheckedChange((checked) => {
                state.setNotificationsEnabled(checked);
                cx.notify();
              })
          ),
        div()
          .flex()
          .flexRow()
          .itemsCenter()
          .justifyBetween()
          .children(
            div()
              .flex()
              .flexCol()
              .gap(2)
              .children(
                text("Dark Mode"),
                text("Use dark color scheme").size(12).color(colors.gray.x400)
              ),
            switchToggle()
              .checked(state.darkModeEnabled)
              .onCheckedChange((checked) => {
                state.setDarkModeEnabled(checked);
                cx.notify();
              })
          )
      ),

    // Disabled
    text("Disabled").size(18),
    div()
      .flex()
      .flexRow()
      .gap(12)
      .itemsCenter()
      .children(switchToggle().checked(true).disabled(true), text("Disabled (on)")),

    // Size variations
    text("Size Variations").size(18),
    div()
      .flex()
      .flexRow()
      .gap(16)
      .itemsCenter()
      .children(
        switchToggle()
          .size(36, 20)
          .checked(state.switchEnabled)
          .onCheckedChange((checked) => {
            state.setSwitchEnabled(checked);
            cx.notify();
          }),
        text("Small").size(12),
        switchToggle()
          .size(44, 24)
          .checked(state.switchEnabled)
          .onCheckedChange((checked) => {
            state.setSwitchEnabled(checked);
            cx.notify();
          }),
        text("Default").size(12),
        switchToggle()
          .size(56, 30)
          .checked(state.switchEnabled)
          .onCheckedChange((checked) => {
            state.setSwitchEnabled(checked);
            cx.notify();
          }),
        text("Large").size(12)
      ),
  ],
};
