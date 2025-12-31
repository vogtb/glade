import { text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const THEME_DEMO: Demo = {
  name: "Theme",
  renderElement: (_cx, _state): DemoItem[] => [
    text(
      "By default, we use the system color scheme, but you can override here. " +
        "Or you can change your color scheme preference in your system " +
        "settings, and you'll see this demo pickup the changes."
    ),
    SPACER_10PX,
  ],
};
