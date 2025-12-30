import type { ColorScheme } from "@glade/core";
import { colors } from "@glade/utils";
import type { Color, ColorObject } from "./types.ts";
import { rgb, toColorObject } from "./types.ts";

export interface Theme {
  scheme: ColorScheme;
  background: ColorObject;
  surface: ColorObject;
  surfaceMuted: ColorObject;
  border: ColorObject;
  text: ColorObject;
  textMuted: ColorObject;
  primary: ColorObject;
  primaryForeground: ColorObject;
  selectionBackground: ColorObject;
  selectionForeground: ColorObject;
  caret: ColorObject;
  focusRing: ColorObject;
  overlayBackground: ColorObject;
  overlayBorder: ColorObject;
  danger: ColorObject;
  warning: ColorObject;
  success: ColorObject;
}

type ThemeColorKey = Exclude<keyof Theme, "scheme">;

export type ThemeOverrides = Partial<Record<ThemeColorKey, Color>>;

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
  background: rgb(colors.black.x900),
  surface: rgb(colors.black.x800),
  surfaceMuted: rgb(colors.black.x700),
  border: rgb(colors.slate.x700),
  text: rgb(colors.slate.x50),
  textMuted: rgb(colors.slate.x300),
  primary: rgb(colors.indigo.x600),
  primaryForeground: rgb(colors.white.default),
  selectionBackground: { ...rgb(colors.blue.x400), a: 0.35 },
  selectionForeground: rgb(colors.white.default),
  caret: rgb(colors.white.default),
  focusRing: rgb(colors.indigo.x400),
  overlayBackground: { ...rgb(colors.black.x950), a: 0.85 },
  overlayBorder: rgb(colors.slate.x700),
  danger: rgb(colors.red.x600),
  warning: rgb(colors.amber.x500),
  success: rgb(colors.green.x500),
};

const LIGHT_THEME: Theme = {
  scheme: "light",
  background: rgb(colors.white.default),
  surface: rgb(colors.gray.x50),
  surfaceMuted: rgb(colors.gray.x100),
  border: rgb(colors.gray.x300),
  text: rgb(colors.gray.x900),
  textMuted: rgb(colors.gray.x500),
  primary: rgb(colors.blue.x500),
  primaryForeground: rgb(colors.white.default),
  selectionBackground: { ...rgb(colors.blue.x400), a: 0.22 },
  selectionForeground: rgb(colors.white.default),
  caret: rgb(colors.black.default),
  focusRing: rgb(colors.blue.x400),
  overlayBackground: { ...rgb(colors.black.x900), a: 0.6 },
  overlayBorder: rgb(colors.gray.x300),
  danger: rgb(colors.red.x600),
  warning: rgb(colors.amber.x500),
  success: rgb(colors.green.x500),
};

const THEME_COLOR_KEYS: ThemeColorKey[] = [
  "background",
  "surface",
  "surfaceMuted",
  "border",
  "text",
  "textMuted",
  "primary",
  "primaryForeground",
  "selectionBackground",
  "selectionForeground",
  "caret",
  "focusRing",
  "overlayBackground",
  "overlayBorder",
  "danger",
  "warning",
  "success",
];

function normalizeThemeColors(theme: Theme): Theme {
  const normalized: Theme = { ...theme };
  for (const key of THEME_COLOR_KEYS) {
    normalized[key] = toColorObject(theme[key]);
  }
  return normalized;
}

function isTheme(value: Theme | ThemeConfig | undefined): value is Theme {
  return Boolean(value && "scheme" in value && "background" in value);
}

function applyOverrides(base: Theme, overrides?: ThemeOverrides): Theme {
  if (!overrides) {
    return base;
  }
  const next: Theme = { ...base };
  for (const key of THEME_COLOR_KEYS) {
    const override = overrides[key];
    if (override !== undefined) {
      next[key] = toColorObject(override);
    }
  }
  return next;
}

export function resolveTheme(
  config: Theme | ThemeConfig | undefined,
  systemScheme: ColorScheme
): Theme {
  if (isTheme(config)) {
    return normalizeThemeColors(config);
  }

  const schemeOverride = config?.scheme ?? "system";
  const targetScheme = schemeOverride === "system" ? systemScheme : schemeOverride;
  const base = targetScheme === "dark" ? DARK_THEME : LIGHT_THEME;
  const normalizedBase = normalizeThemeColors({ ...base });
  return applyOverrides(normalizedBase, config?.overrides);
}

function colorsEqual(a: ColorObject, b: ColorObject): boolean {
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
  menuBg: ColorObject;
  menuBorder: ColorObject;
  itemBg: ColorObject;
  itemHoverBg: ColorObject;
  itemText: ColorObject;
  itemHoverText: ColorObject;
  itemDisabledText: ColorObject;
  labelText: ColorObject;
  separatorColor: ColorObject;
  destructiveText: ColorObject;
  destructiveHoverBg: ColorObject;
  shortcutText: ColorObject;
  checkColor: ColorObject;
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
  text: ColorObject;
  placeholder: ColorObject;
  selection: ColorObject;
  caret: ColorObject;
  composition: ColorObject;
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
  uncheckedBg: ColorObject;
  checkedBg: ColorObject;
  border: ColorObject;
  check: ColorObject;
} {
  return {
    uncheckedBg: theme.surfaceMuted,
    checkedBg: theme.primary,
    border: theme.border,
    check: theme.primaryForeground,
  };
}

export function radioColors(theme: Theme): {
  uncheckedBg: ColorObject;
  checkedBg: ColorObject;
  border: ColorObject;
  indicator: ColorObject;
} {
  return {
    uncheckedBg: theme.surfaceMuted,
    checkedBg: theme.primary,
    border: theme.border,
    indicator: theme.primaryForeground,
  };
}

export function switchColors(theme: Theme): {
  trackOff: ColorObject;
  trackOn: ColorObject;
  thumb: ColorObject;
} {
  return {
    trackOff: theme.surfaceMuted,
    trackOn: theme.primary,
    thumb: theme.primaryForeground,
  };
}

export function linkColors(theme: Theme): { default: ColorObject; hover: ColorObject } {
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

export function tabColors(theme: Theme): { indicator: ColorObject; border: ColorObject } {
  return {
    indicator: theme.primary,
    border: theme.border,
  };
}
