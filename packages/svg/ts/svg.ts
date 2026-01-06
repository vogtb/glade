/**
 * @glade/svg - WASM-based SVG parsing and tessellation
 *
 * Uses Lyon for high-quality path tessellation, providing triangle meshes
 * for GPU rendering in Glade.
 */

import { log } from "@glade/logging";
import { base64ToBytes, formatBytes } from "@glade/utils";

import { type InitOutput, initSync, SvgTessellator as WasmSvgTessellator } from "../pkg/svg";
import { SVG_WASM_BASE64 } from "./gen.embedded";

export class SvgTessellator extends WasmSvgTessellator {
  readonly module: InitOutput;

  constructor(module: InitOutput) {
    super();
    this.module = module;
  }
}

export function createSvgTessellator(): SvgTessellator {
  const wasmBytes = base64ToBytes(SVG_WASM_BASE64);
  log.info(`SVG embedded WASM binary is ${formatBytes(wasmBytes.byteLength)}`);
  const module = initSync({ module: wasmBytes });
  return new SvgTessellator(module);
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

export function parseSvg(tessellator: SvgTessellator, svgContent: string): ParsedSvg {
  return tessellator.parse_svg(svgContent) as ParsedSvg;
}

export function tessellatePath(
  tessellator: SvgTessellator,
  pathD: string,
  offsetX = 0,
  offsetY = 0,
  scaleX = 1,
  scaleY = 1
): TessellatedMesh {
  const raw = tessellator.tessellate_path(pathD, offsetX, offsetY, scaleX, scaleY) as RawMesh;
  return convertMesh(raw);
}

export function tessellateStroke(
  tessellator: SvgTessellator,
  pathD: string,
  strokeWidth: number,
  offsetX = 0,
  offsetY = 0,
  scaleX = 1,
  scaleY = 1
): TessellatedMesh {
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
  tessellator: SvgTessellator,
  svgContent: string,
  displayWidth: number,
  displayHeight: number
): TessellatedMesh[] {
  const rawMeshes = tessellator.tessellate_svg(
    svgContent,
    displayWidth,
    displayHeight
  ) as RawMesh[];
  return rawMeshes.map(convertMesh);
}

export type { InitOutput };
