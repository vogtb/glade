# Flash Theme Plan (Namespaced)

This plan expands the Flash theme into namespaced, component-specific tokens while keeping the existing base palette. The goal is to make theme access explicit and consistent, e.g. `theme.icon.foreground` or `theme.menu.item.hover.background`, similar to VSCode-style tokens.

## Principles

- Keep a small base palette as the default source of truth.
- Add semantic roles for shared meanings (text, surfaces, borders, selection).
- Add component namespaces with explicit state tokens (hover, active, disabled, focused, selected).
- Share a single menu namespace across menu, dropdown, and right-click.
- Keep typography/metrics tokens only where defaults are hardcoded today.

## Theme Shape

### Base Palette

`theme.base`
- `scheme`
- `background`
- `surface`
- `surfaceMuted`
- `border`
- `text`
- `textMuted`
- `primary`
- `primaryForeground`
- `selectionBackground`
- `selectionForeground`
- `caret`
- `focusRing`
- `overlayBackground`
- `overlayBorder`
- `danger`
- `warning`
- `success`

### Semantic Roles

`theme.semantic`
- `window.background`
- `window.foreground`
- `window.border`
- `window.focusRing`
- `text.default`
- `text.muted`
- `text.disabled`
- `selection.background`
- `selection.foreground`
- `selection.inactiveBackground`
- `selection.outline`
- `status.danger`
- `status.warning`
- `status.success`
- `surface.default`
- `surface.muted`
- `surface.hover`
- `border.default`
- `border.muted`
- `border.focused`

## Component Namespaces

### Text

`theme.components.text`
- `foreground`
- `mutedForeground`
- `disabledForeground`
- `selection.background`
- `selection.foreground`
- `underline.default`
- `underline.hover`

### Heading

`theme.components.heading`
- `foreground`
- `mutedForeground`
- `font.family`
- `size.h1`
- `size.h2`
- `size.h3`
- `size.h4`
- `size.h5`
- `size.h6`
- `weight.h1`
- `weight.h2`
- `weight.h3`
- `weight.h4`
- `weight.h5`
- `weight.h6`

### Mono (Code/Pre)

`theme.components.mono`
- `foreground`
- `background`
- `border`
- `inline.foreground`
- `inline.background`
- `inline.border`
- `selection.background`

### Link

`theme.components.link`
- `foreground`
- `hover.foreground`
- `active.foreground`
- `visited.foreground`
- `underline.default`
- `underline.hover`

### Text Input

`theme.components.input`
- `background`
- `border`
- `foreground`
- `placeholder`
- `hover.border`
- `focused.border`
- `selection.background`
- `selection.foreground`
- `caret`
- `composition`
- `disabled.background`
- `disabled.foreground`

### Checkbox

`theme.components.checkbox`
- `background`
- `checked.background`
- `indeterminate.background`
- `border`
- `hover.border`
- `checkmark`
- `hover.background`
- `disabled.opacity`

### Radio

`theme.components.radio`
- `background`
- `checked.background`
- `border`
- `hover.border`
- `indicator`
- `disabled.opacity`

### Switch

`theme.components.switch`
- `track.background`
- `track.checkedBackground`
- `track.hoverBackground`
- `thumb.background`
- `thumb.hoverBackground`
- `thumb.disabledBackground`
- `disabled.opacity`

### Tabs

`theme.components.tabs`
- `bar.background`
- `content.background`
- `border`
- `indicator`
- `indicator.hover`
- `trigger.background`
- `trigger.foreground`
- `trigger.active.background`
- `trigger.active.foreground`
- `trigger.hover.background`
- `trigger.disabled.foreground`
- `focusRing`

### Menu (Menu/Dropdown/Right-Click)

`theme.components.menu`
- `background`
- `border`
- `shadow`
- `separator`
- `item.background`
- `item.foreground`
- `item.hover.background`
- `item.hover.foreground`
- `item.active.background`
- `item.active.foreground`
- `item.disabled.foreground`
- `item.shortcutForeground`
- `item.labelForeground`
- `item.destructiveForeground`
- `item.destructiveHoverBackground`
- `checkmark`
- `submenuIndicator`

### Dialog

`theme.components.dialog`
- `backdrop`
- `background`
- `border`
- `shadow`
- `title.foreground`
- `description.foreground`
- `separator`
- `button.background`
- `button.hover.background`
- `button.foreground`
- `button.border`
- `button.disabled.background`
- `button.disabled.foreground`
- `primaryButton.background`
- `primaryButton.hover.background`
- `primaryButton.foreground`
- `destructiveButton.background`
- `destructiveButton.hover.background`
- `destructiveButton.foreground`

### Tooltip

`theme.components.tooltip`
- `background`
- `border`
- `foreground`
- `shadow`
- `accent`

### Popover

`theme.components.popover`
- `background`
- `border`
- `foreground`
- `shadow`

### Divider

`theme.components.divider`
- `background`

### Scrollbar

`theme.components.scrollbar`
- `track.background`
- `thumb.background`
- `thumb.hover.background`
- `thumb.active.background`

### List

`theme.components.list`
- `background`
- `border`
- `item.background`
- `item.foreground`
- `item.hover.background`
- `item.selected.background`
- `item.selected.foreground`
- `separator`

### Table

`theme.components.table`
- `background`
- `border`
- `header.background`
- `header.foreground`
- `row.background`
- `row.foreground`
- `row.hover.background`
- `row.selected.background`
- `row.selected.foreground`
- `cell.border`

### Icon/SVG

`theme.components.icon`
- `foreground`
- `mutedForeground`
- `activeForeground`
- `dangerForeground`

### Inspector

`theme.components.inspector`
- `bounds`
- `boundsHover`
- `boundsSelected`
- `padding`
- `margin`
- `content`
- `text`
- `textShadow`
- `panel.background`
- `panel.border`

### Drag and Drop

`theme.components.drag`
- `preview.background`
- `preview.border`
- `preview.foreground`
- `dropTarget.outline`
- `dropTarget.background`
- `dropTarget.validOutline`
- `dropTarget.invalidOutline`

## Component Coverage Notes

- The menu namespace should be used by `menu.ts`, `dropdown.ts`, and `right_click.ts`.
- `FlashTextElement`, `FlashTextInput`, and the cross-element selection manager should pull from the text/selection namespaces.
- `Tabs`, `Dialog`, `Checkbox`, `Radio`, `Switch`, `Scrollbar`, `Divider`, and `Link` should read only from their own component namespaces, with semantic/base as fallback defaults.
- Inspector colors should be fully theme-controlled (currently hardcoded).

