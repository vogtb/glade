import type { Clipboard } from "@glade/core";

function getNavigatorClipboard(): globalThis.Clipboard | null {
  if (typeof navigator === "undefined") {
    return null;
  }
  return navigator.clipboard ?? null;
}

function supportsNavigatorRead(): boolean {
  const clipboard = getNavigatorClipboard();
  if (!clipboard) {
    return false;
  }
  return typeof clipboard.readText === "function";
}

function supportsNavigatorWrite(): boolean {
  const clipboard = getNavigatorClipboard();
  if (!clipboard) {
    return false;
  }
  return typeof clipboard.writeText === "function";
}

class BrowserClipboard implements Clipboard {
  get isSupported(): boolean {
    return supportsNavigatorRead() || supportsNavigatorWrite();
  }

  get supportsReadText(): boolean {
    return supportsNavigatorRead();
  }

  get supportsWriteText(): boolean {
    return supportsNavigatorWrite();
  }

  async readText(): Promise<string> {
    const clipboard = getNavigatorClipboard();
    if (!clipboard || !clipboard.readText) {
      throw new Error("Clipboard read is not available in this environment");
    }
    return clipboard.readText();
  }

  async writeText(text: string): Promise<void> {
    const clipboard = getNavigatorClipboard();
    if (!clipboard || !clipboard.writeText) {
      throw new Error("Clipboard write is not available in this environment");
    }
    await clipboard.writeText(text);
  }
}

export function createClipboard(): Clipboard {
  return new BrowserClipboard();
}
