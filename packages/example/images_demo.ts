import { div, img, text } from "@glade/flash";
import { colors } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const IMAGES_DEMO: Demo = {
  name: "Images",
  renderElement: (_cx, state): DemoItem[] => {
    if (!state.pngImageTile || !state.jpgImageTile) {
      return [
        text("Images").size(32),
        SPACER_10PX,
        text("Loading images...").color(colors.black.x400),
      ];
    }

    return [
      text("Images").size(32),
      SPACER_10PX,
      text("PNG + JPG decoding with GPU filters, rounding, and effects.").size(16),
      SPACER_10PX,
      div().h(1).bg(colors.black.x600),
      SPACER_10PX,

      text("PNG Image Rendering").size(24),
      SPACER_10PX,
      text("PNG decoding with GPU-accelerated rendering and effects"),
      SPACER_10PX,
      div()
        .flex()
        .flexRow()
        .gap(16)
        .flexWrap()
        .children(
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(state.pngImageTile).size(150, 100), text("Original").size(11)),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(state.pngImageTile).size(150, 100).rounded(16), text("Rounded").size(11)),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(
              img(state.pngImageTile).size(150, 100).grayscale(),
              text("Grayscale").size(11)
            ),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(
              img(state.pngImageTile).size(150, 100).opacity(0.5),
              text("50% Opacity").size(11)
            ),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(state.pngImageTile).size(100, 100).rounded(50), text("Circle").size(11))
        ),

      SPACER_10PX,
      div().h(1).bg(colors.black.x700),
      SPACER_10PX,

      text("JPEG Image Rendering").size(24),
      SPACER_10PX,
      text("JPEG decoding with GPU-accelerated rendering and effects"),
      SPACER_10PX,
      div()
        .flex()
        .flexRow()
        .gap(16)
        .flexWrap()
        .children(
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(state.jpgImageTile).size(150, 100), text("Original").size(11)),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(state.jpgImageTile).size(150, 100).rounded(16), text("Rounded").size(11)),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(
              img(state.jpgImageTile).size(150, 100).grayscale(),
              text("Grayscale").size(11)
            ),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(state.jpgImageTile).size(100, 100).rounded(50), text("Circle").size(11))
        ),
    ];
  },
};
