/**
 * Platform-agnostic event types and listener interfaces.
 * Loosely based on GLFW events but designed to work across browser and native.
 */

// Key action constants
export const KeyAction = {
  Release: 0,
  Press: 1,
  Repeat: 2,
} as const;

export type KeyAction = (typeof KeyAction)[keyof typeof KeyAction];

// Mouse button constants
export const MouseButton = {
  Left: 0,
  Right: 1,
  Middle: 2,
} as const;

export type MouseButton = (typeof MouseButton)[keyof typeof MouseButton];

// Modifier key flags
export const ModifierKey = {
  Shift: 1 << 0,
  Control: 1 << 1,
  Alt: 1 << 2,
  Super: 1 << 3, // Cmd on macOS, Win on Windows
} as const;

export type ModifierKey = (typeof ModifierKey)[keyof typeof ModifierKey];

// Event payload types
export interface KeyEvent {
  /** Platform-specific key code */
  key: number;
  /** Physical scan code */
  scancode: number;
  /** Press, release, or repeat */
  action: KeyAction;
  /** Modifier keys held (bitmask of ModifierKey) */
  mods: number;
}

export interface CharEvent {
  /** Unicode code point */
  codepoint: number;
  /** The character as a string */
  char: string;
}

export interface MouseButtonEvent {
  /** Which button (MouseButton) */
  button: MouseButton;
  /** Press or release */
  action: KeyAction;
  /** Modifier keys held */
  mods: number;
}

export interface CursorMoveEvent {
  /** X position relative to content area */
  x: number;
  /** Y position relative to content area */
  y: number;
}

export interface ScrollEvent {
  /** Horizontal scroll offset */
  deltaX: number;
  /** Vertical scroll offset */
  deltaY: number;
}

export interface ResizeEvent {
  /** New width in pixels */
  width: number;
  /** New height in pixels */
  height: number;
}

export interface FocusEvent {
  /** Whether the window gained focus */
  focused: boolean;
}

export interface CursorEnterEvent {
  /** Whether the cursor entered (true) or left (false) */
  entered: boolean;
}

// Callback type definitions
export type KeyCallback = (event: KeyEvent) => void;
export type CharCallback = (event: CharEvent) => void;
export type MouseButtonCallback = (event: MouseButtonEvent) => void;
export type CursorMoveCallback = (event: CursorMoveEvent) => void;
export type ScrollCallback = (event: ScrollEvent) => void;
export type ResizeCallback = (event: ResizeEvent) => void;
export type CloseCallback = () => void;
export type FocusCallback = (event: FocusEvent) => void;
export type CursorEnterCallback = (event: CursorEnterEvent) => void;
export type RefreshCallback = () => void;

/**
 * Event handler interface that contexts can implement.
 * Returns a cleanup function to remove the listener.
 */
export interface EventTarget {
  onKey(callback: KeyCallback): () => void;
  onChar(callback: CharCallback): () => void;
  onMouseButton(callback: MouseButtonCallback): () => void;
  onCursorMove(callback: CursorMoveCallback): () => void;
  onScroll(callback: ScrollCallback): () => void;
  onResize(callback: ResizeCallback): () => void;
  onClose(callback: CloseCallback): () => void;
  onFocus(callback: FocusCallback): () => void;
  onCursorEnter(callback: CursorEnterCallback): () => void;
  onRefresh(callback: RefreshCallback): () => void;
}
