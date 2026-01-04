// Re-export macOS platform from @glade/platform
// This file is excluded from typecheck - use @glade/glade/platform with conditional exports
export {
  createGladePlatform,
  type MacOSGladePlatformInstance,
  type MacOSGladePlatformOptions,
} from "@glade/platform/platform.macos";
