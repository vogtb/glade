/**
 * Pure TypeScript image decoders for MacOS platform.
 *
 * These decoders work without Web APIs and are used when running
 * natively via Bun/Dawn where browser image decoding APIs aren't available.
 *
 * NOTE/TODO: This is very much a one-shot-and-it-works implementation for
 * image decoding, and could definitely be improved upon either by using a
 * library for this sort of thing, by using native Objective-C code, or
 * Rust compiled to WASM.
 */

import { clamp } from "@glade/utils";

/**
 * Decoded image data ready for GPU upload.
 */
export interface DecodedImage {
  width: number;
  height: number;
  /** RGBA pixel data (4 bytes per pixel) */
  data: Uint8Array;
}

// ============ PNG Decoder ============

/**
 * Minimal PNG decoder that works without Web APIs.
 * Supports: 8-bit RGB, RGBA, grayscale, grayscale+alpha, indexed color
 * Does NOT support: interlacing, 16-bit depth
 */
export function decodePNG(data: Uint8Array): DecodedImage {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // Validate PNG signature
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (data[i] !== signature[i]) {
      throw new Error("Invalid PNG signature");
    }
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let palette: Uint8Array | null = null;
  let transparency: Uint8Array | null = null;
  const compressedChunks: Uint8Array[] = [];

  let offset = 8;
  while (offset < data.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      data[offset + 4]!,
      data[offset + 5]!,
      data[offset + 6]!,
      data[offset + 7]!
    );
    const chunkData = data.subarray(offset + 8, offset + 8 + length);

    switch (type) {
      case "IHDR":
        width = view.getUint32(offset + 8, false);
        height = view.getUint32(offset + 12, false);
        bitDepth = data[offset + 16]!;
        colorType = data[offset + 17]!;
        if (bitDepth !== 8) {
          throw new Error(`Unsupported bit depth: ${bitDepth}`);
        }
        if (data[offset + 20] !== 0) {
          throw new Error("Interlaced PNGs not supported");
        }
        break;
      case "PLTE":
        palette = new Uint8Array(chunkData);
        break;
      case "tRNS":
        transparency = new Uint8Array(chunkData);
        break;
      case "IDAT":
        compressedChunks.push(new Uint8Array(chunkData));
        break;
      case "IEND":
        break;
    }

    offset += 12 + length;
  }

  // Decompress IDAT chunks
  const totalLength = compressedChunks.reduce((sum, c) => sum + c.length, 0);
  const compressed = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of compressedChunks) {
    compressed.set(chunk, pos);
    pos += chunk.length;
  }

  const decompressed = inflate(compressed);

  // Decode filtered scanlines
  const bytesPerPixel = getBytesPerPixel(colorType);
  const scanlineBytes = width * bytesPerPixel + 1;
  const rawPixels = new Uint8Array(width * height * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * scanlineBytes;
    const filterType = decompressed[scanlineOffset]!;
    const scanline = decompressed.subarray(
      scanlineOffset + 1,
      scanlineOffset + 1 + width * bytesPerPixel
    );
    const prevScanline =
      y > 0 ? rawPixels.subarray((y - 1) * width * bytesPerPixel, y * width * bytesPerPixel) : null;
    const destOffset = y * width * bytesPerPixel;

    unfilterScanline(filterType, scanline, prevScanline, bytesPerPixel, rawPixels, destOffset);
  }

  // Convert to RGBA
  const rgba = new Uint8Array(width * height * 4);
  convertToRGBA(rawPixels, rgba, width, height, colorType, palette, transparency);

  return { width, height, data: rgba };
}

function getBytesPerPixel(colorType: number): number {
  switch (colorType) {
    case 0:
      return 1; // Grayscale
    case 2:
      return 3; // RGB
    case 3:
      return 1; // Indexed
    case 4:
      return 2; // Grayscale + Alpha
    case 6:
      return 4; // RGBA
    default:
      throw new Error(`Unsupported color type: ${colorType}`);
  }
}

