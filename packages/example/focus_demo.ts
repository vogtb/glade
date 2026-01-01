import {
  dialog,
  dialogContent,
  dialogFooter,
  dialogHeader,
  div,
  text,
  type FocusHandle,
  type FlashDiv,
} from "@glade/flash";
import { rgb } from "@glade/utils";
import type { Demo, DemoItem, DemoState } from "./demo";

function focusButton(
  cx: Parameters<Demo["renderElement"]>[0],
  state: DemoState,
  label: string,
  handle: FocusHandle,
  color: number,
  hoverColor: number,
  tabIndex: number,
  options?: {
    group?: string;
    focusOnPress?: boolean;
    keyContext?: string;
    onClickMessage?: string;
  }
): FlashDiv {
  let button = div()
    .h(44)
    .px(16)
    .rounded(4)
    .bg(rgb(color))
    .border(2)
    .borderColor({ r: 1, g: 1, b: 1, a: 0.1 })
    .cursorPointer()
    .hover((s) => s.bg(rgb(hoverColor)).shadow("md"))
    .active((s) => s.bg(rgb(color)))
    .focused((s) => s.borderColor(rgb(0xfcd34d)).shadow("lg"))
    .flex()
    .itemsCenter()
    .justifyCenter()
    .trackFocus(handle)
    .tabStop({ index: tabIndex });

  if (options?.group) {
    button = button.focusGroup(options.group);
  }
  if (options?.focusOnPress) {
    button = button.focusOnPress();
  }
  if (options?.keyContext) {
    button = button.keyContext(options.keyContext);
  }

  button = button.onClick(
    cx.listener((_view, _event, _window, ecx) => {
      state.setFocusLog(options?.onClickMessage ?? `${label} activated`);
      ecx.notify();
    })
  );

  return button.child(text(label).size(13));
}

