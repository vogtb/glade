import { div, text, textInput } from "@glade/glade";
import { rgb } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const INPUTS_DEMO: Demo = {
  name: "Inputs",
  renderElement: (cx, demoState): DemoItem[] => {
    const theme = cx.getTheme();
    const inputHandle = demoState.textInputHandle;
    const controller = demoState.textInputController;

    if (!inputHandle || !controller) {
      return [text("Input demo not initialized").size(16)];
    }

    const inputState = controller.state;
    const focused = cx.isFocused(inputHandle);
    const selectionLength = Math.abs(inputState.selection.end - inputState.selection.start);
    const compositionText = inputState.composition?.text ?? "";

    return [
      text("Demonstrates IME composition, selection, clipboard, and caret rendering.").size(16),
      SPACER_10PX,
      text(
        "Click to focus, type with IME, use Cmd/Ctrl+C/V/X for clipboard, and drag-select (double click for words, triple for lines)."
      ),
      SPACER_10PX,
      div()
        .border(1)
        .borderColor(theme.border)
        .rounded(4)
        .child(
          textInput("", {
            controller,
            focusHandle: inputHandle,
            placeholder: "Type multi-line text...",
            multiline: true,
            selectionColor: { ...rgb(0x6366f1), a: 0.35 },
            compositionColor: rgb(0x22c55e),
            onChange: (_: string) => {
              demoState.setTextInputStatus("Editing…");
              cx.notify();
            },
            onSubmit: (value: string) => {
              demoState.setTextInputStatus(`Submit (${value.length} chars)`);
              cx.notify();
            },
            onCancel: () => {
              demoState.setTextInputStatus("Canceled");
              cx.notify();
            },
          })
            .size(16)
            .pad(4)
            .caretBlink(0.7)
        ),
      SPACER_10PX,
      div()
        .flex()
        .flexRow()
        .gap(12)
        .children(
          text(`Focused: ${focused ? "yes" : "no"}`),
          text(`Length: ${inputState.value.length}`),
          text(`Selection: ${selectionLength} chars`)
        ),
      SPACER_10PX,
      text(
        compositionText.length > 0
          ? `Composing: "${compositionText}" (${compositionText.length} chars)`
          : "Composition: none"
      ),
      SPACER_10PX,
      text(`Status: ${demoState.textInputStatus}`),
    ];
  },
};
