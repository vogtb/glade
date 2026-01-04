import { log } from "@glade/logging";
import { dlopen, FFIType, JSCallback, type Pointer } from "bun:ffi";

// @ts-expect-error - Bun-specific import attribute for embedded dylib
import GLADE_HELPERS_PATH from "../../libs/libgladehelpers.dylib" with { type: "file" };

log.info(`using embedded libgladehelpers.dylib`);
log.info(`GLADE_HELPERS_PATH=${GLADE_HELPERS_PATH}`);

export interface ImeHandle {
  detach(): void;
  makeFirstResponder(): void;
}

export interface TitlebarDragHandle {
  detach(): void;
}

export interface TitlebarDragMonitorHandle {
  detach(): void;
}

type ComposingCallback = (text: string, selectionStart: number, selectionEnd: number) => void;
type CommitCallback = (text: string) => void;
type CancelCallback = () => void;

export interface ImeCallbacks {
  onComposing?: ComposingCallback;
  onCommit?: CommitCallback;
  onCancel?: CancelCallback;
}

type HelperLib = {
  symbols: {
    ime_attach: (
      nsWindow: Pointer,
      composing: Pointer,
      commit: Pointer,
      cancel: Pointer,
      userData: Pointer
    ) => Pointer;
    ime_detach: (handle: Pointer) => void;
    ime_make_first_responder: (handle: Pointer) => void;
    titlebar_drag_attach: (nsWindow: Pointer) => Pointer;
    titlebar_drag_detach: (handle: Pointer) => void;
    titlebar_drag_monitor_attach: (nsWindow: Pointer) => Pointer;
    titlebar_drag_monitor_detach: (handle: Pointer) => void;
  };
};

let cachedLib: HelperLib | null = null;

function loadHelpersLib(): HelperLib | null {
  if (cachedLib) {
    return cachedLib;
  }
  try {
    cachedLib = dlopen(GLADE_HELPERS_PATH, {
      ime_attach: {
        args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
        returns: FFIType.ptr,
      },
      ime_detach: { args: [FFIType.ptr], returns: FFIType.void },
      ime_make_first_responder: { args: [FFIType.ptr], returns: FFIType.void },
      titlebar_drag_attach: { args: [FFIType.ptr], returns: FFIType.ptr },
      titlebar_drag_detach: { args: [FFIType.ptr], returns: FFIType.void },
      titlebar_drag_monitor_attach: { args: [FFIType.ptr], returns: FFIType.ptr },
      titlebar_drag_monitor_detach: { args: [FFIType.ptr], returns: FFIType.void },
    }) as unknown as HelperLib;
  } catch (err) {
    console.warn("Failed to load Glade helper dylib; IME and titlebar drag disabled", err);
    return null;
  }
  return cachedLib;
}

/**
 * Attempts to load the Glade helper dylib and attach to the given NSWindow.
 */
export function attachIme(nsWindow: Pointer, callbacks: ImeCallbacks): ImeHandle | null {
  const lib = loadHelpersLib();
  if (!lib) {
    return null;
  }

  const nullPtr = null as unknown as Pointer;

  const composingCb = callbacks.onComposing
    ? new JSCallback(
        (text: string, selectionStart: number, selectionEnd: number, _userData: Pointer) => {
          callbacks.onComposing?.(text, selectionStart, selectionEnd);
        },
        {
          args: [FFIType.cstring, FFIType.i32, FFIType.i32, FFIType.ptr],
          returns: FFIType.void,
        }
      )
    : null;

  const commitCb = callbacks.onCommit
    ? new JSCallback(
        (text: string, _userData: Pointer) => {
          callbacks.onCommit?.(text);
        },
        {
          args: [FFIType.cstring, FFIType.ptr],
          returns: FFIType.void,
        }
      )
    : null;

  const cancelCb = callbacks.onCancel
    ? new JSCallback(
        (_userData: Pointer) => {
          callbacks.onCancel?.();
        },
        {
          args: [FFIType.ptr],
          returns: FFIType.void,
        }
      )
    : null;

  const composingPtr: Pointer = composingCb ? (composingCb.ptr as Pointer) : nullPtr;
  const commitPtr: Pointer = commitCb ? (commitCb.ptr as Pointer) : nullPtr;
  const cancelPtr: Pointer = cancelCb ? (cancelCb.ptr as Pointer) : nullPtr;

  const handlerPtr = lib.symbols.ime_attach(nsWindow, composingPtr, commitPtr, cancelPtr, nullPtr);

  if (!handlerPtr || handlerPtr === nullPtr) {
    composingCb?.close();
    commitCb?.close();
    cancelCb?.close();
    return null;
  }

  return {
    detach() {
      lib.symbols.ime_detach(handlerPtr);
      composingCb?.close();
      commitCb?.close();
      cancelCb?.close();
    },
    makeFirstResponder() {
      lib.symbols.ime_make_first_responder(handlerPtr);
    },
  };
}

export function attachTitlebarDrag(nsWindow: Pointer): TitlebarDragHandle | null {
  const lib = loadHelpersLib();
  if (!lib) {
    return null;
  }

  const nullPtr = null as unknown as Pointer;
  const handlePtr = lib.symbols.titlebar_drag_attach(nsWindow);
  if (!handlePtr || handlePtr === nullPtr) {
    return null;
  }

  return {
    detach() {
      lib.symbols.titlebar_drag_detach(handlePtr);
    },
  };
}

export function attachTitlebarDragMonitor(nsWindow: Pointer): TitlebarDragMonitorHandle | null {
  const lib = loadHelpersLib();
  if (!lib) {
    return null;
  }

  const nullPtr = null as unknown as Pointer;
  const handlePtr = lib.symbols.titlebar_drag_monitor_attach(nsWindow);
  if (!handlePtr || handlePtr === nullPtr) {
    return null;
  }

  return {
    detach() {
      lib.symbols.titlebar_drag_monitor_detach(handlePtr);
    },
  };
}
