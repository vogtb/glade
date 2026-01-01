import { div, divider, switchToggle, text } from "@glade/flash";
import { colors } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";

export const THEME_DEMO: Demo = {
  name: "Theme",
  renderElement: (cx, state): DemoItem[] => {
    const theme = cx.getTheme();
    const systemScheme = cx.getSystemColorScheme();

    return [
      text("Theme").size(32),
      text("Control the application color scheme").size(16),
      divider().color(colors.gray.x500),

      // Current theme info
      text("Current Theme").size(18),
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
            .gap(8)
            .children(text("Active scheme:").size(14), text(theme.scheme).size(14).weight(600)),
          div()
            .flex()
            .flexRow()
            .gap(8)
            .children(text("System preference:").size(14), text(systemScheme).size(14).weight(600))
        ),

      // Use system theme toggle
      text("Theme Settings").size(18),
      div()
        .flex()
        .flexCol()
        .gap(12)
        .p(16)
        .bg(colors.gray.x800)
        .rounded(8)
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
                  text("Use System Theme").size(14),
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
                  text("Dark Mode").size(14),
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

      // Theme colors preview
      text("Theme Colors Preview").size(18),
      div()
        .flex()
        .flexWrap()
        .gap(12)
        .p(16)
        .bg(theme.background)
        .rounded(8)
        .border(1)
        .borderColor(theme.border)
        .children(
          div()
            .flex()
            .flexCol()
            .gap(4)
            .p(12)
            .bg(theme.surface)
            .rounded(6)
            .children(
              text("Surface").size(12).color(theme.text),
              div().w(60).h(24).bg(theme.surface).rounded(4).border(1).borderColor(theme.border)
            ),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .p(12)
            .bg(theme.surface)
            .rounded(6)
            .children(
              text("Primary").size(12).color(theme.text),
              div().w(60).h(24).bg(theme.primary).rounded(4)
            ),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .p(12)
            .bg(theme.surface)
            .rounded(6)
            .children(
              text("Success").size(12).color(theme.text),
              div().w(60).h(24).bg(theme.success).rounded(4)
            ),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .p(12)
            .bg(theme.surface)
            .rounded(6)
            .children(
              text("Warning").size(12).color(theme.text),
              div().w(60).h(24).bg(theme.warning).rounded(4)
            ),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .p(12)
            .bg(theme.surface)
            .rounded(6)
            .children(
              text("Danger").size(12).color(theme.text),
              div().w(60).h(24).bg(theme.danger).rounded(4)
            )
        ),

      // Info
      text("How It Works").size(18),
      div()
        .flex()
        .flexCol()
        .gap(8)
        .p(16)
        .bg(colors.gray.x800)
        .rounded(8)
        .children(
          text(
            "When 'Use System Theme' is enabled, the app automatically follows your operating system's color scheme preference."
          ).size(14),
          text(
            "You can also change your system color scheme in your OS settings and watch this demo update in real-time."
          ).size(14),
          text(
            "When disabled, you can manually choose between light and dark mode using the 'Dark Mode' toggle."
          ).size(14)
        ),
    ];
  },
};