function unfilterScanline(
  filterType: number,
  scanline: Uint8Array,
  prevScanline: Uint8Array | null,
  bytesPerPixel: number,
  dest: Uint8Array,
  destOffset: number
): void {
  const len = scanline.length;

  for (let i = 0; i < len; i++) {
    const x = scanline[i]!;
    const a = i >= bytesPerPixel ? dest[destOffset + i - bytesPerPixel]! : 0;
    const b = prevScanline ? prevScanline[i]! : 0;
    const c = prevScanline && i >= bytesPerPixel ? prevScanline[i - bytesPerPixel]! : 0;

    let value: number;
    switch (filterType) {
      case 0: // None
        value = x;
        break;
      case 1: // Sub
        value = (x + a) & 0xff;
        break;
      case 2: // Up
        value = (x + b) & 0xff;
        break;
      case 3: // Average
        value = (x + Math.floor((a + b) / 2)) & 0xff;
        break;
      case 4: // Paeth
        value = (x + paethPredictor(a, b, c)) & 0xff;
        break;
      default:
        throw new Error(`Unknown filter type: ${filterType}`);
    }

    dest[destOffset + i] = value;
  }
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  if (pb <= pc) {
    return b;
  }
  return c;
}

function convertToRGBA(
  raw: Uint8Array,
  rgba: Uint8Array,
  width: number,
  height: number,
  colorType: number,
  palette: Uint8Array | null,
  transparency: Uint8Array | null
): void {
  const pixels = width * height;

  switch (colorType) {
    case 0: // Grayscale
      for (let i = 0; i < pixels; i++) {
        const v = raw[i]!;
        const alpha =
          transparency && transparency.length >= 2
            ? transparency[0] === 0 && transparency[1] === v
              ? 0
              : 255
            : 255;
        rgba[i * 4] = v;
        rgba[i * 4 + 1] = v;
        rgba[i * 4 + 2] = v;
        rgba[i * 4 + 3] = alpha;
      }
      break;
    case 2: // RGB
      for (let i = 0; i < pixels; i++) {
        rgba[i * 4] = raw[i * 3]!;
        rgba[i * 4 + 1] = raw[i * 3 + 1]!;
        rgba[i * 4 + 2] = raw[i * 3 + 2]!;
        rgba[i * 4 + 3] = 255;
      }
      break;
    case 3: // Indexed
      if (!palette) {
        throw new Error("Missing palette for indexed PNG");
      }
      for (let i = 0; i < pixels; i++) {
        const idx = raw[i]!;
        rgba[i * 4] = palette[idx * 3]!;
        rgba[i * 4 + 1] = palette[idx * 3 + 1]!;
        rgba[i * 4 + 2] = palette[idx * 3 + 2]!;
        rgba[i * 4 + 3] = transparency && idx < transparency.length ? transparency[idx]! : 255;
      }
      break;
    case 4: // Grayscale + Alpha
      for (let i = 0; i < pixels; i++) {
        const v = raw[i * 2]!;
        rgba[i * 4] = v;
        rgba[i * 4 + 1] = v;
        rgba[i * 4 + 2] = v;
        rgba[i * 4 + 3] = raw[i * 2 + 1]!;
      }
      break;
    case 6: // RGBA
      rgba.set(raw);
      break;
  }
}

// ============ DEFLATE Decompression (zlib) ============

/**
 * Inflate (decompress) zlib-compressed data.
 * Minimal implementation for PNG IDAT chunks.
 */
