/**
 * Mouse event types for Glade.
 *
 * Extends the core event types with Glade-specific functionality.
 */

import type { CursorMoveEvent, MouseButton, MouseButtonEvent } from "@glade/core";

import type { Bounds } from "./bounds.ts";
import type { Point } from "./point.ts";

/**
 * Mouse button state tracker.
 */
export class MouseState {
  private position: Point = { x: 0, y: 0 };
  private buttons: Set<MouseButton> = new Set();
  private lastClickTime = 0;
  private lastClickPosition: Point = { x: 0, y: 0 };
  private clickCount = 0;

  /**
   * Double-click time threshold in milliseconds.
   */
  static readonly DOUBLE_CLICK_TIME = 500;

  /**
   * Double-click distance threshold in pixels.
   */
  static readonly DOUBLE_CLICK_DISTANCE = 5;

  /**
   * Get current mouse position.
   */
  getPosition(): Point {
    return { ...this.position };
  }

  /**
   * Check if a button is currently pressed.
   */
  isButtonDown(button: MouseButton): boolean {
    return this.buttons.has(button);
  }

  /**
   * Check if any button is currently pressed.
   */
  isAnyButtonDown(): boolean {
    return this.buttons.size > 0;
  }

  /**
   * Update position from cursor move event.
   */
  handleCursorMove(event: CursorMoveEvent): void {
    this.position = { x: event.x, y: event.y };
  }

  /**
   * Update button state from mouse button event.
   * Returns click count if this was a click (button release).
   */
  handleMouseButton(event: MouseButtonEvent, now: number): number {
    const isPress = event.action === 1; // KeyAction.Press

    if (isPress) {
      this.buttons.add(event.button);
      return 0;
    } else {
      this.buttons.delete(event.button);

      // Calculate click count
      const timeSinceLastClick = now - this.lastClickTime;
      const distance = Math.sqrt(
        Math.pow(this.position.x - this.lastClickPosition.x, 2) +
          Math.pow(this.position.y - this.lastClickPosition.y, 2)
      );

      if (
        timeSinceLastClick < MouseState.DOUBLE_CLICK_TIME &&
        distance < MouseState.DOUBLE_CLICK_DISTANCE
      ) {
        this.clickCount++;
      } else {
        this.clickCount = 1;
      }

      this.lastClickTime = now;
      this.lastClickPosition = { ...this.position };

      return this.clickCount;
    }
  }

  /**
   * Check if a point is inside bounds.
   */
  // TODO: Reuse boundsContains to avoid duplicating bounds containment logic.
  isInsideBounds(bounds: Bounds): boolean {
    return (
      this.position.x >= bounds.x &&
      this.position.x < bounds.x + bounds.width &&
      this.position.y >= bounds.y &&
      this.position.y < bounds.y + bounds.height
    );
  }
}

/**
 * Drag operation state.
 */
export interface DragState {
  /** Button being used for drag. */
  button: MouseButton;
  /** Starting position. */
  startPosition: Point;
  /** Current position. */
  currentPosition: Point;
  /** Whether drag threshold has been exceeded. */
  isDragging: boolean;
  /** Custom data attached to drag. */
  data?: unknown;
}

/**
 * Drag operation tracker.
 */
export class DragTracker {
  private state: DragState | null = null;

  /**
   * Minimum distance before drag starts.
   */
  static readonly DRAG_THRESHOLD = 4;

  /**
   * Start potential drag operation.
   */
  startPotentialDrag(button: MouseButton, position: Point, data?: unknown): void {
    this.state = {
      button,
      startPosition: { ...position },
      currentPosition: { ...position },
      isDragging: false,
      data,
    };
  }

  /**
   * Update drag position. Returns true if drag is now active.
   */
  updatePosition(position: Point): boolean {
    if (!this.state) {
      return false;
    }

    this.state.currentPosition = { ...position };

    if (!this.state.isDragging) {
      const distance = Math.sqrt(
        Math.pow(position.x - this.state.startPosition.x, 2) +
          Math.pow(position.y - this.state.startPosition.y, 2)
      );
      if (distance >= DragTracker.DRAG_THRESHOLD) {
        this.state.isDragging = true;
      }
    }

    return this.state.isDragging;
  }

  /**
   * End drag operation.
   */
  endDrag(): DragState | null {
    const state = this.state;
    this.state = null;
    return state;
  }

  /**
   * Cancel drag operation.
   */
  cancel(): void {
    this.state = null;
  }

  /**
   * Get current drag state.
   */
  getState(): DragState | null {
    return this.state;
  }

  /**
   * Check if currently dragging.
   */
  isDragging(): boolean {
    return this.state?.isDragging ?? false;
  }
}
