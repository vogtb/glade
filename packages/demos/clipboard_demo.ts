import { div, text } from "@glade/glade";
import { colors, rgb } from "@glade/utils";

import { SPACER_10PX } from "./common";
import type { Demo, DemoItem } from "./demo";

export const CLIPBOARD_DEMO: Demo = {
  name: "Clipboard",
  renderElement: (cx, state): DemoItem[] => {
    const clipboard = cx.window.getClipboard();
    const capabilityText = clipboard.isSupported
      ? `Read ${clipboard.supportsReadText ? "enabled" : "blocked"} | Write ${clipboard.supportsWriteText ? "enabled" : "blocked"}`
      : "Clipboard unavailable in this runtime.";
    const lastText =
      state.clipboardLastText === null
        ? "No clipboard text captured yet."
        : state.clipboardLastText.length > 0
          ? state.clipboardLastText
          : "(empty clipboard)";

    const copyHandler = cx.listener((_view, _event, _window, ecx) => {
      if (!clipboard.supportsWriteText) {
        state.setClipboardStatus("Clipboard write is not available.");
        ecx.notify();
        return;
      }

      const sample = `${state.clipboardSample} (${new Date().toLocaleTimeString()})`;
      clipboard
        .writeText(sample)
        .then(() => {
          state.setClipboardStatus(
            `Copied sample (${sample.length} chars) to the system clipboard.`
          );
          state.setClipboardLastText(sample);
          ecx.notify();
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : "Clipboard write failed.";
          state.setClipboardStatus(message);
          ecx.notify();
        });
    });

    const pasteHandler = cx.listener((_view, _event, _window, ecx) => {
      state.setClipboardStatus("Attempting to paste from system clipboard...");
      ecx.notify();

      let completed = false;
      const timeoutId = setTimeout(() => {
        if (completed) {
          return;
        }
        completed = true;
        state.setClipboardStatus("Paste timed out; no data received.");
        state.setClipboardLastText("");
        ecx.notify();
      }, 500);

      if (!clipboard.supportsReadText) {
        clearTimeout(timeoutId);
        state.setClipboardStatus("Clipboard read is not available.");
        ecx.notify();
        return;
      }

      clipboard
        .readText()
        .then((value) => {
          if (completed) {
            return;
          }
          completed = true;
          clearTimeout(timeoutId);
          state.setClipboardStatus(`Read ${value.length} chars from the system clipboard.`);
          state.setClipboardLastText(value);
          ecx.notify();
        })
        .catch((error) => {
          if (completed) {
            return;
          }
          completed = true;
          clearTimeout(timeoutId);
          const message = error instanceof Error ? error.message : "Clipboard read failed.";
          state.setClipboardStatus(message);
          ecx.notify();
        });
    });

    return [
      text("Cross-platform copy/paste powered by platform clipboards."),
      SPACER_10PX,

      text("Capabilities").size(13),
      text(capabilityText).size(12).color(colors.black.x400),
      SPACER_10PX,

      text("Sample to copy").size(13),
      text(state.clipboardSample).size(16),
      SPACER_10PX,

      div()
        .flex()
        .flexRow()
        .gap(12)
        .children(
          div()
            .flex()
            .itemsCenter()
            .justifyCenter()
            .bg(rgb(0x2563eb))
            .rounded(10)
            .h(44)
            .px(16)
            .cursorPointer()
            .hover((s) => s.bg(rgb(0x1d4ed8)))
            .active((s) => s.bg(rgb(0x1e40af)))
            .onClick(copyHandler)
            .child(text("Copy sample").color(colors.white.default)),
          div()
            .flex()
            .itemsCenter()
            .justifyCenter()
            .bg(rgb(0x22c55e))
            .rounded(10)
            .h(44)
            .px(16)
            .cursorPointer()
            .hover((s) => s.bg(rgb(0x16a34a)))
            .active((s) => s.bg(rgb(0x15803d)))
            .onClick(pasteHandler)
            .child(text("Paste from system").color(colors.white.default))
        ),

      SPACER_10PX,
      text("Last clipboard text").size(13),
      text(lastText).size(15),
      SPACER_10PX,
      text(state.clipboardStatus).size(13).color(colors.black.x400),
    ];
  },
};
