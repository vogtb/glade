import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };
import { div, img, text, type DecodedImage } from "@glade/glade";
import { base64ToBytes, colors } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

const DEMO_PNG_BASE64 = COMPTIME_embedAsBase64("../../assets/image.png");
const DEMO_JPG_BASE64 = COMPTIME_embedAsBase64("../../assets/flower.jpg");

let cachedPngImage: DecodedImage | null = null;
let cachedJpgImage: DecodedImage | null = null;
let loadingStarted = false;

export const IMAGES_DEMO: Demo = {
  name: "Images",
  renderElement: (cx, _state): DemoItem[] => {
    if (!cachedPngImage || !cachedJpgImage) {
      if (!loadingStarted) {
        loadingStarted = true;
        const window = cx.window;
        const pngData = base64ToBytes(DEMO_PNG_BASE64);
        const jpgData = base64ToBytes(DEMO_JPG_BASE64);

        Promise.all([window.decodeImage(pngData), window.decodeImage(jpgData)]).then(
          ([png, jpg]) => {
            cachedPngImage = png;
            cachedJpgImage = jpg;
            cx.notify();
          }
        );
      }

      return [
        text("Images").size(32),
        SPACER_10PX,
        text("Loading images...").color(colors.black.x400),
      ];
    }

    const pngImage = cachedPngImage;
    const jpgImage = cachedJpgImage;

    return [
      text("PNG + JPG decoding with GPU filters, rounding, and effects."),
      text("PNG Image Rendering"),
      SPACER_10PX,
      text("PNG decoding with GPU-accelerated rendering and effects"),
      SPACER_10PX,
      div()
        .flex()
        .flexCol()
        .gap(4)
        .children(img(pngImage), text("Native size (auto-constrained to parent)")),
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
            .children(img(pngImage).hMax(100), text("hMax(100)")),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(pngImage).hMax(100).rounded(16), text("Rounded")),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(pngImage).hMax(100).grayscale(), text("Grayscale")),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(pngImage).hMax(100).opacity(0.5), text("50% Opacity")),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(pngImage).size(100, 100).cover().rounded(50), text("Circle (cover)"))
        ),

      SPACER_10PX,

      text("JPEG Image Rendering"),
      text("JPEG decoding with GPU-accelerated rendering and effects"),
      SPACER_10PX,
      div()
        .flex()
        .flexCol()
        .gap(4)
        .children(img(jpgImage), text("Native size (auto-constrained to parent)")),
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
            .children(img(jpgImage).hMax(100), text("hMax(100)")),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(jpgImage).hMax(100).rounded(16), text("Rounded")),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(jpgImage).hMax(100).grayscale(), text("Grayscale")),
          div()
            .flex()
            .flexCol()
            .gap(4)
            .itemsCenter()
            .children(img(jpgImage).size(100, 100).cover().rounded(50), text("Circle (cover)"))
        ),
    ];
  },
};
