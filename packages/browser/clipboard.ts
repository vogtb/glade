import type { Clipboard } from "@glade/core";

function getNavigatorClipboard(): globalThis.Clipboard | null {
  if (typeof navigator === "undefined") {
    return null;
  }
  const clipboard = navigator.clipboard ?? null;
  return clipboard;
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

function supportsExecCopy(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  if (!document.queryCommandSupported) {
    return false;
  }
  return document.queryCommandSupported("copy");
}

function fallbackCopy(text: string): boolean {
  if (!supportsExecCopy()) {
    return false;
  }
  if (!document.body) {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.setAttribute("readonly", "true");
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let success = false;
  try {
    success = document.execCommand("copy");
  } catch {
    success = false;
  }

  document.body.removeChild(textarea);
  return success;
}

class BrowserClipboard implements Clipboard {
  get isSupported(): boolean {
    return supportsNavigatorRead() || supportsNavigatorWrite() || supportsExecCopy();
  }

  get supportsReadText(): boolean {
    return supportsNavigatorRead();
  }

  get supportsWriteText(): boolean {
    if (supportsNavigatorWrite()) {
      return true;
    }
    return supportsExecCopy();
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
    if (clipboard && clipboard.writeText) {
      await clipboard.writeText(text);
      return;
    }

    const copied = fallbackCopy(text);
    if (!copied) {
      throw new Error("Clipboard write is not available in this environment");
    }
  }
}

export function createClipboard(): Clipboard {
  return new BrowserClipboard();
}