function inflate(data: Uint8Array): Uint8Array {
  // Skip zlib header (2 bytes) and verify
  if (data.length < 2) {
    throw new Error("Invalid zlib data");
  }

  const cmf = data[0]!;
  const flg = data[1]!;

  if ((cmf & 0x0f) !== 8) {
    throw new Error("Invalid compression method");
  }
  if (((cmf << 8) | flg) % 31 !== 0) {
    throw new Error("Invalid zlib header checksum");
  }

  const hasDict = (flg & 0x20) !== 0;
  if (hasDict) {
    throw new Error("Preset dictionary not supported");
  }

  // Inflate the deflate stream
  return inflateRaw(data.subarray(2, data.length - 4));
}

/**
 * Inflate raw deflate data (no zlib wrapper).
 */
function inflateRaw(data: Uint8Array): Uint8Array {
  const reader = new BitReader(data);
  const output: number[] = [];

  let isFinal = false;
  while (!isFinal) {
    isFinal = reader.readBits(1) === 1;
    const blockType = reader.readBits(2);

    switch (blockType) {
      case 0: // Stored
        inflateStored(reader, output);
        break;
      case 1: // Fixed Huffman
        inflateFixed(reader, output);
        break;
      case 2: // Dynamic Huffman
        inflateDynamic(reader, output);
        break;
      default:
        throw new Error("Invalid block type");
    }
  }

  return new Uint8Array(output);
}

class BitReader {
  private data: Uint8Array;
  private pos = 0;
  private bitPos = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  readBits(n: number): number {
    let value = 0;
    for (let i = 0; i < n; i++) {
      if (this.pos >= this.data.length) {
        throw new Error("Unexpected end of data");
      }
      value |= ((this.data[this.pos]! >> this.bitPos) & 1) << i;
      this.bitPos++;
      if (this.bitPos === 8) {
        this.bitPos = 0;
        this.pos++;
      }
    }
    return value;
  }

  readByte(): number {
    this.alignToByte();
    if (this.pos >= this.data.length) {
      throw new Error("Unexpected end of data");
    }
    return this.data[this.pos++]!;
  }

  alignToByte(): void {
    if (this.bitPos !== 0) {
      this.bitPos = 0;
      this.pos++;
    }
  }

  readBytes(n: number): Uint8Array {
    this.alignToByte();
    const result = this.data.subarray(this.pos, this.pos + n);
    this.pos += n;
    return result;
  }
}

function inflateStored(reader: BitReader, output: number[]): void {
  reader.alignToByte();
  const len = reader.readByte() | (reader.readByte() << 8);
  reader.readByte();
  reader.readByte(); // nlen (complement, skip)

  const bytes = reader.readBytes(len);
  for (let i = 0; i < bytes.length; i++) {
    output.push(bytes[i]!);
  }
}

// Fixed Huffman tables
const FIXED_LITERAL_LENGTHS = new Uint8Array(288);
for (let i = 0; i <= 143; i++) FIXED_LITERAL_LENGTHS[i] = 8;
for (let i = 144; i <= 255; i++) FIXED_LITERAL_LENGTHS[i] = 9;
for (let i = 256; i <= 279; i++) FIXED_LITERAL_LENGTHS[i] = 7;
for (let i = 280; i <= 287; i++) FIXED_LITERAL_LENGTHS[i] = 8;

const FIXED_DISTANCE_LENGTHS = new Uint8Array(32).fill(5);

function inflateFixed(reader: BitReader, output: number[]): void {
  const litTree = buildHuffmanTree(FIXED_LITERAL_LENGTHS);
  const distTree = buildHuffmanTree(FIXED_DISTANCE_LENGTHS);
  inflateWithTrees(reader, output, litTree, distTree);
}

