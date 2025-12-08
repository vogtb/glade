/**
 * Scene graph and GPU primitives for Flash.
 *
 * The scene collects all rendering primitives for a frame, organized
 * into layers for proper z-ordering (painter's algorithm).
 */

import type { Color, ContentMask, Bounds } from "./types.ts";
import { boundsIntersect } from "./types.ts";

/**
 * Clip bounds for shader-based clipping.
 * When present, fragments outside these bounds are discarded.
 */
export interface ClipBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}

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
  clipBounds?: ClipBounds;
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
  clipBounds?: ClipBounds;
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
  private clipStack: ContentMask[] = [];

  constructor() {
    this.pushLayer();
  }

  private get currentLayer(): SceneLayer {
    return this.layers[this.currentLayerIndex]!;
  }

  /**
   * Get the current clip bounds from the clip stack.
   * Returns null if no clipping is active.
   */
  private getCurrentClipBounds(): ClipBounds | undefined {
    if (this.clipStack.length === 0) {
      return undefined;
    }

    let result = this.clipStack[0]!.bounds;
    let cornerRadius = this.clipStack[0]!.cornerRadius;

    for (let i = 1; i < this.clipStack.length; i++) {
      const mask = this.clipStack[i]!;
      const intersection = boundsIntersect(result, mask.bounds);
      if (!intersection) {
        return { x: 0, y: 0, width: 0, height: 0, cornerRadius: 0 };
      }
      result = intersection;
      cornerRadius = Math.max(cornerRadius, mask.cornerRadius);
    }

    return {
      x: result.x,
      y: result.y,
      width: result.width,
      height: result.height,
      cornerRadius,
    };
  }

  /**
   * Check if primitive bounds are completely clipped out.
   */
  private isClippedOut(bounds: Bounds): boolean {
    const clip = this.getCurrentClipBounds();
    if (!clip || (clip.width === 0 && clip.height === 0)) {
      return clip?.width === 0 || false;
    }
    const intersection = boundsIntersect(bounds, {
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
    });
    return intersection === null;
  }

  /**
   * Push a content mask onto the clip stack.
   */
  pushContentMask(mask: ContentMask): void {
    this.clipStack.push(mask);
  }

  /**
   * Pop a content mask from the clip stack.
   */
  popContentMask(): void {
    this.clipStack.pop();
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
    const bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    if (this.isClippedOut(bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    this.currentLayer.rects.push({ ...rect, clipBounds });
  }

  /**
   * Add a shadow to the current layer.
   */
  addShadow(shadow: ShadowPrimitive): void {
    const bounds = { x: shadow.x, y: shadow.y, width: shadow.width, height: shadow.height };
    if (this.isClippedOut(bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    this.currentLayer.shadows.push({ ...shadow, clipBounds });
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
    this.clipStack = [];
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
