export type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

/**
 * Create a color from a hex value (e.g., 0xFF5500).
 */
export function rgb(hex: number): Color {
  return {
    r: ((hex >> 16) & 0xff) / 255,
    g: ((hex >> 8) & 0xff) / 255,
    b: (hex & 0xff) / 255,
    a: 1,
  };
}

/**
 * Create a color from RGBA hex value (e.g., 0xFF550080).
 */
export function rgba(hex: number): Color {
  return {
    r: ((hex >> 24) & 0xff) / 255,
    g: ((hex >> 16) & 0xff) / 255,
    b: ((hex >> 8) & 0xff) / 255,
    a: (hex & 0xff) / 255,
  };
}

/**
 * Create a color from individual components (0-255).
 */
export function color(r: number, g: number, b: number, a = 255): Color {
  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
    a: a / 255,
  };
}

// Tailwind CSS v4 colors for easy-to-use colors.

export const red = {
  x50: 0xfef2f2,
  x100: 0xffe2e2,
  x200: 0xffc9c9,
  x300: 0xffa2a2,
  x400: 0xff6467,
  x500: 0xfb2c36,
  default: 0xfb2c36,
  x600: 0xe7000b,
  x700: 0xc10007,
  x800: 0x9f0712,
  x900: 0x82181a,
  x950: 0x460809,
} as const;

export const orange = {
  x50: 0xfff7ed,
  x100: 0xffedd4,
  x200: 0xffd6a7,
  x300: 0xffb86a,
  x400: 0xff8904,
  x500: 0xff6900,
  default: 0xff6900,
  x600: 0xf54900,
  x700: 0xca3500,
  x800: 0x9f2d00,
  x900: 0x7e2a0c,
  x950: 0x441306,
} as const;

export const amber = {
  x50: 0xfffbeb,
  x100: 0xfef3c6,
  x200: 0xfee685,
  x300: 0xffd230,
  x400: 0xffb900,
  x500: 0xfe9a00,
  default: 0xfe9a00,
  x600: 0xe17100,
  x700: 0xbb4d00,
  x800: 0x973c00,
  x900: 0x7b3306,
  x950: 0x461901,
} as const;

export const yellow = {
  x50: 0xfefce8,
  x100: 0xfef9c2,
  x200: 0xfff085,
  x300: 0xffdf20,
  x400: 0xfdc700,
  x500: 0xf0b100,
  default: 0xf0b100,
  x600: 0xd08700,
  x700: 0xa65f00,
  x800: 0x894b00,
  x900: 0x733e0a,
  x950: 0x432004,
} as const;

export const lime = {
  x50: 0xf7fee7,
  x100: 0xecfcca,
  x200: 0xd8f999,
  x300: 0xbbf451,
  x400: 0x9ae600,
  x500: 0x7ccf00,
  default: 0x7ccf00,
  x600: 0x5ea500,
  x700: 0x497d00,
  x800: 0x3c6300,
  x900: 0x35530e,
  x950: 0x192e03,
} as const;

export const green = {
  x50: 0xf0fdf4,
  x100: 0xdcfce7,
  x200: 0xb9f8cf,
  x300: 0x7bf1a8,
  x400: 0x05df72,
  x500: 0x00c950,
  default: 0x00c950,
  x600: 0x00a63e,
  x700: 0x008236,
  x800: 0x016630,
  x900: 0x0d542b,
  x950: 0x032e15,
} as const;

export const emerald = {
  x50: 0xecfdf5,
  x100: 0xd0fae5,
  x200: 0xa4f4cf,
  x300: 0x5ee9b5,
  x400: 0x00d492,
  x500: 0x00bc7d,
  default: 0x00bc7d,
  x600: 0x009966,
  x700: 0x007a55,
  x800: 0x006045,
  x900: 0x004f3b,
  x950: 0x002c22,
} as const;

export const teal = {
  x50: 0xf0fdfa,
  x100: 0xcbfbf1,
  x200: 0x96f7e4,
  x300: 0x46ecd5,
  x400: 0x00d5be,
  x500: 0x00bba7,
  default: 0x00bba7,
  x600: 0x009689,
  x700: 0x00786f,
  x800: 0x005f5a,
  x900: 0x0b4f4a,
  x950: 0x022f2e,
} as const;

export const cyan = {
  x50: 0xecfeff,
  x100: 0xcefafe,
  x200: 0xa2f4fd,
  x300: 0x53eafd,
  x400: 0x00d3f2,
  x500: 0x00b8db,
  default: 0x00b8db,
  x600: 0x0092b8,
  x700: 0x007595,
  x800: 0x005f78,
  x900: 0x104e64,
  x950: 0x053345,
} as const;

export const sky = {
  x50: 0xf0f9ff,
  x100: 0xdff2fe,
  x200: 0xb8e6fe,
  x300: 0x74d4ff,
  x400: 0x00bcff,
  x500: 0x00a6f4,
  default: 0x00a6f4,
  x600: 0x0084d1,
  x700: 0x0069a8,
  x800: 0x00598a,
  x900: 0x024a70,
  x950: 0x052f4a,
} as const;

export const blue = {
  x50: 0xeff6ff,
  x100: 0xdbeafe,
  x200: 0xbedbff,
  x300: 0x8ec5ff,
  x400: 0x51a2ff,
  x500: 0x2b7fff,
  default: 0x2b7fff,
  x600: 0x155dfc,
  x700: 0x1447e6,
  x800: 0x193cb8,
  x900: 0x1c398e,
  x950: 0x162456,
} as const;

