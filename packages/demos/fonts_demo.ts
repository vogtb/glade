import { div, text } from "@glade/glade";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const FONTS_DEMO: Demo = {
  name: "Fonts",
  renderElement: (_cx, _state): DemoItem[] => [
    text("Render different fonts").size(28),
    SPACER_10PX,
    div().child(text("Inter is a sans serif font.").size(28)),
    SPACER_10PX,
    div().child(text("JetBrains Mono is a monospaced font.").font("JetBrains Mono").size(28)),
    SPACER_10PX,
    div().child(text("Noto Color Emoji is an open source emoji font.").size(28)),
    div().child(
      text("🐋😎👍🏼🪙🎲🍔⛳️😄😑🐺🥄🍳🍏🐶🐰🦆🐨🦂🦍🐩🐥").font("Noto Color Emoji").size(28)
    ),
  ],
};
