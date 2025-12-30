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
