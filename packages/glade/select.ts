/**
 * CrossElementSelectionManager - Manages text selection across multiple
 * GladeTextElement instances.
 *
 * This manager tracks selection state that can span multiple text elements,
 * handling:
 * - Element registration during prepaint phase
 * - Mouse-based selection gestures
 * - Keyboard commands (copy, select all)
 * - Rendering selection highlights
 * - Clipboard integration
 *
 * Uses content-based element keys to track elements across frame rebuilds.
 */

import { log } from "@glade/logging";
import { type Color, toColorObject } from "@glade/utils";

import type { Bounds } from "./bounds.ts";
import type { GladeContext } from "./context.ts";
import type { EventResult, GladeKeyEvent, GladeMouseEvent } from "./dispatch.ts";
import type { GlobalElementId } from "./element.ts";
import { FocusHandle } from "./entity.ts";
import { Key } from "./keyboard.ts";
import type { Point } from "./point.ts";
import type { GladeScene } from "./scene.ts";
import type { CachedTextLayout, TextHitTestResult } from "./text.ts";
import { computeRangeRectsWithLayout, hitTestWithLayout } from "./text.ts";
import type { GladeWindow } from "./window.ts";

/**
 * Content-based element key for tracking elements across frame rebuilds.
 * Format: "hash:{contentHash}:{yBucket}:{visualOrder}"
 */
export type ElementKey = string;

/**
 * Registered text element with its layout and metadata.
 */
export interface RegisteredElement {
  key: ElementKey;
  text: string;
  bounds: Bounds;
  layout: CachedTextLayout;
  visualOrder: number;
  isSelectable: boolean;
}

/**
 * Selection range within an element.
 */
export interface SelectionRange {
  start: number;
  end: number;
}

/**
 * Persistent selection state that survives frame rebuilds.
 */
export interface CrossElementSelectionState {
  isActive: boolean;
  startKey: ElementKey;
  startIndex: number;
  endKey: ElementKey;
  endIndex: number;
  focusHandle: FocusHandle | null;
}

/**
 * Hit test result across all registered elements.
 */
interface HitTestResult {
  elementKey: ElementKey;
  element: RegisteredElement;
  textHit: TextHitTestResult;
}

/**
 * Reserved GlobalElementId for storing selection state in window.elementState.
 */
const CROSS_ELEMENT_SELECTION_ID = 0 as GlobalElementId;

/**
 * Simple FNV-1a hash for string content.
 */
function simpleHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < Math.min(str.length, 1000); i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * CrossElementSelectionManager manages text selection across multiple elements.
 */
export class CrossElementSelectionManager {
  private registry: Map<ElementKey, RegisteredElement> = new Map();
  private orderedKeys: ElementKey[] = [];
  private state: CrossElementSelectionState;

  constructor(private window: GladeWindow) {
    const persisted = this.window.getElementState().get(CROSS_ELEMENT_SELECTION_ID) as
      | CrossElementSelectionState
      | undefined;

    this.state = persisted ?? this.createDefaultState();
  }

  private createDefaultState(): CrossElementSelectionState {
    return {
      isActive: false,
      startKey: "",
      startIndex: 0,
      endKey: "",
      endIndex: 0,
      focusHandle: null,
    };
  }

  /**
   * Called at the start of each frame to clear the registry.
   */
  beginFrame(): void {
    this.registry.clear();
    this.orderedKeys = [];
  }

  /**
   * Called at the end of each frame to validate selection.
   * NOTE: computeVisualOrder() is now called before painting, not here.
   */
  endFrame(): void {
    // Validate that selected elements still exist
    if (this.state.isActive) {
      const startExists = this.registry.has(this.state.startKey);
      const endExists = this.registry.has(this.state.endKey);

      if (!startExists || !endExists) {
        this.clearSelection();
      }
    }

    // Save state to window persistent storage
    this.window.getElementState().set(CROSS_ELEMENT_SELECTION_ID, this.state);
  }

  /**
   * Register a text element for potential selection.
   */
  registerElement(
    key: ElementKey,
    text: string,
    bounds: Bounds,
    layout: CachedTextLayout,
    isSelectable: boolean
  ): void {
    this.registry.set(key, {
      key,
      text,
      bounds,
      layout,
      visualOrder: 0, // Set during computeVisualOrder
      isSelectable,
    });
  }

