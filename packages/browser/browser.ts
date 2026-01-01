/**
 * Browser bindings are not really that complex as we're depending on the
 * standard WegGPU JS APIs, not our own custom implementations of
 * them like on darwin.
 */

export {
  // WebGPU
  createWebGPUContext,
  runWebGPURenderLoop,
  // Types
  type BrowserWebGPUContext,
  type BrowserContextOptions,
  type BrowserWebGPUContextOptions,
} from "./context.ts";

// Clipboard
export { createClipboard } from "./clipboard.ts";

// Glade platform
export { createGladePlatform } from "./glade";

// Theme utilities
export { createColorSchemeProvider } from "./theme.ts";
