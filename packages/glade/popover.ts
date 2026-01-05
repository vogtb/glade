/**
 * Popover system for Glade. Provides overlay popups that don't affect layout.
 * Uses a manager pattern similar to tooltips - elements register during
 * prepaint and the manager handles rendering in the deferred pass.
 *
 * Behavior:
 * - Trigger element registers with PopoverManager during prepaint
 * - Manager tracks which popover is active
 * - Active popover is rendered in deferred pass (after normal elements)
 * - Click outside dismisses the popover
 */

import type { Corner } from "./anchored.ts";
import type { Bounds } from "./bounds.ts";
import type { GladeContext } from "./context.ts";
import type { AnyGladeElement } from "./element.ts";
import type { HitboxId } from "./hitbox.ts";
import type { Point } from "./point.ts";
import type { Size } from "./size.ts";

export type PopoverSide = "top" | "bottom" | "left" | "right";
export type PopoverAlign = "start" | "center" | "end";
export type PopoverCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * Popover configuration.
 */
export interface PopoverConfig {
  /** Preferred side relative to trigger. */
  side: PopoverSide;
  /** Alignment along the side. */
  align: PopoverAlign;
  /** Offset from trigger element. */
  sideOffset: number;
  /** Margin from window edges. */
  windowMargin: number;
}

/**
 * Default popover configuration.
 */
export const DEFAULT_POPOVER_CONFIG: PopoverConfig = {
  side: "bottom",
  align: "start",
  sideOffset: 4,
  windowMargin: 8,
};

/**
 * Builder function for creating popover content.
 */

export type PopoverBuilder = (cx: GladeContext) => AnyGladeElement;

/**
 * Popover registration for an element.
 */
export interface PopoverRegistration {
  /** Unique ID for this popover. */
  id: string;
  /** Hitbox ID of the trigger element. */
  hitboxId: HitboxId;
  /** Bounds of the triggering element. */
  triggerBounds: Bounds;
  /** Function to build popover content. */
  builder: PopoverBuilder;
  /** Popover configuration. */
  config: PopoverConfig;
  /** Whether this popover is currently open. */
  open: boolean;
  /** Callback when popover should close. */
  onClose: (() => void) | null;
}

/**
 * Active popover state.
 */
export interface ActivePopover {
  /** Registration that created this popover. */
  registration: PopoverRegistration;
  /** Computed popover bounds. */
  bounds: Bounds | null;
  /** The popover element. */

  element: AnyGladeElement | null;
  /** Anchor corner used for positioning. */
  anchorCorner: Corner;
  /** Computed anchor position. */
  anchorPosition: Point;
}

/**
 * Popover manager for tracking and displaying popovers.
 */
export class PopoverManager {
  private registrations = new Map<string, PopoverRegistration>();
  private activePopover: ActivePopover | null = null;

  /**
   * Register a popover.
   */
  register(registration: PopoverRegistration): void {
    this.registrations.set(registration.id, registration);

    // If this popover is open, set it as active
    if (registration.open) {
      // Only one popover can be active at a time. If a different popover
      // becomes active, close the previous one
      if (this.activePopover && this.activePopover.registration.id !== registration.id) {
        const previousOnClose = this.activePopover.registration.onClose;
        if (previousOnClose) {
          previousOnClose();
        }
      }

      this.activePopover = {
        registration,
        bounds: null,
        element: null,
        anchorCorner: "top-left",
        anchorPosition: { x: 0, y: 0 },
      };
    } else if (this.activePopover?.registration.id === registration.id) {
      // This popover was active but is now closed
      this.activePopover = null;
    }
  }

  /**
   * Clear all registrations (called each frame). Also clears active popover.
   * If the component still exists, it will re-register during prepaint.
   */
  clearRegistrations(): void {
    this.registrations.clear();
    this.activePopover = null;
  }

  /**
   * Build the active popover element.
   */
  buildActivePopover(cx: GladeContext, _windowSize: Size): void {
    if (!this.activePopover) {
      return;
    }

    const { registration } = this.activePopover;
    const { triggerBounds, config } = registration;

    // Build the element
    this.activePopover.element = registration.builder(cx);

    // Calculate anchor position and corner
    const { position, corner } = this.calculateAnchorPosition(triggerBounds, config);
    this.activePopover.anchorPosition = position;
    this.activePopover.anchorCorner = corner;

    // We don't know the popover size yet - that will be determined during
    // layout. The anchored element will handle final positioning
    this.activePopover.bounds = {
      x: position.x,
      y: position.y,
      width: 0,
      height: 0,
    };
  }

