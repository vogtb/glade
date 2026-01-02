import type { ColorScheme } from "@glade/core";
import { colors, rgb, type ColorObject } from "@glade/utils";

export type ThemeFonts = {
  system: string;
  sans: string;
  monospaced: string;
  emoji: string;
};

export const DEFAULT_THEME_FONTS: ThemeFonts = {
  system: "Inter",
  sans: "Inter",
  monospaced: "JetBrains Mono",
  emoji: "Noto Color Emoji",
};

type ThemePalette = {
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
};

export type ThemeSemantic = {
  window: {
    background: ColorObject;
    foreground: ColorObject;
    border: ColorObject;
    focusRing: ColorObject;
  };
  text: {
    default: ColorObject;
    muted: ColorObject;
    disabled: ColorObject;
  };
  selection: {
    background: ColorObject;
    foreground: ColorObject;
    inactiveBackground: ColorObject;
    outline: ColorObject;
  };
  status: {
    danger: ColorObject;
    warning: ColorObject;
    success: ColorObject;
  };
  surface: {
    default: ColorObject;
    muted: ColorObject;
    hover: ColorObject;
  };
  border: {
    default: ColorObject;
    muted: ColorObject;
    focused: ColorObject;
  };
};

export type ThemeComponents = {
  text: {
    foreground: ColorObject;
    mutedForeground: ColorObject;
    disabledForeground: ColorObject;
    selection: {
      background: ColorObject;
      foreground: ColorObject;
    };
    underline: {
      default: ColorObject;
      hover: ColorObject;
    };
  };
  heading: {
    foreground: ColorObject;
    mutedForeground: ColorObject;
    font: {
      family: string;
    };
    size: {
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      h5: number;
      h6: number;
    };
    weight: {
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      h5: number;
      h6: number;
    };
  };
  mono: {
    foreground: ColorObject;
    background: ColorObject;
    border: ColorObject;
    inline: {
      foreground: ColorObject;
      background: ColorObject;
      border: ColorObject;
    };
    selection: {
      background: ColorObject;
    };
  };
  link: {
    foreground: ColorObject;
    hover: {
      foreground: ColorObject;
    };
    active: {
      foreground: ColorObject;
    };
    visited: {
      foreground: ColorObject;
    };
    underline: {
      default: ColorObject;
      hover: ColorObject;
    };
  };
  input: {
    background: ColorObject;
    border: ColorObject;
    foreground: ColorObject;
    placeholder: ColorObject;
    hover: {
      border: ColorObject;
    };
    focused: {
      border: ColorObject;
    };
    selection: {
      background: ColorObject;
      foreground: ColorObject;
    };
    caret: ColorObject;
    composition: ColorObject;
    disabled: {
      background: ColorObject;
      foreground: ColorObject;
    };
  };
  checkbox: {
    background: ColorObject;
    checked: {
      background: ColorObject;
    };
    indeterminate: {
      background: ColorObject;
    };
    border: ColorObject;
    hover: {
      border: ColorObject;
      background: ColorObject;
    };
    checkmark: ColorObject;
    disabled: {
      opacity: number;
    };
  };
  radio: {
    background: ColorObject;
    checked: {
      background: ColorObject;
    };
    border: ColorObject;
    hover: {
      border: ColorObject;
    };
    indicator: ColorObject;
    disabled: {
      opacity: number;
    };
  };
  switch: {
    track: {
      background: ColorObject;
      checkedBackground: ColorObject;
      hoverBackground: ColorObject;
    };
    thumb: {
      background: ColorObject;
      hoverBackground: ColorObject;
      disabledBackground: ColorObject;
    };
    disabled: {
      opacity: number;
    };
  };
  tabs: {
    bar: {
      background: ColorObject;
    };
    content: {
      background: ColorObject;
    };
    border: ColorObject;
    indicator: ColorObject;
    indicatorHover: ColorObject;
    trigger: {
      background: ColorObject;
      foreground: ColorObject;
      active: {
        background: ColorObject;
        foreground: ColorObject;
      };
      hover: {
        background: ColorObject;
      };
      disabled: {
        foreground: ColorObject;
      };
    };
    focusRing: ColorObject;
  };
  menu: {
    background: ColorObject;
    border: ColorObject;
    shadow: ColorObject;
    separator: ColorObject;
    item: {
      background: ColorObject;
      foreground: ColorObject;
      hover: {
        background: ColorObject;
        foreground: ColorObject;
      };
      active: {
        background: ColorObject;
        foreground: ColorObject;
      };
      disabled: {
        foreground: ColorObject;
      };
      shortcutForeground: ColorObject;
      labelForeground: ColorObject;
      destructiveForeground: ColorObject;
      destructiveHoverBackground: ColorObject;
    };
    checkmark: ColorObject;
    submenuIndicator: ColorObject;
  };
  dialog: {
    backdrop: ColorObject;
    background: ColorObject;
    border: ColorObject;
    shadow: ColorObject;
    title: {
      foreground: ColorObject;
    };
    description: {
      foreground: ColorObject;
    };
    separator: ColorObject;
    button: {
      background: ColorObject;
      hover: {
        background: ColorObject;
      };
      foreground: ColorObject;
      border: ColorObject;
      disabled: {
        background: ColorObject;
        foreground: ColorObject;
      };
    };
    primaryButton: {
      background: ColorObject;
      hover: {
        background: ColorObject;
      };
      foreground: ColorObject;
    };
    destructiveButton: {
      background: ColorObject;
      hover: {
        background: ColorObject;
      };
      foreground: ColorObject;
    };
  };
  tooltip: {
    background: ColorObject;
    border: ColorObject;
    foreground: ColorObject;
    shadow: ColorObject;
    accent: ColorObject;
  };
  popover: {
    background: ColorObject;
    border: ColorObject;
    foreground: ColorObject;
    shadow: ColorObject;
  };
  divider: {
    background: ColorObject;
  };
  scrollbar: {
    track: {
      background: ColorObject;
    };
    thumb: {
      background: ColorObject;
      hover: {
        background: ColorObject;
      };
      active: {
        background: ColorObject;
      };
    };
  };
  list: {
    background: ColorObject;
    border: ColorObject;
    item: {
      background: ColorObject;
      foreground: ColorObject;
      hover: {
        background: ColorObject;
      };
      selected: {
        background: ColorObject;
        foreground: ColorObject;
      };
    };
    separator: ColorObject;
  };
  table: {
    background: ColorObject;
    border: ColorObject;
    header: {
      background: ColorObject;
      foreground: ColorObject;
    };
    row: {
      background: ColorObject;
      foreground: ColorObject;
      hover: {
        background: ColorObject;
      };
      selected: {
        background: ColorObject;
        foreground: ColorObject;
      };
    };
    cell: {
      border: ColorObject;
    };
  };
  icon: {
    foreground: ColorObject;
    mutedForeground: ColorObject;
    activeForeground: ColorObject;
    dangerForeground: ColorObject;
  };
  inspector: {
    bounds: ColorObject;
    boundsHover: ColorObject;
    boundsSelected: ColorObject;
    padding: ColorObject;
    margin: ColorObject;
    content: ColorObject;
    text: ColorObject;
    textShadow: ColorObject;
    panel: {
      background: ColorObject;
      border: ColorObject;
    };
  };
  drag: {
    preview: {
      background: ColorObject;
      border: ColorObject;
      foreground: ColorObject;
    };
    dropTarget: {
      outline: ColorObject;
      background: ColorObject;
      validOutline: ColorObject;
      invalidOutline: ColorObject;
    };
  };
};