function inflateDynamic(reader: BitReader, output: number[]): void {
  const hlit = reader.readBits(5) + 257;
  const hdist = reader.readBits(5) + 1;
  const hclen = reader.readBits(4) + 4;

  const codeLengthOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  const codeLengths = new Uint8Array(19);
  for (let i = 0; i < hclen; i++) {
    codeLengths[codeLengthOrder[i]!] = reader.readBits(3);
  }

  const codeTree = buildHuffmanTree(codeLengths);
  const allLengths = new Uint8Array(hlit + hdist);

  let i = 0;
  while (i < allLengths.length) {
    const code = decodeSymbol(reader, codeTree);
    if (code < 16) {
      allLengths[i++] = code;
    } else if (code === 16) {
      const repeat = reader.readBits(2) + 3;
      const prev = allLengths[i - 1]!;
      for (let j = 0; j < repeat; j++) allLengths[i++] = prev;
    } else if (code === 17) {
      const repeat = reader.readBits(3) + 3;
      for (let j = 0; j < repeat; j++) allLengths[i++] = 0;
    } else if (code === 18) {
      const repeat = reader.readBits(7) + 11;
      for (let j = 0; j < repeat; j++) allLengths[i++] = 0;
    }
  }

  const litTree = buildHuffmanTree(allLengths.subarray(0, hlit));
  const distTree = buildHuffmanTree(allLengths.subarray(hlit));
  inflateWithTrees(reader, output, litTree, distTree);
}

interface HuffmanNode {
  value?: number;
  left?: HuffmanNode;
  right?: HuffmanNode;
}

function buildHuffmanTree(lengths: Uint8Array): HuffmanNode {
  const maxBits = Math.max(...lengths);
  const blCount = new Uint16Array(maxBits + 1);
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i]!;
    if (len > 0) blCount[len]!++;
  }

  const nextCode = new Uint16Array(maxBits + 1);
  let code = 0;
  for (let bits = 1; bits <= maxBits; bits++) {
    code = (code + blCount[bits - 1]!) << 1;
    nextCode[bits] = code;
  }

  const root: HuffmanNode = {};
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i]!;
    if (len === 0) continue;

    const codeVal = nextCode[len]!;
    nextCode[len] = codeVal + 1;

    let node = root;
    for (let bit = len - 1; bit >= 0; bit--) {
      const isRight = (codeVal >> bit) & 1;
      if (isRight) {
        if (!node.right) node.right = {};
        node = node.right;
      } else {
        if (!node.left) node.left = {};
        node = node.left;
      }
    }
    node.value = i;
  }

  return root;
}

function decodeSymbol(reader: BitReader, tree: HuffmanNode): number {
  let node = tree;
  while (node.value === undefined) {
    const bit = reader.readBits(1);
    node = bit ? node.right! : node.left!;
    if (!node) {
      throw new Error("Invalid Huffman code");
    }
  }
  return node.value;
}

const LENGTH_EXTRA_BITS = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
];
const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131,
  163, 195, 227, 258,
];
const DISTANCE_EXTRA_BITS = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049,
  3073, 4097, 6145, 8193, 12289, 16385, 24577,
];

function inflateWithTrees(
  reader: BitReader,
  output: number[],
  litTree: HuffmanNode,
  distTree: HuffmanNode
): void {
  while (true) {
    const lit = decodeSymbol(reader, litTree);

    if (lit < 256) {
      output.push(lit);
    } else if (lit === 256) {
      break;
    } else {
      const lengthCode = lit - 257;
      const length = LENGTH_BASE[lengthCode]! + reader.readBits(LENGTH_EXTRA_BITS[lengthCode]!);

      const distCode = decodeSymbol(reader, distTree);
      const distance = DISTANCE_BASE[distCode]! + reader.readBits(DISTANCE_EXTRA_BITS[distCode]!);

      const start = output.length - distance;
      for (let i = 0; i < length; i++) {
        output.push(output[start + i]!);
      }
    }
  }
}

// ============ JPEG Decoder ============

/**
 * Minimal baseline JPEG decoder that works without Web APIs.
 * Supports: Baseline DCT (SOF0), YCbCr color space, 4:4:4 and 4:2:0 subsampling
 * Does NOT support: Progressive JPEG, CMYK, arithmetic coding
 */
export function decodeJPEG(data: Uint8Array): DecodedImage {
  const jpeg = new JPEGDecoder(data);
  return jpeg.decode();
}

