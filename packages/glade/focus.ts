/**
 * Focus management for Glade.
 *
 * Handles focus state, focus navigation, and focus-related events.
 */

import type { FocusId } from "./types.ts";
import type { FocusHandle } from "./entity.ts";

/**
 * Focus stack for a window.
 * Manages which elements are focused and their z-order.
 */
export class FocusStack {
  private stack: FocusId[] = [];
  private focusHandles: Map<FocusId, FocusHandle> = new Map();

  /**
   * Register a focus handle.
   */
  register(handle: FocusHandle): void {
    this.focusHandles.set(handle.id, handle);
  }

  /**
   * Unregister a focus handle.
   */
  unregister(focusId: FocusId): void {
    this.focusHandles.delete(focusId);
    this.blur(focusId);
  }

  /**
   * Focus an element by its focus ID.
   */
  focus(focusId: FocusId): void {
    // Remove if already in stack
    const index = this.stack.indexOf(focusId);
    if (index >= 0) {
      this.stack.splice(index, 1);
    }
    // Add to top of stack
    this.stack.push(focusId);
  }

  /**
   * Blur (unfocus) an element.
   */
  blur(focusId: FocusId): void {
    const index = this.stack.indexOf(focusId);
    if (index >= 0) {
      this.stack.splice(index, 1);
    }
  }

  /**
   * Check if an element is focused.
   */
  isFocused(focusId: FocusId): boolean {
    return this.stack.includes(focusId);
  }

  /**
   * Check if an element is the top-most focused element.
   */
  isTopFocused(focusId: FocusId): boolean {
    return this.stack.length > 0 && this.stack[this.stack.length - 1] === focusId;
  }

  /**
   * Get the currently focused element (top of stack).
   */
  getFocused(): FocusId | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1]! : null;
  }

  /**
   * Get the focus handle for an ID.
   */
  getHandle(focusId: FocusId): FocusHandle | null {
    return this.focusHandles.get(focusId) ?? null;
  }

  /**
   * Get all focused element IDs in order (bottom to top).
   */
  getFocusChain(): FocusId[] {
    return [...this.stack];
  }

  /**
   * Clear all focus.
   */
  clear(): void {
    this.stack = [];
  }
}

/**
 * Focus direction for navigation.
 */
export type FocusDirection = "next" | "prev" | "up" | "down" | "left" | "right";

/**
 * Focusable element info for navigation.
 */
export interface FocusableElement {
  focusId: FocusId;
  tabIndex: number;
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Focus navigator for tab/arrow key navigation.
 */
export class FocusNavigator {
  private elements: FocusableElement[] = [];

  /**
   * Register a focusable element.
   */
  register(element: FocusableElement): void {
    this.elements.push(element);
    // Keep sorted by tab index
    this.elements.sort((a, b) => a.tabIndex - b.tabIndex);
  }

  /**
   * Unregister a focusable element.
   */
  unregister(focusId: FocusId): void {
    const index = this.elements.findIndex((e) => e.focusId === focusId);
    if (index >= 0) {
      this.elements.splice(index, 1);
    }
  }

  /**
   * Clear all registered elements.
   */
  clear(): void {
    this.elements = [];
  }

  /**
   * Find the next focusable element in a direction.
   */
  findNext(currentFocusId: FocusId | null, direction: FocusDirection): FocusId | null {
    if (this.elements.length === 0) {
      return null;
    }

    const currentIndex = currentFocusId
      ? this.elements.findIndex((e) => e.focusId === currentFocusId)
      : -1;

    switch (direction) {
      case "next": {
        const nextIndex = (currentIndex + 1) % this.elements.length;
        return this.elements[nextIndex]?.focusId ?? null;
      }
      case "prev": {
        const prevIndex = currentIndex <= 0 ? this.elements.length - 1 : currentIndex - 1;
        return this.elements[prevIndex]?.focusId ?? null;
      }
      case "up":
      case "down":
      case "left":
      case "right": {
        // Spatial navigation - find nearest element in direction
        if (currentIndex < 0) {
          return this.elements[0]?.focusId ?? null;
        }
        return this.findSpatialNext(currentIndex, direction);
      }
    }
  }

  /**
   * Find the nearest element in a spatial direction.
   */
  private findSpatialNext(
    currentIndex: number,
    direction: "up" | "down" | "left" | "right"
  ): FocusId | null {
    const current = this.elements[currentIndex];
    if (!current) {
      return null;
    }

    const currentCenter = {
      x: current.bounds.x + current.bounds.width / 2,
      y: current.bounds.y + current.bounds.height / 2,
    };

    let bestMatch: FocusableElement | null = null;
    let bestDistance = Infinity;

    for (let i = 0; i < this.elements.length; i++) {
      if (i === currentIndex) continue;

      const element = this.elements[i]!;
      const center = {
        x: element.bounds.x + element.bounds.width / 2,
        y: element.bounds.y + element.bounds.height / 2,
      };

      // Check if element is in the right direction
      let isInDirection = false;
      switch (direction) {
        case "up":
          isInDirection = center.y < currentCenter.y;
          break;
        case "down":
          isInDirection = center.y > currentCenter.y;
          break;
        case "left":
          isInDirection = center.x < currentCenter.x;
          break;
        case "right":
          isInDirection = center.x > currentCenter.x;
          break;
      }

      if (!isInDirection) continue;

      // Calculate distance (weighted by axis alignment)
      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      let distance: number;
      if (direction === "up" || direction === "down") {
        // Prefer vertically aligned elements
        distance = Math.abs(dy) + Math.abs(dx) * 2;
      } else {
        // Prefer horizontally aligned elements
        distance = Math.abs(dx) + Math.abs(dy) * 2;
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = element;
      }
    }

    return bestMatch?.focusId ?? null;
  }
}

/**
 * Focus context string for keybinding scope.
 * Contexts form a hierarchy for key dispatch.
 */
export type FocusContext = string;

/**
 * Focus context stack for key dispatch scoping.
 */
export class FocusContextStack {
  private contexts: FocusContext[] = [];

  /**
   * Push a context onto the stack.
   */
  push(context: FocusContext): void {
    this.contexts.push(context);
  }

  /**
   * Pop a context from the stack.
   */
  pop(): FocusContext | undefined {
    return this.contexts.pop();
  }

  /**
   * Get current context (top of stack).
   */
  current(): FocusContext | null {
    return this.contexts.length > 0 ? this.contexts[this.contexts.length - 1]! : null;
  }

  /**
   * Get full context chain.
   */
  getChain(): FocusContext[] {
    return [...this.contexts];
  }

  /**
   * Check if a context is active (in the stack).
   */
  hasContext(context: FocusContext): boolean {
    return this.contexts.includes(context);
  }

  /**
   * Clear all contexts.
   */
  clear(): void {
    this.contexts = [];
  }
}
