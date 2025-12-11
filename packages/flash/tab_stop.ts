/**
 * Tab stop system for enhanced focus navigation.
 *
 * Handles tab order, focus groups, and keyboard navigation for UI elements.
 */

import type { Bounds, FocusId } from "./types.ts";

/**
 * Configuration for a tab stop.
 */
export interface TabStopConfig {
  /** Explicit tab order index. Lower values are focused first. Default: spatial order. */
  index?: number;
  /** Group name for focus grouping. Tab navigates within group first. */
  group?: string;
  /** Focus on mouse down (before click). Default: false. */
  focusOnPress?: boolean;
}

/**
 * Registered tab stop.
 */
export interface TabStop {
  focusId: FocusId;
  bounds: Bounds;
  config: TabStopConfig;
  groupName: string | null;
  tabIndex: number;
}

/**
 * Tab stop registry for a window.
 * Manages tab order and focus navigation.
 */
export class TabStopRegistry {
  private tabStops: TabStop[] = [];
  private tabStopsByGroup: Map<string, TabStop[]> = new Map();

  /**
   * Register a tab stop.
   */
  register(focusId: FocusId, bounds: Bounds, config: TabStopConfig): void {
    const existingIndex = this.tabStops.findIndex((t) => t.focusId === focusId);
    if (existingIndex >= 0) {
      this.tabStops.splice(existingIndex, 1);
    }

    const tabIndex = config.index ?? this.calculateSpatialTabIndex(bounds);
    const groupName = config.group ?? null;

    const tabStop: TabStop = {
      focusId,
      bounds,
      config,
      groupName,
      tabIndex,
    };

    this.tabStops.push(tabStop);
    this.sortTabStops();

    if (groupName) {
      const group = this.tabStopsByGroup.get(groupName) ?? [];
      group.push(tabStop);
      group.sort((a, b) => a.tabIndex - b.tabIndex);
      this.tabStopsByGroup.set(groupName, group);
    }
  }

  /**
   * Unregister a tab stop.
   */
  unregister(focusId: FocusId): void {
    const index = this.tabStops.findIndex((t) => t.focusId === focusId);
    if (index >= 0) {
      const tabStop = this.tabStops[index]!;
      this.tabStops.splice(index, 1);

      if (tabStop.groupName) {
        const group = this.tabStopsByGroup.get(tabStop.groupName);
        if (group) {
          const groupIndex = group.findIndex((t) => t.focusId === focusId);
          if (groupIndex >= 0) {
            group.splice(groupIndex, 1);
          }
          if (group.length === 0) {
            this.tabStopsByGroup.delete(tabStop.groupName);
          }
        }
      }
    }
  }

  /**
   * Get the next focusable element via Tab key.
   * If in a group, navigates within group first, then to next group.
   */
  getNextFocus(currentFocusId: FocusId | null, currentGroup: string | null): FocusId | null {
    if (this.tabStops.length === 0) {
      return null;
    }

    // If in a focus group, try next in group first
    if (currentGroup) {
      const group = this.tabStopsByGroup.get(currentGroup);
      if (group && group.length > 0) {
        const currentIndex = group.findIndex((t) => t.focusId === currentFocusId);
        if (currentIndex >= 0) {
          if (currentIndex + 1 < group.length) {
            return group[currentIndex + 1]?.focusId ?? null;
          }
        }
      }
    }

    // Fall back to global tab order
    const currentIndex =
      currentFocusId !== null ? this.tabStops.findIndex((t) => t.focusId === currentFocusId) : -1;

    if (currentIndex < 0) {
      return this.tabStops[0]?.focusId ?? null;
    }

    const nextIndex = (currentIndex + 1) % this.tabStops.length;
    return this.tabStops[nextIndex]?.focusId ?? null;
  }

  /**
   * Get the previous focusable element via Shift+Tab.
   */
  getPrevFocus(currentFocusId: FocusId | null, currentGroup: string | null): FocusId | null {
    if (this.tabStops.length === 0) {
      return null;
    }

    // If in a focus group, try previous in group first
    if (currentGroup) {
      const group = this.tabStopsByGroup.get(currentGroup);
      if (group && group.length > 0) {
        const currentIndex = group.findIndex((t) => t.focusId === currentFocusId);
        if (currentIndex >= 0) {
          if (currentIndex > 0) {
            return group[currentIndex - 1]?.focusId ?? null;
          }
        }
      }
    }

    // Fall back to global tab order
    const currentIndex =
      currentFocusId !== null ? this.tabStops.findIndex((t) => t.focusId === currentFocusId) : -1;

    if (currentIndex < 0) {
      return this.tabStops[this.tabStops.length - 1]?.focusId ?? null;
    }

    const prevIndex = currentIndex <= 0 ? this.tabStops.length - 1 : currentIndex - 1;
    return this.tabStops[prevIndex]?.focusId ?? null;
  }

