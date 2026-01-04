import {
  div,
  divider,
  rightClickItem,
  rightClickLabel,
  rightClickMenu,
  rightClickSeparator,
  rightClickSub,
  text,
} from "@glade/glade";

import type { Demo, DemoItem } from "./demo";

export const RIGHT_CLICK_DEMO: Demo = {
  name: "Right-Click Menu",
  renderElement: (cx, state): DemoItem[] => {
    const theme = cx.getTheme();

    return [
      text("Context menus triggered by right-click (or Ctrl+click on Mac)"),
      divider().color(theme.semantic.border.default),

      // Status display
      div()
        .flex()
        .flexRow()
        .gap(8)
        .itemsCenter()
        .children(text("Last Action:"), text(state.rightClickLastAction).weight(600)),

      // Basic Right-Click Menu
      text("Basic Right-Click Menu"),
      text("Right-click anywhere in the box below"),
      div()
        .w(400)
        .h(150)
        .bg(theme.semantic.surface.muted)
        .rounded(8)
        .border(1)
        .borderColor(theme.semantic.border.default)
        .flex()
        .itemsCenter()
        .justifyCenter()
        .onMouseDown((event) => {
          // button 1 = right click
          if (event.button === 1) {
            state.setRightClickPosition({ x: event.x, y: event.y });
            state.setRightClickOpen(true);
            cx.notify();
            return { stopPropagation: true };
          }
        })
        .children(
          div().p(40).child(text("Right-click here").color(theme.semantic.text.muted)),
          rightClickMenu()
            .open(state.rightClickOpen)
            .position(state.rightClickPosition)
            .onOpenChange((open) => {
              state.setRightClickOpen(open);
              cx.notify();
            })
            .items(
              rightClickItem("Cut").onSelect(() => {
                state.setRightClickLastAction("Cut");
                cx.notify();
              }),
              rightClickItem("Copy").onSelect(() => {
                state.setRightClickLastAction("Copy");
                cx.notify();
              }),
              rightClickItem("Paste").onSelect(() => {
                state.setRightClickLastAction("Paste");
                cx.notify();
              }),
              rightClickSeparator(),
              rightClickItem("Select All").onSelect(() => {
                state.setRightClickLastAction("Select All");
                cx.notify();
              })
            )
        ),

      // Right-Click with Labels
      text("Right-Click with Labels"),
      text("Grouped items with section labels"),
      div()
        .w(400)
        .h(150)
        .bg(theme.semantic.surface.muted)
        .rounded(8)
        .border(1)
        .borderColor(theme.semantic.border.default)
        .flex()
        .itemsCenter()
        .justifyCenter()
        .onMouseDown((event) => {
          if (event.button === 1) {
            state.setRightClick2Position({ x: event.x, y: event.y });
            state.setRightClick2Open(true);
            cx.notify();
            return { stopPropagation: true };
          }
        })
        .children(
          div().p(40).child(text("Right-click here").color(theme.semantic.text.muted)),
          rightClickMenu()
            .open(state.rightClick2Open)
            .position(state.rightClick2Position)
            .onOpenChange((open) => {
              state.setRightClick2Open(open);
              cx.notify();
            })
            .items(
              rightClickLabel("Edit"),
              rightClickItem("Undo").onSelect(() => {
                state.setRightClickLastAction("Undo");
                cx.notify();
              }),
              rightClickItem("Redo").onSelect(() => {
                state.setRightClickLastAction("Redo");
                cx.notify();
              }),
              rightClickSeparator(),
              rightClickLabel("Clipboard"),
              rightClickItem("Cut").onSelect(() => {
                state.setRightClickLastAction("Cut");
                cx.notify();
              }),
              rightClickItem("Copy").onSelect(() => {
                state.setRightClickLastAction("Copy");
                cx.notify();
              }),
              rightClickItem("Paste").onSelect(() => {
                state.setRightClickLastAction("Paste");
                cx.notify();
              })
            )
        ),

      // Right-Click with Submenus
      text("Right-Click with Submenus"),
      text("Nested context menus with submenus"),
      div()
        .w(400)
        .h(150)
        .bg(theme.semantic.surface.muted)
        .rounded(8)
        .border(1)
        .borderColor(theme.semantic.border.default)
        .flex()
        .itemsCenter()
        .justifyCenter()
        .onMouseDown((event) => {
          if (event.button === 1) {
            state.setRightClick3Position({ x: event.x, y: event.y });
            state.setRightClick3Open(true);
            cx.notify();
            return { stopPropagation: true };
          }
        })
        .children(
          div().p(40).child(text("Right-click here").color(theme.semantic.text.muted)),
          rightClickMenu()
            .id("file-context-menu")
            .open(state.rightClick3Open)
            .position(state.rightClick3Position)
            .onOpenChange((open) => {
              state.setRightClick3Open(open);
              cx.notify();
            })
            .items(
              rightClickItem("New File").onSelect(() => {
                state.setRightClickLastAction("New File");
                cx.notify();
              }),
              rightClickItem("New Folder").onSelect(() => {
                state.setRightClickLastAction("New Folder");
                cx.notify();
              }),
              rightClickSeparator(),
              rightClickSub("Open With").items(
                rightClickItem("Text Editor").onSelect(() => {
                  state.setRightClickLastAction("Open With: Text Editor");
                  cx.notify();
                }),
                rightClickItem("Code Editor").onSelect(() => {
                  state.setRightClickLastAction("Open With: Code Editor");
                  cx.notify();
                }),
                rightClickItem("Hex Editor").onSelect(() => {
                  state.setRightClickLastAction("Open With: Hex Editor");
                  cx.notify();
                })
              ),
              rightClickSub("Share").items(
                rightClickItem("Email").onSelect(() => {
                  state.setRightClickLastAction("Share: Email");
                  cx.notify();
                }),
                rightClickItem("Messages").onSelect(() => {
                  state.setRightClickLastAction("Share: Messages");
                  cx.notify();
                }),
                rightClickSub("Social").items(
                  rightClickItem("Twitter").onSelect(() => {
                    state.setRightClickLastAction("Share: Twitter");
                    cx.notify();
                  }),
                  rightClickItem("LinkedIn").onSelect(() => {
                    state.setRightClickLastAction("Share: LinkedIn");
                    cx.notify();
                  })
                )
              ),
              rightClickSeparator(),
              rightClickItem("Delete")
                .destructive(true)
                .onSelect(() => {
                  state.setRightClickLastAction("Delete (destructive)");
                  cx.notify();
                })
            )
        ),

      div().pt(200),
    ];
  },
};
