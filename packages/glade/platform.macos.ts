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