  /**
   * Get the first focusable element (for auto-focus).
   */
  getFirstFocus(): FocusId | null {
    return this.tabStops[0]?.focusId ?? null;
  }

  /**
   * Get the first focusable element in a group.
   */
  getFirstFocusInGroup(group: string): FocusId | null {
    const groupStops = this.tabStopsByGroup.get(group);
    return groupStops?.[0]?.focusId ?? null;
  }

  /**
   * Get the tab stop for a focus ID.
   */
  getTabStop(focusId: FocusId): TabStop | null {
    return this.tabStops.find((t) => t.focusId === focusId) ?? null;
  }

  /**
   * Get the group a focus ID belongs to.
   */
  getGroup(focusId: FocusId): string | null {
    const tabStop = this.getTabStop(focusId);
    return tabStop?.groupName ?? null;
  }

  /**
   * Clear all tab stops.
   */
  clear(): void {
    this.tabStops = [];
    this.tabStopsByGroup.clear();
  }

  /**
   * Calculate tab index based on spatial position (reading order).
   * Top-to-bottom, left-to-right.
   */
  private calculateSpatialTabIndex(bounds: Bounds): number {
    // Start with Y position, then X position
    return Math.round(bounds.y * 1000 + bounds.x);
  }

  /**
   * Sort tab stops by tab index.
   */
  private sortTabStops(): void {
    this.tabStops.sort((a, b) => {
      // Explicit indices first
      if (a.config.index !== undefined && b.config.index !== undefined) {
        return a.config.index - b.config.index;
      }
      if (a.config.index !== undefined) return -1;
      if (b.config.index !== undefined) return 1;

      // Spatial order
      return a.tabIndex - b.tabIndex;
    });
  }
}

/**
 * Focus context for element hierarchies.
 * Elements can belong to context scopes (Editor, TextInput, etc).
 */
export class FocusContextManager {
  private focusContexts: Map<FocusId, string[]> = new Map();

  /**
   * Set the context chain for a focus ID.
   * Contexts form a hierarchy from root to leaf.
   */
  setContextChain(focusId: FocusId, contexts: string[]): void {
    this.focusContexts.set(focusId, [...contexts]);
  }

  /**
   * Get the context chain for a focus ID.
   */
  getContextChain(focusId: FocusId): string[] {
    return this.focusContexts.get(focusId) ?? [];
  }

  /**
   * Check if a focus ID is in a specific context.
   */
  isInContext(focusId: FocusId, context: string): boolean {
    const chain = this.getContextChain(focusId);
    return chain.includes(context);
  }

  /**
   * Get the deepest context for a focus ID.
   */
  getDeepestContext(focusId: FocusId): string | null {
    const chain = this.getContextChain(focusId);
    return chain.length > 0 ? chain[chain.length - 1]! : null;
  }

  /**
   * Remove a focus ID from tracking.
   */
  remove(focusId: FocusId): void {
    this.focusContexts.delete(focusId);
  }

  /**
   * Clear all contexts.
   */
  clear(): void {
    this.focusContexts.clear();
  }
}

/**
 * Focus restoration for modal/overlay support.
 * Stores focus state when opening modals, restores when closing.
 */
export class FocusRestoration {
  private stack: (FocusId | null)[] = [];

  /**
   * Save the current focus before opening a modal.
   */
  saveFocus(currentFocusId: FocusId | null): void {
    this.stack.push(currentFocusId);
  }

  /**
   * Restore the saved focus.
   */
  restoreFocus(): FocusId | null {
    return this.stack.pop() ?? null;
  }

  /**
   * Get the saved focus without removing it.
   */
  peekFocus(): FocusId | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1]! : null;
  }

  /**
   * Clear the stack.
   */
  clear(): void {
    this.stack = [];
  }
}
