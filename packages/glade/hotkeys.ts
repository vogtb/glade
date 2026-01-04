/**
 * Hotkeys utility for Glade.
 *
 * Provides a simple, ergonomic API for binding keyboard shortcuts
 * to actions, with support for:
 * - Type-safe hotkey combinations
 * - OS-specific formatting
 * - Context-aware bindings
 * - Disposable pattern for cleanup
 */

import { type Action, ActionRegistry, Keymap } from "./actions.ts";
import type { GladeContext } from "./context.ts";
import type { FocusContext } from "./focus.ts";
import type { GladeWindow } from "./window.ts";

/**
 * Type-safe hotkey enum for all supported keys.
 */
export enum Hotkey {
  // Modifiers (in display order)
  Meta = "meta",
  Shift = "shift",
  Alt = "alt",
  Ctrl = "ctrl",

  // Letters
  A = "a",
  B = "b",
  C = "c",
  D = "d",
  E = "e",
  F = "f",
  G = "g",
  H = "h",
  I = "i",
  J = "j",
  K = "k",
  L = "l",
  M = "m",
  N = "n",
  O = "o",
  P = "p",
  Q = "q",
  R = "r",
  S = "s",
  T = "t",
  U = "u",
  V = "v",
  W = "w",
  X = "x",
  Y = "y",
  Z = "z",

  // Numbers
  Digit0 = "0",
  Digit1 = "1",
  Digit2 = "2",
  Digit3 = "3",
  Digit4 = "4",
  Digit5 = "5",
  Digit6 = "6",
  Digit7 = "7",
  Digit8 = "8",
  Digit9 = "9",

  // Punctuation
  Backquote = "`",
  Minus = "-",
  Equal = "=",
  BracketLeft = "[",
  BracketRight = "]",
  Backslash = "\\",
  Semicolon = ";",
  Quote = "'",
  Comma = ",",
  Period = ".",
  Slash = "/",

  // Special keys
  Space = "space",
  Enter = "enter",
  Escape = "escape",
  Backspace = "backspace",
  Tab = "tab",
  Delete = "delete",
  Home = "home",
  End = "end",
  PageUp = "pageup",
  PageDown = "pagedown",

  // Arrow keys
  Up = "up",
  Down = "down",
  Left = "left",
  Right = "right",

  // Function keys
  F1 = "f1",
  F2 = "f2",
  F3 = "f3",
  F4 = "f4",
  F5 = "f5",
  F6 = "f6",
  F7 = "f7",
  F8 = "f8",
  F9 = "f9",
  F10 = "f10",
  F11 = "f11",
  F12 = "f12",
}

/**
 * A combination of keys that form a hotkey.
 */
export type HotkeyCombo = Hotkey[];

/**
 * Handler function for hotkey activation.
 */
export type HotkeyHandler = (cx: GladeContext, window: GladeWindow) => void;

/**
 * Options for hotkey binding.
 */
export interface HotkeyOptions {
  /** Focus context where this hotkey is active. */
  context?: FocusContext;
  /** Whether the hotkey is enabled. */
  enabled?: boolean;
  /** Human-readable description. */
  description?: string;
  /** Prevent default action. */
  preventDefault?: boolean;
  /** Stop event propagation. */
  stopPropagation?: boolean;
}

/**
 * Internal hotkey binding representation.
 */
interface HotkeyBinding {
  id: string;
  combo: HotkeyCombo;
  handler: HotkeyHandler;
  context?: FocusContext;
  enabled: boolean;
  description?: string;
  actionName: string;
}

/**
 * Disposable handle for cleaning up hotkey bindings.
 */
export interface HotkeyDisposable {
  /** Remove this hotkey binding. */
  dispose(): void;
  /** Enable or disable the hotkey. */
  setEnabled(enabled: boolean): void;
}

// Note: MODIFIER_KEYS could be used for validation in future
// const MODIFIER_KEYS = new Set([Hotkey.Meta, Hotkey.Shift, Hotkey.Ctrl, Hotkey.Alt]);

/**
 * Map GLFW key codes to Hotkey enum values.
 */
