import { link, separator, text } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const HELLO_DEMO: Demo = {
  name: "Hello there!",
  renderElement: (_cx, _state): DemoItem[] => [
    text(
      `If you're reading this, you at least know that Glade is a GUI
so I'll skip the preamble. This is a demo of all the glade features:
flexbox, grid, text, and so on.`.replaceAll("\n", " ")
    ).size(16),
    text(
      `You can select any of the demos in the side bar, and it'll appear here
in the main area. If you're viewing this in the browser, some of these may
block scroll events from reaching the window.`.replaceAll("\n", " ")
    ).size(16),
    text(
      `This app is system-color-scheme aware, so if you go to the Theme demo,
or just change your color scheme in the System Settings, you'll see that change
reflected here.`.replaceAll("\n", " ")
    ).size(16),
    separator(),

    text(
      `If you hit Cmd+I, you can turn on the debug-mode inspector, which
will outline all the components in view.`.replaceAll("\n", " ")
    ).size(16),
    text(
      `You can also resize the window (or whatever contains this,
if it's running in the browser) and layout will adjust dynamically.`.replaceAll("\n", " ")
    ).size(16),
    link("Click here to see this demo in full-screen.", "https://glade.graphics/demo").size(16),
    text("To read more about Glade, visit the site below.").size(16),
    link("https://glade.graphics/", "https://glade.graphics/").size(16),
    text("The source is available on GitHub:").size(16),
    link("https://github.com/vogtb/glade", "https://github.com/vogtb/glade").size(16),
  ],
};
