import { dlopen, FFIType, JSCallback, type Pointer } from "bun:ffi";
import { fileURLToPath } from "url";
import path from "path";

export interface ImeHandle {
  detach(): void;
  makeFirstResponder(): void;
}

type ComposingCallback = (text: string, selectionStart: number, selectionEnd: number) => void;
type CommitCallback = (text: string) => void;
type CancelCallback = () => void;

export interface ImeCallbacks {
  onComposing?: ComposingCallback;
  onCommit?: CommitCallback;
  onCancel?: CancelCallback;
}

type ImeLib = {
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
  };
};

/**
 * Attempts to load the IME bridge dylib and attach to the given NSWindow.
 */
export function attachIme(nsWindow: Pointer, callbacks: ImeCallbacks): ImeHandle | null {
  const libPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "ime_handler.dylib");

  let lib: ImeLib;
  try {
    lib = dlopen(libPath, {
      ime_attach: {
        args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
        returns: FFIType.ptr,
      },
      ime_detach: { args: [FFIType.ptr], returns: FFIType.void },
      ime_make_first_responder: { args: [FFIType.ptr], returns: FFIType.void },
    }) as unknown as ImeLib;
  } catch (err) {
    console.error("Failed to load IME handler dylib", err);
    return null;
  }

  const nullPtr = 0 as unknown as Pointer;

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
