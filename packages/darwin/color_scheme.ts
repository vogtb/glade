import type { ColorScheme, ColorSchemeProvider } from "@glade/core";

function parseScheme(output: string): ColorScheme | null {
  const trimmed = output.trim().toLowerCase();
  if (trimmed.includes("dark")) {
    return "dark";
  }
  if (trimmed.length > 0) {
    return "light";
  }
  return null;
}

function readSystemScheme(): ColorScheme {
  try {
    const result = Bun.spawnSync(["defaults", "read", "-g", "AppleInterfaceStyle"]);
    if (result.exitCode === 0) {
      const decoded = new TextDecoder().decode(result.stdout);
      const parsed = parseScheme(decoded);
      if (parsed) {
        return parsed;
      }
    }
  } catch {
    // Ignore errors and fall back below
  }
  return "light";
}

/**
 * Color scheme provider for macOS.
 *
 * Uses the system preference from AppleInterfaceStyle and polls for changes.
 * Polling keeps the implementation lightweight while still reacting to updates.
 */
export function createColorSchemeProvider(): ColorSchemeProvider {
  let scheme = readSystemScheme();
  const listeners = new Set<(value: ColorScheme) => void>();
  const POLL_INTERVAL_MS = 2000;
  let timer: ReturnType<typeof setInterval> | null = null;

  const ensurePolling = (): void => {
    if (timer !== null) {
      return;
    }
    timer = setInterval(() => {
      if (listeners.size === 0) {
        return;
      }
      const next = readSystemScheme();
      if (next !== scheme) {
        scheme = next;
        for (const listener of listeners) {
          listener(scheme);
        }
      }
    }, POLL_INTERVAL_MS);
  };

  return {
    get(): ColorScheme {
      return scheme;
    },
    subscribe(callback: (value: ColorScheme) => void): () => void {
      listeners.add(callback);
      ensurePolling();
      return () => {
        listeners.delete(callback);
        if (listeners.size === 0 && timer !== null) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
  };
}
