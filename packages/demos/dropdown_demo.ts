import {
  div,
  divider,
  dropdown,
  dropdownItem,
  dropdownLabel,
  dropdownSeparator,
  dropdownSub,
  icon,
  text,
} from "@glade/glade";
import { colors } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";

export const DROPDOWN_DEMO: Demo = {
  name: "Dropdown Menu",
  renderElement: (cx, state): DemoItem[] => [
    text("Dropdown Menu").size(32),
    text("Displays a menu triggered by a button with items, separators, and labels").size(16),
    divider().color(colors.gray.x500),

    // Status display
    div()
      .flex()
      .flexRow()
      .gap(8)
      .itemsCenter()
      .children(text("Last Action:"), text(state.dropdownLastAction).weight(600)),

    // Basic Dropdown
    text("Basic Dropdown").size(20),
    text("Click the button to open a simple dropdown menu"),
    dropdown()
      .open(state.dropdownOpen)
      .onOpenChange((open) => {
        state.setDropdownOpen(open);
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
          .bg(colors.gray.x700)
          .rounded(6)
          .cursorPointer()
          .children(text("Open Menu"), icon("arrowDown", 14))
      )
      .items(
        dropdownItem("New File").onSelect(() => {
          state.setDropdownLastAction("New File");
          cx.notify();
        }),
        dropdownItem("Open...").onSelect(() => {
          state.setDropdownLastAction("Open...");
          cx.notify();
        }),
        dropdownItem("Save").onSelect(() => {
          state.setDropdownLastAction("Save");
          cx.notify();
        }),
        dropdownSeparator(),
        dropdownItem("Exit").onSelect(() => {
          state.setDropdownLastAction("Exit");
          cx.notify();
        })
      ),

    // Dropdown with Labels
    text("Dropdown with Labels").size(20),
    text("Group items with section labels"),
    dropdown()
      .open(state.dropdown2Open)
      .onOpenChange((open) => {
        state.setDropdown2Open(open);
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
          .bg(colors.gray.x700)
          .rounded(6)
          .cursorPointer()
          .children(text("Actions"), icon("arrowDown", 14))
      )
      .items(
        dropdownLabel("Edit"),
        dropdownItem("Cut").onSelect(() => {
          state.setDropdownLastAction("Cut");
          cx.notify();
        }),
        dropdownItem("Copy").onSelect(() => {
          state.setDropdownLastAction("Copy");
          cx.notify();
        }),
        dropdownItem("Paste").onSelect(() => {
          state.setDropdownLastAction("Paste");
          cx.notify();
        }),
        dropdownSeparator(),
        dropdownLabel("View"),
        dropdownItem("Zoom In").onSelect(() => {
          state.setDropdownLastAction("Zoom In");
          cx.notify();
        }),
        dropdownItem("Zoom Out").onSelect(() => {
          state.setDropdownLastAction("Zoom Out");
          cx.notify();
        }),
        dropdownItem("Reset Zoom").onSelect(() => {
          state.setDropdownLastAction("Reset Zoom");
          cx.notify();
        })
      ),

    // Destructive Actions
    text("Destructive Actions").size(20),
    text("Items with destructive styling for dangerous actions"),
    dropdown()
      .open(state.dropdown3Open)
      .onOpenChange((open) => {
        state.setDropdown3Open(open);
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
          .bg(colors.gray.x700)
          .rounded(6)
          .cursorPointer()
          .children(icon("settings", 16), text("Settings"), icon("arrowDown", 14))
      )
      .items(
        dropdownItem("Profile").onSelect(() => {
          state.setDropdownLastAction("Profile");
          cx.notify();
        }),
        dropdownItem("Preferences").onSelect(() => {
          state.setDropdownLastAction("Preferences");
          cx.notify();
        }),
        dropdownSeparator(),
        dropdownItem("Log Out").onSelect(() => {
          state.setDropdownLastAction("Log Out");
          cx.notify();
        }),
        dropdownItem("Delete Account")
          .destructive(true)
          .onSelect(() => {
            state.setDropdownLastAction("Delete Account (destructive)");
            cx.notify();
          })
      ),

    // Nested Submenus
    text("Nested Submenus").size(20),
    text("Hover over submenu items to reveal nested menus"),
    dropdown()
      .id("file-menu-dropdown")
      .open(state.dropdown4Open)
      .onOpenChange((open) => {
        state.setDropdown4Open(open);
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
          .bg(colors.gray.x700)
          .rounded(6)
          .cursorPointer()
          .children(text("File Menu"), icon("arrowDown", 14))
      )
      .items(
        dropdownItem("New").onSelect(() => {
          state.setDropdownLastAction("New");
          cx.notify();
        }),
        dropdownSub("Open Recent").items(
          dropdownItem("project-alpha.ts").onSelect(() => {
            state.setDropdownLastAction("Open: project-alpha.ts");
            cx.notify();
          }),
          dropdownItem("config.json").onSelect(() => {
            state.setDropdownLastAction("Open: config.json");
            cx.notify();
          }),
          dropdownItem("README.md").onSelect(() => {
            state.setDropdownLastAction("Open: README.md");
            cx.notify();
          }),
          dropdownSeparator(),
          dropdownSub("More Files").items(
            dropdownItem("old-backup.zip").onSelect(() => {
              state.setDropdownLastAction("Open: old-backup.zip");
              cx.notify();
            }),
            dropdownItem("notes.txt").onSelect(() => {
              state.setDropdownLastAction("Open: notes.txt");
              cx.notify();
            })
          )
        ),
        dropdownSeparator(),
        dropdownSub("Export As").items(
          dropdownItem("PDF").onSelect(() => {
            state.setDropdownLastAction("Export as PDF");
            cx.notify();
          }),
          dropdownItem("HTML").onSelect(() => {
            state.setDropdownLastAction("Export as HTML");
            cx.notify();
          }),
          dropdownSub("Image").items(
            dropdownItem("PNG").onSelect(() => {
              state.setDropdownLastAction("Export as PNG");
              cx.notify();
            }),
            dropdownItem("JPEG").onSelect(() => {
              state.setDropdownLastAction("Export as JPEG");
              cx.notify();
            }),
            dropdownItem("WebP").onSelect(() => {
              state.setDropdownLastAction("Export as WebP");
              cx.notify();
            })
          )
        ),
        dropdownSeparator(),
        dropdownItem("Save").onSelect(() => {
          state.setDropdownLastAction("Save");
          cx.notify();
        }),
        dropdownItem("Close").onSelect(() => {
          state.setDropdownLastAction("Close");
          cx.notify();
        })
      ),
  ],
};
