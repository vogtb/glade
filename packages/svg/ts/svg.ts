/**
 * @glade/svg - WASM-based SVG parsing and tessellation
 *
 * Uses Lyon for high-quality path tessellation, providing triangle meshes
 * for GPU rendering in Flash.
 */

import { initSync, SvgTessellator, type InitOutput } from "../pkg/svg";
import { embedAsBase64 } from "./embed" with { type: "macro" };

const wasmBase64 = embedAsBase64("../pkg/svg_bg.wasm") as unknown as string;

let wasmModule: InitOutput | null = null;
let sharedTessellator: SvgTessellator | null = null;

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function initSvg(): InitOutput {
  if (wasmModule) {
    return wasmModule;
  }
  const wasmBytes = base64ToBytes(wasmBase64);
  wasmModule = initSync({ module: wasmBytes });
  return wasmModule;
}

export function isInitialized(): boolean {
  return wasmModule !== null;
}

export function createSvgTessellator(): SvgTessellator {
  initSvg();
  return new SvgTessellator();
}

export function getSharedTessellator(): SvgTessellator {
  if (!sharedTessellator) {
    sharedTessellator = createSvgTessellator();
  }
  return sharedTessellator;
}

export interface TessellatedMesh {
  vertices: Float32Array;
  indices: Uint32Array;
  bounds: MeshBounds;
}

export interface MeshBounds {
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
}

export interface ParsedPath {
  fill?: string;
  stroke?: string;
  stroke_width?: number;
  d: string;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParsedSvg {
  width: number;
  height: number;
  view_box?: ViewBox;
  paths: ParsedPath[];
}

interface RawMesh {
  vertices: number[];
  indices: number[];
  bounds: MeshBounds;
}

function convertMesh(raw: RawMesh): TessellatedMesh {
  return {
    vertices: new Float32Array(raw.vertices),
    indices: new Uint32Array(raw.indices),
    bounds: raw.bounds,
  };
}

export function parseSvg(svgContent: string): ParsedSvg {
  const tessellator = getSharedTessellator();
  return tessellator.parse_svg(svgContent) as ParsedSvg;
}

export function tessellatePath(
  pathD: string,
  offsetX = 0,
  offsetY = 0,
  scaleX = 1,
  scaleY = 1
): TessellatedMesh {
  const tessellator = getSharedTessellator();
  const raw = tessellator.tessellate_path(pathD, offsetX, offsetY, scaleX, scaleY) as RawMesh;
  return convertMesh(raw);
}

export function tessellateStroke(
  pathD: string,
  strokeWidth: number,
  offsetX = 0,
  offsetY = 0,
  scaleX = 1,
  scaleY = 1
): TessellatedMesh {
  const tessellator = getSharedTessellator();
  const raw = tessellator.tessellate_stroke(
    pathD,
    strokeWidth,
    offsetX,
    offsetY,
    scaleX,
    scaleY
  ) as RawMesh;
  return convertMesh(raw);
}

export function tessellateSvg(
  svgContent: string,
  displayWidth: number,
  displayHeight: number
): TessellatedMesh[] {
  const tessellator = getSharedTessellator();
  const rawMeshes = tessellator.tessellate_svg(
    svgContent,
    displayWidth,
    displayHeight
  ) as RawMesh[];
  return rawMeshes.map(convertMesh);
}

export type { SvgTessellator, InitOutput };