export type Theme = {
  scheme: ColorScheme;
  fonts: ThemeFonts;
  semantic: ThemeSemantic;
  components: ThemeComponents;
};

const HEADING_SIZES = {
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
};

const HEADING_WEIGHTS = {
  h1: 700,
  h2: 700,
  h3: 600,
  h4: 600,
  h5: 600,
  h6: 600,
};

const TRANSPARENT: ColorObject = { r: 0, g: 0, b: 0, a: 0 };

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function lighten(colorValue: ColorObject, amount: number): ColorObject {
  return {
    r: clamp01(colorValue.r + amount),
    g: clamp01(colorValue.g + amount),
    b: clamp01(colorValue.b + amount),
    a: colorValue.a,
  };
}

function darken(colorValue: ColorObject, amount: number): ColorObject {
  return {
    r: clamp01(colorValue.r - amount),
    g: clamp01(colorValue.g - amount),
    b: clamp01(colorValue.b - amount),
    a: colorValue.a,
  };
}

function mixColors(a: ColorObject, b: ColorObject, ratio: number): ColorObject {
  const t = clamp01(ratio);
  const inv = 1 - t;
  return {
    r: clamp01(a.r * inv + b.r * t),
    g: clamp01(a.g * inv + b.g * t),
    b: clamp01(a.b * inv + b.b * t),
    a: clamp01(a.a * inv + b.a * t),
  };
}

