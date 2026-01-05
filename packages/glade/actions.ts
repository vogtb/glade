/**
 * Action system for Glade.
 *
 * Actions are named commands that can be bound to keyboard shortcuts
 * and dispatched through the focus hierarchy.
 */

import type { KeyEvent } from "@glade/core";
import { coreModsToGladeMods } from "@glade/core";
import { log } from "@glade/logging";

import type { GladeContext } from "./context.ts";
import type { Modifiers } from "./dispatch.ts";
import type { FocusContext } from "./focus.ts";
import { Key, type Keystroke, matchesKeystroke, parseKeystroke } from "./keyboard.ts";
import type { GladeWindow } from "./window.ts";

/**
 * Action handler function.
 */
export type ActionHandler = (cx: GladeContext, window: GladeWindow) => void;

/**
 * Action definition.
 */
export interface Action {
  /** Unique action name (e.g., "editor:save", "workspace:close-tab"). */
  name: string;
  /** Human-readable label for UI. */
  label?: string;
  /** Action handler. */
  handler: ActionHandler;
}

/**
 * Key binding definition.
 */
export interface KeyBinding {
  /** Keystroke that triggers this binding. */
  keystroke: Keystroke;
  /** Action name to dispatch. */
  action: string;
  /** Context in which this binding is active (null = global). */
  context: FocusContext | null;
  /** Whether this binding is enabled. */
  enabled: boolean;
}

/**
 * Handle returned from bind() for managing a key binding.
 */
export interface KeyBindingHandle {
  /** Remove this key binding and its associated action (if auto-registered). */
  unbind(): void;
  /** Enable or disable this binding. */
  setEnabled(enabled: boolean): void;
}

/**
 * Parsed key binding with priority info.
 */
interface ResolvedBinding {
  binding: KeyBinding;
  contextDepth: number;
}

/**
 * Input to bind() - either an action name string or an action/handler.
 */
export type BindTarget = string | Action | ActionHandler;

/**
 * Action registry - stores actions and their handlers.
 */
export class ActionRegistry {
  private actions: Map<string, Action> = new Map();

  /**
   * Register an action.
   */
  register(action: Action): void {
    this.actions.set(action.name, action);
  }

  /**
   * Register multiple actions.
   */
  registerAll(actions: Action[]): void {
    for (const action of actions) {
      this.register(action);
    }
  }

  /**
   * Unregister an action.
   */
  unregister(name: string): void {
    this.actions.delete(name);
  }

  /**
   * Get an action by name.
   */
  get(name: string): Action | null {
    return this.actions.get(name) ?? null;
  }

  /**
   * Check if an action is registered.
   */
  has(name: string): boolean {
    return this.actions.has(name);
  }

  /**
   * Get all registered action names.
   */
  getAll(): string[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Dispatch an action by name.
   */
  dispatch(name: string, cx: GladeContext, window: GladeWindow): boolean {
    const action = this.actions.get(name);
    if (!action) {
      log.warn(`Action not found: ${name}`);
      return false;
    }
    action.handler(cx, window);
    return true;
  }
}

let bindingCounter = 0;

/**
 * Keymap - manages key bindings and resolves keystrokes to actions.
 */
export class Keymap {
  private bindings: KeyBinding[] = [];
  private actionRegistry: ActionRegistry | null = null;
  private autoRegisteredActions: Set<string> = new Set();
  private currentModifiers: Modifiers = {
    shift: false,
    ctrl: false,
    alt: false,
    meta: false,
  };

  /**
   * Create a new Keymap.
   *
   * @param actionRegistry Optional action registry for auto-registering actions
   */
  constructor(actionRegistry?: ActionRegistry) {
    this.actionRegistry = actionRegistry ?? null;
  }

  /**
   * Update modifier state from a key event.
   * Call this on every key event to keep modifier tracking accurate.
   */
  updateModifiers(event: KeyEvent): void {
    this.currentModifiers = coreModsToGladeMods(event.mods);
  }

  /**
   * Check if a specific modifier is currently pressed.
   */
  isModifierPressed(mod: "shift" | "ctrl" | "alt" | "meta"): boolean {
    return this.currentModifiers[mod];
  }

  /**
   * Get the current modifier state.
   */
  getModifiers(): Modifiers {
    return { ...this.currentModifiers };
  }

  /**
   * Reset modifier state (e.g., on window blur).
   */
  resetModifiers(): void {
    this.currentModifiers = {
      shift: false,
      ctrl: false,
      alt: false,
      meta: false,
    };
  }

