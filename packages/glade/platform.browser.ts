// Re-export browser platform from @glade/platform
// This file is excluded from typecheck - use @glade/glade/platform with conditional exports
export {
  type BrowserGladePlatformInstance,
  type BrowserGladePlatformOptions,
  createGladePlatform,
} from "@glade/platform/platform.browser";