export function keyCodeToHotkey(keyCode: number): Hotkey | null {
  // Letters (A=65 to Z=90)
  if (keyCode >= 65 && keyCode <= 90) {
    return String.fromCharCode(keyCode).toLowerCase() as Hotkey;
  }

  // Numbers (0=48 to 9=57)
  if (keyCode >= 48 && keyCode <= 57) {
    return String.fromCharCode(keyCode) as Hotkey;
  }

  // Special key mapping
  const keyMap: Partial<Record<number, Hotkey>> = {
    32: Hotkey.Space,
    39: Hotkey.Quote,
    44: Hotkey.Comma,
    45: Hotkey.Minus,
    46: Hotkey.Period,
    47: Hotkey.Slash,
    59: Hotkey.Semicolon,
    61: Hotkey.Equal,
    91: Hotkey.BracketLeft,
    92: Hotkey.Backslash,
    93: Hotkey.BracketRight,
    96: Hotkey.Backquote,
    256: Hotkey.Escape,
    257: Hotkey.Enter,
    258: Hotkey.Tab,
    259: Hotkey.Backspace,
    261: Hotkey.Delete,
    262: Hotkey.Right,
    263: Hotkey.Left,
    264: Hotkey.Down,
    265: Hotkey.Up,
    266: Hotkey.PageUp,
    267: Hotkey.PageDown,
    268: Hotkey.Home,
    269: Hotkey.End,
    290: Hotkey.F1,
    291: Hotkey.F2,
    292: Hotkey.F3,
    293: Hotkey.F4,
    294: Hotkey.F5,
    295: Hotkey.F6,
    296: Hotkey.F7,
    297: Hotkey.F8,
    298: Hotkey.F9,
    299: Hotkey.F10,
    300: Hotkey.F11,
    301: Hotkey.F12,
  };

  return keyMap[keyCode] ?? null;
}

/**
 * Extract modifier hotkeys from key event modifiers.
 */
export function getModifierHotkeys(mods: number): Hotkey[] {
  const modifiers: Hotkey[] = [];
  if (mods & 0x01) modifiers.push(Hotkey.Shift);
  if (mods & 0x02) modifiers.push(Hotkey.Ctrl);
  if (mods & 0x04) modifiers.push(Hotkey.Alt);
  if (mods & 0x08) modifiers.push(Hotkey.Meta);
  return modifiers;
}

/**
 * Mac symbols for keys.
 */
const MAC_SYMBOLS: Partial<Record<Hotkey, string>> = {
  [Hotkey.Meta]: "⌘",
  [Hotkey.Shift]: "⇧",
  [Hotkey.Alt]: "⌥",
  [Hotkey.Ctrl]: "⌃",
  [Hotkey.Enter]: "↩",
  [Hotkey.Backspace]: "⌫",
  [Hotkey.Delete]: "⌦",
  [Hotkey.Escape]: "⎋",
  [Hotkey.Tab]: "⇥",
  [Hotkey.Up]: "↑",
  [Hotkey.Down]: "↓",
  [Hotkey.Left]: "←",
  [Hotkey.Right]: "→",
  [Hotkey.Space]: "␣",
};

/**
 * Windows symbols for keys.
 */
const WINDOWS_SYMBOLS: Partial<Record<Hotkey, string>> = {
  [Hotkey.Meta]: "⊞",
  [Hotkey.Shift]: "⇧",
  [Hotkey.Alt]: "Alt",
  [Hotkey.Ctrl]: "Ctrl",
  [Hotkey.Enter]: "↩",
  [Hotkey.Backspace]: "⌫",
  [Hotkey.Delete]: "Del",
  [Hotkey.Escape]: "Esc",
  [Hotkey.Tab]: "Tab",
  [Hotkey.Up]: "↑",
  [Hotkey.Down]: "↓",
  [Hotkey.Left]: "←",
  [Hotkey.Right]: "→",
  [Hotkey.Space]: "Space",
};

/**
 * Convert a hotkey combo to a string for parsing.
 */
function hotkeyComboToString(combo: HotkeyCombo): string {
  return combo.join("+");
}

/**
 * Parse a hotkey string into a combo.
 */
function parseHotkeyString(str: string): HotkeyCombo {
  const parts = str
    .toLowerCase()
    .split("+")
    .map((p) => p.trim());
  const combo: HotkeyCombo = [];

  for (const part of parts) {
    // Check if it's a valid Hotkey enum value
    const hotkey = Object.values(Hotkey).find((h) => h === part);
    if (hotkey) {
      combo.push(hotkey as Hotkey);
    }
  }

  return combo;
}

/**
 * Detect if running on macOS.
 */
function isMacOS(): boolean {
  if (typeof globalThis !== "undefined" && "navigator" in globalThis) {
    const nav = globalThis.navigator as Navigator;
    return /Mac|iPhone|iPad|iPod/.test(nav.userAgent);
  }
  // For native platform, check process.platform if available
  if (typeof globalThis !== "undefined" && "process" in globalThis) {
    const proc = (globalThis as Record<string, unknown>).process as { platform?: string };
    return proc.platform === "darwin";
  }
  return false;
}

