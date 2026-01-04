import { colors, div, switchToggle, text } from "@glade/glade";

import { SPACER_10PX } from "./common";
import type { Demo, DemoItem } from "./demo";

export const THEME_DEMO: Demo = {
  name: "Theme",
  renderElement: (cx, state): DemoItem[] => {
    const theme = cx.getTheme();
    const systemScheme = cx.getSystemColorScheme();

    return [
      text("Control the application color scheme"),
      SPACER_10PX,

      // Current theme info
      text("Current Theme"),
      div()
        .flex()
        .flexCol()
        .gap(8)
        .p(16)
        .roundedSm()
        .children(
          div()
            .flex()
            .flexRow()
            .gap(8)
            .children(text("Active scheme:"), text(theme.scheme).weight(600)),
          div()
            .flex()
            .flexRow()
            .gap(8)
            .children(text("System preference:"), text(systemScheme).weight(600))
        ),

      text("Theme Settings"),
      div()
        .flex()
        .flexCol()
        .gap(12)
        .p(16)
        .roundedSm()
        .children(
          div()
            .flex()
            .flexRow()
            .itemsCenter()
            .justifyBetween()
            .w(320)
            .children(
              div()
                .flex()
                .flexCol()
                .gap(2)
                .children(
                  text("Use System Theme"),
                  text("Automatically match your system color scheme")
                    .size(12)
                    .color(colors.gray.x400)
                ),
              switchToggle()
                .checked(state.useSystemTheme)
                .checkedTrack(colors.blue.x500)
                .onCheckedChange((checked) => {
                  state.setUseSystemTheme(checked);
                  if (checked) {
                    cx.setThemeScheme("system");
                  } else {
                    cx.setThemeScheme(state.preferDarkMode ? "dark" : "light");
                  }
                  cx.notify();
                })
            ),
          div()
            .flex()
            .flexRow()
            .itemsCenter()
            .justifyBetween()
            .w(320)
            .opacity(state.useSystemTheme ? 0.5 : 1)
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
                .checked(state.preferDarkMode)
                .disabled(state.useSystemTheme)
                .onCheckedChange((checked) => {
                  state.setPreferDarkMode(checked);
                  cx.setThemeScheme(checked ? "dark" : "light");
                  cx.notify();
                })
            )
        ),
    ];
  },
};