function setAlpha(colorValue: ColorObject, alpha: number): ColorObject {
  return { r: colorValue.r, g: colorValue.g, b: colorValue.b, a: clamp01(alpha) };
}

function cloneFonts(fonts: ThemeFonts): ThemeFonts {
  return {
    system: fonts.system,
    sans: fonts.sans,
    monospaced: fonts.monospaced,
    emoji: fonts.emoji,
  };
}

function createBasePalette(scheme: ColorScheme): ThemePalette {
  if (scheme === "dark") {
    return {
      scheme: "dark",
      background: rgb(colors.black.x900),
      surface: rgb(colors.black.x800),
      surfaceMuted: rgb(colors.black.x700),
      border: rgb(colors.slate.x700),
      text: rgb(colors.slate.x50),
      textMuted: rgb(colors.slate.x300),
      primary: rgb(colors.blue.x600),
      primaryForeground: rgb(colors.white.default),
      selectionBackground: setAlpha(rgb(colors.blue.x400), 0.35),
      selectionForeground: rgb(colors.white.default),
      caret: rgb(colors.white.default),
      focusRing: rgb(colors.blue.x400),
      overlayBackground: setAlpha(rgb(colors.black.x950), 0.85),
      overlayBorder: rgb(colors.slate.x700),
      danger: rgb(colors.red.x600),
      warning: rgb(colors.amber.x500),
      success: rgb(colors.green.x500),
    };
  }

  return {
    scheme: "light",
    background: rgb(colors.white.default),
    surface: rgb(colors.gray.x50),
    surfaceMuted: rgb(colors.gray.x100),
    border: rgb(colors.gray.x300),
    text: rgb(colors.gray.x900),
    textMuted: rgb(colors.gray.x500),
    primary: rgb(colors.blue.x500),
    primaryForeground: rgb(colors.white.default),
    selectionBackground: setAlpha(rgb(colors.blue.x400), 0.22),
    selectionForeground: rgb(colors.white.default),
    caret: rgb(colors.black.default),
    focusRing: rgb(colors.blue.x400),
    overlayBackground: setAlpha(rgb(colors.black.x900), 0.6),
    overlayBorder: rgb(colors.gray.x300),
    danger: rgb(colors.red.x600),
    warning: rgb(colors.amber.x500),
    success: rgb(colors.green.x500),
  };
}

