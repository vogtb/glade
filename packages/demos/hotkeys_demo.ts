import {
  type ActionHandler,
  button,
  div,
  formatKeystrokeString,
  type GladeView,
  type GladeViewContext,
  h2,
  type KeyBindingHandle,
  KeymapDebugger,
  log,
  mono,
  text,
  type Theme,
} from "@glade/glade";

import { separator } from "../glade/separator";
import type { Demo, DemoItem } from "./demo";

// Track demo state for hotkey actions
let actionCounter = 0;
let lastAction = "None";
let activeBindings: KeyBindingHandle[] = [];
let keymapDebugEnabled = false;
let notifications: Array<{ id: number; message: string; timestamp: number }> = [];
let nextNotificationId = 0;

function addNotification(message: string) {
  const id = nextNotificationId++;
  notifications.push({ id, message, timestamp: Date.now() });
  // Keep only last 5 notifications
  if (notifications.length > 5) {
    notifications.shift();
  }
}

function resetDemo() {
  // Clean up existing bindings
  activeBindings.forEach((h) => h.unbind());
  activeBindings = [];

  // Reset state
  actionCounter = 0;
  lastAction = "None";
  notifications = [];
  keymapDebugEnabled = false;
}

function setupDemoHotkeys(cx: GladeViewContext<GladeView>) {
  // Clean up any existing hotkeys
  resetDemo();

  const window = cx.window;
  const keymap = window.getKeymap();

  const createHandler = (action: string, notify: () => void): ActionHandler => {
    return () => {
      lastAction = action;
      actionCounter++;
      addNotification(action);
      notify();
    };
  };

  // Single hotkey binding
  const saveBinding = keymap.bind(
    "meta+s",
    createHandler("Save triggered", () => cx.notify())
  );
  if (saveBinding) {
    activeBindings.push(saveBinding);
  }

  // Editor hotkeys
  const undoBinding = keymap.bind(
    "meta+z",
    createHandler("Undo triggered", () => cx.notify())
  );
  if (undoBinding) {
    activeBindings.push(undoBinding);
  }

  const redoBinding = keymap.bind(
    "meta+shift+z",
    createHandler("Redo triggered", () => cx.notify())
  );
  if (redoBinding) {
    activeBindings.push(redoBinding);
  }

  const selectAllBinding = keymap.bind(
    "meta+a",
    createHandler("Select All triggered", () => cx.notify())
  );
  if (selectAllBinding) {
    activeBindings.push(selectAllBinding);
  }

  const copyBinding = keymap.bind(
    "meta+c",
    createHandler("Copy triggered", () => cx.notify())
  );
  if (copyBinding) {
    activeBindings.push(copyBinding);
  }

  const pasteBinding = keymap.bind(
    "meta+v",
    createHandler("Paste triggered", () => cx.notify())
  );
  if (pasteBinding) {
    activeBindings.push(pasteBinding);
  }

  // Navigation hotkeys
  const navLeftBinding = keymap.bind(
    "meta+left",
    createHandler("Navigate Back", () => cx.notify())
  );
  if (navLeftBinding) {
    activeBindings.push(navLeftBinding);
  }

  const navRightBinding = keymap.bind(
    "meta+right",
    createHandler("Navigate Forward", () => cx.notify())
  );
  if (navRightBinding) {
    activeBindings.push(navRightBinding);
  }

  const navUpBinding = keymap.bind(
    "meta+up",
    createHandler("Navigate Up", () => cx.notify())
  );
  if (navUpBinding) {
    activeBindings.push(navUpBinding);
  }

  const navDownBinding = keymap.bind(
    "meta+down",
    createHandler("Navigate Down", () => cx.notify())
  );
  if (navDownBinding) {
    activeBindings.push(navDownBinding);
  }

  // Function keys
  const f1Binding = keymap.bind(
    "f1",
    createHandler("Help (F1)", () => cx.notify())
  );
  if (f1Binding) {
    activeBindings.push(f1Binding);
  }

  const f2Binding = keymap.bind(
    "f2",
    createHandler("Rename (F2)", () => cx.notify())
  );
  if (f2Binding) {
    activeBindings.push(f2Binding);
  }

  const f3Binding = keymap.bind(
    "f3",
    createHandler("Search (F3)", () => cx.notify())
  );
  if (f3Binding) {
    activeBindings.push(f3Binding);
  }

  // Debug hotkey
  const debugBinding = keymap.bind("meta+shift+d", () => {
    keymapDebugEnabled = !keymapDebugEnabled;
    if (keymapDebugEnabled) {
      KeymapDebugger.enableLogging();
      addNotification("Debug mode enabled");
    } else {
      KeymapDebugger.disableLogging();
      addNotification("Debug mode disabled");
    }
    cx.notify();
  });
  if (debugBinding) {
    activeBindings.push(debugBinding);
  }
}

