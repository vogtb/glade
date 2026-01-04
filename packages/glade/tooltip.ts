/**
 * Tooltip system for Glade.
 *
 * Provides delayed tooltip display with positioning and hover support.
 * Inspired by GPUI's tooltip system.
 */

import type { GladeContext } from "./context.ts";
import type { AnyGladeElement, GladeElement } from "./element.ts";
import type { HitboxId } from "./hitbox.ts";
import type { Bounds, Point } from "./types.ts";

/**
 * Position preference for tooltip placement.
 */
export type TooltipPosition = "top" | "bottom" | "left" | "right" | "cursor";

/**
 * Tooltip configuration.
 */
export interface TooltipConfig {
  /** Delay before showing tooltip in milliseconds. */
  delay: number;
  /** Whether tooltip stays visible when hovered. */
  hoverable: boolean;
  /** Preferred position relative to target. */
  position: TooltipPosition;
  /** Offset from target element. */
  offset: number;
}

/**
 * Default tooltip configuration.
 */
export const DEFAULT_TOOLTIP_CONFIG: TooltipConfig = {
  delay: 500,
  hoverable: false,
  position: "top",
  offset: 8,
};

/**
 * Builder function for creating tooltip content.
 * Called when tooltip should be displayed.
 */

export type TooltipBuilder = (cx: GladeContext) => AnyGladeElement;

/**
 * Tooltip registration for an element.
 */
export interface TooltipRegistration {
  /** Hitbox ID of the element that triggers the tooltip. */
  hitboxId: HitboxId;
  /** Bounds of the triggering element. */
  targetBounds: Bounds;
  /** Function to build tooltip content. */
  builder: TooltipBuilder;
  /** Tooltip configuration. */
  config: TooltipConfig;
}

/**
 * Active tooltip state.
 */
export interface ActiveTooltip {
  /** Registration that created this tooltip. */
  registration: TooltipRegistration;
  /** When the hover started. */
  hoverStartTime: number;
  /** Whether tooltip is currently visible. */
  visible: boolean;
  /** Computed tooltip bounds (once visible). */
  bounds: Bounds | null;
  /** The tooltip element (once visible). */
  element: GladeElement | null;
}

/**
 * Tooltip manager for tracking and displaying tooltips.
 */
export class TooltipManager {
  private registrations = new Map<HitboxId, TooltipRegistration>();
  private activeTooltip: ActiveTooltip | null = null;
  private hoveredHitboxId: HitboxId | null = null;

  /**
   * Register a tooltip for a hitbox.
   */
  register(registration: TooltipRegistration): void {
    this.registrations.set(registration.hitboxId, registration);
  }

  /**
   * Clear all registrations (called each frame).
   */
  clearRegistrations(): void {
    this.registrations.clear();
  }

  /**
   * Update tooltip state based on current hover.
   * Returns true if tooltip visibility changed.
   */
  update(hoveredHitboxId: HitboxId | null, now: number, cx: GladeContext): boolean {
    const previouslyVisible = this.activeTooltip?.visible ?? false;

    if (hoveredHitboxId !== this.hoveredHitboxId) {
      // Hover target changed
      this.hoveredHitboxId = hoveredHitboxId;

      if (hoveredHitboxId === null) {
        // No longer hovering anything
        if (this.activeTooltip && !this.activeTooltip.registration.config.hoverable) {
          this.activeTooltip = null;
        }
      } else {
        const registration = this.registrations.get(hoveredHitboxId);
        if (registration) {
          // Start new tooltip hover
          this.activeTooltip = {
            registration,
            hoverStartTime: now,
            visible: false,
            bounds: null,
            element: null,
          };
        } else {
          // Hovering something without a tooltip
          this.activeTooltip = null;
        }
      }
    }

    // Check if tooltip should become visible
    if (this.activeTooltip && !this.activeTooltip.visible) {
      const elapsed = now - this.activeTooltip.hoverStartTime;
      if (elapsed >= this.activeTooltip.registration.config.delay) {
        this.activeTooltip.visible = true;
        this.activeTooltip.element = this.activeTooltip.registration.builder(cx);
      }
    }

    return previouslyVisible !== (this.activeTooltip?.visible ?? false);
  }

  /**
   * Get the active tooltip if visible.
   */
  getActiveTooltip(): ActiveTooltip | null {
    if (this.activeTooltip?.visible) {
      return this.activeTooltip;
    }
    return null;
  }

  /**
   * Hide the current tooltip.
   */
  hide(): void {
    this.activeTooltip = null;
  }

  /**
   * Check if a tooltip is currently visible.
   */
  isVisible(): boolean {
    return this.activeTooltip?.visible ?? false;
  }

  /**
   * Compute tooltip bounds based on target and window size.
   */
  computeTooltipBounds(
    targetBounds: Bounds,
    tooltipSize: { width: number; height: number },
    windowSize: { width: number; height: number },
    config: TooltipConfig,
    cursorPosition?: Point
  ): Bounds {
    const { position, offset } = config;
    let x: number;
    let y: number;

    if (position === "cursor" && cursorPosition) {
      // Position relative to cursor
      x = cursorPosition.x + offset;
      y = cursorPosition.y + offset;
    } else {
      // Position relative to target element
      switch (position) {
        case "top":
          x = targetBounds.x + (targetBounds.width - tooltipSize.width) / 2;
          y = targetBounds.y - tooltipSize.height - offset;
          break;
        case "bottom":
          x = targetBounds.x + (targetBounds.width - tooltipSize.width) / 2;
          y = targetBounds.y + targetBounds.height + offset;
          break;
        case "left":
          x = targetBounds.x - tooltipSize.width - offset;
          y = targetBounds.y + (targetBounds.height - tooltipSize.height) / 2;
          break;
        case "right":
          x = targetBounds.x + targetBounds.width + offset;
          y = targetBounds.y + (targetBounds.height - tooltipSize.height) / 2;
          break;
        default:
          x = targetBounds.x + (targetBounds.width - tooltipSize.width) / 2;
          y = targetBounds.y - tooltipSize.height - offset;
      }
    }

    // Clamp to window bounds
    x = Math.max(0, Math.min(x, windowSize.width - tooltipSize.width));
    y = Math.max(0, Math.min(y, windowSize.height - tooltipSize.height));

    return {
      x,
      y,
      width: tooltipSize.width,
      height: tooltipSize.height,
    };
  }
}

/**
 * Fluent builder for tooltip configuration.
 */
export class TooltipConfigBuilder {
  private config: TooltipConfig = { ...DEFAULT_TOOLTIP_CONFIG };

  /**
   * Set delay before showing tooltip.
   */
  delay(ms: number): this {
    this.config.delay = ms;
    return this;
  }

  /**
   * Make tooltip stay visible when hovered.
   */
  hoverable(): this {
    this.config.hoverable = true;
    return this;
  }

  /**
   * Set tooltip position.
   */
  position(pos: TooltipPosition): this {
    this.config.position = pos;
    return this;
  }

  /**
   * Set offset from target.
   */
  offset(px: number): this {
    this.config.offset = px;
    return this;
  }

  /**
   * Build the configuration.
   */
  build(): TooltipConfig {
    return { ...this.config };
  }
}

/**
 * Create a tooltip configuration builder.
 */
export function tooltipConfig(): TooltipConfigBuilder {
  return new TooltipConfigBuilder();
}
