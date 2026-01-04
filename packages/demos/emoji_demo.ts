import { div, text } from "@glade/glade";

import { SPACER_10PX } from "./common";
import type { Demo, DemoItem } from "./demo";

export const EMOJI_DEMO: Demo = {
  name: "Emoji",
  renderElement: (_cx, _state): DemoItem[] => [
    div().child(text("We use Noto Color Emoji for these.").size(28)),
    SPACER_10PX,
    div().child(text("🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮").font("Noto Color Emoji").size(28)),
    SPACER_10PX,
    div().child(text("👐🏼🙌🏼👏🏼👊🏽✊🏽🤛🏽🤜🏽🤞🏽👋🏾🤙🏾💪🏾🖕🏾").font("Noto Color Emoji").size(28)),
    SPACER_10PX,
    div().child(text("🍅🍆🥒🥕🌽🌶🧄🧅🥔🍠🌰🥓").font("Noto Color Emoji").size(28)),
  ],
};