function buildTheme(palette: ThemePalette, fonts: ThemeFonts): Theme {
  const disabledText = setAlpha(palette.textMuted, palette.scheme === "dark" ? 0.5 : 0.4);
  const selectionInactive = setAlpha(palette.selectionBackground, 0.5);
  const surfaceHover =
    palette.scheme === "dark" ? lighten(palette.surface, 0.05) : darken(palette.surface, 0.05);
  const borderMuted =
    palette.scheme === "dark" ? lighten(palette.border, 0.06) : darken(palette.border, 0.06);

  const semantic: ThemeSemantic = {
    window: {
      background: palette.background,
      foreground: palette.text,
      border: palette.border,
      focusRing: palette.focusRing,
    },
    text: {
      default: palette.text,
      muted: palette.textMuted,
      disabled: disabledText,
    },
    selection: {
      background: palette.selectionBackground,
      foreground: palette.selectionForeground,
      inactiveBackground: selectionInactive,
      outline: palette.focusRing,
    },
    status: {
      danger: palette.danger,
      warning: palette.warning,
      success: palette.success,
    },
    surface: {
      default: palette.surface,
      muted: palette.surfaceMuted,
      hover: surfaceHover,
    },
    border: {
      default: palette.border,
      muted: borderMuted,
      focused: palette.focusRing,
    },
  };

  const menuHoverBg = mixColors(palette.primary, palette.surface, 0.14);
  const menuActiveBg = palette.primary;
  const menuShadow = setAlpha(palette.overlayBackground, 0.9);

  const components: ThemeComponents = {
    text: {
      foreground: semantic.text.default,
      mutedForeground: semantic.text.muted,
      disabledForeground: semantic.text.disabled,
      selection: {
        background: semantic.selection.background,
        foreground: semantic.selection.foreground,
      },
      underline: {
        default: palette.primary,
        hover: lighten(palette.primary, 0.08),
      },
    },
    heading: {
      foreground: semantic.text.default,
      mutedForeground: semantic.text.muted,
      font: {
        family: fonts.sans,
      },
      size: HEADING_SIZES,
      weight: HEADING_WEIGHTS,
    },
    mono: {
      foreground: semantic.text.default,
      background: semantic.surface.muted,
      border: semantic.border.muted,
      inline: {
        foreground: semantic.text.default,
        background: mixColors(semantic.surface.muted, palette.primary, 0.08),
        border: semantic.border.muted,
      },
      selection: {
        background: semantic.selection.background,
      },
    },
    link: {
      foreground: palette.primary,
      hover: {
        foreground: lighten(palette.primary, palette.scheme === "dark" ? 0.1 : 0.08),
      },
      active: {
        foreground: darken(palette.primary, 0.08),
      },
      visited: {
        foreground: mixColors(palette.primary, semantic.text.muted, 0.25),
      },
      underline: {
        default: palette.primary,
        hover: lighten(palette.primary, 0.1),
      },
    },
    input: {
      background: semantic.surface.default,
      border: semantic.border.default,
      foreground: semantic.text.default,
      placeholder: semantic.text.muted,
      hover: {
        border: semantic.border.focused,
      },
      focused: {
        border: semantic.border.focused,
      },
      selection: {
        background: semantic.selection.background,
        foreground: semantic.selection.foreground,
      },
      caret: palette.caret,
      composition: palette.success,
      disabled: {
        background: semantic.surface.muted,
        foreground: semantic.text.disabled,
      },
    },
    checkbox: {
      background: semantic.surface.muted,
      checked: {
        background: palette.primary,
      },
      indeterminate: {
        background: palette.primary,
      },
      border: semantic.border.default,
      hover: {
        border: semantic.border.focused,
        background: semantic.surface.hover,
      },
      checkmark: palette.primaryForeground,
      disabled: {
        opacity: 0.5,
      },
    },
    radio: {
      background: semantic.surface.muted,
      checked: {
        background: palette.primary,
      },
      border: semantic.border.default,
      hover: {
        border: semantic.border.focused,
      },
      indicator: palette.primaryForeground,
      disabled: {
        opacity: 0.5,
      },
    },
    switch: {
      track: {
        background: semantic.surface.muted,
        checkedBackground: palette.primary,
        hoverBackground: semantic.surface.hover,
      },
      thumb: {
        background: palette.primaryForeground,
        hoverBackground: lighten(palette.primaryForeground, 0.06),
        disabledBackground: semantic.surface.default,
      },
      disabled: {
        opacity: 0.5,
      },
    },
    tabs: {
      bar: {
        background: semantic.surface.muted,
      },
      content: {
        background: semantic.surface.default,
      },
      border: semantic.border.default,
      indicator: palette.primary,
      indicatorHover: lighten(palette.primary, 0.05),
      trigger: {
        background: TRANSPARENT,
        foreground: semantic.text.muted,
        active: {
          background: semantic.surface.default,
          foreground: semantic.text.default,
        },
        hover: {
          background: semantic.surface.hover,
        },
        disabled: {
          foreground: semantic.text.disabled,
        },
      },
      focusRing: semantic.border.focused,
    },
    menu: {
      background: semantic.surface.default,
      border: semantic.border.default,
      shadow: menuShadow,
      separator: semantic.border.muted,
      item: {
        background: TRANSPARENT,
        foreground: semantic.text.default,
        hover: {
          background: menuHoverBg,
          foreground: palette.primaryForeground,
        },
        active: {
          background: menuActiveBg,
          foreground: palette.primaryForeground,
        },
        disabled: {
          foreground: semantic.text.disabled,
        },
        shortcutForeground: semantic.text.muted,
        labelForeground: semantic.text.muted,
        destructiveForeground: palette.danger,
        destructiveHoverBackground: mixColors(palette.danger, palette.surface, 0.2),
      },
      checkmark: palette.primaryForeground,
      submenuIndicator: semantic.text.muted,
    },
    dialog: {
      backdrop: palette.overlayBackground,
      background: semantic.surface.default,
      border: semantic.border.default,
      shadow: palette.overlayBackground,
      title: {
        foreground: semantic.text.default,
      },
      description: {
        foreground: semantic.text.muted,
      },
      separator: semantic.border.muted,
      button: {
        background: semantic.surface.muted,
        hover: {
          background: semantic.surface.hover,
        },
        foreground: semantic.text.default,
        border: semantic.border.default,
        disabled: {
          background: semantic.surface.muted,
          foreground: semantic.text.disabled,
        },
      },
      primaryButton: {
        background: palette.primary,
        hover: {
          background: lighten(palette.primary, 0.05),
        },
        foreground: palette.primaryForeground,
      },
      destructiveButton: {
        background: palette.danger,
        hover: {
          background: lighten(palette.danger, 0.05),
        },
        foreground: palette.primaryForeground,
      },
    },
    tooltip: {
      background: mixColors(palette.overlayBackground, semantic.surface.default, 0.4),
      border: semantic.border.default,
      foreground: semantic.text.default,
      shadow: setAlpha(palette.overlayBackground, 0.9),
      accent: palette.primary,
    },
    popover: {
      background: semantic.surface.default,
      border: semantic.border.default,
      foreground: semantic.text.default,
      shadow: setAlpha(palette.overlayBackground, 0.9),
    },
    divider: {
      background: semantic.border.default,
    },
    scrollbar: {
      track: {
        background: setAlpha(semantic.surface.muted, 0.2),
      },
      thumb: {
        background: setAlpha(semantic.text.muted, 0.5),
        hover: {
          background: setAlpha(semantic.text.muted, 0.7),
        },
        active: {
          background: setAlpha(semantic.text.muted, 0.9),
        },
      },
    },
    list: {
      background: semantic.surface.default,
      border: semantic.border.default,
      item: {
        background: TRANSPARENT,
        foreground: semantic.text.default,
        hover: {
          background: semantic.surface.hover,
        },
        selected: {
          background: semantic.selection.background,
          foreground: semantic.selection.foreground,
        },
      },
      separator: semantic.border.muted,
    },
    table: {
      background: semantic.surface.default,
      border: semantic.border.default,
      header: {
        background: semantic.surface.muted,
        foreground: semantic.text.muted,
      },
      row: {
        background: semantic.surface.default,
        foreground: semantic.text.default,
        hover: {
          background: semantic.surface.hover,
        },
        selected: {
          background: semantic.selection.background,
          foreground: semantic.selection.foreground,
        },
      },
      cell: {
        border: semantic.border.muted,
      },
    },
    icon: {
      foreground: semantic.text.default,
      mutedForeground: semantic.text.muted,
      activeForeground: palette.primary,
      dangerForeground: palette.danger,
    },
    inspector: {
      bounds: setAlpha(palette.primary, 0.8),
      boundsHover: setAlpha(palette.warning, 0.9),
      boundsSelected: setAlpha(palette.success, 0.9),
      padding: setAlpha(palette.primary, 0.3),
      margin: setAlpha(palette.warning, 0.3),
      content: setAlpha(palette.primary, 0.2),
      text: semantic.text.default,
      textShadow: setAlpha(palette.background, 0.85),
      panel: {
        background: setAlpha(semantic.surface.default, 0.95),
        border: semantic.border.default,
      },
    },
    drag: {
      preview: {
        background: setAlpha(semantic.surface.default, 0.9),
        border: semantic.border.focused,
        foreground: semantic.text.default,
      },
      dropTarget: {
        outline: semantic.border.focused,
        background: setAlpha(semantic.selection.background, 0.3),
        validOutline: semantic.status.success,
        invalidOutline: semantic.status.danger,
      },
    },
  };

  return {
    scheme: palette.scheme,
    fonts,
    semantic,
    components,
  };
}