export const FOCUS_DEMO: Demo = {
  name: "Focus",
  renderElement: (cx, state): DemoItem[] => {
    const [toolbarA, toolbarB, toolbarC] = state.toolbarHandles;
    if (
      !state.focusPrimaryHandle ||
      !state.focusSecondaryHandle ||
      !state.focusDangerHandle ||
      !toolbarA ||
      !toolbarB ||
      !toolbarC ||
      !state.toolbarContainerHandle ||
      !state.modalTriggerHandle
    ) {
      throw new Error("Demo MainViewState not properly initialized");
    }

    const contextChain = cx.window.getKeyContextChain();
    const contextLabel = contextChain.length > 0 ? contextChain.join(" > ") : "None";

    const focusEntries: Array<{ handle: FocusHandle; label: string }> = [
      { handle: state.focusPrimaryHandle, label: "Primary" },
      { handle: state.focusSecondaryHandle, label: "Secondary" },
      { handle: state.focusDangerHandle, label: "Destructive" },
      { handle: toolbarA, label: "Toolbar 1" },
      { handle: toolbarB, label: "Toolbar 2" },
      { handle: toolbarC, label: "Toolbar 3" },
      { handle: state.modalTriggerHandle, label: "Modal Trigger" },
    ];
    const focusedLabel = focusEntries.find((entry) => cx.isFocused(entry.handle))?.label ?? "None";

    return [
      div()
        .flex()
        .flexCol()
        .gap(16)
        .keyContext("focus-demo")
        .children(
          text("Keyboard traversal across toolbars, groups, and modal dialogs.").size(16),
          div().h(1).bg({ r: 0.3, g: 0.32, b: 0.38, a: 0.6 }),
          text("• Tab/Shift+Tab respects custom tab indexes and focus groups.").size(13),
          text(
            "• Right arrow in the toolbar uses focusNextSibling(); Home jumps to the first child."
          ).size(13),
          text(
            "• Enter logs the current key context chain; Escape closes the modal and restores focus."
          ).size(13),
          text("• The red button focuses on mouse down via focusOnPress().").size(13),
          text("Tab Stops").size(18),
          div()
            .flex()
            .flexRow()
            .gap(12)
            .keyContext("focus-demo.controls")
            .children(
              focusButton(
                cx,
                state,
                "Primary Action",
                state.focusPrimaryHandle,
                0x2563eb,
                0x1d4ed8,
                1,
                {
                  onClickMessage: "Primary activated",
                }
              ),
              focusButton(
                cx,
                state,
                "Secondary",
                state.focusSecondaryHandle,
                0x10b981,
                0x059669,
                2,
                {
                  onClickMessage: "Secondary activated",
                }
              ),
              focusButton(
                cx,
                state,
                "Destructive",
                state.focusDangerHandle,
                0xef4444,
                0xdc2626,
                3,
                {
                  focusOnPress: true,
                  onClickMessage: "Destructive pressed",
                }
              )
            ),
          text("Focus Group (Toolbar)").size(18),
          text(
            "Tab stays in the group first, Right arrow advances with focusNextSibling(), Home jumps to the first child."
          ).size(13),
          div()
            .flex()
            .flexRow()
            .gap(10)
            .keyContext("focus-demo.toolbar")
            .trackFocus(state.toolbarContainerHandle)
            .children(
              focusButton(cx, state, "Toolbar A", toolbarA, 0x4f46e5, 0x4338ca, 4, {
                group: "toolbar",
                onClickMessage: "Toolbar A focused",
              }),
              focusButton(cx, state, "Toolbar B", toolbarB, 0x22c55e, 0x16a34a, 5, {
                group: "toolbar",
                onClickMessage: "Toolbar B focused",
              }),
              focusButton(cx, state, "Toolbar C", toolbarC, 0xf59e0b, 0xd97706, 6, {
                group: "toolbar",
                onClickMessage: "Toolbar C focused",
              })
            ),
          text("Focus Restoration (Dialog)").size(18),
          text("Open the dialog; Escape or buttons close it and restore focus.").size(13),
          dialog()
            .open(state.focusModalOpen)
            .onOpenChange((open) => {
              state.setFocusModalOpen(open);
              state.setFocusLog(open ? "Dialog opened" : "Dialog closed");
              cx.notify();
            })
            .trigger(
              div()
                .flex()
                .justifyCenter()
                .itemsCenter()
                .h(44)
                .px(16)
                .rounded(10)
                .bg(rgb(0x0ea5e9))
                .border(2)
                .borderColor({ r: 1, g: 1, b: 1, a: 0.1 })
                .cursorPointer()
                .hover((s) => s.bg(rgb(0x0284c7)).shadow("md"))
                .trackFocus(state.modalTriggerHandle)
                .tabStop({ index: 7 })
                .child(text("Open Dialog").size(13))
            )
            .content(
              dialogContent()
                .header(
                  dialogHeader()
                    .title("Focus Demo Modal")
                    .description(
                      "This dialog demonstrates focus restoration. Tab between buttons, then close with Escape or a button."
                    )
                )
                .footer(
                  dialogFooter()
                    .cancel("Cancel")
                    .confirm("Confirm")
                    .onCancel(() => {
                      state.setFocusModalOpen(false);
                      state.setFocusLog("Dialog cancelled");
                      cx.notify();
                    })
                    .onConfirm(() => {
                      state.setFocusModalOpen(false);
                      state.setFocusLog("Dialog confirmed");
                      cx.notify();
                    })
                )
            ),
          div()
            .flex()
            .flexCol()
            .gap(6)
            .borderColor({ r: 0.16, g: 0.17, b: 0.22, a: 0.5 })
            .rounded(10)
            .p(12)
            .children(
              text(`Current Focus: ${focusedLabel}`).size(14),
              text(`Key Context Chain: ${contextLabel}`).size(14),
              text(`Focus Log: ${state.focusLog}`).size(14)
            )
        ),
    ];
  },
};
