// Types and classes - safe to import without pulling in embedded fonts
export { FontFamily, FontVariant } from "./types";

// Embedded font data - only import if you need the pre-loaded fonts
export {
  FONT_FAMILIES,
  INTER_FAMILY,
  JETBRAINS_MONO_FAMILY,
  NOTO_COLOR_EMOJI_FAMILY,
} from "./embedded";