export const HOTKEYS_DEMO: Demo = {
  name: "Hotkeys",
  renderElement: (cx, _state): DemoItem[] => {
    // Initialize hotkeys if not already done
    if (activeBindings.length === 0) {
      setupDemoHotkeys(cx);
    }

    // Get theme colors
    const theme = cx.getTheme();

    // Check if Shift is currently pressed (for UI indication)
    const keymap = cx.window.getKeymap();
    const shiftPressed = keymap.isModifierPressed("shift");

    // Format some common hotkeys for display
    const saveFormat = formatKeystrokeString("meta+s") ?? "Meta+S";
    const undoFormat = formatKeystrokeString("meta+z") ?? "Meta+Z";
    const redoFormat = formatKeystrokeString("meta+shift+z") ?? "Meta+Shift+Z";
    const selectAllFormat = formatKeystrokeString("meta+a") ?? "Meta+A";
    const debugFormat = formatKeystrokeString("meta+shift+d") ?? "Meta+Shift+D";

    const elements: DemoItem[] = [
      text("Keyboard shortcuts with type-safe bindings and OS-specific formatting"),
      separator(),

      // Status display
      h2("Status"),
      div()
        .flex()
        .flexCol()
        .gap(8)
        .children(
          div()
            .flex()
            .flexRow()
            .gap(12)
            .children(
              text("Last Action:"),
              div().child(mono(lastAction)).textColor(theme.components.link.foreground),
              text(`(Total: ${actionCounter})`)
            ),
          div()
            .flex()
            .flexRow()
            .gap(12)
            .children(
              text("Shift Pressed:"),
              div()
                .child(mono(shiftPressed ? "Yes" : "No"))
                .textColor(shiftPressed ? theme.semantic.status.success : theme.semantic.text.muted)
            ),
          div()
            .flex()
            .flexRow()
            .gap(12)
            .children(
              text("Debug Mode:"),
              div()
                .child(mono(keymapDebugEnabled ? "Enabled" : "Disabled"))
                .textColor(
                  keymapDebugEnabled ? theme.semantic.status.warning : theme.semantic.text.muted
                ),
              text(`(Press ${debugFormat} to toggle)`)
            )
        ),

      // Notifications
      ...(notifications.length > 0 ? [h2("Notifications")] : []),
      ...(notifications.length > 0
        ? [
            div()
              .flex()
              .flexCol()
              .gap(4)
              .children(
                ...notifications.map((notif) =>
                  div()
                    .bg(theme.semantic.surface.muted)
                    .rounded(4)
                    .px(8)
                    .py(4)
                    .flex()
                    .flexRow()
                    .gap(8)
                    .children(
                      div()
                        .child(mono(new Date(notif.timestamp).toLocaleTimeString()))
                        .textColor(theme.semantic.text.muted),
                      text(notif.message)
                    )
                )
              ),
          ]
        : []),

      // Available hotkeys
      h2("Available Hotkeys"),
      text("Try pressing these key combinations:"),

      div()
        .flex()
        .flexCol()
        .gap(12)
        .mt(12)
        .children(
          // Editor shortcuts
          div()
            .flex()
            .flexCol()
            .gap(4)
            .children(
              text("Editor Actions").weight(600),
              div()
                .grid()
                .gridCols(2)
                .gap(8)
                .children(
                  hotkeyRow(saveFormat, "Save", theme),
                  hotkeyRow(undoFormat, "Undo", theme),
                  hotkeyRow(redoFormat, "Redo", theme),
                  hotkeyRow(selectAllFormat, "Select All", theme),
                  hotkeyRow(formatKeystrokeString("meta+c") ?? "Meta+C", "Copy", theme),
                  hotkeyRow(formatKeystrokeString("meta+v") ?? "Meta+V", "Paste", theme)
                )
            ),

          // Navigation
          div()
            .flex()
            .flexCol()
            .gap(4)
            .children(
              text("Navigation").weight(600),
              div()
                .grid()
                .gridCols(2)
                .gap(8)
                .children(
                  hotkeyRow(
                    formatKeystrokeString("meta+left") ?? "Meta+Left",
                    "Navigate Back",
                    theme
                  ),
                  hotkeyRow(
                    formatKeystrokeString("meta+right") ?? "Meta+Right",
                    "Navigate Forward",
                    theme
                  ),
                  hotkeyRow(formatKeystrokeString("meta+up") ?? "Meta+Up", "Navigate Up", theme),
                  hotkeyRow(
                    formatKeystrokeString("meta+down") ?? "Meta+Down",
                    "Navigate Down",
                    theme
                  )
                )
            ),

          // Function keys
          div()
            .flex()
            .flexCol()
            .gap(4)
            .children(
              text("Function Keys").weight(600),
              div()
                .grid()
                .gridCols(2)
                .gap(8)
                .children(
                  hotkeyRow(formatKeystrokeString("f1") ?? "F1", "Help", theme),
                  hotkeyRow(formatKeystrokeString("f2") ?? "F2", "Rename", theme),
                  hotkeyRow(formatKeystrokeString("f3") ?? "F3", "Search", theme)
                )
            )
        ),

      // Actions
      h2("Actions"),
      div()
        .flex()
        .flexRow()
        .gap(12)
        .children(
          button("Reset Demo")
            .secondary()
            .onClick(() => {
              resetDemo();
              setupDemoHotkeys(cx);
              cx.notify();
            }),
          button("List All Bindings")
            .outline()
            .onClick(() => {
              const allBindings = KeymapDebugger.listAll(keymap);
              log.info("all registered key bindings:", allBindings);
              addNotification(`Listed ${allBindings.length} bindings in console`);
              cx.notify();
            }),
          button("Find Conflicts")
            .outline()
            .onClick(() => {
              const conflicts = KeymapDebugger.findConflicts(keymap);
              log.info("Key binding conflicts:", conflicts);
              const conflictCount = conflicts.size;
              addNotification(
                conflictCount > 0
                  ? `Found ${conflictCount} conflicts (see console)`
                  : "No conflicts found"
              );
              cx.notify();
            })
        ),

      // Code examples
      h2("Code Examples"),
      div()
        .flex()
        .flexCol()
        .gap(12)
        .children(
          codeExample(
            "Simple Binding",
            theme,
            `const keymap = window.getKeymap();
const handle = keymap.bind("meta+s", (cx, window) => {
  console.log("Save triggered");
});

// Clean up when done
handle.unbind();`
          ),
          codeExample(
            "Named Action",
            theme,
            `keymap.bind("meta+s", {
  name: "file:save",
  label: "Save File",
  handler: (cx, window) => save()
});`
          ),
          codeExample(
            "Check Modifiers",
            theme,
            `if (keymap.isModifierPressed("shift")) {
  // Multi-select behavior
}`
          ),
          codeExample(
            "Format for Display",
            theme,
            `const formatted = formatKeystrokeString("meta+s");
// Returns "⌘S" on Mac, "Ctrl+S" on Windows`
          )
        ),
    ];

    return elements;
  },
};

function hotkeyRow(keys: string, description: string, theme: Theme) {
  return div()
    .flex()
    .flexRow()
    .gap(8)
    .itemsCenter()
    .children(
      div().bg(theme.semantic.surface.muted).rounded(4).px(6).py(2).child(mono(keys).size(13)),
      text(description).color(theme.semantic.text.muted)
    );
}

function codeExample(title: string, theme: Theme, code: string) {
  return div()
    .flex()
    .flexCol()
    .gap(4)
    .children(
      text(title).weight(600).color(theme.semantic.text.default),
      div()
        .bg(theme.components.mono.background)
        .rounded(6)
        .p(12)
        .child(mono(code).size(12).lineHeight(1.5))
    );
}