  /**
   * Add a key binding.
   *
   * @param keystrokeStr Keystroke string like "meta+s" or "ctrl+shift+a"
   * @param target Action name, Action object, or handler function
   * @param context Focus context where this binding is active (null = global)
   * @returns Handle for managing the binding, or null if keystroke is invalid
   */
  bind(
    keystrokeStr: string,
    target: BindTarget,
    context: FocusContext | null = null
  ): KeyBindingHandle | null {
    const keystroke = parseKeystroke(keystrokeStr);
    if (!keystroke) {
      log.warn(`Invalid keystroke: ${keystrokeStr}`);
      return null;
    }

    let actionName: string;
    let autoRegistered = false;

    if (typeof target === "string") {
      actionName = target;
    } else if (typeof target === "function") {
      bindingCounter = bindingCounter + 1;
      actionName = `keymap:auto-${bindingCounter}`;
      if (this.actionRegistry) {
        this.actionRegistry.register({
          name: actionName,
          handler: target,
        });
        this.autoRegisteredActions.add(actionName);
        autoRegistered = true;
      } else {
        log.warn(
          "Cannot bind handler without ActionRegistry. Pass registry to Keymap constructor."
        );
        return null;
      }
    } else {
      actionName = target.name;
      if (this.actionRegistry && !this.actionRegistry.has(actionName)) {
        this.actionRegistry.register(target);
        this.autoRegisteredActions.add(actionName);
        autoRegistered = true;
      }
    }

    const binding: KeyBinding = {
      keystroke,
      action: actionName,
      context,
      enabled: true,
    };
    this.bindings.push(binding);

    return {
      unbind: () => {
        const index = this.bindings.indexOf(binding);
        if (index >= 0) {
          this.bindings.splice(index, 1);
        }
        if (autoRegistered && this.actionRegistry) {
          this.actionRegistry.unregister(actionName);
          this.autoRegisteredActions.delete(actionName);
        }
      },
      setEnabled: (enabled: boolean) => {
        binding.enabled = enabled;
      },
    };
  }

  /**
   * Add a key binding (legacy API, returns boolean).
   */
  bindAction(keystrokeStr: string, action: string, context: FocusContext | null = null): boolean {
    const handle = this.bind(keystrokeStr, action, context);
    return handle !== null;
  }

  /**
   * Add multiple bindings (legacy API).
   */
  bindAll(bindings: Array<{ key: string; action: string; context?: FocusContext }>): void {
    for (const b of bindings) {
      this.bindAction(b.key, b.action, b.context ?? null);
    }
  }

  /**
   * Remove bindings for an action.
   */
  unbind(action: string): void {
    this.bindings = this.bindings.filter((b) => b.action !== action);
    if (this.autoRegisteredActions.has(action) && this.actionRegistry) {
      this.actionRegistry.unregister(action);
      this.autoRegisteredActions.delete(action);
    }
  }

  /**
   * Remove a specific binding by keystroke.
   */
  unbindKey(keystrokeStr: string, context: FocusContext | null = null): void {
    const keystroke = parseKeystroke(keystrokeStr);
    if (!keystroke) {
      return;
    }

    this.bindings = this.bindings.filter(
      (b) =>
        !(
          b.keystroke.key === keystroke.key &&
          b.keystroke.modifiers.shift === keystroke.modifiers.shift &&
          b.keystroke.modifiers.ctrl === keystroke.modifiers.ctrl &&
          b.keystroke.modifiers.alt === keystroke.modifiers.alt &&
          b.keystroke.modifiers.meta === keystroke.modifiers.meta &&
          b.context === context
        )
    );
  }

