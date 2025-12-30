import type { ColorScheme } from "@glade/core";
import type { Color } from "./types.ts";
import { rgb } from "./types.ts";

export interface Theme {
  scheme: ColorScheme;
  background: Color;
  surface: Color;
  surfaceMuted: Color;
  border: Color;
  text: Color;
  textMuted: Color;
  primary: Color;
  primaryForeground: Color;
  selectionBackground: Color;
  selectionForeground: Color;
  caret: Color;
  focusRing: Color;
  overlayBackground: Color;
  overlayBorder: Color;
  danger: Color;
  warning: Color;
  success: Color;
}

export type ThemeOverrides = Partial<Omit<Theme, "scheme">>;

export interface ThemeConfig {
  /**
   * Desired scheme. Use "system" to follow platform preference.
   * Defaults to "system".
   */
  scheme?: ColorScheme | "system";
  /**
   * Partial overrides applied on top of the base light/dark palette.
   */
  overrides?: ThemeOverrides;
}

const DARK_THEME: Theme = {
  scheme: "dark",
  background: { r: 0.08, g: 0.08, b: 0.1, a: 1 },
  surface: { r: 0.12, g: 0.12, b: 0.15, a: 1 },
  surfaceMuted: { r: 0.1, g: 0.1, b: 0.12, a: 1 },
  border: { r: 0.23, g: 0.23, b: 0.28, a: 1 },
  text: { r: 0.92, g: 0.95, b: 1, a: 1 },
  textMuted: { r: 0.65, g: 0.7, b: 0.8, a: 1 },
  primary: rgb(0x4f46e5),
  primaryForeground: { r: 1, g: 1, b: 1, a: 1 },
  selectionBackground: { ...rgb(0x3b82f6), a: 0.35 },
  selectionForeground: { r: 1, g: 1, b: 1, a: 1 },
  caret: { r: 1, g: 1, b: 1, a: 1 },
  focusRing: rgb(0x7c83ff),
  overlayBackground: { r: 0.05, g: 0.05, b: 0.07, a: 0.85 },
  overlayBorder: { r: 0.3, g: 0.3, b: 0.35, a: 1 },
  danger: rgb(0xef4444),
  warning: rgb(0xf59e0b),
  success: rgb(0x22c55e),
};

const LIGHT_THEME: Theme = {
  scheme: "light",
  background: { r: 1, g: 1, b: 1, a: 1 },
  surface: { r: 0.98, g: 0.98, b: 0.99, a: 1 },
  surfaceMuted: { r: 0.95, g: 0.95, b: 0.97, a: 1 },
  border: { r: 0.8, g: 0.82, b: 0.86, a: 1 },
  text: { r: 0.09, g: 0.1, b: 0.12, a: 1 },
  textMuted: { r: 0.35, g: 0.38, b: 0.43, a: 1 },
  primary: rgb(0x2563eb),
  primaryForeground: { r: 1, g: 1, b: 1, a: 1 },
  selectionBackground: { ...rgb(0x2563eb), a: 0.22 },
  selectionForeground: { r: 1, g: 1, b: 1, a: 1 },
  caret: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
  focusRing: rgb(0x3b82f6),
  overlayBackground: { r: 0.02, g: 0.02, b: 0.03, a: 0.6 },
  overlayBorder: { r: 0.75, g: 0.78, b: 0.83, a: 1 },
  danger: rgb(0xdc2626),
  warning: rgb(0xf59e0b),
  success: rgb(0x16a34a),
};

function isTheme(value: Theme | ThemeConfig | undefined): value is Theme {
  return Boolean(value && "background" in value);
}

function applyOverrides(base: Theme, overrides?: ThemeOverrides): Theme {
  if (!overrides) {
    return base;
  }
  return { ...base, ...overrides };
}

export function resolveTheme(
  config: Theme | ThemeConfig | undefined,
  systemScheme: ColorScheme
): Theme {
  if (isTheme(config)) {
    return config;
  }

  const schemeOverride = config?.scheme ?? "system";
  const targetScheme = schemeOverride === "system" ? systemScheme : schemeOverride;
  const base = targetScheme === "dark" ? DARK_THEME : LIGHT_THEME;
  return applyOverrides(base, config?.overrides);
}

function colorsEqual(a: Color, b: Color): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

function themesEqual(a: Theme, b: Theme): boolean {
  return (
    a.scheme === b.scheme &&
    colorsEqual(a.background, b.background) &&
    colorsEqual(a.surface, b.surface) &&
    colorsEqual(a.surfaceMuted, b.surfaceMuted) &&
    colorsEqual(a.border, b.border) &&
    colorsEqual(a.text, b.text) &&
    colorsEqual(a.textMuted, b.textMuted) &&
    colorsEqual(a.primary, b.primary) &&
    colorsEqual(a.primaryForeground, b.primaryForeground) &&
    colorsEqual(a.selectionBackground, b.selectionBackground) &&
    colorsEqual(a.selectionForeground, b.selectionForeground) &&
    colorsEqual(a.caret, b.caret) &&
    colorsEqual(a.focusRing, b.focusRing) &&
    colorsEqual(a.overlayBackground, b.overlayBackground) &&
    colorsEqual(a.overlayBorder, b.overlayBorder) &&
    colorsEqual(a.danger, b.danger) &&
    colorsEqual(a.warning, b.warning) &&
    colorsEqual(a.success, b.success)
  );
}