  /**
   * Compute element key based on content and position.
   */
  computeKeyForRegistration(text: string, bounds: Bounds): ElementKey {
    const hash = simpleHash(text);
    const yBucket = Math.floor(bounds.y / 50);
    return `hash:${hash}:${yBucket}`;
  }

  /**
   * Check if there are any selectable elements registered.
   */
  hasSelectableElements(): boolean {
    for (const elem of this.registry.values()) {
      if (elem.isSelectable) {
        return true;
      }
    }
    return false;
  }

  /**
   * Compute visual order of registered elements (top-to-bottom, left-to-right).
   * Must be called after all elements are registered and before
   * getSelectionRanges().
   */
  computeVisualOrder(): void {
    const elements = Array.from(this.registry.values());

    elements.sort((a, b) => {
      if (Math.abs(a.bounds.y - b.bounds.y) < 5) {
        return a.bounds.x - b.bounds.x;
      }
      return a.bounds.y - b.bounds.y;
    });

    this.orderedKeys = [];
    for (let i = 0; i < elements.length; i++) {
      const elem = elements[i]!;
      elem.visualOrder = i;
      this.orderedKeys.push(elem.key);
    }
  }

  /**
   * Hit test a point across all registered elements.
   */
  private hitTestPoint(point: Point): HitTestResult | null {
    for (const [key, elem] of this.registry.entries()) {
      if (!elem.isSelectable) {
        continue;
      }

      const inBounds =
        point.x >= elem.bounds.x &&
        point.x < elem.bounds.x + elem.bounds.width &&
        point.y >= elem.bounds.y &&
        point.y < elem.bounds.y + elem.bounds.height;

      if (inBounds) {
        const localX = point.x - elem.bounds.x;
        const localY = point.y - elem.bounds.y;
        const hit = hitTestWithLayout(elem.layout, { x: localX, y: localY });
        return { elementKey: key, element: elem, textHit: hit };
      }
    }
    return null;
  }

  /**
   * Handle mouse down event to start selection.
   */
  handleMouseDown(
    event: GladeMouseEvent,
    window: GladeWindow,
    cx: GladeContext
  ): EventResult | void {
    const hit = this.hitTestPoint({ x: event.x, y: event.y });
    if (!hit || !hit.element.isSelectable) {
      return;
    }

    // Create focus handle if needed
    if (!this.state.focusHandle) {
      this.state.focusHandle = cx.newFocusHandle(window.id);
    }
    cx.focus(this.state.focusHandle);

    // Start selection
    this.state.isActive = true;
    this.state.startKey = hit.elementKey;
    this.state.startIndex = hit.textHit.index;
    this.state.endKey = hit.elementKey;
    this.state.endIndex = hit.textHit.index;

    cx.markWindowDirty(window.id);
    return { stopPropagation: true, preventDefault: true };
  }

  /**
   * Handle mouse move event to update selection.
   */
  handleMouseMove(
    event: GladeMouseEvent,
    window: GladeWindow,
    cx: GladeContext
  ): EventResult | void {
    if (!this.state.isActive) {
      return;
    }

    const hit = this.hitTestPoint({ x: event.x, y: event.y });
    if (!hit) {
      return;
    }

    // Update end position
    this.state.endKey = hit.elementKey;
    this.state.endIndex = hit.textHit.index;

    cx.markWindowDirty(window.id);
    return { stopPropagation: true, preventDefault: true };
  }

  /**
   * Handle mouse up event to finalize selection.
   */
  handleMouseUp(
    _event: GladeMouseEvent,
    window: GladeWindow,
    cx: GladeContext
  ): EventResult | void {
    if (!this.state.isActive) {
      return;
    }

    // Keep selection active but mark as not dragging (we keep isActive true
    // so selection remains visible)
    cx.markWindowDirty(window.id);
    return { stopPropagation: true, preventDefault: true };
  }

  /**
   * Handle key down event for keyboard commands.
   */
  handleKeyDown(event: GladeKeyEvent, window: GladeWindow, cx: GladeContext): EventResult | void {
    if (!this.state.focusHandle || !cx.isFocused(this.state.focusHandle)) {
      return;
    }

    const code = Number(event.code);
    const mods = event.modifiers;

    // Cmd+C: Copy selected text
    if (mods.meta && code === Key.C) {
      if (this.state.isActive) {
        const text = this.getSelectedText();
        if (text) {
          window.getClipboard().writeText(text).catch(log.warn);
        }
        return { stopPropagation: true, preventDefault: true };
      }
    }

    // Cmd+A: Select all
    if (mods.meta && code === Key.A) {
      this.selectAll();
      cx.markWindowDirty(window.id);
      return { stopPropagation: true, preventDefault: true };
    }

    return undefined;
  }