  /**
   * Resolve a key event to an action, considering focus context.
   * Returns the action name or null if no binding matches.
   */
  resolve(event: KeyEvent, contextChain: FocusContext[]): string | null {
    // Only handle key press events
    if (event.action !== 1) {
      return null; // KeyAction.Press
    }

    const matches: ResolvedBinding[] = [];

    for (const binding of this.bindings) {
      if (!binding.enabled) {
        continue;
      }

      if (matchesKeystroke(event, binding.keystroke)) {
        // Calculate context depth (-1 for global, higher = deeper context)
        let contextDepth = -1;

        if (binding.context === null) {
          // Global binding
          contextDepth = -1;
        } else {
          const index = contextChain.indexOf(binding.context);
          if (index >= 0) {
            contextDepth = index;
          } else {
            // Context not active, skip this binding
            continue;
          }
        }

        matches.push({ binding, contextDepth });
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // Sort by context depth (deeper = higher priority), then by insertion order (later = higher)
    matches.sort((a, b) => {
      if (a.contextDepth !== b.contextDepth) {
        return b.contextDepth - a.contextDepth; // Deeper first
      }
      // Later bindings have higher priority (they're at higher indices in the array)
      return this.bindings.indexOf(b.binding) - this.bindings.indexOf(a.binding);
    });

    return matches[0]?.binding.action ?? null;
  }

  /**
   * Get all bindings for an action.
   */
  getBindingsForAction(action: string): KeyBinding[] {
    return this.bindings.filter((b) => b.action === action);
  }

  /**
   * Get all bindings.
   */
  getAllBindings(): KeyBinding[] {
    return [...this.bindings];
  }

  /**
   * Clear all bindings.
   */
  clear(): void {
    for (const actionName of this.autoRegisteredActions) {
      if (this.actionRegistry) {
        this.actionRegistry.unregister(actionName);
      }
    }
    this.autoRegisteredActions.clear();
    this.bindings = [];
  }

  /**
   * Check if a key is a modifier key.
   */
  isModifierKey(keyCode: number): boolean {
    return (
      keyCode === Key.LeftShift ||
      keyCode === Key.RightShift ||
      keyCode === Key.LeftControl ||
      keyCode === Key.RightControl ||
      keyCode === Key.LeftAlt ||
      keyCode === Key.RightAlt ||
      keyCode === Key.LeftSuper ||
      keyCode === Key.RightSuper
    );
  }
}

/**
 * Key dispatch result.
 */
export interface KeyDispatchResult {
  /** Whether the key was handled. */
  handled: boolean;
  /** Action that was dispatched (if any). */
  action: string | null;
}

/**
 * Key dispatcher - coordinates key events, keymap, and actions.
 */
export class KeyDispatcher {
  constructor(
    private keymap: Keymap,
    private actions: ActionRegistry
  ) {}

  /**
   * Handle a key event.
   */
  dispatch(
    event: KeyEvent,
    contextChain: FocusContext[],
    cx: GladeContext,
    window: GladeWindow
  ): KeyDispatchResult {
    const action = this.keymap.resolve(event, contextChain);

    if (action) {
      const handled = this.actions.dispatch(action, cx, window);
      return { handled, action };
    }

    return { handled: false, action: null };
  }
}

/**
 * Common built-in actions.
 */
export const BuiltinActions = {
  // Navigation
  FocusNext: "glade:focus-next",
  FocusPrev: "glade:focus-prev",

  // Clipboard
  Cut: "glade:cut",
  Copy: "glade:copy",
  Paste: "glade:paste",
  SelectAll: "glade:select-all",

  // Editing
  Undo: "glade:undo",
  Redo: "glade:redo",

  // Window
  Close: "glade:close",
  Quit: "glade:quit",

  // Debug
  ToggleInspector: "glade:toggle-inspector",
} as const;

/**
 * Create default key bindings.
 */
export function createDefaultKeymap(actionRegistry?: ActionRegistry): Keymap {
  const keymap = new Keymap(actionRegistry);

  keymap.bindAll([
    // Navigation
    { key: "tab", action: BuiltinActions.FocusNext },
    { key: "shift+tab", action: BuiltinActions.FocusPrev },

    // Clipboard (using Cmd on macOS convention)
    { key: "meta+x", action: BuiltinActions.Cut },
    { key: "meta+c", action: BuiltinActions.Copy },
    { key: "meta+v", action: BuiltinActions.Paste },
    { key: "meta+a", action: BuiltinActions.SelectAll },

    // Editing
    { key: "meta+z", action: BuiltinActions.Undo },
    { key: "meta+shift+z", action: BuiltinActions.Redo },

    // Window
    { key: "meta+w", action: BuiltinActions.Close },
    { key: "meta+q", action: BuiltinActions.Quit },

    // Debug
    { key: "i", action: BuiltinActions.ToggleInspector },
  ]);

  return keymap;
}

/**
 * Debug utilities for keymap.
 */
export class KeymapDebugger {
  private static loggingEnabled = false;

  /**
   * List all active bindings from a keymap.
   */
  static listAll(keymap: Keymap): KeyBinding[] {
    return keymap.getAllBindings();
  }

  /**
   * Find conflicting bindings in a keymap.
   */
  static findConflicts(keymap: Keymap): Map<string, KeyBinding[]> {
    const bindings = keymap.getAllBindings();
    const byKey = new Map<string, KeyBinding[]>();

    for (const binding of bindings) {
      const key = `${binding.keystroke.key}-${binding.keystroke.modifiers.shift}-${binding.keystroke.modifiers.ctrl}-${binding.keystroke.modifiers.alt}-${binding.keystroke.modifiers.meta}-${binding.context ?? "global"}`;
      const existing = byKey.get(key) ?? [];
      existing.push(binding);
      byKey.set(key, existing);
    }

    const conflicts = new Map<string, KeyBinding[]>();
    for (const [key, list] of byKey) {
      if (list.length > 1) {
        conflicts.set(key, list);
      }
    }

    return conflicts;
  }

  /**
   * Enable logging of key events.
   */
  static enableLogging(): void {
    this.loggingEnabled = true;
    log.info("Keymap logging enabled");
  }

  /**
   * Disable logging of key events.
   */
  static disableLogging(): void {
    this.loggingEnabled = false;
    log.info("Keymap logging disabled");
  }

  /**
   * Check if logging is enabled.
   */
  static isLoggingEnabled(): boolean {
    return this.loggingEnabled;
  }

  /**
   * Log a keymap event if logging is enabled.
   */
  static log(message: string, data?: unknown): void {
    if (this.loggingEnabled) {
      log.info(`[Keymap] ${message}`, data ?? "");
    }
  }
}
