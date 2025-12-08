/**
 * Scene graph and GPU primitives for Flash.
 *
 * The scene collects all rendering primitives for a frame, organized
 * into layers for proper z-ordering (painter's algorithm).
 */

import type { Color } from "./types.ts";

/**
 * Rectangle primitive for GPU rendering.
 */
export interface RectPrimitive {
  x: number;
  y: number;
  width: number;
  height: number;
  color: Color;
  cornerRadius: number;
  borderWidth: number;
  borderColor: Color;
}

/**
 * Shadow primitive for GPU rendering.
 */
export interface ShadowPrimitive {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  color: Color;
  blur: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Glyph primitive for text rendering.
 */
export interface GlyphPrimitive {
  x: number;
  y: number;
  width: number;
  height: number;
  atlasX: number;
  atlasY: number;
  atlasWidth: number;
  atlasHeight: number;
  color: Color;
}

/**
 * Image primitive for rendering textures.
 */
export interface ImagePrimitive {
  x: number;
  y: number;
  width: number;
  height: number;
  textureId: number;
  cornerRadius: number;
  opacity: number;
}

/**
 * A scene layer containing primitives at the same z-level.
 */
export interface SceneLayer {
  shadows: ShadowPrimitive[];
  rects: RectPrimitive[];
  glyphs: GlyphPrimitive[];
  images: ImagePrimitive[];
}

/**
 * Scene collects all primitives for a frame.
 * Layers provide z-ordering (painter's algorithm).
 */
export class FlashScene {
  private layers: SceneLayer[] = [];
  private currentLayerIndex = 0;

  constructor() {
    this.pushLayer();
  }

  private get currentLayer(): SceneLayer {
    return this.layers[this.currentLayerIndex]!;
  }

  /**
   * Push a new layer onto the stack.
   */
  pushLayer(): void {
    this.layers.push({
      shadows: [],
      rects: [],
      glyphs: [],
      images: [],
    });
    this.currentLayerIndex = this.layers.length - 1;
  }

  /**
   * Pop back to the previous layer.
   */
  popLayer(): void {
    if (this.currentLayerIndex > 0) {
      this.currentLayerIndex--;
    }
  }

  /**
   * Add a rectangle to the current layer.
   */
  addRect(rect: RectPrimitive): void {
    this.currentLayer.rects.push(rect);
  }

  /**
   * Add a shadow to the current layer.
   */
  addShadow(shadow: ShadowPrimitive): void {
    this.currentLayer.shadows.push(shadow);
  }

  /**
   * Add a glyph to the current layer.
   */
  addGlyph(glyph: GlyphPrimitive): void {
    this.currentLayer.glyphs.push(glyph);
  }

  /**
   * Add an image to the current layer.
   */
  addImage(image: ImagePrimitive): void {
    this.currentLayer.images.push(image);
  }

  /**
   * Clear all layers and reset to initial state.
   */
  clear(): void {
    this.layers = [];
    this.currentLayerIndex = 0;
    this.pushLayer();
  }

  /**
   * Get all layers for rendering.
   */
  getLayers(): readonly SceneLayer[] {
    return this.layers;
  }

  /**
   * Get total primitive counts for debugging.
   */
  getStats(): { rects: number; shadows: number; glyphs: number; images: number; layers: number } {
    let rects = 0;
    let shadows = 0;
    let glyphs = 0;
    let images = 0;
    for (const layer of this.layers) {
      rects += layer.rects.length;
      shadows += layer.shadows.length;
      glyphs += layer.glyphs.length;
      images += layer.images.length;
    }
    return { rects, shadows, glyphs, images, layers: this.layers.length };
  }
}