class JPEGDecoder {
  private data: Uint8Array;
  private pos = 0;
  private width = 0;
  private height = 0;
  private components: JPEGComponent[] = [];
  private quantTables: (Int32Array | null)[] = [null, null, null, null];
  private huffmanDC: (HuffmanTable | null)[] = [null, null, null, null];
  private huffmanAC: (HuffmanTable | null)[] = [null, null, null, null];
  private mcuWidth = 0;
  private mcuHeight = 0;
  private mcusPerRow = 0;
  private mcusPerCol = 0;
  private restartInterval = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  decode(): DecodedImage {
    this.parseMarkers();
    const imageData = this.decodeImageData();
    return { width: this.width, height: this.height, data: imageData };
  }

  private readUint8(): number {
    return this.data[this.pos++]!;
  }

  private readUint16(): number {
    const val = (this.data[this.pos]! << 8) | this.data[this.pos + 1]!;
    this.pos += 2;
    return val;
  }

  private parseMarkers(): void {
    if (this.readUint8() !== 0xff || this.readUint8() !== 0xd8) {
      throw new Error("Invalid JPEG: missing SOI marker");
    }

    while (this.pos < this.data.length) {
      if (this.readUint8() !== 0xff) continue;

      let marker = this.readUint8();
      while (marker === 0xff) marker = this.readUint8();

      if (marker === 0xd9) break; // EOI
      if (marker === 0xd8) continue; // SOI
      if (marker === 0x00) continue; // Stuffed byte

      if (marker >= 0xd0 && marker <= 0xd7) continue; // RST markers

      const length = this.readUint16() - 2;
      const segmentEnd = this.pos + length;

      switch (marker) {
        case 0xc0: // SOF0 - Baseline DCT
          this.parseSOF(segmentEnd);
          break;
        case 0xc4: // DHT - Define Huffman Table
          this.parseDHT(segmentEnd);
          break;
        case 0xdb: // DQT - Define Quantization Table
          this.parseDQT(segmentEnd);
          break;
        case 0xdd: // DRI - Define Restart Interval
          this.restartInterval = this.readUint16();
          break;
        case 0xda: // SOS - Start of Scan
          this.parseSOS();
          return; // Image data follows
        case 0xe0: // APP0 (JFIF)
        case 0xe1: // APP1 (EXIF)
        case 0xe2:
        case 0xfe: // COM
          this.pos = segmentEnd;
          break;
        default:
          this.pos = segmentEnd;
          break;
      }
    }
  }

  private parseSOF(end: number): void {
    const precision = this.readUint8();
    if (precision !== 8) {
      throw new Error(`Unsupported bit depth: ${precision}`);
    }

    this.height = this.readUint16();
    this.width = this.readUint16();
    const numComponents = this.readUint8();

    let maxH = 1,
      maxV = 1;
    this.components = [];

    for (let i = 0; i < numComponents; i++) {
      const id = this.readUint8();
      const sampling = this.readUint8();
      const h = sampling >> 4;
      const v = sampling & 0x0f;
      const qTableId = this.readUint8();

      maxH = Math.max(maxH, h);
      maxV = Math.max(maxV, v);

      this.components.push({ id, h, v, qTableId, dcPred: 0, blocks: [] });
    }

    this.mcuWidth = maxH * 8;
    this.mcuHeight = maxV * 8;
    this.mcusPerRow = Math.ceil(this.width / this.mcuWidth);
    this.mcusPerCol = Math.ceil(this.height / this.mcuHeight);

    for (const comp of this.components) {
      comp.blocksPerMcuH = comp.h;
      comp.blocksPerMcuV = comp.v;
    }

    this.pos = end;
  }

