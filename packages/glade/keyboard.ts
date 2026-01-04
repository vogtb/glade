/**
 * Keyboard event types for Glade.
 *
 * Extends the core event types with Glade-specific functionality.
 */

import type { KeyEvent } from "@glade/core";
import { coreModsToGladeMods } from "@glade/core";

import type { Modifiers } from "./dispatch.ts";

/**
 * Common key codes (GLFW-compatible).
 */
export const Key = {
  // Printable keys
  Space: 32,
  Apostrophe: 39,
  Comma: 44,
  Minus: 45,
  Period: 46,
  Slash: 47,
  Num0: 48,
  Num1: 49,
  Num2: 50,
  Num3: 51,
  Num4: 52,
  Num5: 53,
  Num6: 54,
  Num7: 55,
  Num8: 56,
  Num9: 57,
  Semicolon: 59,
  Equal: 61,
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
  LeftBracket: 91,
  Backslash: 92,
  RightBracket: 93,
  GraveAccent: 96,

  // Function keys
  Escape: 256,
  Enter: 257,
  Tab: 258,
  Backspace: 259,
  Insert: 260,
  Delete: 261,
  Right: 262,
  Left: 263,
  Down: 264,
  Up: 265,
  PageUp: 266,
  PageDown: 267,
  Home: 268,
  End: 269,
  CapsLock: 280,
  ScrollLock: 281,
  NumLock: 282,
  PrintScreen: 283,
  Pause: 284,
  F1: 290,
  F2: 291,
  F3: 292,
  F4: 293,
  F5: 294,
  F6: 295,
  F7: 296,
  F8: 297,
  F9: 298,
  F10: 299,
  F11: 300,
  F12: 301,

  // Modifier keys
  LeftShift: 340,
  LeftControl: 341,
  LeftAlt: 342,
  LeftSuper: 343,
  RightShift: 344,
  RightControl: 345,
  RightAlt: 346,
  RightSuper: 347,
  Menu: 348,
} as const;

export type KeyCode = (typeof Key)[keyof typeof Key];

/**
 * Keystroke representation for keybinding matching.
 */
export interface Keystroke {
  key: KeyCode;
  modifiers: Modifiers;
}

/**
 * Parse a keystroke string like "ctrl+shift+a" into a Keystroke.
 */
export function parseKeystroke(str: string): Keystroke | null {
  const parts = str.toLowerCase().split("+");
  const modifiers: Modifiers = {
    shift: false,
    ctrl: false,
    alt: false,
    meta: false,
  };

  let keyPart: string | null = null;

  for (const part of parts) {
    switch (part) {
      case "shift":
        modifiers.shift = true;
        break;
      case "ctrl":
      case "control":
        modifiers.ctrl = true;
        break;
      case "alt":
      case "option":
        modifiers.alt = true;
        break;
      case "meta":
      case "cmd":
      case "command":
      case "super":
      case "win":
        modifiers.meta = true;
        break;
      default:
        keyPart = part;
    }
  }

  if (!keyPart) {
    return null;
  }

  const key = keyNameToCode(keyPart);
  if (key === null) {
    return null;
  }

  return { key, modifiers };
}

/**
 * Convert a key name to a key code.
 */
function keyNameToCode(name: string): KeyCode | null {
  // Single letter
  if (name.length === 1 && name >= "a" && name <= "z") {
    return name.toUpperCase().charCodeAt(0) as KeyCode;
  }

  // Single digit
  if (name.length === 1 && name >= "0" && name <= "9") {
    return name.charCodeAt(0) as KeyCode;
  }

  // Named keys
  const namedKeys: Record<string, KeyCode> = {
    space: Key.Space,
    enter: Key.Enter,
    return: Key.Enter,
    tab: Key.Tab,
    backspace: Key.Backspace,
    delete: Key.Delete,
    escape: Key.Escape,
    esc: Key.Escape,
    up: Key.Up,
    down: Key.Down,
    left: Key.Left,
    right: Key.Right,
    home: Key.Home,
    end: Key.End,
    pageup: Key.PageUp,
    pagedown: Key.PageDown,
    f1: Key.F1,
    f2: Key.F2,
    f3: Key.F3,
    f4: Key.F4,
    f5: Key.F5,
    f6: Key.F6,
    f7: Key.F7,
    f8: Key.F8,
    f9: Key.F9,
    f10: Key.F10,
    f11: Key.F11,
    f12: Key.F12,
  };

  return namedKeys[name] ?? null;
}

/**
 * Check if a key event matches a keystroke.
 */
export function matchesKeystroke(event: KeyEvent, keystroke: Keystroke): boolean {
  if (event.key !== keystroke.key) {
    return false;
  }

  const eventMods = coreModsToGladeMods(event.mods);
  return (
    eventMods.shift === keystroke.modifiers.shift &&
    eventMods.ctrl === keystroke.modifiers.ctrl &&
    eventMods.alt === keystroke.modifiers.alt &&
    eventMods.meta === keystroke.modifiers.meta
  );
}

/**
 * Format a keystroke as a human-readable string.
 */
export function formatKeystroke(keystroke: Keystroke): string {
  const parts: string[] = [];

  if (keystroke.modifiers.ctrl) parts.push("Ctrl");
  if (keystroke.modifiers.alt) parts.push("Alt");
  if (keystroke.modifiers.shift) parts.push("Shift");
  if (keystroke.modifiers.meta) parts.push("Cmd");

  const keyName = keyCodeToName(keystroke.key);
  if (keyName) parts.push(keyName);

  return parts.join("+");
}

/**
 * Convert a key code to a display name.
 */
function keyCodeToName(code: KeyCode): string | null {
  // Letters
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(code);
  }

  // Numbers
  if (code >= 48 && code <= 57) {
    return String.fromCharCode(code);
  }

  const names: Partial<Record<KeyCode, string>> = {
    [Key.Space]: "Space",
    [Key.Enter]: "Enter",
    [Key.Tab]: "Tab",
    [Key.Backspace]: "Backspace",
    [Key.Delete]: "Delete",
    [Key.Escape]: "Escape",
    [Key.Up]: "Up",
    [Key.Down]: "Down",
    [Key.Left]: "Left",
    [Key.Right]: "Right",
    [Key.Home]: "Home",
    [Key.End]: "End",
    [Key.PageUp]: "PageUp",
    [Key.PageDown]: "PageDown",
    [Key.F1]: "F1",
    [Key.F2]: "F2",
    [Key.F3]: "F3",
    [Key.F4]: "F4",
    [Key.F5]: "F5",
    [Key.F6]: "F6",
    [Key.F7]: "F7",
    [Key.F8]: "F8",
    [Key.F9]: "F9",
    [Key.F10]: "F10",
    [Key.F11]: "F11",
    [Key.F12]: "F12",
  };

  return names[code] ?? null;
}
