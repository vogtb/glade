import { div, text, textInput } from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

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
      div().p(10),
      text(
        "Click to focus, type with IME, use Cmd/Ctrl+C/V/X for clipboard, and drag-select (double click for words, triple for lines)."
      ),
      div().p(10),
      div()
        .border(1)
        .borderColor(theme.semantic.border.default)
        .rounded(4)
        .child(
          textInput("", {
            controller,
            focusHandle: inputHandle,
            placeholder: "Type multi-line text...",
            multiline: true,
            selectionColor: theme.components.input.selection.background,
            compositionColor: theme.components.input.composition,
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
      div().p(10),
      div()
        .flex()
        .flexRow()
        .gap(12)
        .children(
          text(`Focused: ${focused ? "yes" : "no"}`),
          text(`Length: ${inputState.value.length}`),
          text(`Selection: ${selectionLength} chars`)
        ),
      div().p(10),
      text(
        compositionText.length > 0
          ? `Composing: "${compositionText}" (${compositionText.length} chars)`
          : "Composition: none"
      ),
      div().p(10),
      text(`Status: ${demoState.textInputStatus}`),
    ];
  },
};