export function createDefaultTheme(scheme: ColorScheme): Theme {
  const palette = createBasePalette(scheme);
  return buildTheme(palette, cloneFonts(DEFAULT_THEME_FONTS));
}

export function resolveTheme(theme: Theme | undefined, systemScheme: ColorScheme): Theme {
  if (theme) {
    return theme;
  }
  return createDefaultTheme(systemScheme);
}

export class ThemeManager {
  private systemScheme: ColorScheme;
  private mode: ColorScheme | "system";
  private theme: Theme;
  private listeners = new Set<(theme: Theme) => void>();

  constructor(systemScheme: ColorScheme, theme?: Theme) {
    this.systemScheme = systemScheme;
    this.theme = resolveTheme(theme, this.systemScheme);
    this.mode = theme ? theme.scheme : "system";
  }

  getTheme(): Theme {
    return this.theme;
  }

  getSystemScheme(): ColorScheme {
    return this.systemScheme;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.mode = theme.scheme;
    this.notify();
  }

  setThemeScheme(scheme: ColorScheme | "system"): void {
    this.mode = scheme;
    const targetScheme = scheme === "system" ? this.systemScheme : scheme;
    const next = createDefaultTheme(targetScheme);
    this.theme = next;
    this.notify();
  }

  setSystemScheme(scheme: ColorScheme): void {
    this.systemScheme = scheme;
    if (this.mode === "system") {
      const next = createDefaultTheme(scheme);
      this.theme = next;
      this.notify();
    }
  }

  subscribe(callback: (theme: Theme) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.theme);
    }
  }
}
