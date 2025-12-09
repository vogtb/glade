/**
 * Scene graph and GPU primitives for Flash.
 *
 * The scene collects all rendering primitives for a frame, organized
 * into layers for proper z-ordering (painter's algorithm).
 */

import type { Color, ContentMask, Bounds, TransformationMatrix } from "./types.ts";
import { boundsIntersect, IDENTITY_TRANSFORM, multiplyTransform } from "./types.ts";

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
  /** Whether border is dashed (1.0) or solid (0.0). */
  borderDashed?: number;
  /** Dash length for dashed borders. Default 6. */
  borderDashLength?: number;
  /** Gap length for dashed borders. Default 4. */
  borderGapLength?: number;
  clipBounds?: ClipBounds;
  transform?: TransformationMatrix;
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
  transform?: TransformationMatrix;
}

/**
 * Glyph primitive for text rendering.
 * Compatible with GlyphInstance from text.ts.
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
  clipBounds?: ClipBounds;
}

/**
 * Text primitive for high-level text rendering.
 * Used to queue text that will be shaped and converted to glyphs.
 */
export interface TextPrimitive {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  lineHeight: number;
  color: Color;
  fontFamily: string;
  maxWidth?: number;
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
 * A vertex in a path for GPU rendering.
 */
export interface PathVertex {
  x: number;
  y: number;
}

/**
 * Path primitive for vector rendering.
 * Paths are tessellated into triangles for GPU rendering.
 */
export interface PathPrimitive {
  vertices: PathVertex[];
  indices: number[];
  color: Color;
  bounds: Bounds;
  clipBounds?: ClipBounds;
  transform?: TransformationMatrix;
}

/**
 * Underline style.
 */
export type UnderlineStyle = "solid" | "wavy";

/**
 * Underline primitive for text decoration rendering.
 * Supports both solid and wavy (spell-check) underlines.
 */
export interface UnderlinePrimitive {
  x: number;
  y: number;
  width: number;
  thickness: number;
  color: Color;
  style: UnderlineStyle;
  /** Wavelength for wavy underlines (pixels per wave cycle). */
  wavelength?: number;
  /** Amplitude for wavy underlines (pixels of wave height). */
  amplitude?: number;
  clipBounds?: ClipBounds;
  transform?: TransformationMatrix;
}

/**
 * A scene layer containing primitives at the same z-level.
 */
export interface SceneLayer {
  shadows: ShadowPrimitive[];
  rects: RectPrimitive[];
  glyphs: GlyphPrimitive[];
  images: ImagePrimitive[];
  paths: PathPrimitive[];
  underlines: UnderlinePrimitive[];
}

/**
 * Scene collects all primitives for a frame.
 * Layers provide z-ordering (painter's algorithm).
 */
export class FlashScene {
  private layers: SceneLayer[] = [];
  private currentLayerIndex = 0;
  private clipStack: ContentMask[] = [];
  private transformStack: TransformationMatrix[] = [];

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
   * Get the current transform from the transform stack.
   * Returns identity if no transform is active.
   */
  getCurrentTransform(): TransformationMatrix {
    if (this.transformStack.length === 0) {
      return IDENTITY_TRANSFORM;
    }
    return this.transformStack[this.transformStack.length - 1]!;
  }

  /**
   * Push a transform onto the transform stack.
   * The new transform is composed with the current transform.
   */
  pushTransform(transform: TransformationMatrix): void {
    const current = this.getCurrentTransform();
    const composed = multiplyTransform(current, transform);
    this.transformStack.push(composed);
  }

  /**
   * Pop a transform from the transform stack.
   */
  popTransform(): void {
    this.transformStack.pop();
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
      paths: [],
      underlines: [],
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
    const transform = this.getCurrentTransform();
    const hasTransform =
      transform.a !== 1 ||
      transform.b !== 0 ||
      transform.c !== 0 ||
      transform.d !== 1 ||
      transform.tx !== 0 ||
      transform.ty !== 0;
    this.currentLayer.rects.push({
      ...rect,
      clipBounds,
      transform: hasTransform ? transform : undefined,
    });
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
    const transform = this.getCurrentTransform();
    const hasTransform =
      transform.a !== 1 ||
      transform.b !== 0 ||
      transform.c !== 0 ||
      transform.d !== 1 ||
      transform.tx !== 0 ||
      transform.ty !== 0;
    this.currentLayer.shadows.push({
      ...shadow,
      clipBounds,
      transform: hasTransform ? transform : undefined,
    });
  }

  /**
   * Add a glyph to the current layer.
   */
  addGlyph(glyph: GlyphPrimitive): void {
    const bounds = { x: glyph.x, y: glyph.y, width: glyph.width, height: glyph.height };
    if (this.isClippedOut(bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    this.currentLayer.glyphs.push({
      ...glyph,
      clipBounds,
    });
  }

  /**
   * Add an image to the current layer.
   */
  addImage(image: ImagePrimitive): void {
    this.currentLayer.images.push(image);
  }

  /**
   * Add a path to the current layer.
   */
  addPath(path: PathPrimitive): void {
    if (this.isClippedOut(path.bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    const transform = this.getCurrentTransform();
    const hasTransform =
      transform.a !== 1 ||
      transform.b !== 0 ||
      transform.c !== 0 ||
      transform.d !== 1 ||
      transform.tx !== 0 ||
      transform.ty !== 0;
    this.currentLayer.paths.push({
      ...path,
      clipBounds,
      transform: hasTransform ? transform : undefined,
    });
  }

  /**
   * Add an underline to the current layer.
   */
  addUnderline(underline: UnderlinePrimitive): void {
    const bounds = {
      x: underline.x,
      y: underline.y,
      width: underline.width,
      height: underline.thickness,
    };
    if (this.isClippedOut(bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    const transform = this.getCurrentTransform();
    const hasTransform =
      transform.a !== 1 ||
      transform.b !== 0 ||
      transform.c !== 0 ||
      transform.d !== 1 ||
      transform.tx !== 0 ||
      transform.ty !== 0;
    this.currentLayer.underlines.push({
      ...underline,
      clipBounds,
      transform: hasTransform ? transform : undefined,
    });
  }

  /**
   * Clear all layers and reset to initial state.
   */
  clear(): void {
    this.layers = [];
    this.currentLayerIndex = 0;
    this.clipStack = [];
    this.transformStack = [];
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
  getStats(): {
    rects: number;
    shadows: number;
    glyphs: number;
    images: number;
    paths: number;
    underlines: number;
    layers: number;
  } {
    let rects = 0;
    let shadows = 0;
    let glyphs = 0;
    let images = 0;
    let paths = 0;
    let underlines = 0;
    for (const layer of this.layers) {
      rects += layer.rects.length;
      shadows += layer.shadows.length;
      glyphs += layer.glyphs.length;
      images += layer.images.length;
      paths += layer.paths.length;
      underlines += layer.underlines.length;
    }
    return { rects, shadows, glyphs, images, paths, underlines, layers: this.layers.length };
  }
}
