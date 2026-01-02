import {
  button,
  div,
  divider,
  text,
  mono,
  h2,
  hotkey,
  hotkeys,
  isHotkeyPressed,
  formatHotkey,
  Hotkey,
  HotkeyDebugger,
  type HotkeyDisposable,
  type GladeViewContext,
  type GladeView,
  type Theme,
} from "@glade/glade";
import type { Demo, DemoItem } from "./demo";

// Track demo state for hotkey actions
let actionCounter = 0;
let lastAction = "None";
let activeHotkeys: HotkeyDisposable[] = [];
let hotkeyDebugEnabled = false;
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
  // Clean up existing hotkeys
  activeHotkeys.forEach((h) => h.dispose());
  activeHotkeys = [];

  // Reset state
  actionCounter = 0;
  lastAction = "None";
  notifications = [];
  hotkeyDebugEnabled = false;
}

function setupDemoHotkeys(cx: GladeViewContext<GladeView>) {
  // Clean up any existing hotkeys
  resetDemo();

  // Single hotkey binding
  const saveHotkey = hotkey([Hotkey.Meta, Hotkey.S], (_cx, _window) => {
    lastAction = "Save triggered";
    actionCounter++;
    addNotification(`Save action triggered (count: ${actionCounter})`);
    cx.notify();
  });
  activeHotkeys.push(saveHotkey);

  // Multiple hotkeys at once
  const editorHotkeys = hotkeys(
    {
      "meta+z": (_cx, _window) => {
        lastAction = "Undo triggered";
        actionCounter++;
        addNotification(`Undo action triggered`);
        cx.notify();
      },
      "meta+shift+z": (_cx, _window) => {
        lastAction = "Redo triggered";
        actionCounter++;
        addNotification(`Redo action triggered`);
        cx.notify();
      },
      "meta+a": (_cx, _window) => {
        lastAction = "Select All triggered";
        actionCounter++;
        addNotification(`Select All triggered`);
        cx.notify();
      },
      "meta+c": (_cx, _window) => {
        lastAction = "Copy triggered";
        actionCounter++;
        addNotification(`Copy triggered`);
        cx.notify();
      },
      "meta+v": (_cx, _window) => {
        lastAction = "Paste triggered";
        actionCounter++;
        addNotification(`Paste triggered`);
        cx.notify();
      },
    },
    { description: "Editor shortcuts" }
  );
  activeHotkeys.push(editorHotkeys);

  // Navigation hotkeys
  const navHotkeys = hotkeys({
    "meta+left": (_cx, _window) => {
      lastAction = "Navigate Back";
      addNotification(`Navigate back`);
      cx.notify();
    },
    "meta+right": (_cx, _window) => {
      lastAction = "Navigate Forward";
      addNotification(`Navigate forward`);
      cx.notify();
    },
    "meta+up": (_cx, _window) => {
      lastAction = "Navigate Up";
      addNotification(`Navigate up`);
      cx.notify();
    },
    "meta+down": (_cx, _window) => {
      lastAction = "Navigate Down";
      addNotification(`Navigate down`);
      cx.notify();
    },
  });
  activeHotkeys.push(navHotkeys);

  // Function keys
  const fnHotkeys = hotkeys({
    f1: (_cx, _window) => {
      lastAction = "Help opened";
      addNotification(`Help (F1)`);
      cx.notify();
    },
    f2: (_cx, _window) => {
      lastAction = "Rename triggered";
      addNotification(`Rename (F2)`);
      cx.notify();
    },
    f3: (_cx, _window) => {
      lastAction = "Search triggered";
      addNotification(`Search (F3)`);
      cx.notify();
    },
  });
  activeHotkeys.push(fnHotkeys);

  // Debug hotkey
  const debugHotkey = hotkey([Hotkey.Meta, Hotkey.Shift, Hotkey.D], (_cx, _window) => {
    hotkeyDebugEnabled = !hotkeyDebugEnabled;
    if (hotkeyDebugEnabled) {
      HotkeyDebugger.enableLogging();
      addNotification(`Debug mode enabled`);
    } else {
      HotkeyDebugger.disableLogging();
      addNotification(`Debug mode disabled`);
    }
    cx.notify();
  });
  activeHotkeys.push(debugHotkey);
}