  private parseDQT(end: number): void {
    while (this.pos < end) {
      const info = this.readUint8();
      const precision = info >> 4;
      const tableId = info & 0x0f;

      const table = new Int32Array(64);
      if (precision === 0) {
        for (let i = 0; i < 64; i++) {
          table[ZIGZAG[i]!] = this.readUint8();
        }
      } else {
        for (let i = 0; i < 64; i++) {
          table[ZIGZAG[i]!] = this.readUint16();
        }
      }
      this.quantTables[tableId] = table;
    }
  }

  private parseDHT(end: number): void {
    while (this.pos < end) {
      const info = this.readUint8();
      const tableClass = info >> 4; // 0=DC, 1=AC
      const tableId = info & 0x0f;

      const codeLengths = new Uint8Array(16);
      let totalCodes = 0;
      for (let i = 0; i < 16; i++) {
        codeLengths[i] = this.readUint8();
        totalCodes += codeLengths[i]!;
      }

      const values = new Uint8Array(totalCodes);
      for (let i = 0; i < totalCodes; i++) {
        values[i] = this.readUint8();
      }

      const table = buildHuffmanTableJPEG(codeLengths, values);
      if (tableClass === 0) {
        this.huffmanDC[tableId] = table;
      } else {
        this.huffmanAC[tableId] = table;
      }
    }
  }

  private parseSOS(): void {
    const numComponents = this.readUint8();
    for (let i = 0; i < numComponents; i++) {
      const id = this.readUint8();
      const tables = this.readUint8();
      const comp = this.components.find((c) => c.id === id);
      if (comp) {
        comp.dcTableId = tables >> 4;
        comp.acTableId = tables & 0x0f;
      }
    }
    this.pos += 3; // Skip Ss, Se, Ah/Al
  }

  private decodeImageData(): Uint8Array {
    const reader = new JPEGBitReader(this.data, this.pos);
    const rgba = new Uint8Array(this.width * this.height * 4);

    const totalMcus = this.mcusPerRow * this.mcusPerCol;

    for (const comp of this.components) {
      const blocksH = comp.blocksPerMcuH ?? 1;
      const blocksV = comp.blocksPerMcuV ?? 1;
      comp.blocks = new Array(totalMcus * blocksH * blocksV);
      for (let i = 0; i < comp.blocks.length; i++) {
        comp.blocks[i] = new Int32Array(64);
      }
    }

    let mcusBeforeRestart = this.restartInterval;

    for (let mcuIdx = 0; mcuIdx < totalMcus; mcuIdx++) {
      if (this.restartInterval > 0 && mcusBeforeRestart === 0) {
        reader.skipToNextMarker();
        for (const comp of this.components) {
          comp.dcPred = 0;
        }
        mcusBeforeRestart = this.restartInterval;
      }

      for (const comp of this.components) {
        const blocksH = comp.blocksPerMcuH ?? 1;
        const blocksV = comp.blocksPerMcuV ?? 1;

        for (let v = 0; v < blocksV; v++) {
          for (let h = 0; h < blocksH; h++) {
            const blockIdx = mcuIdx * blocksH * blocksV + v * blocksH + h;
            this.decodeBlock(reader, comp, comp.blocks![blockIdx]!);
          }
        }
      }

      if (this.restartInterval > 0) {
        mcusBeforeRestart--;
      }
    }

    this.convertToRGBA(rgba);
    return rgba;
  }

  private decodeBlock(reader: JPEGBitReader, comp: JPEGComponent, block: Int32Array): void {
    const dcTable = this.huffmanDC[comp.dcTableId ?? 0]!;
    const acTable = this.huffmanAC[comp.acTableId ?? 0]!;
    const qTable = this.quantTables[comp.qTableId]!;

    block.fill(0);

    const dcLength = decodeHuffmanJPEG(reader, dcTable);
    if (dcLength > 0) {
      const dcValue = reader.readBits(dcLength);
      comp.dcPred += extend(dcValue, dcLength);
    }
    block[0] = comp.dcPred * qTable[0]!;

    let k = 1;
    while (k < 64) {
      const symbol = decodeHuffmanJPEG(reader, acTable);
      if (symbol === 0) break; // EOB

      const run = symbol >> 4;
      const size = symbol & 0x0f;

      k += run;
      if (k >= 64) break;

      if (size > 0) {
        const value = reader.readBits(size);
        block[ZIGZAG[k]!] = extend(value, size) * qTable[ZIGZAG[k]!]!;
      }
      k++;
    }

    idct(block);
  }