  /**
   * Calculate anchor position based on side and align settings.
   */
  private calculateAnchorPosition(
    triggerBounds: Bounds,
    config: PopoverConfig
  ): { position: Point; corner: Corner } {
    const { side, align, sideOffset } = config;
    let x: number = triggerBounds.x;
    let y: number = triggerBounds.y;
    let corner: Corner = "top-left";

    switch (side) {
      case "bottom":
        y = triggerBounds.y + triggerBounds.height + sideOffset;
        corner = "top-left";
        break;
      case "top":
        y = triggerBounds.y - sideOffset;
        corner = "bottom-left";
        break;
      case "right":
        x = triggerBounds.x + triggerBounds.width + sideOffset;
        y = triggerBounds.y;
        corner = "top-left";
        break;
      case "left":
        x = triggerBounds.x - sideOffset;
        y = triggerBounds.y;
        corner = "top-right";
        break;
    }

    // Handle alignment
    if (side === "bottom" || side === "top") {
      switch (align) {
        case "start":
          x = triggerBounds.x;
          break;
        case "center":
          x = triggerBounds.x + triggerBounds.width / 2;
          // For center alignment, we want the popover centered
          corner = side === "bottom" ? "top-left" : "bottom-left";
          break;
        case "end":
          x = triggerBounds.x + triggerBounds.width;
          corner = side === "bottom" ? "top-right" : "bottom-right";
          break;
      }
    } else {
      switch (align) {
        case "start":
          y = triggerBounds.y;
          break;
        case "center":
          y = triggerBounds.y + triggerBounds.height / 2;
          break;
        case "end":
          y = triggerBounds.y + triggerBounds.height;
          corner = side === "right" ? "bottom-left" : "bottom-right";
          break;
      }
    }

    return { position: { x, y }, corner };
  }

  /**
   * Get the active popover if one exists.
   */
  getActivePopover(): ActivePopover | null {
    return this.activePopover;
  }

  /**
   * Handle click event for dismissing popovers. Returns true if click was
   * outside the popover and it should be dismissed.
   */
  handleClick(clickPosition: Point, popoverBounds: Bounds | null): boolean {
    if (!this.activePopover || !popoverBounds) {
      return false;
    }

    // Check if click is inside popover bounds
    const inside =
      clickPosition.x >= popoverBounds.x &&
      clickPosition.x <= popoverBounds.x + popoverBounds.width &&
      clickPosition.y >= popoverBounds.y &&
      clickPosition.y <= popoverBounds.y + popoverBounds.height;

    // Also check if click is inside trigger bounds
    const triggerBounds = this.activePopover.registration.triggerBounds;
    const insideTrigger =
      clickPosition.x >= triggerBounds.x &&
      clickPosition.x <= triggerBounds.x + triggerBounds.width &&
      clickPosition.y >= triggerBounds.y &&
      clickPosition.y <= triggerBounds.y + triggerBounds.height;

    if (!inside && !insideTrigger) {
      // Click was outside - dismiss
      const onClose = this.activePopover.registration.onClose;
      if (onClose) {
        onClose();
      }
      return true;
    }

    return false;
  }

  /**
   * Hide the current popover.
   */
  hide(): void {
    if (this.activePopover) {
      const onClose = this.activePopover.registration.onClose;
      if (onClose) {
        onClose();
      }
      this.activePopover = null;
    }
  }

  /**
   * Check if a popover is currently active.
   */
  isActive(): boolean {
    return this.activePopover !== null;
  }

  /**
   * Check if a specific popover ID is currently active.
   */
  isPopoverActive(id: string): boolean {
    return this.activePopover?.registration.id === id;
  }
}

/**
 * Fluent builder for popover configuration.
 */
export class PopoverConfigBuilder {
  private config: PopoverConfig = { ...DEFAULT_POPOVER_CONFIG };

  /**
   * Set preferred side.
   */
  side(s: PopoverSide): this {
    this.config.side = s;
    return this;
  }

  /**
   * Set alignment.
   */
  align(a: PopoverAlign): this {
    this.config.align = a;
    return this;
  }

  /**
   * Set offset from trigger.
   */
  sideOffset(px: number): this {
    this.config.sideOffset = px;
    return this;
  }

  /**
   * Set margin from window edges.
   */
  windowMargin(px: number): this {
    this.config.windowMargin = px;
    return this;
  }

  /**
   * Build the configuration.
   */
  build(): PopoverConfig {
    return { ...this.config };
  }
}

/**
 * Create a popover configuration builder.
 */
export function popoverConfig(): PopoverConfigBuilder {
  return new PopoverConfigBuilder();
}
