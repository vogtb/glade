// Re-export browser platform from @glade/platform
// This file is excluded from typecheck - use @glade/glade/platform with conditional exports
import type { BrowserGladePlatformOptions } from "@glade/platform/platform.browser";

export {
  type BrowserGladePlatformInstance,
  type BrowserGladePlatformOptions,
  createGladePlatform,
} from "@glade/platform/platform.browser";

// Unified type alias for cross-platform code
export type GladePlatformOptions = BrowserGladePlatformOptions;

// TODO: getting the following err on this file...
// File ignored because of a matching ignore pattern. Use "--no-ignore" to disable file ignore settings or use "--no-warn-ignored" to suppress this warning. (eslint)
