/**
 * Action system for Flash.
 *
 * Actions are named commands that can be bound to keyboard shortcuts
 * and dispatched through the focus hierarchy.
 */

import type { KeyEvent } from "@glade/core";
import type { FlashContext } from "./context.ts";
import type { FlashWindow } from "./window.ts";
import { type Keystroke, parseKeystroke, matchesKeystroke } from "./keyboard.ts";
import type { FocusContext } from "./focus.ts";

/**
 * Action handler function.
 */
export type ActionHandler = (cx: FlashContext, window: FlashWindow) => void;

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
}

/**
 * Parsed key binding with priority info.
 */
interface ResolvedBinding {
  binding: KeyBinding;
  contextDepth: number;
}

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
  dispatch(name: string, cx: FlashContext, window: FlashWindow): boolean {
    const action = this.actions.get(name);
    if (!action) {
      console.warn(`Action not found: ${name}`);
      return false;
    }
    action.handler(cx, window);
    return true;
  }
}

/**
 * Keymap - manages key bindings and resolves keystrokes to actions.
 */
export class Keymap {
  private bindings: KeyBinding[] = [];

  /**
   * Add a key binding.
   */
  bind(keystrokeStr: string, action: string, context: FocusContext | null = null): boolean {
    const keystroke = parseKeystroke(keystrokeStr);
    if (!keystroke) {
      console.warn(`Invalid keystroke: ${keystrokeStr}`);
      return false;
    }

    this.bindings.push({ keystroke, action, context });
    return true;
  }

  /**
   * Add multiple bindings.
   */
  bindAll(bindings: Array<{ key: string; action: string; context?: FocusContext }>): void {
    for (const b of bindings) {
      this.bind(b.key, b.action, b.context ?? null);
    }
  }

  /**
   * Remove bindings for an action.
   */
  unbind(action: string): void {
    this.bindings = this.bindings.filter((b) => b.action !== action);
  }

  /**
   * Remove a specific binding.
   */
  unbindKey(keystrokeStr: string, context: FocusContext | null = null): void {
    const keystroke = parseKeystroke(keystrokeStr);
    if (!keystroke) return;

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
    if (event.action !== 1) return null; // KeyAction.Press

    const matches: ResolvedBinding[] = [];

    for (const binding of this.bindings) {
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

    if (matches.length === 0) return null;

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
    this.bindings = [];
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
    cx: FlashContext,
    window: FlashWindow
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
  FocusNext: "flash:focus-next",
  FocusPrev: "flash:focus-prev",

  // Clipboard
  Cut: "flash:cut",
  Copy: "flash:copy",
  Paste: "flash:paste",
  SelectAll: "flash:select-all",

  // Editing
  Undo: "flash:undo",
  Redo: "flash:redo",

  // Window
  Close: "flash:close",
  Quit: "flash:quit",
} as const;

/**
 * Create default key bindings.
 */
export function createDefaultKeymap(): Keymap {
  const keymap = new Keymap();

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
  ]);

  return keymap;
}