export class ThemeManager {
  private systemScheme: ColorScheme;
  private overrideScheme: ColorScheme | "system";
  private overrides: ThemeOverrides | undefined;
  private theme: Theme;
  private listeners = new Set<(theme: Theme) => void>();

  constructor(systemScheme: ColorScheme, config?: Theme | ThemeConfig) {
    this.systemScheme = systemScheme;
    if (isTheme(config)) {
      this.overrideScheme = config.scheme;
      this.overrides = undefined;
      this.theme = config;
    } else {
      this.overrideScheme = config?.scheme ?? "system";
      this.overrides = config?.overrides;
      this.theme = resolveTheme(config, this.systemScheme);
    }
  }

  getTheme(): Theme {
    return this.theme;
  }

  getSystemScheme(): ColorScheme {
    return this.systemScheme;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.overrideScheme = theme.scheme;
    this.overrides = undefined;
    this.notify();
  }

  setThemeConfig(config: ThemeConfig): void {
    this.overrideScheme = config.scheme ?? this.overrideScheme;
    this.overrides = config.overrides ?? this.overrides;
    this.recompute();
  }

  setOverrideScheme(scheme: ColorScheme | "system"): void {
    this.overrideScheme = scheme;
    this.recompute();
  }

  setSystemScheme(scheme: ColorScheme): void {
    this.systemScheme = scheme;
    if (this.overrideScheme === "system") {
      this.recompute();
    }
  }

  setOverrides(overrides: ThemeOverrides): void {
    this.overrides = overrides;
    this.recompute();
  }

  subscribe(callback: (theme: Theme) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private recompute(): void {
    const next = resolveTheme(
      { scheme: this.overrideScheme, overrides: this.overrides },
      this.systemScheme
    );
    if (!themesEqual(this.theme, next)) {
      this.theme = next;
      this.notify();
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.theme);
    }
  }
}

/**
 * Component-friendly defaults derived from the active theme.
 */
export function menuColors(theme: Theme): {
  menuBg: Color;
  menuBorder: Color;
  itemBg: Color;
  itemHoverBg: Color;
  itemText: Color;
  itemHoverText: Color;
  itemDisabledText: Color;
  labelText: Color;
  separatorColor: Color;
  destructiveText: Color;
  destructiveHoverBg: Color;
  shortcutText: Color;
  checkColor: Color;
} {
  const hoverBg = {
    r: theme.primary.r,
    g: theme.primary.g,
    b: theme.primary.b,
    a: theme.primary.a,
  };

  return {
    menuBg: theme.surface,
    menuBorder: theme.border,
    itemBg: { r: 0, g: 0, b: 0, a: 0 },
    itemHoverBg: hoverBg,
    itemText: theme.text,
    itemHoverText: theme.primaryForeground,
    itemDisabledText: theme.textMuted,
    labelText: theme.textMuted,
    separatorColor: theme.border,
    destructiveText: theme.danger,
    destructiveHoverBg: {
      r: theme.danger.r,
      g: theme.danger.g,
      b: theme.danger.b,
      a: 0.9,
    },
    shortcutText: theme.textMuted,
    checkColor: theme.primaryForeground,
  };
}

export function inputColors(theme: Theme): {
  text: Color;
  placeholder: Color;
  selection: Color;
  caret: Color;
  composition: Color;
} {
  return {
    text: theme.text,
    placeholder: theme.textMuted,
    selection: theme.selectionBackground,
    caret: theme.caret,
    composition: theme.success,
  };
}

export function checkboxColors(theme: Theme): {
  uncheckedBg: Color;
  checkedBg: Color;
  border: Color;
  check: Color;
} {
  return {
    uncheckedBg: theme.surfaceMuted,
    checkedBg: theme.primary,
    border: theme.border,
    check: theme.primaryForeground,
  };
}

export function radioColors(theme: Theme): {
  uncheckedBg: Color;
  checkedBg: Color;
  border: Color;
  indicator: Color;
} {
  return {
    uncheckedBg: theme.surfaceMuted,
    checkedBg: theme.primary,
    border: theme.border,
    indicator: theme.primaryForeground,
  };
}

export function switchColors(theme: Theme): {
  trackOff: Color;
  trackOn: Color;
  thumb: Color;
} {
  return {
    trackOff: theme.surfaceMuted,
    trackOn: theme.primary,
    thumb: theme.primaryForeground,
  };
}

export function linkColors(theme: Theme): { default: Color; hover: Color } {
  const hover = {
    r: Math.min(1, theme.primary.r + 0.1),
    g: Math.min(1, theme.primary.g + 0.1),
    b: Math.min(1, theme.primary.b + 0.1),
    a: theme.primary.a,
  };
  return {
    default: theme.primary,
    hover,
  };
}

export function tabColors(theme: Theme): { indicator: Color; border: Color } {
  return {
    indicator: theme.primary,
    border: theme.border,
  };
}