/**
 * Generate a unique action name for a hotkey.
 */
let actionCounter = 0;
function generateActionName(): string {
  return `hotkey:auto-${++actionCounter}`;
}

/**
 * Implementation of HotkeyDisposable.
 */
class HotkeyBindingDisposable implements HotkeyDisposable {
  constructor(
    private manager: HotkeyManager,
    private bindingIds: string[]
  ) {}

  dispose(): void {
    for (const id of this.bindingIds) {
      this.manager.unbind(id);
    }
  }

  setEnabled(enabled: boolean): void {
    for (const id of this.bindingIds) {
      this.manager.setBindingEnabled(id, enabled);
    }
  }
}

/**
 * Manages hotkey bindings for a window.
 */
export class HotkeyManager {
  private bindings = new Map<string, HotkeyBinding>();
  private pressedKeys = new Set<Hotkey>();
  private bindingCounter = 0;

  constructor(
    private registry: ActionRegistry,
    private keymap: Keymap
  ) {}

  /**
   * Bind a hotkey combination to a handler.
   */
  bind(combo: HotkeyCombo, handler: HotkeyHandler, options?: HotkeyOptions): HotkeyDisposable {
    const id = `binding-${++this.bindingCounter}`;
    const actionName = generateActionName();

    // Register the action
    const action: Action = {
      name: actionName,
      label: options?.description,
      handler,
    };
    this.registry.register(action);

    // Bind the key combination
    const keystrokeStr = hotkeyComboToString(combo);
    this.keymap.bind(keystrokeStr, actionName, options?.context ?? null);

    // Store the binding
    const binding: HotkeyBinding = {
      id,
      combo,
      handler,
      context: options?.context,
      enabled: options?.enabled ?? true,
      description: options?.description,
      actionName,
    };
    this.bindings.set(id, binding);

    return new HotkeyBindingDisposable(this, [id]);
  }

  /**
   * Bind multiple hotkeys at once.
   */
  bindAll(bindings: Record<string, HotkeyHandler>, options?: HotkeyOptions): HotkeyDisposable {
    const ids: string[] = [];

    for (const [comboStr, handler] of Object.entries(bindings)) {
      const combo = parseHotkeyString(comboStr);
      const disposable = this.bind(combo, handler, options);
      // Extract the binding IDs from the disposable
      const bindingDisposable = disposable as HotkeyBindingDisposable;
      ids.push(...bindingDisposable["bindingIds"]);
    }

    return new HotkeyBindingDisposable(this, ids);
  }

  /**
   * Remove a hotkey binding.
   */
  unbind(id: string): void {
    const binding = this.bindings.get(id);
    if (!binding) {
      return;
    }

    // Unregister the action
    this.registry.unregister(binding.actionName);

    // Remove the key binding
    this.keymap.unbind(binding.actionName);

    // Remove from our tracking
    this.bindings.delete(id);
  }

  /**
   * Enable or disable a binding.
   */
  setBindingEnabled(id: string, enabled: boolean): void {
    const binding = this.bindings.get(id);
    if (binding) {
      binding.enabled = enabled;
      // TODO: Implement enable/disable in keymap
    }
  }

  /**
   * Check if a hotkey combination is currently pressed.
   */
  isPressed(combo: HotkeyCombo): boolean {
    return combo.every((key) => this.pressedKeys.has(key));
  }

  /**
   * Update the set of pressed keys.
   */
  updatePressedKeys(key: Hotkey, pressed: boolean): void {
    if (pressed) {
      this.pressedKeys.add(key);
    } else {
      this.pressedKeys.delete(key);
    }
  }

  /**
   * Format a hotkey combination for display.
   */
  format(combo: HotkeyCombo, platform?: "macos" | "windows"): string {
    const isMac = platform === "macos" || isMacOS();
    const symbols = isMac ? MAC_SYMBOLS : WINDOWS_SYMBOLS;

    if (isMac) {
      // On Mac, show symbols concatenated
      return combo.map((key) => symbols[key] || key.toUpperCase()).join("");
    } else {
      // On Windows/Linux, show with + separator
      return combo.map((key) => symbols[key] || key.toUpperCase()).join("+");
    }
  }

