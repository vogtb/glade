import {
  colors,
  dialog,
  dialogContent,
  dialogFooter,
  dialogHeader,
  div,
  separator,
  text,
} from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const DIALOG_DEMO: Demo = {
  name: "Dialog",
  renderElement: (cx, state): DemoItem[] => [
    text("Modal dialogs with backdrop, header, footer, and configurable behavior"),
    separator(),

    // Basic Dialog
    text("Basic Dialog"),
    text("Click the button to open a simple dialog"),
    dialog()
      .open(state.dialogOpen)
      .onOpenChange((open) => {
        state.setDialogOpen(open);
        cx.notify();
      })
      .trigger(
        div()
          .flex()
          .flexRow()
          .gap(8)
          .itemsCenter()
          .px(16)
          .py(10)
          .bg(colors.blue.x600)
          .rounded(6)
          .cursorPointer()
          .children(text("Open Dialog").color(colors.white.default))
      )
      .content(() =>
        dialogContent()
          .header(
            dialogHeader()
              .title("Basic Dialog")
              .description("This is a simple dialog with a title and description.")
          )
          .body(
            div()
              .py(16)
              .child(
                text("Dialog content goes here. You can add any elements inside the dialog body.")
              )
          )
          .footer(
            dialogFooter()
              .cancel("Cancel")
              .confirm("Confirm")
              .onCancel(() => {
                state.setDialogOpen(false);
                cx.notify();
              })
              .onConfirm(() => {
                state.setDialogOpen(false);
                state.setDialogLastAction("Confirmed");
                cx.notify();
              })
          )
      ),

    // Confirmation Dialog
    text("Confirmation Dialog"),
    text("A dialog for confirming destructive actions"),
    dialog()
      .open(state.dialog2Open)
      .onOpenChange((open) => {
        state.setDialog2Open(open);
        cx.notify();
      })
      .trigger(
        div()
          .flex()
          .flexRow()
          .gap(8)
          .itemsCenter()
          .px(16)
          .py(10)
          .bg(colors.red.x600)
          .rounded(6)
          .cursorPointer()
          .children(text("Delete Item").color(colors.white.default))
      )
      .content(() =>
        dialogContent()
          .header(
            dialogHeader()
              .title("Delete Item?")
              .description("This action cannot be undone. The item will be permanently deleted.")
          )
          .footer(
            dialogFooter()
              .cancel("Cancel")
              .confirm("Delete")
              .isDestructive(true)
              .onCancel(() => {
                state.setDialog2Open(false);
                cx.notify();
              })
              .onConfirm(() => {
                state.setDialog2Open(false);
                state.setDialogLastAction("Item deleted");
                cx.notify();
              })
          )
      ),

    // Dialog with Form Content
    text("Dialog with Rich Content"),
    text("Dialogs can contain any content including forms and complex layouts"),
    dialog()
      .open(state.dialog3Open)
      .onOpenChange((open) => {
        state.setDialog3Open(open);
        cx.notify();
      })
      .trigger(
        div()
          .flex()
          .flexRow()
          .gap(8)
          .itemsCenter()
          .px(16)
          .py(10)
          .bg(colors.gray.x600)
          .rounded(6)
          .cursorPointer()
          .children(text("Edit Profile").color(colors.white.default))
      )
      .content(() =>
        dialogContent()
          .header(
            dialogHeader()
              .title("Edit Profile")
              .description("Update your profile information below.")
          )
          .body(
            div()
              .flex()
              .flexCol()
              .gap(16)
              .py(16)
              .children(
                div()
                  .flex()
                  .flexCol()
                  .gap(4)
                  .children(
                    text("Name").size(14).weight(500),
                    div()
                      .px(12)
                      .py(8)
                      .bg(colors.gray.x800)
                      .rounded(6)
                      .border(1)
                      .borderColor(colors.gray.x600)
                      .child(text("John Doe").color(colors.gray.x300))
                  ),
                div()
                  .flex()
                  .flexCol()
                  .gap(4)
                  .children(
                    text("Email").size(14).weight(500),
                    div()
                      .px(12)
                      .py(8)
                      .bg(colors.gray.x800)
                      .rounded(6)
                      .border(1)
                      .borderColor(colors.gray.x600)
                      .child(text("john@example.com").color(colors.gray.x300))
                  ),
                div()
                  .flex()
                  .flexCol()
                  .gap(4)
                  .children(
                    text("Bio").size(14).weight(500),
                    div()
                      .px(12)
                      .py(8)
                      .bg(colors.gray.x800)
                      .rounded(6)
                      .border(1)
                      .borderColor(colors.gray.x600)
                      .h(80)
                      .child(text("Software developer...").color(colors.gray.x300))
                  )
              )
          )
          .footer(
            dialogFooter()
              .cancel("Cancel")
              .confirm("Save Changes")
              .onCancel(() => {
                state.setDialog3Open(false);
                cx.notify();
              })
              .onConfirm(() => {
                state.setDialog3Open(false);
                state.setDialogLastAction("Profile saved");
                cx.notify();
              })
          )
      ),

    // Non-dismissable Dialog
    text("Non-dismissable Dialog"),
    text("This dialog cannot be closed by clicking the backdrop or pressing Escape"),
    dialog()
      .open(state.dialog4Open)
      .onOpenChange((open) => {
        state.setDialog4Open(open);
        cx.notify();
      })
      .closeOnBackdropClick(false)
      .closeOnEscape(false)
      .trigger(
        div()
          .flex()
          .flexRow()
          .gap(8)
          .itemsCenter()
          .px(16)
          .py(10)
          .bg(colors.gray.x700)
          .border(1)
          .borderColor(colors.gray.x500)
          .rounded(6)
          .cursorPointer()
          .children(text("Open Persistent Dialog"))
      )
      .content(() =>
        dialogContent()
          .header(
            dialogHeader()
              .title("Important Notice")
              .description("You must acknowledge this message before continuing.")
          )
          .body(
            div()
              .py(16)
              .child(
                text(
                  "This dialog can only be closed by clicking the button below. Clicking the backdrop or pressing Escape will not close it."
                )
              )
          )
          .footer(
            dialogFooter()
              .confirm("I Understand")
              .onConfirm(() => {
                state.setDialog4Open(false);
                state.setDialogLastAction("Acknowledged");
                cx.notify();
              })
          )
      ),

    // Status display
    separator(),
    div()
      .flex()
      .flexRow()
      .gap(8)
      .itemsCenter()
      .children(text("Last Action:"), text(state.dialogLastAction).weight(600)),

    div().pt(200),
  ],
};