  private convertToRGBA(rgba: Uint8Array): void {
    const yComp = this.components[0]!;
    const cbComp = this.components.length > 1 ? this.components[1]! : null;
    const crComp = this.components.length > 2 ? this.components[2]! : null;

    for (let py = 0; py < this.height; py++) {
      for (let px = 0; px < this.width; px++) {
        const y = this.getSample(yComp, px, py);

        let r: number, g: number, b: number;
        if (cbComp && crComp) {
          const cb = this.getSample(cbComp, px, py) - 128;
          const cr = this.getSample(crComp, px, py) - 128;

          r = y + 1.402 * cr;
          g = y - 0.344136 * cb - 0.714136 * cr;
          b = y + 1.772 * cb;
        } else {
          r = g = b = y;
        }

        const idx = (py * this.width + px) * 4;
        rgba[idx] = clamp(Math.round(r), 0, 255);
        rgba[idx + 1] = clamp(Math.round(g), 0, 255);
        rgba[idx + 2] = clamp(Math.round(b), 0, 255);
        rgba[idx + 3] = 255;
      }
    }
  }

  private getSample(comp: JPEGComponent, px: number, py: number): number {
    const scaleX = (comp.h * 8 * this.mcusPerRow) / this.width;
    const scaleY = (comp.v * 8 * this.mcusPerCol) / this.height;

    const fx = px * scaleX;
    const fy = py * scaleY;

    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, comp.h * 8 * this.mcusPerRow - 1);
    const y1 = Math.min(y0 + 1, comp.v * 8 * this.mcusPerCol - 1);

    const dx = fx - x0;
    const dy = fy - y0;

    const s00 = this.getBlockSample(comp, x0, y0);
    const s10 = this.getBlockSample(comp, x1, y0);
    const s01 = this.getBlockSample(comp, x0, y1);
    const s11 = this.getBlockSample(comp, x1, y1);

    const top = s00 + (s10 - s00) * dx;
    const bottom = s01 + (s11 - s01) * dx;
    return top + (bottom - top) * dy + 128;
  }

  private getBlockSample(comp: JPEGComponent, x: number, y: number): number {
    const blocksH = comp.blocksPerMcuH ?? 1;
    const blocksV = comp.blocksPerMcuV ?? 1;
    const compWidth = blocksH * 8;
    const compHeight = blocksV * 8;

    const mcuX = Math.floor(x / compWidth);
    const mcuY = Math.floor(y / compHeight);
    const mcuIdx = mcuY * this.mcusPerRow + mcuX;

    const localX = x % compWidth;
    const localY = y % compHeight;

    const blockH = Math.floor(localX / 8);
    const blockV = Math.floor(localY / 8);
    const blockIdx = mcuIdx * blocksH * blocksV + blockV * blocksH + blockH;

    const sampleX = localX % 8;
    const sampleY = localY % 8;

    if (blockIdx >= 0 && blockIdx < comp.blocks!.length) {
      return comp.blocks![blockIdx]![sampleY * 8 + sampleX]!;
    }
    return 0;
  }
}

interface JPEGComponent {
  id: number;
  h: number;
  v: number;
  qTableId: number;
  dcTableId?: number;
  acTableId?: number;
  dcPred: number;
  blocksPerMcuH?: number;
  blocksPerMcuV?: number;
  blocks?: Int32Array[];
}