  /**
   * Get all active bindings.
   */
  getAllBindings(): HotkeyBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * Find conflicting bindings.
   */
  findConflicts(): Map<string, HotkeyBinding[]> {
    const conflicts = new Map<string, HotkeyBinding[]>();

    for (const binding of this.bindings.values()) {
      const key = `${hotkeyComboToString(binding.combo)}-${binding.context ?? "global"}`;
      const existing = conflicts.get(key) || [];
      existing.push(binding);
      if (existing.length > 1) {
        conflicts.set(key, existing);
      }
    }

    // Only return actual conflicts
    const actualConflicts = new Map<string, HotkeyBinding[]>();
    for (const [key, bindings] of conflicts) {
      if (bindings.length > 1) {
        actualConflicts.set(key, bindings);
      }
    }

    return actualConflicts;
  }
}

// Global hotkey manager instance (will be set by window)
let globalManager: HotkeyManager | null = null;

/**
 * Set the global hotkey manager (called by GladeWindow).
 */
export function setGlobalHotkeyManager(manager: HotkeyManager): void {
  globalManager = manager;
}

/**
 * Get the global hotkey manager.
 */
export function getGlobalHotkeyManager(): HotkeyManager | null {
  return globalManager;
}

/**
 * Bind a hotkey with a direct handler.
 */
export function hotkey(
  combo: HotkeyCombo | string,
  handler: HotkeyHandler,
  options?: HotkeyOptions
): HotkeyDisposable {
  const manager = getGlobalHotkeyManager();
  if (!manager) {
    throw new Error("HotkeyManager not initialized. Ensure GladeWindow is created first.");
  }

  const parsedCombo = typeof combo === "string" ? parseHotkeyString(combo) : combo;
  return manager.bind(parsedCombo, handler, options);
}

/**
 * Bind multiple hotkeys at once.
 */
export function hotkeys(
  bindings: Record<string, HotkeyHandler>,
  options?: HotkeyOptions
): HotkeyDisposable {
  const manager = getGlobalHotkeyManager();
  if (!manager) {
    throw new Error("HotkeyManager not initialized. Ensure GladeWindow is created first.");
  }

  return manager.bindAll(bindings, options);
}

/**
 * Check if a hotkey is currently pressed.
 */
export function isHotkeyPressed(combo: HotkeyCombo | string): boolean {
  const manager = getGlobalHotkeyManager();
  if (!manager) {
    return false;
  }

  const parsedCombo = typeof combo === "string" ? parseHotkeyString(combo) : combo;
  return manager.isPressed(parsedCombo);
}

/**
 * Format a hotkey for display.
 */
export function formatHotkey(combo: HotkeyCombo | string, platform?: "macos" | "windows"): string {
  const manager = getGlobalHotkeyManager();
  if (!manager) {
    // Fallback formatting without manager
    const parsedCombo = typeof combo === "string" ? parseHotkeyString(combo) : combo;
    const isMac = platform === "macos" || isMacOS();
    const symbols = isMac ? MAC_SYMBOLS : WINDOWS_SYMBOLS;

    if (isMac) {
      return parsedCombo.map((key) => symbols[key] || key.toUpperCase()).join("");
    } else {
      return parsedCombo.map((key) => symbols[key] || key.toUpperCase()).join("+");
    }
  }

  const parsedCombo = typeof combo === "string" ? parseHotkeyString(combo) : combo;
  return manager.format(parsedCombo, platform);
}

/**
 * Debug utilities for hotkeys.
 */
export class HotkeyDebugger {
  private static loggingEnabled = false;

  /**
   * List all active hotkeys.
   */
  static listAll(): HotkeyBinding[] {
    const manager = getGlobalHotkeyManager();
    return manager ? manager.getAllBindings() : [];
  }

  /**
   * Find conflicting hotkeys.
   */
  static findConflicts(): Map<string, HotkeyBinding[]> {
    const manager = getGlobalHotkeyManager();
    return manager ? manager.findConflicts() : new Map();
  }

  /**
   * Enable logging of hotkey events.
   */
  static enableLogging(): void {
    this.loggingEnabled = true;
    console.log("Hotkey logging enabled");
  }

  /**
   * Disable logging of hotkey events.
   */
  static disableLogging(): void {
    this.loggingEnabled = false;
    console.log("Hotkey logging disabled");
  }

  /**
   * Check if logging is enabled.
   */
  static isLoggingEnabled(): boolean {
    return this.loggingEnabled;
  }

  /**
   * Log a hotkey event if logging is enabled.
   */
  static log(message: string, data?: unknown): void {
    if (this.loggingEnabled) {
      console.log(`[Hotkey] ${message}`, data || "");
    }
  }
}
