/**
 * Hitbox system for Flash.
 *
 * Provides explicit hitbox tracking with occlusion behavior,
 * similar to GPUI's hitbox system.
 */

import type { Bounds, ContentMask } from "./types.ts";
import type { Cursor } from "./styles.ts";

declare const __hitboxIdBrand: unique symbol;
export type HitboxId = number & { [__hitboxIdBrand]: true };

/**
 * Hitbox behavior determines how a hitbox affects mouse interactions.
 */
export enum HitboxBehavior {
  /**
   * Normal hitbox - doesn't affect mouse handling for other hitboxes.
   */
  Normal = "normal",

  /**
   * All hitboxes behind this one will be ignored for hover and scroll.
   * Use for modal overlays that should block all interaction.
   */
  BlockMouse = "block-mouse",

  /**
   * Hitboxes behind this one won't receive hover, but can still scroll.
   * Use for overlays that should allow scrolling underlying content.
   */
  BlockMouseExceptScroll = "block-mouse-except-scroll",
}

/**
 * A hitbox represents an interactive region in the UI.
 */
export interface Hitbox {
  readonly id: HitboxId;
  readonly bounds: Bounds;
  readonly contentMask: ContentMask | null;
  readonly behavior: HitboxBehavior;
  readonly cursor: Cursor | undefined;
}

/**
 * Result of a hit test, containing all hitboxes under the mouse.
 */
export interface HitTest {
  /** All hitbox IDs at the mouse position, front-to-back order. */
  ids: HitboxId[];
  /** Number of hitboxes that should report as hovered (occlusion cutoff). */
  hoverHitboxCount: number;
  /** Cursor from the topmost hovered hitbox that has a cursor set. */
  cursor: Cursor | undefined;
}

/**
 * Create an empty hit test result.
 */
export function createHitTest(): HitTest {
  return {
    ids: [],
    hoverHitboxCount: 0,
    cursor: undefined,
  };
}

/**
 * Per-frame hitbox tracking state.
 */
export interface HitboxFrame {
  hitboxes: Hitbox[];
  nextHitboxId: number;
}

/**
 * Create an empty hitbox frame.
 */
export function createHitboxFrame(): HitboxFrame {
  return {
    hitboxes: [],
    nextHitboxId: 1,
  };
}

/**
 * Insert a hitbox into the frame.
 * Returns the created hitbox for later reference.
 */
export function insertHitbox(
  frame: HitboxFrame,
  bounds: Bounds,
  contentMask: ContentMask | null,
  behavior: HitboxBehavior = HitboxBehavior.Normal,
  cursor?: Cursor
): Hitbox {
  const id = frame.nextHitboxId++ as HitboxId;
  const hitbox: Hitbox = {
    id,
    bounds,
    contentMask,
    behavior,
    cursor,
  };
  frame.hitboxes.push(hitbox);
  return hitbox;
}

/**
 * Perform a hit test at the given position.
 * Returns hitbox IDs from front-to-back order with occlusion applied.
 */
export function performHitTest(frame: HitboxFrame, x: number, y: number): HitTest {
  const result: HitTest = {
    ids: [],
    hoverHitboxCount: 0,
    cursor: undefined,
  };

  let setHoverCount = false;

  // Iterate in reverse (front-to-back, since hitboxes are added back-to-front)
  for (let i = frame.hitboxes.length - 1; i >= 0; i--) {
    const hitbox = frame.hitboxes[i]!;

    // Check if point is inside hitbox bounds
    let effectiveBounds = hitbox.bounds;

    // Apply content mask clipping if present
    if (hitbox.contentMask) {
      const maskBounds = hitbox.contentMask.bounds;
      const clippedX = Math.max(effectiveBounds.x, maskBounds.x);
      const clippedY = Math.max(effectiveBounds.y, maskBounds.y);
      const clippedRight = Math.min(
        effectiveBounds.x + effectiveBounds.width,
        maskBounds.x + maskBounds.width
      );
      const clippedBottom = Math.min(
        effectiveBounds.y + effectiveBounds.height,
        maskBounds.y + maskBounds.height
      );

      if (clippedRight <= clippedX || clippedBottom <= clippedY) {
        // Completely clipped out
        continue;
      }

      effectiveBounds = {
        x: clippedX,
        y: clippedY,
        width: clippedRight - clippedX,
        height: clippedBottom - clippedY,
      };
    }

    const inside =
      x >= effectiveBounds.x &&
      x < effectiveBounds.x + effectiveBounds.width &&
      y >= effectiveBounds.y &&
      y < effectiveBounds.y + effectiveBounds.height;

    if (!inside) {
      continue;
    }

    result.ids.push(hitbox.id);

    // Set cursor from first hitbox that has one (topmost)
    if (result.cursor === undefined && hitbox.cursor !== undefined) {
      result.cursor = hitbox.cursor;
    }

    // Handle occlusion
    if (!setHoverCount && hitbox.behavior === HitboxBehavior.BlockMouseExceptScroll) {
      result.hoverHitboxCount = result.ids.length;
      setHoverCount = true;
    }

    if (hitbox.behavior === HitboxBehavior.BlockMouse) {
      // Stop checking further back hitboxes
      break;
    }
  }

  if (!setHoverCount) {
    result.hoverHitboxCount = result.ids.length;
  }

  return result;
}

/**
 * Check if a hitbox ID is hovered based on the current hit test.
 */
export function isHitboxHovered(hitTest: HitTest, id: HitboxId): boolean {
  for (let i = 0; i < hitTest.hoverHitboxCount; i++) {
    if (hitTest.ids[i] === id) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a hitbox ID should handle scroll events.
 * All hitboxes in the hit test can handle scroll (not just hovered ones).
 */
export function shouldHitboxHandleScroll(hitTest: HitTest, id: HitboxId): boolean {
  return hitTest.ids.includes(id);
}

// ============ Group Hitboxes ============

/**
 * Group hitbox tracking for group hover effects.
 * Maps group names to stacks of hitbox IDs.
 */
export class GroupHitboxes {
  private groups = new Map<string, HitboxId[]>();

  /**
   * Get the topmost hitbox ID for a group.
   */
  get(groupName: string): HitboxId | null {
    const stack = this.groups.get(groupName);
    if (!stack || stack.length === 0) {
      return null;
    }
    return stack[stack.length - 1]!;
  }

  /**
   * Push a hitbox ID onto a group's stack.
   */
  push(groupName: string, hitboxId: HitboxId): void {
    let stack = this.groups.get(groupName);
    if (!stack) {
      stack = [];
      this.groups.set(groupName, stack);
    }
    stack.push(hitboxId);
  }

  /**
   * Pop a hitbox ID from a group's stack.
   */
  pop(groupName: string): void {
    const stack = this.groups.get(groupName);
    if (stack && stack.length > 0) {
      stack.pop();
    }
  }

  /**
   * Clear all groups.
   */
  clear(): void {
    this.groups.clear();
  }
}
