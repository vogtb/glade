import type { ColorScheme } from "@glade/core";
import { colors, rgb, toColorObject, type Color, type ColorObject } from "@glade/utils";

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

export type ThemePaletteOverrides = Partial<{
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
}>;

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

type OverrideValue<T> = T extends ColorObject
  ? Color
  : T extends Record<string, unknown>
    ? { [K in keyof T]?: OverrideValue<T[K]> }
    : T;

export type ThemeOverrides = {
  palette?: ThemePaletteOverrides;
  semantic?: OverrideValue<ThemeSemantic>;
  components?: OverrideValue<ThemeComponents>;
};

export type ThemeConfig = {
  scheme?: ColorScheme | "system";
  overrides?: ThemeOverrides;
  fonts?: Partial<ThemeFonts>;
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

function copyColor(colorValue: ColorObject): ColorObject {
  return { r: colorValue.r, g: colorValue.g, b: colorValue.b, a: colorValue.a };
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

function mergeColor(base: ColorObject, override?: Color): ColorObject {
  if (override === undefined) {
    return copyColor(base);
  }
  return toColorObject(override);
}

function mergeNumber(base: number, override?: number): number {
  return override ?? base;
}

function mergeString(base: string, override?: string): string {
  return override ?? base;
}

function mergeFonts(base: ThemeFonts, override?: Partial<ThemeFonts>): ThemeFonts {
  return {
    system: mergeString(base.system, override?.system),
    sans: mergeString(base.sans, override?.sans),
    monospaced: mergeString(base.monospaced, override?.monospaced),
    emoji: mergeString(base.emoji, override?.emoji),
  };
}

function mergePalette(base: ThemePalette, overrides?: ThemePaletteOverrides): ThemePalette {
  return {
    scheme: base.scheme,
    background: mergeColor(base.background, overrides?.background),
    surface: mergeColor(base.surface, overrides?.surface),
    surfaceMuted: mergeColor(base.surfaceMuted, overrides?.surfaceMuted),
    border: mergeColor(base.border, overrides?.border),
    text: mergeColor(base.text, overrides?.text),
    textMuted: mergeColor(base.textMuted, overrides?.textMuted),
    primary: mergeColor(base.primary, overrides?.primary),
    primaryForeground: mergeColor(base.primaryForeground, overrides?.primaryForeground),
    selectionBackground: mergeColor(base.selectionBackground, overrides?.selectionBackground),
    selectionForeground: mergeColor(base.selectionForeground, overrides?.selectionForeground),
    caret: mergeColor(base.caret, overrides?.caret),
    focusRing: mergeColor(base.focusRing, overrides?.focusRing),
    overlayBackground: mergeColor(base.overlayBackground, overrides?.overlayBackground),
    overlayBorder: mergeColor(base.overlayBorder, overrides?.overlayBorder),
    danger: mergeColor(base.danger, overrides?.danger),
    warning: mergeColor(base.warning, overrides?.warning),
    success: mergeColor(base.success, overrides?.success),
  };
}

function mergeSemantic(base: ThemeSemantic, overrides?: ThemeOverrides["semantic"]): ThemeSemantic {
  return {
    window: {
      background: mergeColor(base.window.background, overrides?.window?.background),
      foreground: mergeColor(base.window.foreground, overrides?.window?.foreground),
      border: mergeColor(base.window.border, overrides?.window?.border),
      focusRing: mergeColor(base.window.focusRing, overrides?.window?.focusRing),
    },
    text: {
      default: mergeColor(base.text.default, overrides?.text?.default),
      muted: mergeColor(base.text.muted, overrides?.text?.muted),
      disabled: mergeColor(base.text.disabled, overrides?.text?.disabled),
    },
    selection: {
      background: mergeColor(base.selection.background, overrides?.selection?.background),
      foreground: mergeColor(base.selection.foreground, overrides?.selection?.foreground),
      inactiveBackground: mergeColor(
        base.selection.inactiveBackground,
        overrides?.selection?.inactiveBackground
      ),
      outline: mergeColor(base.selection.outline, overrides?.selection?.outline),
    },
    status: {
      danger: mergeColor(base.status.danger, overrides?.status?.danger),
      warning: mergeColor(base.status.warning, overrides?.status?.warning),
      success: mergeColor(base.status.success, overrides?.status?.success),
    },
    surface: {
      default: mergeColor(base.surface.default, overrides?.surface?.default),
      muted: mergeColor(base.surface.muted, overrides?.surface?.muted),
      hover: mergeColor(base.surface.hover, overrides?.surface?.hover),
    },
    border: {
      default: mergeColor(base.border.default, overrides?.border?.default),
      muted: mergeColor(base.border.muted, overrides?.border?.muted),
      focused: mergeColor(base.border.focused, overrides?.border?.focused),
    },
  };
}

function mergeComponents(
  base: ThemeComponents,
  overrides?: ThemeOverrides["components"]
): ThemeComponents {
  return {
    text: {
      foreground: mergeColor(base.text.foreground, overrides?.text?.foreground),
      mutedForeground: mergeColor(base.text.mutedForeground, overrides?.text?.mutedForeground),
      disabledForeground: mergeColor(
        base.text.disabledForeground,
        overrides?.text?.disabledForeground
      ),
      selection: {
        background: mergeColor(
          base.text.selection.background,
          overrides?.text?.selection?.background
        ),
        foreground: mergeColor(
          base.text.selection.foreground,
          overrides?.text?.selection?.foreground
        ),
      },
      underline: {
        default: mergeColor(base.text.underline.default, overrides?.text?.underline?.default),
        hover: mergeColor(base.text.underline.hover, overrides?.text?.underline?.hover),
      },
    },
    heading: {
      foreground: mergeColor(base.heading.foreground, overrides?.heading?.foreground),
      mutedForeground: mergeColor(
        base.heading.mutedForeground,
        overrides?.heading?.mutedForeground
      ),
      font: {
        family: mergeString(base.heading.font.family, overrides?.heading?.font?.family),
      },
      size: {
        h1: mergeNumber(base.heading.size.h1, overrides?.heading?.size?.h1),
        h2: mergeNumber(base.heading.size.h2, overrides?.heading?.size?.h2),
        h3: mergeNumber(base.heading.size.h3, overrides?.heading?.size?.h3),
        h4: mergeNumber(base.heading.size.h4, overrides?.heading?.size?.h4),
        h5: mergeNumber(base.heading.size.h5, overrides?.heading?.size?.h5),
        h6: mergeNumber(base.heading.size.h6, overrides?.heading?.size?.h6),
      },
      weight: {
        h1: mergeNumber(base.heading.weight.h1, overrides?.heading?.weight?.h1),
        h2: mergeNumber(base.heading.weight.h2, overrides?.heading?.weight?.h2),
        h3: mergeNumber(base.heading.weight.h3, overrides?.heading?.weight?.h3),
        h4: mergeNumber(base.heading.weight.h4, overrides?.heading?.weight?.h4),
        h5: mergeNumber(base.heading.weight.h5, overrides?.heading?.weight?.h5),
        h6: mergeNumber(base.heading.weight.h6, overrides?.heading?.weight?.h6),
      },
    },
    mono: {
      foreground: mergeColor(base.mono.foreground, overrides?.mono?.foreground),
      background: mergeColor(base.mono.background, overrides?.mono?.background),
      border: mergeColor(base.mono.border, overrides?.mono?.border),
      inline: {
        foreground: mergeColor(base.mono.inline.foreground, overrides?.mono?.inline?.foreground),
        background: mergeColor(base.mono.inline.background, overrides?.mono?.inline?.background),
        border: mergeColor(base.mono.inline.border, overrides?.mono?.inline?.border),
      },
      selection: {
        background: mergeColor(
          base.mono.selection.background,
          overrides?.mono?.selection?.background
        ),
      },
    },
    link: {
      foreground: mergeColor(base.link.foreground, overrides?.link?.foreground),
      hover: {
        foreground: mergeColor(base.link.hover.foreground, overrides?.link?.hover?.foreground),
      },
      active: {
        foreground: mergeColor(base.link.active.foreground, overrides?.link?.active?.foreground),
      },
      visited: {
        foreground: mergeColor(base.link.visited.foreground, overrides?.link?.visited?.foreground),
      },
      underline: {
        default: mergeColor(base.link.underline.default, overrides?.link?.underline?.default),
        hover: mergeColor(base.link.underline.hover, overrides?.link?.underline?.hover),
      },
    },
    input: {
      background: mergeColor(base.input.background, overrides?.input?.background),
      border: mergeColor(base.input.border, overrides?.input?.border),
      foreground: mergeColor(base.input.foreground, overrides?.input?.foreground),
      placeholder: mergeColor(base.input.placeholder, overrides?.input?.placeholder),
      hover: {
        border: mergeColor(base.input.hover.border, overrides?.input?.hover?.border),
      },
      focused: {
        border: mergeColor(base.input.focused.border, overrides?.input?.focused?.border),
      },
      selection: {
        background: mergeColor(
          base.input.selection.background,
          overrides?.input?.selection?.background
        ),
        foreground: mergeColor(
          base.input.selection.foreground,
          overrides?.input?.selection?.foreground
        ),
      },
      caret: mergeColor(base.input.caret, overrides?.input?.caret),
      composition: mergeColor(base.input.composition, overrides?.input?.composition),
      disabled: {
        background: mergeColor(
          base.input.disabled.background,
          overrides?.input?.disabled?.background
        ),
        foreground: mergeColor(
          base.input.disabled.foreground,
          overrides?.input?.disabled?.foreground
        ),
      },
    },
    checkbox: {
      background: mergeColor(base.checkbox.background, overrides?.checkbox?.background),
      checked: {
        background: mergeColor(
          base.checkbox.checked.background,
          overrides?.checkbox?.checked?.background
        ),
      },
      indeterminate: {
        background: mergeColor(
          base.checkbox.indeterminate.background,
          overrides?.checkbox?.indeterminate?.background
        ),
      },
      border: mergeColor(base.checkbox.border, overrides?.checkbox?.border),
      hover: {
        border: mergeColor(base.checkbox.hover.border, overrides?.checkbox?.hover?.border),
        background: mergeColor(
          base.checkbox.hover.background,
          overrides?.checkbox?.hover?.background
        ),
      },
      checkmark: mergeColor(base.checkbox.checkmark, overrides?.checkbox?.checkmark),
      disabled: {
        opacity: mergeNumber(
          base.checkbox.disabled.opacity,
          overrides?.checkbox?.disabled?.opacity
        ),
      },
    },
    radio: {
      background: mergeColor(base.radio.background, overrides?.radio?.background),
      checked: {
        background: mergeColor(
          base.radio.checked.background,
          overrides?.radio?.checked?.background
        ),
      },
      border: mergeColor(base.radio.border, overrides?.radio?.border),
      hover: {
        border: mergeColor(base.radio.hover.border, overrides?.radio?.hover?.border),
      },
      indicator: mergeColor(base.radio.indicator, overrides?.radio?.indicator),
      disabled: {
        opacity: mergeNumber(base.radio.disabled.opacity, overrides?.radio?.disabled?.opacity),
      },
    },
    switch: {
      track: {
        background: mergeColor(base.switch.track.background, overrides?.switch?.track?.background),
        checkedBackground: mergeColor(
          base.switch.track.checkedBackground,
          overrides?.switch?.track?.checkedBackground
        ),
        hoverBackground: mergeColor(
          base.switch.track.hoverBackground,
          overrides?.switch?.track?.hoverBackground
        ),
      },
      thumb: {
        background: mergeColor(base.switch.thumb.background, overrides?.switch?.thumb?.background),
        hoverBackground: mergeColor(
          base.switch.thumb.hoverBackground,
          overrides?.switch?.thumb?.hoverBackground
        ),
        disabledBackground: mergeColor(
          base.switch.thumb.disabledBackground,
          overrides?.switch?.thumb?.disabledBackground
        ),
      },
      disabled: {
        opacity: mergeNumber(base.switch.disabled.opacity, overrides?.switch?.disabled?.opacity),
      },
    },
    tabs: {
      bar: {
        background: mergeColor(base.tabs.bar.background, overrides?.tabs?.bar?.background),
      },
      content: {
        background: mergeColor(base.tabs.content.background, overrides?.tabs?.content?.background),
      },
      border: mergeColor(base.tabs.border, overrides?.tabs?.border),
      indicator: mergeColor(base.tabs.indicator, overrides?.tabs?.indicator),
      indicatorHover: mergeColor(base.tabs.indicatorHover, overrides?.tabs?.indicatorHover),
      trigger: {
        background: mergeColor(base.tabs.trigger.background, overrides?.tabs?.trigger?.background),
        foreground: mergeColor(base.tabs.trigger.foreground, overrides?.tabs?.trigger?.foreground),
        active: {
          background: mergeColor(
            base.tabs.trigger.active.background,
            overrides?.tabs?.trigger?.active?.background
          ),
          foreground: mergeColor(
            base.tabs.trigger.active.foreground,
            overrides?.tabs?.trigger?.active?.foreground
          ),
        },
        hover: {
          background: mergeColor(
            base.tabs.trigger.hover.background,
            overrides?.tabs?.trigger?.hover?.background
          ),
        },
        disabled: {
          foreground: mergeColor(
            base.tabs.trigger.disabled.foreground,
            overrides?.tabs?.trigger?.disabled?.foreground
          ),
        },
      },
      focusRing: mergeColor(base.tabs.focusRing, overrides?.tabs?.focusRing),
    },
    menu: {
      background: mergeColor(base.menu.background, overrides?.menu?.background),
      border: mergeColor(base.menu.border, overrides?.menu?.border),
      shadow: mergeColor(base.menu.shadow, overrides?.menu?.shadow),
      separator: mergeColor(base.menu.separator, overrides?.menu?.separator),
      item: {
        background: mergeColor(base.menu.item.background, overrides?.menu?.item?.background),
        foreground: mergeColor(base.menu.item.foreground, overrides?.menu?.item?.foreground),
        hover: {
          background: mergeColor(
            base.menu.item.hover.background,
            overrides?.menu?.item?.hover?.background
          ),
          foreground: mergeColor(
            base.menu.item.hover.foreground,
            overrides?.menu?.item?.hover?.foreground
          ),
        },
        active: {
          background: mergeColor(
            base.menu.item.active.background,
            overrides?.menu?.item?.active?.background
          ),
          foreground: mergeColor(
            base.menu.item.active.foreground,
            overrides?.menu?.item?.active?.foreground
          ),
        },
        disabled: {
          foreground: mergeColor(
            base.menu.item.disabled.foreground,
            overrides?.menu?.item?.disabled?.foreground
          ),
        },
        shortcutForeground: mergeColor(
          base.menu.item.shortcutForeground,
          overrides?.menu?.item?.shortcutForeground
        ),
        labelForeground: mergeColor(
          base.menu.item.labelForeground,
          overrides?.menu?.item?.labelForeground
        ),
        destructiveForeground: mergeColor(
          base.menu.item.destructiveForeground,
          overrides?.menu?.item?.destructiveForeground
        ),
        destructiveHoverBackground: mergeColor(
          base.menu.item.destructiveHoverBackground,
          overrides?.menu?.item?.destructiveHoverBackground
        ),
      },
      checkmark: mergeColor(base.menu.checkmark, overrides?.menu?.checkmark),
      submenuIndicator: mergeColor(base.menu.submenuIndicator, overrides?.menu?.submenuIndicator),
    },
    dialog: {
      backdrop: mergeColor(base.dialog.backdrop, overrides?.dialog?.backdrop),
      background: mergeColor(base.dialog.background, overrides?.dialog?.background),
      border: mergeColor(base.dialog.border, overrides?.dialog?.border),
      shadow: mergeColor(base.dialog.shadow, overrides?.dialog?.shadow),
      title: {
        foreground: mergeColor(base.dialog.title.foreground, overrides?.dialog?.title?.foreground),
      },
      description: {
        foreground: mergeColor(
          base.dialog.description.foreground,
          overrides?.dialog?.description?.foreground
        ),
      },
      separator: mergeColor(base.dialog.separator, overrides?.dialog?.separator),
      button: {
        background: mergeColor(
          base.dialog.button.background,
          overrides?.dialog?.button?.background
        ),
        hover: {
          background: mergeColor(
            base.dialog.button.hover.background,
            overrides?.dialog?.button?.hover?.background
          ),
        },
        foreground: mergeColor(
          base.dialog.button.foreground,
          overrides?.dialog?.button?.foreground
        ),
        border: mergeColor(base.dialog.button.border, overrides?.dialog?.button?.border),
        disabled: {
          background: mergeColor(
            base.dialog.button.disabled.background,
            overrides?.dialog?.button?.disabled?.background
          ),
          foreground: mergeColor(
            base.dialog.button.disabled.foreground,
            overrides?.dialog?.button?.disabled?.foreground
          ),
        },
      },
      primaryButton: {
        background: mergeColor(
          base.dialog.primaryButton.background,
          overrides?.dialog?.primaryButton?.background
        ),
        hover: {
          background: mergeColor(
            base.dialog.primaryButton.hover.background,
            overrides?.dialog?.primaryButton?.hover?.background
          ),
        },
        foreground: mergeColor(
          base.dialog.primaryButton.foreground,
          overrides?.dialog?.primaryButton?.foreground
        ),
      },
      destructiveButton: {
        background: mergeColor(
          base.dialog.destructiveButton.background,
          overrides?.dialog?.destructiveButton?.background
        ),
        hover: {
          background: mergeColor(
            base.dialog.destructiveButton.hover.background,
            overrides?.dialog?.destructiveButton?.hover?.background
          ),
        },
        foreground: mergeColor(
          base.dialog.destructiveButton.foreground,
          overrides?.dialog?.destructiveButton?.foreground
        ),
      },
    },
    tooltip: {
      background: mergeColor(base.tooltip.background, overrides?.tooltip?.background),
      border: mergeColor(base.tooltip.border, overrides?.tooltip?.border),
      foreground: mergeColor(base.tooltip.foreground, overrides?.tooltip?.foreground),
      shadow: mergeColor(base.tooltip.shadow, overrides?.tooltip?.shadow),
      accent: mergeColor(base.tooltip.accent, overrides?.tooltip?.accent),
    },
    popover: {
      background: mergeColor(base.popover.background, overrides?.popover?.background),
      border: mergeColor(base.popover.border, overrides?.popover?.border),
      foreground: mergeColor(base.popover.foreground, overrides?.popover?.foreground),
      shadow: mergeColor(base.popover.shadow, overrides?.popover?.shadow),
    },
    divider: {
      background: mergeColor(base.divider.background, overrides?.divider?.background),
    },
    scrollbar: {
      track: {
        background: mergeColor(
          base.scrollbar.track.background,
          overrides?.scrollbar?.track?.background
        ),
      },
      thumb: {
        background: mergeColor(
          base.scrollbar.thumb.background,
          overrides?.scrollbar?.thumb?.background
        ),
        hover: {
          background: mergeColor(
            base.scrollbar.thumb.hover.background,
            overrides?.scrollbar?.thumb?.hover?.background
          ),
        },
        active: {
          background: mergeColor(
            base.scrollbar.thumb.active.background,
            overrides?.scrollbar?.thumb?.active?.background
          ),
        },
      },
    },
    list: {
      background: mergeColor(base.list.background, overrides?.list?.background),
      border: mergeColor(base.list.border, overrides?.list?.border),
      item: {
        background: mergeColor(base.list.item.background, overrides?.list?.item?.background),
        foreground: mergeColor(base.list.item.foreground, overrides?.list?.item?.foreground),
        hover: {
          background: mergeColor(
            base.list.item.hover.background,
            overrides?.list?.item?.hover?.background
          ),
        },
        selected: {
          background: mergeColor(
            base.list.item.selected.background,
            overrides?.list?.item?.selected?.background
          ),
          foreground: mergeColor(
            base.list.item.selected.foreground,
            overrides?.list?.item?.selected?.foreground
          ),
        },
      },
      separator: mergeColor(base.list.separator, overrides?.list?.separator),
    },
    table: {
      background: mergeColor(base.table.background, overrides?.table?.background),
      border: mergeColor(base.table.border, overrides?.table?.border),
      header: {
        background: mergeColor(base.table.header.background, overrides?.table?.header?.background),
        foreground: mergeColor(base.table.header.foreground, overrides?.table?.header?.foreground),
      },
      row: {
        background: mergeColor(base.table.row.background, overrides?.table?.row?.background),
        foreground: mergeColor(base.table.row.foreground, overrides?.table?.row?.foreground),
        hover: {
          background: mergeColor(
            base.table.row.hover.background,
            overrides?.table?.row?.hover?.background
          ),
        },
        selected: {
          background: mergeColor(
            base.table.row.selected.background,
            overrides?.table?.row?.selected?.background
          ),
          foreground: mergeColor(
            base.table.row.selected.foreground,
            overrides?.table?.row?.selected?.foreground
          ),
        },
      },
      cell: {
        border: mergeColor(base.table.cell.border, overrides?.table?.cell?.border),
      },
    },
    icon: {
      foreground: mergeColor(base.icon.foreground, overrides?.icon?.foreground),
      mutedForeground: mergeColor(base.icon.mutedForeground, overrides?.icon?.mutedForeground),
      activeForeground: mergeColor(base.icon.activeForeground, overrides?.icon?.activeForeground),
      dangerForeground: mergeColor(base.icon.dangerForeground, overrides?.icon?.dangerForeground),
    },
    inspector: {
      bounds: mergeColor(base.inspector.bounds, overrides?.inspector?.bounds),
      boundsHover: mergeColor(base.inspector.boundsHover, overrides?.inspector?.boundsHover),
      boundsSelected: mergeColor(
        base.inspector.boundsSelected,
        overrides?.inspector?.boundsSelected
      ),
      padding: mergeColor(base.inspector.padding, overrides?.inspector?.padding),
      margin: mergeColor(base.inspector.margin, overrides?.inspector?.margin),
      content: mergeColor(base.inspector.content, overrides?.inspector?.content),
      text: mergeColor(base.inspector.text, overrides?.inspector?.text),
      textShadow: mergeColor(base.inspector.textShadow, overrides?.inspector?.textShadow),
      panel: {
        background: mergeColor(
          base.inspector.panel.background,
          overrides?.inspector?.panel?.background
        ),
        border: mergeColor(base.inspector.panel.border, overrides?.inspector?.panel?.border),
      },
    },
    drag: {
      preview: {
        background: mergeColor(base.drag.preview.background, overrides?.drag?.preview?.background),
        border: mergeColor(base.drag.preview.border, overrides?.drag?.preview?.border),
        foreground: mergeColor(base.drag.preview.foreground, overrides?.drag?.preview?.foreground),
      },
      dropTarget: {
        outline: mergeColor(base.drag.dropTarget.outline, overrides?.drag?.dropTarget?.outline),
        background: mergeColor(
          base.drag.dropTarget.background,
          overrides?.drag?.dropTarget?.background
        ),
        validOutline: mergeColor(
          base.drag.dropTarget.validOutline,
          overrides?.drag?.dropTarget?.validOutline
        ),
        invalidOutline: mergeColor(
          base.drag.dropTarget.invalidOutline,
          overrides?.drag?.dropTarget?.invalidOutline
        ),
      },
    },
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

function normalizeThemeWithTemplate(template: Theme, theme: Theme): Theme {
  const fonts = mergeFonts(template.fonts, theme.fonts);
  const semantic = mergeSemantic(template.semantic, theme.semantic);
  const components = mergeComponents(template.components, theme.components);
  return {
    scheme: theme.scheme,
    fonts,
    semantic,
    components,
  };
}

function applyOverrides(base: Theme, overrides?: ThemeOverrides): Theme {
  if (!overrides) {
    return {
      scheme: base.scheme,
      fonts: base.fonts,
      semantic: mergeSemantic(base.semantic, undefined),
      components: mergeComponents(base.components, undefined),
    };
  }
  const mergedSemantic = mergeSemantic(base.semantic, overrides.semantic);
  const mergedComponents = mergeComponents(base.components, overrides.components);
  return {
    scheme: base.scheme,
    fonts: base.fonts,
    semantic: mergedSemantic,
    components: mergedComponents,
  };
}

function isTheme(value: Theme | ThemeConfig | undefined): value is Theme {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "semantic" in value && "components" in value && "fonts" in value && "scheme" in value;
}

export function resolveTheme(
  config: Theme | ThemeConfig | undefined,
  systemScheme: ColorScheme
): Theme {
  if (isTheme(config)) {
    const template = buildTheme(
      createBasePalette(config.scheme),
      mergeFonts(DEFAULT_THEME_FONTS, {})
    );
    return normalizeThemeWithTemplate(template, config);
  }

  const schemeOverride = config?.scheme ?? "system";
  const targetScheme = schemeOverride === "system" ? systemScheme : schemeOverride;
  const basePalette = createBasePalette(targetScheme);
  const fonts = mergeFonts(DEFAULT_THEME_FONTS, config?.fonts);
  const palette = mergePalette(basePalette, config?.overrides?.palette);
  const derived = buildTheme(palette, fonts);
  const overrides = config?.overrides
    ? { semantic: config.overrides.semantic, components: config.overrides.components }
    : undefined;
  return applyOverrides(derived, overrides);
}

function themesEqual(a: Theme, b: Theme): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class ThemeManager {
  private systemScheme: ColorScheme;
  private overrideScheme: ColorScheme | "system";
  private overrides: ThemeOverrides | undefined;
  private fontOverrides: Partial<ThemeFonts> | undefined;
  private theme: Theme;
  private listeners = new Set<(theme: Theme) => void>();

  constructor(systemScheme: ColorScheme, config?: Theme | ThemeConfig) {
    this.systemScheme = systemScheme;
    if (isTheme(config)) {
      this.overrideScheme = config.scheme;
      this.overrides = undefined;
      this.fontOverrides = undefined;
      this.theme = resolveTheme(config, this.systemScheme);
    } else {
      this.overrideScheme = config?.scheme ?? "system";
      this.overrides = config?.overrides;
      this.fontOverrides = config?.fonts;
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
    this.theme = resolveTheme(theme, this.systemScheme);
    this.overrideScheme = theme.scheme;
    this.overrides = undefined;
    this.fontOverrides = undefined;
    this.notify();
  }

  setThemeConfig(config: ThemeConfig): void {
    this.overrideScheme = config.scheme ?? this.overrideScheme;
    this.overrides = config.overrides ?? this.overrides;
    this.fontOverrides = config.fonts ?? this.fontOverrides;
    this.recompute();
  }

  setThemeScheme(scheme: ColorScheme | "system"): void {
    this.overrideScheme = scheme;
    this.recompute();
  }

  setSystemScheme(scheme: ColorScheme): void {
    this.systemScheme = scheme;
    if (this.overrideScheme === "system") {
      this.recompute();
    }
  }

  setThemeOverrides(overrides: ThemeOverrides): void {
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
      {
        scheme: this.overrideScheme,
        overrides: this.overrides,
        fonts: this.fontOverrides,
      },
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