export const HOTKEYS_DEMO: Demo = {
  name: "Hotkeys",
  renderElement: (cx, _state): DemoItem[] => {
    // Initialize hotkeys if not already done
    if (activeHotkeys.length === 0) {
      setupDemoHotkeys(cx);
    }

    // Get theme colors
    const theme = cx.getTheme();

    // Check if Shift is currently pressed (for UI indication)
    const shiftPressed = isHotkeyPressed([Hotkey.Shift]);

    // Format some common hotkeys for display
    const saveFormat = formatHotkey([Hotkey.Meta, Hotkey.S]);
    const undoFormat = formatHotkey([Hotkey.Meta, Hotkey.Z]);
    const redoFormat = formatHotkey([Hotkey.Meta, Hotkey.Shift, Hotkey.Z]);
    const selectAllFormat = formatHotkey([Hotkey.Meta, Hotkey.A]);
    const debugFormat = formatHotkey([Hotkey.Meta, Hotkey.Shift, Hotkey.D]);

    const elements: DemoItem[] = [
      text("Keyboard shortcuts with type-safe bindings and OS-specific formatting"),
      divider().color(theme.semantic.border.default),

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
                .child(mono(hotkeyDebugEnabled ? "Enabled" : "Disabled"))
                .textColor(
                  hotkeyDebugEnabled ? theme.semantic.status.warning : theme.semantic.text.muted
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
                  hotkeyRow(formatHotkey([Hotkey.Meta, Hotkey.C]), "Copy", theme),
                  hotkeyRow(formatHotkey([Hotkey.Meta, Hotkey.V]), "Paste", theme)
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
                  hotkeyRow(formatHotkey([Hotkey.Meta, Hotkey.Left]), "Navigate Back", theme),
                  hotkeyRow(formatHotkey([Hotkey.Meta, Hotkey.Right]), "Navigate Forward", theme),
                  hotkeyRow(formatHotkey([Hotkey.Meta, Hotkey.Up]), "Navigate Up", theme),
                  hotkeyRow(formatHotkey([Hotkey.Meta, Hotkey.Down]), "Navigate Down", theme)
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
                  hotkeyRow(formatHotkey([Hotkey.F1]), "Help", theme),
                  hotkeyRow(formatHotkey([Hotkey.F2]), "Rename", theme),
                  hotkeyRow(formatHotkey([Hotkey.F3]), "Search", theme)
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
          button("List All Hotkeys")
            .outline()
            .onClick(() => {
              const allBindings = HotkeyDebugger.listAll();
              console.log("All registered hotkeys:", allBindings);
              addNotification(`Listed ${allBindings.length} hotkeys in console`);
              cx.notify();
            }),
          button("Find Conflicts")
            .outline()
            .onClick(() => {
              const conflicts = HotkeyDebugger.findConflicts();
              console.log("Hotkey conflicts:", conflicts);
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
            `const saveHotkey = hotkey([Hotkey.Meta, Hotkey.S], (cx, window) => {
  console.log("Save triggered");
});

// Clean up when done
saveHotkey.dispose();`
          ),
          codeExample(
            "Multiple Bindings",
            theme,
            `const editorHotkeys = hotkeys({
  "meta+s": () => save(),
  "meta+z": () => undo(),
  "meta+shift+z": () => redo(),
});`
          ),
          codeExample(
            "Check if Pressed",
            theme,
            `if (isHotkeyPressed([Hotkey.Shift])) {
  // Multi-select behavior
}`
          ),
          codeExample(
            "Format for Display",
            theme,
            `const formatted = formatHotkey([Hotkey.Meta, Hotkey.S]);
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
