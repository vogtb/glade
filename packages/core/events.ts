/**
 * Platform-agnostic event types and listener interfaces. Loosely based on
 * GLFW events but designed to work across browser and native.
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

/**
 * Composition (IME) event payload.
 */
export interface CompositionEvent {
  /** Current composition text (empty for start) */
  text: string;
  /** Selection start within the composition string */
  selectionStart: number;
  /** Selection end within the composition string */
  selectionEnd: number;
}

/**
 * Committed text input payload (post-composition).
 */
export interface TextInputEvent {
  /** Text to insert */
  text: string;
  /** Whether the text is being inserted as part of an active composition */
  isComposing: boolean;
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
export type CompositionCallback = (event: CompositionEvent) => void;
export type TextInputCallback = (event: TextInputEvent) => void;

/**
 * Cursor style constants matching CSS cursor values.
 */
export const CursorStyle = {
  Default: "default",
  Pointer: "pointer",
  Text: "text",
  Grab: "grab",
  Grabbing: "grabbing",
  NotAllowed: "not-allowed",
  Move: "move",
  Crosshair: "crosshair",
  EwResize: "ew-resize",
  NsResize: "ns-resize",
  NeswResize: "nesw-resize",
  NwseResize: "nwse-resize",
} as const;

export type CursorStyle = (typeof CursorStyle)[keyof typeof CursorStyle];

/**
 * Event handler interface that contexts can implement. Returns a cleanup
 * function to remove the listener.
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
  onCompositionStart(callback: CompositionCallback): () => void;
  onCompositionUpdate(callback: CompositionCallback): () => void;
  onCompositionEnd(callback: CompositionCallback): () => void;
  onTextInput(callback: TextInputCallback): () => void;
  setCursor(style: CursorStyle): void;
}