export const indigo = {
  x50: 0xeef2ff,
  x100: 0xe0e7ff,
  x200: 0xc6d2ff,
  x300: 0xa3b3ff,
  x400: 0x7c86ff,
  x500: 0x615fff,
  default: 0x615fff,
  x600: 0x4f39f6,
  x700: 0x432dd7,
  x800: 0x372aac,
  x900: 0x312c85,
  x950: 0x1e1a4d,
} as const;

export const violet = {
  x50: 0xf5f3ff,
  x100: 0xede9fe,
  x200: 0xddd6ff,
  x300: 0xc4b4ff,
  x400: 0xa684ff,
  x500: 0x8e51ff,
  default: 0x8e51ff,
  x600: 0x7f22fe,
  x700: 0x7008e7,
  x800: 0x5d0ec0,
  x900: 0x4d179a,
  x950: 0x2f0d68,
} as const;

export const purple = {
  x50: 0xfaf5ff,
  x100: 0xf3e8ff,
  x200: 0xe9d4ff,
  x300: 0xdab2ff,
  x400: 0xc27aff,
  x500: 0xad46ff,
  default: 0xad46ff,
  x600: 0x9810fa,
  x700: 0x8200db,
  x800: 0x6e11b0,
  x900: 0x59168b,
  x950: 0x3c0366,
} as const;

export const fuchsia = {
  x50: 0xfdf4ff,
  x100: 0xfae8ff,
  x200: 0xf6cfff,
  x300: 0xf4a8ff,
  x400: 0xed6aff,
  x500: 0xe12afb,
  default: 0xe12afb,
  x600: 0xc800de,
  x700: 0xa800b7,
  x800: 0x8a0194,
  x900: 0x721378,
  x950: 0x4b004f,
} as const;

export const pink = {
  x50: 0xfdf2f8,
  x100: 0xfce7f3,
  x200: 0xfccee8,
  x300: 0xfda5d5,
  x400: 0xfb64b6,
  x500: 0xf6339a,
  default: 0xf6339a,
  x600: 0xe60076,
  x700: 0xc6005c,
  x800: 0xa3004c,
  x900: 0x861043,
  x950: 0x510424,
} as const;

export const rose = {
  x50: 0xfff1f2,
  x100: 0xffe4e6,
  x200: 0xffccd3,
  x300: 0xffa1ad,
  x400: 0xff637e,
  x500: 0xff2056,
  default: 0xff2056,
  x600: 0xec003f,
  x700: 0xc70036,
  x800: 0xa50036,
  x900: 0x8b0836,
  x950: 0x4d0218,
} as const;

export const slate = {
  x50: 0xf8fafc,
  x100: 0xf1f5f9,
  x200: 0xe2e8f0,
  x300: 0xcad5e2,
  x400: 0x90a1b9,
  x500: 0x62748e,
  default: 0x62748e,
  x600: 0x45556c,
  x700: 0x314158,
  x800: 0x1d293d,
  x900: 0x0f172b,
  x950: 0x020618,
} as const;

export const gray = {
  x50: 0xf9fafb,
  x100: 0xf3f4f6,
  x200: 0xe5e7eb,
  x300: 0xd1d5dc,
  x400: 0x99a1af,
  x500: 0x6a7282,
  default: 0x6a7282,
  x600: 0x4a5565,
  x700: 0x364153,
  x800: 0x1e2939,
  x900: 0x101828,
  x950: 0x030712,
} as const;

export const zinc = {
  x50: 0xfafafa,
  x100: 0xf4f4f5,
  x200: 0xe4e4e7,
  x300: 0xd4d4d8,
  x400: 0x9f9fa9,
  x500: 0x71717b,
  default: 0x71717b,
  x600: 0x52525c,
  x700: 0x3f3f46,
  x800: 0x27272a,
  x900: 0x18181b,
  x950: 0x09090b,
} as const;

export const neutral = {
  x50: 0xfafafa,
  x100: 0xf5f5f5,
  x200: 0xe5e5e5,
  x300: 0xd4d4d4,
  x400: 0xa1a1a1,
  x500: 0x737373,
  default: 0x737373,
  x600: 0x525252,
  x700: 0x404040,
  x800: 0x262626,
  x900: 0x171717,
  x950: 0x0a0a0a,
} as const;

export const stone = {
  x50: 0xfafaf9,
  x100: 0xf5f5f4,
  x200: 0xe7e5e4,
  x300: 0xd6d3d1,
  x400: 0xa6a09b,
  x500: 0x79716b,
  default: 0x79716b,
  x600: 0x57534d,
  x700: 0x44403b,
  x800: 0x292524,
  x900: 0x1c1917,
  x950: 0x0c0a09,
} as const;

export const black = {
  x50: 0x4c4c4c,
  x100: 0x4c4c4c,
  x200: 0x444444,
  x300: 0x3c3c3c,
  x400: 0x343434,
  x500: 0x2c2c2c,
  x600: 0x272727,
  x700: 0x1c1c1c,
  x800: 0x121212,
  x900: 0x0b0b0b,
  x950: 0x0b0b0b,
  default: 0x000000,
} as const;

export const white = {
  x50: 0xffffff,
  x100: 0xffffff,
  x200: 0xfcfcfc,
  x300: 0xf8f8f8,
  x400: 0xf0f0f0,
  x500: 0xececec,
  x600: 0xe6e6e6,
  x700: 0xe0e0e0,
  x800: 0xdadada,
  x900: 0xd2d2d2,
  x950: 0xd2d2d2,
  default: 0xffffff,
} as const;

export const colors = {
  red,
  orange,
  amber,
  yellow,
  lime,
  green,
  emerald,
  teal,
  cyan,
  sky,
  blue,
  indigo,
  violet,
  purple,
  fuchsia,
  pink,
  rose,
  slate,
  gray,
  zinc,
  neutral,
  stone,
  black,
  white,
} as const;