  /**
   * Select all text in all selectable elements.
   */
  private selectAll(): void {
    if (this.orderedKeys.length === 0) {
      return;
    }

    // Find first and last selectable elements
    let firstKey: ElementKey | null = null;
    let lastKey: ElementKey | null = null;

    for (const key of this.orderedKeys) {
      const elem = this.registry.get(key);
      if (elem?.isSelectable) {
        if (!firstKey) {
          firstKey = key;
        }
        lastKey = key;
      }
    }

    if (!firstKey || !lastKey) {
      return;
    }

    const lastElem = this.registry.get(lastKey)!;

    this.state.isActive = true;
    this.state.startKey = firstKey;
    this.state.startIndex = 0;
    this.state.endKey = lastKey;
    this.state.endIndex = lastElem.text.length;
  }

  /**
   * Clear the current selection.
   */
  private clearSelection(): void {
    this.state.isActive = false;
    this.state.startKey = "";
    this.state.startIndex = 0;
    this.state.endKey = "";
    this.state.endIndex = 0;
  }

  /**
   * Get selection ranges for all elements in the selection.
   */
  getSelectionRanges(): Array<{ key: ElementKey; range: SelectionRange }> {
    if (!this.state.isActive) {
      return [];
    }

    const startElem = this.registry.get(this.state.startKey);
    const endElem = this.registry.get(this.state.endKey);

    if (!startElem || !endElem) {
      return [];
    }

    const startOrder = startElem.visualOrder;
    const endOrder = endElem.visualOrder;
    const forward = startOrder <= endOrder;

    const ranges: Array<{ key: ElementKey; range: SelectionRange }> = [];

    if (forward) {
      // Forward selection: start → end
      for (let i = startOrder; i <= endOrder; i++) {
        const key = this.orderedKeys[i];
        if (!key) {
          continue;
        }
        const elem = this.registry.get(key);
        if (!elem || !elem.isSelectable) {
          continue;
        }

        const isFirst = i === startOrder;
        const isLast = i === endOrder;

        ranges.push({
          key,
          range: {
            start: isFirst ? this.state.startIndex : 0,
            end: isLast ? this.state.endIndex : elem.text.length,
          },
        });
      }
    } else {
      // Backward selection: end → start
      for (let i = endOrder; i <= startOrder; i++) {
        const key = this.orderedKeys[i];
        if (!key) {
          continue;
        }
        const elem = this.registry.get(key);
        if (!elem || !elem.isSelectable) {
          continue;
        }

        const isFirst = i === endOrder;
        const isLast = i === startOrder;

        ranges.push({
          key,
          range: {
            start: isFirst ? this.state.endIndex : 0,
            end: isLast ? this.state.startIndex : elem.text.length,
          },
        });
      }
    }

    return ranges;
  }

  /**
   * Get selected text as a string (joined with newlines).
   */
  getSelectedText(): string {
    const ranges = this.getSelectionRanges();
    if (ranges.length === 0) {
      return "";
    }

    const parts: string[] = [];
    for (const { key, range } of ranges) {
      const elem = this.registry.get(key);
      if (!elem) {
        continue;
      }

      const start = Math.min(range.start, range.end);
      const end = Math.max(range.start, range.end);
      const selectedText = elem.text.slice(start, end);
      parts.push(selectedText);
    }

    // Join with newlines (each element = paragraph)
    return parts.join("\n");
  }

  /**
   * Paint selection highlights for all selected ranges.
   */
  paintSelectionHighlights(scene: GladeScene, color: Color): void {
    const highlightColor = toColorObject(color);
    const ranges = this.getSelectionRanges();

    for (const { key, range } of ranges) {
      const elem = this.registry.get(key);
      if (!elem) {
        continue;
      }

      // Use existing text.ts helper to compute selection rectangles
      const rects = computeRangeRectsWithLayout(elem.layout, {
        start: range.start,
        end: range.end,
      });

      for (const rect of rects) {
        scene.addRect({
          x: elem.bounds.x + rect.x,
          y: elem.bounds.y + rect.y,
          width: rect.width,
          height: rect.height,
          color: highlightColor,
          cornerRadius: 2,
          borderWidth: 0,
          borderColor: { r: 0, g: 0, b: 0, a: 0 },
        });
      }
    }
  }
}
