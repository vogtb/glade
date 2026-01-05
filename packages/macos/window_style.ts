import type { TitleBarStyle } from "@glade/core";
import type { Pointer } from "bun:ffi";

import { getSelector, objcSendOneBool, objcSendOneU64, objcSendReturnU64 } from "./objc";

const NSWindowStyleMaskTitled = 1n << 0n;
const NSWindowStyleMaskFullSizeContentView = 1n << 15n;
const NSWindowTitleVisibilityVisible = 0n;
const _NSWindowTitleVisibilityHidden = 1n;

const selectors = {
  styleMask: getSelector("styleMask"),
  setStyleMask: getSelector("setStyleMask:"),
  setTitleVisibility: getSelector("setTitleVisibility:"),
  setTitlebarAppearsTransparent: getSelector("setTitlebarAppearsTransparent:"),
  setMovableByWindowBackground: getSelector("setMovableByWindowBackground:"),
};

export function applyTitleBarStyle(nsWindow: Pointer, style: TitleBarStyle): void {
  const rawMask = objcSendReturnU64.symbols.objc_msgSend(nsWindow, selectors.styleMask);
  const currentMask = typeof rawMask === "bigint" ? rawMask : BigInt(rawMask);

  if (style === "transparent" || style === "controlled") {
    const nextMask = currentMask | NSWindowStyleMaskFullSizeContentView | NSWindowStyleMaskTitled;
    objcSendOneU64.symbols.objc_msgSend(nsWindow, selectors.setStyleMask, nextMask);
    objcSendOneU64.symbols.objc_msgSend(
      nsWindow,
      selectors.setTitleVisibility,
      NSWindowTitleVisibilityVisible
    );
    objcSendOneBool.symbols.objc_msgSend(nsWindow, selectors.setTitlebarAppearsTransparent, 1);
    objcSendOneBool.symbols.objc_msgSend(nsWindow, selectors.setMovableByWindowBackground, 1);
    return;
  }

  const nextMask = currentMask & ~NSWindowStyleMaskFullSizeContentView;
  objcSendOneU64.symbols.objc_msgSend(nsWindow, selectors.setStyleMask, nextMask);
  objcSendOneU64.symbols.objc_msgSend(
    nsWindow,
    selectors.setTitleVisibility,
    NSWindowTitleVisibilityVisible
  );
  objcSendOneBool.symbols.objc_msgSend(nsWindow, selectors.setTitlebarAppearsTransparent, 0);
  objcSendOneBool.symbols.objc_msgSend(nsWindow, selectors.setMovableByWindowBackground, 0);
}
