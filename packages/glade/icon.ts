/**
 * Icon element - a simple wrapper for common SVG icons. Provides a convenient
 * API for rendering icons with consistent sizing.
 */

import { SvgElement, SvgIcons } from "./svg.ts";

/**
 * Available icon names from the built-in icon set.
 */
export type IconName = keyof typeof SvgIcons;

/**
 * Icon element for rendering common UI icons.
 *
 * Usage:
 * ```ts
 * icon("check").size(24).color({ r: 0, g: 1, b: 0, a: 1 })
 * icon("close", 16) // shorthand with size
 * ```
 */
export class GladeIcon extends SvgElement {
  constructor(name: IconName, size?: number) {
    const pathData = SvgIcons[name];
    const svgContent = `<svg viewBox="0 0 24 24"><path d="${pathData}"/></svg>`;
    super(svgContent);
    if (size !== undefined) {
      this.size(size, size);
    }
  }

  /**
   * Set the icon size (width and height).
   */
  override size(s: number): this;
  override size(w: number, h: number): this;
  override size(w: number, h?: number): this {
    super.size(w, h ?? w);
    return this;
  }
}

/**
 * Factory function to create an icon element.
 *
 * @param name - Icon name from the built-in icon set
 * @param size - Optional size (width and height, defaults to 24)
 *
 * @example
 * // Basic usage
 * icon("check")
 *
 * @example
 * // With size
 * icon("close", 16)
 *
 * @example
 * // With color
 * icon("star").size(32).color({ r: 1, g: 0.8, b: 0, a: 1 })
 */
export function icon(name: IconName, size?: number): GladeIcon {
  return new GladeIcon(name, size ?? 24);
}