interface HuffmanTable {
  maxCode: Int32Array;
  valPtr: Int32Array;
  values: Uint8Array;
  minCode: Int32Array;
}

const ZIGZAG = new Uint8Array([
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20,
  13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52,
  45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
]);

function buildHuffmanTableJPEG(codeLengths: Uint8Array, values: Uint8Array): HuffmanTable {
  const maxCode = new Int32Array(17);
  const valPtr = new Int32Array(17);
  const minCode = new Int32Array(17);

  let code = 0;
  let valIdx = 0;

  for (let len = 1; len <= 16; len++) {
    valPtr[len] = valIdx;
    minCode[len] = code;

    const count = codeLengths[len - 1]!;
    if (count > 0) {
      maxCode[len] = code + count - 1;
      code += count;
      valIdx += count;
    } else {
      maxCode[len] = -1;
    }
    code <<= 1;
  }

  return { maxCode, valPtr, values, minCode };
}

function decodeHuffmanJPEG(reader: JPEGBitReader, table: HuffmanTable): number {
  let code = 0;
  for (let len = 1; len <= 16; len++) {
    code = (code << 1) | reader.readBit();
    if (code <= table.maxCode[len]!) {
      const idx = table.valPtr[len]! + (code - table.minCode[len]!);
      return table.values[idx]!;
    }
  }
  throw new Error("Invalid Huffman code");
}

function extend(value: number, bits: number): number {
  const vt = 1 << (bits - 1);
  return value < vt ? value - (1 << bits) + 1 : value;
}

class JPEGBitReader {
  private data: Uint8Array;
  private pos: number;
  private bitBuffer = 0;
  private bitsInBuffer = 0;

  constructor(data: Uint8Array, startPos: number) {
    this.data = data;
    this.pos = startPos;
  }

  readBit(): number {
    if (this.bitsInBuffer === 0) {
      this.fillBuffer();
    }
    this.bitsInBuffer--;
    return (this.bitBuffer >> this.bitsInBuffer) & 1;
  }

  readBits(n: number): number {
    let value = 0;
    for (let i = 0; i < n; i++) {
      value = (value << 1) | this.readBit();
    }
    return value;
  }

  skipToNextMarker(): void {
    this.bitsInBuffer = 0;
    while (this.pos < this.data.length - 1) {
      if (this.data[this.pos]! === 0xff && this.data[this.pos + 1]! !== 0x00) {
        this.pos += 2;
        return;
      }
      this.pos++;
    }
  }

  private fillBuffer(): void {
    if (this.pos >= this.data.length) {
      this.bitBuffer = 0;
      this.bitsInBuffer = 8;
      return;
    }
    let byte = this.data[this.pos++]!;
    if (byte === 0xff) {
      const next = this.pos < this.data.length ? this.data[this.pos++]! : 0;
      if (next !== 0x00) {
        this.pos -= 2;
        byte = 0;
      }
    }
    this.bitBuffer = byte;
    this.bitsInBuffer = 8;
  }
}

const C = new Float64Array(8);
for (let i = 0; i < 8; i++) {
  C[i] = i === 0 ? 1 / Math.sqrt(2) : 1;
}

const COS_TABLE = new Float64Array(64);
for (let u = 0; u < 8; u++) {
  for (let x = 0; x < 8; x++) {
    COS_TABLE[u * 8 + x] = Math.cos(((2 * x + 1) * u * Math.PI) / 16);
  }
}

function idct(block: Int32Array): void {
  const result = new Float64Array(64);

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let sum = 0;
      for (let v = 0; v < 8; v++) {
        for (let u = 0; u < 8; u++) {
          sum += C[u]! * C[v]! * block[v * 8 + u]! * COS_TABLE[u * 8 + x]! * COS_TABLE[v * 8 + y]!;
        }
      }
      result[y * 8 + x] = sum / 4;
    }
  }

  for (let i = 0; i < 64; i++) {
    block[i] = Math.round(result[i]!);
  }
}
