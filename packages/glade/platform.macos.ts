// Re-export macOS platform from @glade/platform
// This file is excluded from typecheck - use @glade/glade/platform with conditional exports
import type { MacOSGladePlatformOptions } from "@glade/platform/platform.macos";

export {
  createGladePlatform,
  type MacOSGladePlatformInstance,
  type MacOSGladePlatformOptions,
} from "@glade/platform/platform.macos";

// Unified type alias for cross-platform code
export type GladePlatformOptions = MacOSGladePlatformOptions;

// TODO: getting the following err on this file...
// File ignored because of a matching ignore pattern. Use "--no-ignore" to disable file ignore settings or use "--no-warn-ignored" to suppress this warning. (eslint)
