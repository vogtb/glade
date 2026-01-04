/**
 * Dialog system for Glade.
 *
 * Provides modal dialog windows with backdrop overlay, centered positioning,
 * and structured content (header, body, footer).
 *
 * Key behavior:
 * - DialogManager tracks active dialog state
 * - Dialog renders a semi-transparent backdrop
 * - Content is centered in the window
 * - Click-outside (backdrop) dismisses by default
 * - Escape key dismisses by default
 * - Only one dialog can be active at a time
 *
 * Usage:
 *   dialog()
 *     .open(isOpen)
 *     .onOpenChange((open) => { ... })
 *     .trigger(button)
 *     .content(
 *       dialogContent()
 *         .header(dialogHeader().title("My Dialog"))
 *         .body(div().child(...))
 *         .footer(dialogFooter().cancel("Cancel").confirm("OK"))
 *     )
 */

import { type Color, type ColorObject, toColorObject } from "@glade/utils";

import { anchored, AnchoredElement } from "./anchored.ts";
import type { Bounds } from "./bounds.ts";
import type { GladeContext } from "./context.ts";
import { deferred, DeferredElement } from "./deferred.ts";
import type { ClickHandler, HitTestNode, KeyHandler } from "./dispatch.ts";
import { div, GladeDiv } from "./div.ts";
import type { AnyGladeElement } from "./element.ts";
import {
  GladeContainerElement,
  GladeElement,
  type GlobalElementId,
  type PaintContext,
  type PrepaintContext,
  type RequestLayoutContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { Hitbox, HitboxId } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";
import type { LayoutId } from "./layout.ts";
import type { Size } from "./size.ts";
import type { Theme } from "./theme.ts";

// ============================================================================
// Sizes
// ============================================================================
const DEFAULT_DIALOG_PADDING = 24;
const DEFAULT_DIALOG_BORDER_RADIUS = 8;
const DEFAULT_DIALOG_BORDER_WIDTH = 1;
const DEFAULT_DIALOG_MIN_WIDTH = 320;
const DEFAULT_DIALOG_MAX_WIDTH = 480;
const DEFAULT_TITLE_FONT_SIZE = 18;
const DEFAULT_DESCRIPTION_FONT_SIZE = 14;
const DEFAULT_BUTTON_FONT_SIZE = 14;
const DEFAULT_BUTTON_PADDING_X = 16;
const DEFAULT_BUTTON_PADDING_Y = 10;
const DEFAULT_BUTTON_BORDER_RADIUS = 6;
const DEFAULT_HEADER_GAP = 8;
const DEFAULT_FOOTER_GAP = 12;
const DEFAULT_CONTENT_GAP = 16;

// ============================================================================
// Types
// ============================================================================

/**
 * Handler called when dialog open state changes.
 */
export type DialogOpenChangeHandler = (open: boolean) => void;

/**
 * Handler called when dialog action buttons are clicked.
 */
export type DialogActionHandler = () => void;

/**
 * Dialog configuration.
 */
export interface DialogConfig {
  /** Whether clicking backdrop closes the dialog. */
  closeOnBackdropClick: boolean;
  /** Whether pressing Escape closes the dialog. */
  closeOnEscape: boolean;
  /** Backdrop color (semi-transparent overlay). */
  backdropColor: ColorObject;
  /** Window margin to prevent dialog from touching edges. */
  windowMargin: number;
}

/**
 * Default dialog configuration.
 */
export const DEFAULT_DIALOG_CONFIG: DialogConfig = {
  closeOnBackdropClick: true,
  closeOnEscape: true,
  backdropColor: { r: 0, g: 0, b: 0, a: 0 },
  windowMargin: 32,
};

/**
 * Builder function for creating dialog content.
 */

export type DialogBuilder = (cx: GladeContext) => AnyGladeElement;

/**
 * Dialog registration for the manager.
 */
export interface DialogRegistration {
  /** Unique ID for this dialog. */
  id: string;
  /** Hitbox ID of the trigger element. */
  hitboxId: HitboxId;
  /** Function to build dialog content. */
  builder: DialogBuilder;
  /** Dialog configuration. */
  config: DialogConfig;
  /** Whether this dialog is currently open. */
  open: boolean;
  /** Callback when dialog should close. */
  onClose: (() => void) | null;
}

/**
 * Active dialog state.
 */
export interface ActiveDialog {
  /** Registration that created this dialog. */
  registration: DialogRegistration;
  /** The dialog element once built. */

  element: AnyGladeElement | null;
  /** Computed dialog bounds. */
  bounds: Bounds | null;
}

/**
 * Context passed from Dialog to content components.
 */
export type DialogContentContext = {
  onOpenChange: DialogOpenChangeHandler | null;
  // Styling
  dialogBg: ColorObject;
  dialogBorder: ColorObject;
  dialogBorderRadius: number;
  dialogPadding: number;
  titleColor: ColorObject;
  descriptionColor: ColorObject;
  separatorColor: ColorObject;
  buttonBg: ColorObject;
  buttonHoverBg: ColorObject;
  buttonText: ColorObject;
  primaryButtonBg: ColorObject;
  primaryButtonHoverBg: ColorObject;
  primaryButtonText: ColorObject;
  destructiveButtonBg: ColorObject;
  destructiveButtonHoverBg: ColorObject;
  destructiveButtonText: ColorObject;
  buttonFontSize: number;
  buttonPaddingX: number;
  buttonPaddingY: number;
  buttonBorderRadius: number;
};

// ============================================================================
// DialogManager
// ============================================================================

/**
 * Dialog manager for tracking and displaying dialogs.
 */
export class DialogManager {
  private registrations = new Map<string, DialogRegistration>();
  private activeDialog: ActiveDialog | null = null;

  /**
   * Register a dialog.
   */
  register(registration: DialogRegistration): void {
    this.registrations.set(registration.id, registration);

    if (registration.open) {
      // Only one dialog can be active at a time
      if (this.activeDialog && this.activeDialog.registration.id !== registration.id) {
        const previousOnClose = this.activeDialog.registration.onClose;
        if (previousOnClose) {
          previousOnClose();
        }
      }

      this.activeDialog = {
        registration,
        element: null,
        bounds: null,
      };
    } else if (this.activeDialog?.registration.id === registration.id) {
      // This dialog was active but is now closed
      this.activeDialog = null;
    }
  }

  /**
   * Clear all registrations (called each frame).
   */
  clearRegistrations(): void {
    this.registrations.clear();
    this.activeDialog = null;
  }

  /**
   * Build the active dialog element.
   */
  buildActiveDialog(cx: GladeContext, _windowSize: Size): void {
    if (!this.activeDialog) {
      return;
    }

    const { registration } = this.activeDialog;

    // Build the element
    this.activeDialog.element = registration.builder(cx);
  }

  /**
   * Get the active dialog if one exists.
   */
  getActiveDialog(): ActiveDialog | null {
    return this.activeDialog;
  }

  /**
   * Handle escape key for dismissing dialogs.
   */
  handleEscapeKey(): boolean {
    if (!this.activeDialog) {
      return false;
    }

    if (!this.activeDialog.registration.config.closeOnEscape) {
      return false;
    }

    const onClose = this.activeDialog.registration.onClose;
    if (onClose) {
      onClose();
    }
    return true;
  }

  /**
   * Hide the current dialog.
   */
  hide(): void {
    if (this.activeDialog) {
      const onClose = this.activeDialog.registration.onClose;
      if (onClose) {
        onClose();
      }
      this.activeDialog = null;
    }
  }

  /**
   * Check if a dialog is currently active.
   */
  isActive(): boolean {
    return this.activeDialog !== null;
  }

  /**
   * Check if a specific dialog ID is currently active.
   */
  isDialogActive(id: string): boolean {
    return this.activeDialog?.registration.id === id;
  }
}

// ============================================================================
// DialogConfigBuilder
// ============================================================================

/**
 * Fluent builder for dialog configuration.
 */
export class DialogConfigBuilder {
  private config: DialogConfig = { ...DEFAULT_DIALOG_CONFIG };

  /**
   * Set whether clicking backdrop closes the dialog.
   */
  closeOnBackdropClick(value: boolean): this {
    this.config.closeOnBackdropClick = value;
    return this;
  }

  /**
   * Set whether pressing Escape closes the dialog.
   */
  closeOnEscape(value: boolean): this {
    this.config.closeOnEscape = value;
    return this;
  }

  /**
   * Set backdrop color.
   */
  backdropColor(color: Color): this {
    this.config.backdropColor = toColorObject(color);
    return this;
  }

  /**
   * Set window margin.
   */
  windowMargin(px: number): this {
    this.config.windowMargin = px;
    return this;
  }

  /**
   * Build the configuration.
   */
  build(): DialogConfig {
    return { ...this.config };
  }
}

/**
 * Create a dialog configuration builder.
 */
export function dialogConfig(): DialogConfigBuilder {
  return new DialogConfigBuilder();
}

// ============================================================================
// DialogHeader
// ============================================================================

type DialogHeaderRequestState = {
  layoutId: LayoutId;
  titleSize?: { width: number; height: number };
  descriptionSize?: { width: number; height: number };
  closeIconSize?: { width: number; height: number };
  fontFamily: string;
};

type DialogHeaderPrepaintState = {
  hitTestNode: HitTestNode | null;
  titleBounds?: Bounds;
  descriptionBounds?: Bounds;
  closeButtonBounds?: Bounds;
  closeButtonHitbox?: Hitbox;
  closeIconSize?: { width: number; height: number };
  fontFamily: string;
};

/**
 * Dialog header component with title, description, and optional close button.
 */
export class GladeDialogHeader extends GladeElement<
  DialogHeaderRequestState,
  DialogHeaderPrepaintState
> {
  private titleText: string | null = null;
  private descriptionText: string | null = null;
  private showCloseButton = true;
  private context: DialogContentContext | null = null;
  private onCloseHandler: DialogActionHandler | null = null;

  constructor() {
    super();
  }

  /**
   * Set the title text.
   */
  title(text: string): this {
    this.titleText = text;
    return this;
  }

  /**
   * Set the description text.
   */
  description(text: string): this {
    this.descriptionText = text;
    return this;
  }

  /**
   * Set whether to show the close button.
   */
  showClose(show: boolean): this {
    this.showCloseButton = show;
    return this;
  }

  /**
   * Set close button handler.
   */
  onClose(handler: DialogActionHandler): this {
    this.onCloseHandler = handler;
    return this;
  }

  /**
   * Set the context from parent dialog content.
   */
  setContext(context: DialogContentContext): void {
    this.context = context;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DialogHeaderRequestState> {
    const titleFontSize = DEFAULT_TITLE_FONT_SIZE;
    const descriptionFontSize = DEFAULT_DESCRIPTION_FONT_SIZE;
    const headerGap = DEFAULT_HEADER_GAP;
    const closeButtonSize = 24;
    const closeIconFontSize = 18;
    const fontFamily = cx.getTheme().fonts.sans.name;

    let totalHeight = 0;
    let maxWidth = 0;
    let titleSize: { width: number; height: number } | undefined;
    let descriptionSize: { width: number; height: number } | undefined;
    let closeIconSize: { width: number; height: number } | undefined;

    // Measure close icon if shown
    if (this.showCloseButton) {
      closeIconSize = cx.measureText("×", {
        fontSize: closeIconFontSize,
        fontFamily,
        fontWeight: 400,
      });
    }

    // Measure title if present
    if (this.titleText) {
      titleSize = cx.measureText(this.titleText, {
        fontSize: titleFontSize,
        fontFamily,
        fontWeight: 600,
      });
      maxWidth = Math.max(
        maxWidth,
        titleSize.width + (this.showCloseButton ? closeButtonSize + 16 : 0)
      );
      totalHeight += titleSize.height;
    }

    // Measure description if present
    if (this.descriptionText) {
      if (this.titleText) {
        totalHeight += headerGap;
      }
      descriptionSize = cx.measureText(this.descriptionText, {
        fontSize: descriptionFontSize,
        fontFamily,
        fontWeight: 400,
        maxWidth: DEFAULT_DIALOG_MAX_WIDTH - DEFAULT_DIALOG_PADDING * 2,
      });
      maxWidth = Math.max(maxWidth, descriptionSize.width);
      totalHeight += descriptionSize.height;
    }

    const layoutId = cx.requestLayout(
      {
        width: maxWidth > 0 ? maxWidth : undefined,
        height: totalHeight > 0 ? totalHeight : undefined,
        minHeight: this.showCloseButton ? closeButtonSize : undefined,
      },
      []
    );

    return {
      layoutId,
      requestState: {
        layoutId,
        titleSize,
        descriptionSize,
        closeIconSize,
        fontFamily,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DialogHeaderRequestState
  ): DialogHeaderPrepaintState {
    const headerGap = DEFAULT_HEADER_GAP;
    const closeButtonSize = 24;

    let currentY = bounds.y;
    let titleBounds: Bounds | undefined;
    let descriptionBounds: Bounds | undefined;
    let closeButtonBounds: Bounds | undefined;
    let closeButtonHitbox: Hitbox | undefined;

    // Position title
    if (this.titleText && requestState.titleSize) {
      titleBounds = {
        x: bounds.x,
        y: currentY,
        width: requestState.titleSize.width,
        height: requestState.titleSize.height,
      };
      currentY += requestState.titleSize.height + (this.descriptionText ? headerGap : 0);
    }

    // Position description
    if (this.descriptionText && requestState.descriptionSize) {
      descriptionBounds = {
        x: bounds.x,
        y: currentY,
        width: requestState.descriptionSize.width,
        height: requestState.descriptionSize.height,
      };
    }

    // Position close button
    if (this.showCloseButton) {
      closeButtonBounds = {
        x: bounds.x + bounds.width - closeButtonSize,
        y: bounds.y,
        width: closeButtonSize,
        height: closeButtonSize,
      };
      closeButtonHitbox = cx.insertHitbox(closeButtonBounds, HitboxBehavior.Normal, "pointer");
    }

    return {
      hitTestNode: null,
      titleBounds,
      descriptionBounds,
      closeButtonBounds,
      closeButtonHitbox,
      closeIconSize: requestState.closeIconSize,
      fontFamily: requestState.fontFamily,
    };
  }

  paint(cx: PaintContext, _bounds: Bounds, prepaintState: DialogHeaderPrepaintState): void {
    const context = this.context;
    if (!context) {
      return;
    }
    const titleColor = context.titleColor;
    const descriptionColor = context.descriptionColor;
    const titleFontSize = DEFAULT_TITLE_FONT_SIZE;
    const descriptionFontSize = DEFAULT_DESCRIPTION_FONT_SIZE;
    const fontFamily = prepaintState.fontFamily;

    // Paint title
    if (this.titleText && prepaintState.titleBounds) {
      cx.paintGlyphs(this.titleText, prepaintState.titleBounds, titleColor, {
        fontSize: titleFontSize,
        fontFamily,
        fontWeight: 600,
      });
    }

    // Paint description
    if (this.descriptionText && prepaintState.descriptionBounds) {
      cx.paintGlyphs(this.descriptionText, prepaintState.descriptionBounds, descriptionColor, {
        fontSize: descriptionFontSize,
        fontFamily,
        fontWeight: 400,
        maxWidth: DEFAULT_DIALOG_MAX_WIDTH - DEFAULT_DIALOG_PADDING * 2,
      });
    }

    // Paint close button
    if (this.showCloseButton && prepaintState.closeButtonBounds && prepaintState.closeIconSize) {
      const isHovered = cx.isHovered(prepaintState.closeButtonBounds);

      if (isHovered) {
        cx.paintRect(prepaintState.closeButtonBounds, {
          backgroundColor: { r: 0.25, g: 0.25, b: 0.28, a: 1 },
          borderRadius: 4,
        });
      }

      // Draw X icon centered in the button
      const iconFontSize = 18;
      const iconLineHeight = iconFontSize * 1.2;
      const iconColor = { r: 0.7, g: 0.7, b: 0.7, a: 1 };
      const iconBounds: Bounds = {
        x:
          prepaintState.closeButtonBounds.x +
          (prepaintState.closeButtonBounds.width - prepaintState.closeIconSize.width) / 2,
        y:
          prepaintState.closeButtonBounds.y +
          (prepaintState.closeButtonBounds.height - iconLineHeight) / 2,
        width: prepaintState.closeIconSize.width,
        height: iconLineHeight,
      };
      cx.paintGlyphs("×", iconBounds, iconColor, {
        fontSize: iconFontSize,
        fontFamily,
        fontWeight: 400,
        lineHeight: iconLineHeight,
      });
    }
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================
// DialogFooter
// ============================================================================

type DialogFooterRequestState = {
  layoutId: LayoutId;
  cancelSize?: { width: number; height: number };
  confirmSize?: { width: number; height: number };
  fontFamily: string;
};

type DialogFooterPrepaintState = {
  hitTestNode: HitTestNode | null;
  cancelBounds?: Bounds;
  confirmBounds?: Bounds;
  cancelHitbox?: Hitbox;
  confirmHitbox?: Hitbox;
  cancelTextSize?: { width: number; height: number };
  confirmTextSize?: { width: number; height: number };
  fontFamily: string;
};

/**
 * Dialog footer component with action buttons.
 */
export class GladeDialogFooter extends GladeElement<
  DialogFooterRequestState,
  DialogFooterPrepaintState
> {
  private cancelText: string | null = null;
  private confirmText: string | null = null;
  private destructive = false;
  private onCancelHandler: DialogActionHandler | null = null;
  private onConfirmHandler: DialogActionHandler | null = null;
  private context: DialogContentContext | null = null;

  constructor() {
    super();
  }

  /**
   * Set cancel button text.
   */
  cancel(text: string): this {
    this.cancelText = text;
    return this;
  }

  /**
   * Set confirm button text.
   */
  confirm(text: string): this {
    this.confirmText = text;
    return this;
  }

  /**
   * Set whether confirm button is destructive (red).
   */
  isDestructive(value: boolean): this {
    this.destructive = value;
    return this;
  }

  /**
   * Set cancel button handler.
   */
  onCancel(handler: DialogActionHandler): this {
    this.onCancelHandler = handler;
    return this;
  }

  /**
   * Set confirm button handler.
   */
  onConfirm(handler: DialogActionHandler): this {
    this.onConfirmHandler = handler;
    return this;
  }

  /**
   * Set the context from parent dialog content.
   */
  setContext(context: DialogContentContext): void {
    this.context = context;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DialogFooterRequestState> {
    const fontSize = this.context?.buttonFontSize ?? DEFAULT_BUTTON_FONT_SIZE;
    const paddingX = this.context?.buttonPaddingX ?? DEFAULT_BUTTON_PADDING_X;
    const paddingY = this.context?.buttonPaddingY ?? DEFAULT_BUTTON_PADDING_Y;
    const gap = DEFAULT_FOOTER_GAP;
    const fontFamily = cx.getTheme().fonts.sans.name;

    let totalWidth = 0;
    let maxHeight = 0;
    let cancelSize: { width: number; height: number } | undefined;
    let confirmSize: { width: number; height: number } | undefined;

    // Measure cancel button
    if (this.cancelText) {
      cancelSize = cx.measureText(this.cancelText, {
        fontSize,
        fontFamily,
        fontWeight: 500,
      });
      totalWidth += cancelSize.width + paddingX * 2;
      maxHeight = Math.max(maxHeight, cancelSize.height + paddingY * 2);
    }

    // Measure confirm button
    if (this.confirmText) {
      if (this.cancelText) {
        totalWidth += gap;
      }
      confirmSize = cx.measureText(this.confirmText, {
        fontSize,
        fontFamily,
        fontWeight: 500,
      });
      totalWidth += confirmSize.width + paddingX * 2;
      maxHeight = Math.max(maxHeight, confirmSize.height + paddingY * 2);
    }

    const layoutId = cx.requestLayout(
      {
        width: totalWidth > 0 ? totalWidth : undefined,
        height: maxHeight > 0 ? maxHeight : undefined,
      },
      []
    );

    return {
      layoutId,
      requestState: {
        layoutId,
        cancelSize,
        confirmSize,
        fontFamily,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DialogFooterRequestState
  ): DialogFooterPrepaintState {
    const paddingX = this.context?.buttonPaddingX ?? DEFAULT_BUTTON_PADDING_X;
    const paddingY = this.context?.buttonPaddingY ?? DEFAULT_BUTTON_PADDING_Y;
    const gap = DEFAULT_FOOTER_GAP;

    let cancelBounds: Bounds | undefined;
    let confirmBounds: Bounds | undefined;
    let cancelHitbox: Hitbox | undefined;
    let confirmHitbox: Hitbox | undefined;

    // Position buttons from right to left
    let currentX = bounds.x + bounds.width;

    // Confirm button (rightmost)
    if (this.confirmText && requestState.confirmSize) {
      const buttonWidth = requestState.confirmSize.width + paddingX * 2;
      const buttonHeight = requestState.confirmSize.height + paddingY * 2;
      currentX -= buttonWidth;
      confirmBounds = {
        x: currentX,
        y: bounds.y,
        width: buttonWidth,
        height: buttonHeight,
      };
      confirmHitbox = cx.insertHitbox(confirmBounds, HitboxBehavior.Normal, "pointer");
      currentX -= gap;
    }

    // Cancel button
    if (this.cancelText && requestState.cancelSize) {
      const buttonWidth = requestState.cancelSize.width + paddingX * 2;
      const buttonHeight = requestState.cancelSize.height + paddingY * 2;
      currentX -= buttonWidth;
      cancelBounds = {
        x: currentX,
        y: bounds.y,
        width: buttonWidth,
        height: buttonHeight,
      };
      cancelHitbox = cx.insertHitbox(cancelBounds, HitboxBehavior.Normal, "pointer");
    }

    // Build hit test nodes for buttons
    const childHitTestNodes: HitTestNode[] = [];

    if (cancelBounds && this.onCancelHandler) {
      const handler = this.onCancelHandler;
      childHitTestNodes.push({
        bounds: cancelBounds,
        handlers: {
          click: () => {
            handler();
            return { stopPropagation: true };
          },
        },
        focusHandle: null,
        scrollHandle: null,
        keyContext: null,
        children: [],
      });
    }

    if (confirmBounds && this.onConfirmHandler) {
      const handler = this.onConfirmHandler;
      childHitTestNodes.push({
        bounds: confirmBounds,
        handlers: {
          click: () => {
            handler();
            return { stopPropagation: true };
          },
        },
        focusHandle: null,
        scrollHandle: null,
        keyContext: null,
        children: [],
      });
    }

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: childHitTestNodes,
    };

    return {
      hitTestNode,
      cancelBounds,
      confirmBounds,
      cancelHitbox,
      confirmHitbox,
      cancelTextSize: requestState.cancelSize,
      confirmTextSize: requestState.confirmSize,
      fontFamily: requestState.fontFamily,
    };
  }

  paint(cx: PaintContext, _bounds: Bounds, prepaintState: DialogFooterPrepaintState): void {
    const context = this.context;
    if (!context) {
      return;
    }

    const fontSize = context.buttonFontSize ?? DEFAULT_BUTTON_FONT_SIZE;
    const lineHeight = fontSize * 1.2; // Match the default in paintGlyphs
    const borderRadius = context.buttonBorderRadius ?? DEFAULT_BUTTON_BORDER_RADIUS;

    const buttonBg = context.buttonBg;
    const buttonHoverBg = context.buttonHoverBg;
    const buttonText = context.buttonText;

    const primaryBg = context.primaryButtonBg;
    const primaryHoverBg = context.primaryButtonHoverBg;
    const primaryText = context.primaryButtonText;

    const destructiveBg = context.destructiveButtonBg;
    const destructiveHoverBg = context.destructiveButtonHoverBg;
    const destructiveText = context.destructiveButtonText;
    const fontFamily = prepaintState.fontFamily;

    // Paint cancel button
    if (this.cancelText && prepaintState.cancelBounds && prepaintState.cancelTextSize) {
      const isHovered = cx.isHovered(prepaintState.cancelBounds);
      const bg = isHovered ? buttonHoverBg : buttonBg;

      cx.paintRect(prepaintState.cancelBounds, {
        backgroundColor: bg,
        borderRadius,
      });

      // Center text in button
      // Horizontal: center based on measured text width
      // Vertical: center based on line height (text rendering centers within line height)
      const cancelTextBounds: Bounds = {
        x:
          prepaintState.cancelBounds.x +
          (prepaintState.cancelBounds.width - prepaintState.cancelTextSize.width) / 2,
        y: prepaintState.cancelBounds.y + (prepaintState.cancelBounds.height - lineHeight) / 2,
        width: prepaintState.cancelTextSize.width,
        height: lineHeight,
      };
      cx.paintGlyphs(this.cancelText, cancelTextBounds, buttonText, {
        fontSize,
        fontFamily,
        fontWeight: 500,
        lineHeight,
      });
    }

    // Paint confirm button
    if (this.confirmText && prepaintState.confirmBounds && prepaintState.confirmTextSize) {
      const isHovered = cx.isHovered(prepaintState.confirmBounds);

      let bg: ColorObject;
      let textColor: ColorObject;
      if (this.destructive) {
        bg = isHovered ? destructiveHoverBg : destructiveBg;
        textColor = destructiveText;
      } else {
        bg = isHovered ? primaryHoverBg : primaryBg;
        textColor = primaryText;
      }

      cx.paintRect(prepaintState.confirmBounds, {
        backgroundColor: bg,
        borderRadius,
      });

      // Center text in button
      // Horizontal: center based on measured text width
      // Vertical: center based on line height (text rendering centers within line height)
      const confirmTextBounds: Bounds = {
        x:
          prepaintState.confirmBounds.x +
          (prepaintState.confirmBounds.width - prepaintState.confirmTextSize.width) / 2,
        y: prepaintState.confirmBounds.y + (prepaintState.confirmBounds.height - lineHeight) / 2,
        width: prepaintState.confirmTextSize.width,
        height: lineHeight,
      };
      cx.paintGlyphs(this.confirmText, confirmTextBounds, textColor, {
        fontSize,
        fontFamily,
        fontWeight: 500,
        lineHeight,
      });
    }
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

// ============================================================================
// DialogContent
// ============================================================================

type DialogContentRequestState = {
  layoutId: LayoutId;
  headerLayoutId?: LayoutId;
  headerElementId?: GlobalElementId;
  headerRequestState?: DialogHeaderRequestState;
  bodyLayoutId?: LayoutId;
  bodyElementId?: GlobalElementId;
  bodyRequestState?: unknown;
  footerLayoutId?: LayoutId;
  footerElementId?: GlobalElementId;
  footerRequestState?: DialogFooterRequestState;
};

type DialogContentPrepaintState = {
  hitTestNode: HitTestNode | null;
  headerBounds?: Bounds;
  headerPrepaintState?: DialogHeaderPrepaintState;
  bodyBounds?: Bounds;
  bodyPrepaintState?: unknown;
  footerBounds?: Bounds;
  footerPrepaintState?: DialogFooterPrepaintState;
};

/**
 * Dialog content container that wraps header, body, and footer.
 */
export class GladeDialogContent extends GladeElement<
  DialogContentRequestState,
  DialogContentPrepaintState
> {
  private headerElement: GladeDialogHeader | null = null;

  private bodyElement: AnyGladeElement | null = null;
  private footerElement: GladeDialogFooter | null = null;
  private context: DialogContentContext | null = null;

  constructor() {
    super();
  }

  /**
   * Set the header component.
   */
  header(header: GladeDialogHeader): this {
    this.headerElement = header;
    return this;
  }

  /**
   * Set the body content.
   */

  body(body: AnyGladeElement): this {
    this.bodyElement = body;
    return this;
  }

  /**
   * Set the footer component.
   */
  footer(footer: GladeDialogFooter): this {
    this.footerElement = footer;
    return this;
  }

  /**
   * Set the context from parent dialog.
   */
  setContext(context: DialogContentContext): void {
    this.context = context;
    if (this.headerElement) {
      this.headerElement.setContext(context);
    }
    if (this.footerElement) {
      this.footerElement.setContext(context);
    }
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DialogContentRequestState> {
    const padding = this.context?.dialogPadding ?? DEFAULT_DIALOG_PADDING;
    const contentGap = DEFAULT_CONTENT_GAP;

    const childLayoutIds: LayoutId[] = [];
    let headerLayoutId: LayoutId | undefined;
    let headerElementId: GlobalElementId | undefined;
    let headerRequestState: DialogHeaderRequestState | undefined;
    let bodyLayoutId: LayoutId | undefined;
    let bodyElementId: GlobalElementId | undefined;
    let bodyRequestState: unknown;
    let footerLayoutId: LayoutId | undefined;
    let footerElementId: GlobalElementId | undefined;
    let footerRequestState: DialogFooterRequestState | undefined;

    // Layout header
    if (this.headerElement) {
      headerElementId = cx.allocateChildId();
      const headerCx: RequestLayoutContext = { ...cx, elementId: headerElementId };
      const result = this.headerElement.requestLayout(headerCx);
      headerLayoutId = result.layoutId;
      headerRequestState = result.requestState;
      childLayoutIds.push(headerLayoutId);
    }

    // Layout body
    if (this.bodyElement) {
      bodyElementId = cx.allocateChildId();
      const bodyCx: RequestLayoutContext = { ...cx, elementId: bodyElementId };
      const result = this.bodyElement.requestLayout(bodyCx);
      bodyLayoutId = result.layoutId;
      bodyRequestState = result.requestState;
      childLayoutIds.push(bodyLayoutId);
    }

    // Layout footer
    if (this.footerElement) {
      footerElementId = cx.allocateChildId();
      const footerCx: RequestLayoutContext = { ...cx, elementId: footerElementId };
      const result = this.footerElement.requestLayout(footerCx);
      footerLayoutId = result.layoutId;
      footerRequestState = result.requestState;
      childLayoutIds.push(footerLayoutId);
    }

    const layoutId = cx.requestLayout(
      {
        display: "flex",
        flexDirection: "column",
        paddingTop: padding,
        paddingBottom: padding,
        paddingLeft: padding,
        paddingRight: padding,
        gap: contentGap,
        minWidth: DEFAULT_DIALOG_MIN_WIDTH,
        maxWidth: DEFAULT_DIALOG_MAX_WIDTH,
      },
      childLayoutIds
    );

    return {
      layoutId,
      requestState: {
        layoutId,
        headerLayoutId,
        headerElementId,
        headerRequestState,
        bodyLayoutId,
        bodyElementId,
        bodyRequestState,
        footerLayoutId,
        footerElementId,
        footerRequestState,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DialogContentRequestState
  ): DialogContentPrepaintState {
    const childHitTestNodes: HitTestNode[] = [];
    let headerBounds: Bounds | undefined;
    let headerPrepaintState: DialogHeaderPrepaintState | undefined;
    let bodyBounds: Bounds | undefined;
    let bodyPrepaintState: unknown;
    let footerBounds: Bounds | undefined;
    let footerPrepaintState: DialogFooterPrepaintState | undefined;

    // Prepaint header
    if (
      this.headerElement &&
      requestState.headerLayoutId &&
      requestState.headerElementId &&
      requestState.headerRequestState
    ) {
      headerBounds = cx.getBounds(requestState.headerLayoutId);
      const headerCx = cx.withElementId(requestState.headerElementId);
      headerPrepaintState = this.headerElement.prepaint(
        headerCx,
        headerBounds,
        requestState.headerRequestState
      );
    }

    // Prepaint body
    if (this.bodyElement && requestState.bodyLayoutId && requestState.bodyElementId) {
      bodyBounds = cx.getBounds(requestState.bodyLayoutId);
      const bodyCx = cx.withElementId(requestState.bodyElementId);
      bodyPrepaintState = this.bodyElement.prepaint(
        bodyCx,
        bodyBounds,
        requestState.bodyRequestState
      );
      const bodyHitTest = (bodyPrepaintState as { hitTestNode?: HitTestNode } | undefined)
        ?.hitTestNode;
      if (bodyHitTest) {
        childHitTestNodes.push(bodyHitTest);
      }
    }

    // Prepaint footer
    if (
      this.footerElement &&
      requestState.footerLayoutId &&
      requestState.footerElementId &&
      requestState.footerRequestState
    ) {
      footerBounds = cx.getBounds(requestState.footerLayoutId);
      const footerCx = cx.withElementId(requestState.footerElementId);
      footerPrepaintState = this.footerElement.prepaint(
        footerCx,
        footerBounds,
        requestState.footerRequestState
      );
      // Add footer's hit test node for button clicks
      if (footerPrepaintState?.hitTestNode) {
        childHitTestNodes.push(footerPrepaintState.hitTestNode);
      }
    }

    // Click handler that stops propagation to prevent backdrop dismiss
    const clickHandler: ClickHandler = () => {
      return { stopPropagation: true };
    };

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {
        click: clickHandler,
      },
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: childHitTestNodes,
    };

    return {
      hitTestNode,
      headerBounds,
      headerPrepaintState,
      bodyBounds,
      bodyPrepaintState,
      footerBounds,
      footerPrepaintState,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: DialogContentPrepaintState): void {
    const context = this.context;
    if (!context) {
      return;
    }

    const dialogBg = context.dialogBg;
    const dialogBorder = context.dialogBorder;
    const dialogBorderRadius = context.dialogBorderRadius ?? DEFAULT_DIALOG_BORDER_RADIUS;

    // Paint dialog background
    cx.paintRect(bounds, {
      backgroundColor: dialogBg,
      borderRadius: dialogBorderRadius,
      borderColor: dialogBorder,
      borderWidth: DEFAULT_DIALOG_BORDER_WIDTH,
    });

    // Paint header
    if (this.headerElement && prepaintState.headerBounds && prepaintState.headerPrepaintState) {
      this.headerElement.paint(cx, prepaintState.headerBounds, prepaintState.headerPrepaintState);
    }

    // Paint body
    if (this.bodyElement && prepaintState.bodyBounds) {
      this.bodyElement.paint(cx, prepaintState.bodyBounds, prepaintState.bodyPrepaintState);
    }

    // Paint footer
    if (this.footerElement && prepaintState.footerBounds && prepaintState.footerPrepaintState) {
      this.footerElement.paint(cx, prepaintState.footerBounds, prepaintState.footerPrepaintState);
    }
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };
  }
}

// ============================================================================
// GladeDialog (main wrapper component)
// ============================================================================

type DialogRequestState = {
  dialogLayoutId: LayoutId;
  triggerLayoutId: LayoutId;
  triggerElementId: GlobalElementId;
  triggerRequestState: unknown;
  // Dialog overlay elements (when open)
  dialogContentLayoutId: LayoutId | null;
  dialogContentElementId: GlobalElementId | null;
  dialogContentRequestState: unknown;
  dialogContentElement: GladeElement<unknown, unknown> | null;
  anchoredElement: AnchoredElement | null;
  backdropElement: GladeDiv | null;
  deferredElement: DeferredElement | null;
};

type DialogPrepaintState = {
  triggerElementId: GlobalElementId;
  triggerPrepaintState: unknown;
  triggerBounds: Bounds;
  hitTestNode: HitTestNode | null;
};

let dialogIdCounter = 0;

/**
 * A dialog container that manages open state and renders a trigger.
 * The dialog content is rendered separately via DialogManager.
 */
export class GladeDialog extends GladeContainerElement<DialogRequestState, DialogPrepaintState> {
  private dialogId: string;
  private openValue = false;
  private onOpenChangeHandler: DialogOpenChangeHandler | null = null;

  private triggerElement: AnyGladeElement | null = null;
  private contentBuilder: DialogBuilder | null = null;

  // Config
  private closeOnBackdropClickValue = true;
  private closeOnEscapeValue = true;
  private backdropColorValue: ColorObject | null = null;
  private windowMarginValue = 32;

  // Styling
  private dialogBgColor: ColorObject | null = null;
  private dialogBorderColor: ColorObject | null = null;
  private dialogBorderRadiusValue = DEFAULT_DIALOG_BORDER_RADIUS;
  private dialogPaddingValue = DEFAULT_DIALOG_PADDING;

  constructor() {
    super();
    this.dialogId = `dialog-${++dialogIdCounter}`;
  }

  /**
   * Set whether dialog is open.
   */
  open(value: boolean): this {
    this.openValue = value;
    return this;
  }

  /**
   * Set handler for open state changes.
   */
  onOpenChange(handler: DialogOpenChangeHandler): this {
    this.onOpenChangeHandler = handler;
    return this;
  }

  /**
   * Set the trigger element that opens the dialog.
   */

  trigger(element: AnyGladeElement): this {
    this.triggerElement = element;
    return this;
  }

  /**
   * Set the dialog content builder.
   */
  content(builder: DialogBuilder | GladeDialogContent): this {
    if (typeof builder === "function") {
      this.contentBuilder = builder;
    } else {
      this.contentBuilder = () => builder;
    }
    return this;
  }

  /**
   * Set whether clicking backdrop closes the dialog.
   */
  closeOnBackdropClick(value: boolean): this {
    this.closeOnBackdropClickValue = value;
    return this;
  }

  /**
   * Set whether pressing Escape closes the dialog.
   */
  closeOnEscape(value: boolean): this {
    this.closeOnEscapeValue = value;
    return this;
  }

  /**
   * Set backdrop color.
   */
  backdropColor(color: Color): this {
    this.backdropColorValue = toColorObject(color);
    return this;
  }

  /**
   * Set dialog background color.
   */
  dialogBg(color: Color): this {
    this.dialogBgColor = toColorObject(color);
    return this;
  }

  /**
   * Set dialog border color.
   */
  dialogBorder(color: Color): this {
    this.dialogBorderColor = toColorObject(color);
    return this;
  }

  /**
   * Set dialog border radius.
   */
  dialogBorderRadius(radius: number): this {
    this.dialogBorderRadiusValue = radius;
    return this;
  }

  /**
   * Set dialog padding.
   */
  dialogPadding(padding: number): this {
    this.dialogPaddingValue = padding;
    return this;
  }

  private buildContentContext(theme: Theme): DialogContentContext {
    const dialog = theme.components.dialog;
    return {
      onOpenChange: this.onOpenChangeHandler,
      dialogBg: this.dialogBgColor ?? dialog.background,
      dialogBorder: this.dialogBorderColor ?? dialog.border,
      dialogBorderRadius: this.dialogBorderRadiusValue,
      dialogPadding: this.dialogPaddingValue,
      titleColor: dialog.title.foreground,
      descriptionColor: dialog.description.foreground,
      separatorColor: dialog.separator,
      buttonBg: dialog.button.background,
      buttonHoverBg: dialog.button.hover.background,
      buttonText: dialog.button.foreground,
      primaryButtonBg: dialog.primaryButton.background,
      primaryButtonHoverBg: dialog.primaryButton.hover.background,
      primaryButtonText: dialog.primaryButton.foreground,
      destructiveButtonBg: dialog.destructiveButton.background,
      destructiveButtonHoverBg: dialog.destructiveButton.hover.background,
      destructiveButtonText: dialog.destructiveButton.foreground,
      buttonFontSize: DEFAULT_BUTTON_FONT_SIZE,
      buttonPaddingX: DEFAULT_BUTTON_PADDING_X,
      buttonPaddingY: DEFAULT_BUTTON_PADDING_Y,
      buttonBorderRadius: DEFAULT_BUTTON_BORDER_RADIUS,
    };
  }

  private buildDialogConfig(theme: Theme): DialogConfig {
    const dialog = theme.components.dialog;
    return {
      closeOnBackdropClick: this.closeOnBackdropClickValue,
      closeOnEscape: this.closeOnEscapeValue,
      backdropColor: this.backdropColorValue ?? dialog.backdrop,
      windowMargin: this.windowMarginValue,
    };
  }

  /**
   * Build the dialog overlay element structure.
   * Creates: deferred(backdrop with centered anchored content)
   */
  private buildDialogOverlay(theme: Theme): {
    deferred: DeferredElement;
    anchored: AnchoredElement;
    backdrop: GladeDiv;
    content: GladeElement<unknown, unknown>;
  } {
    const config = this.buildDialogConfig(theme);
    const contentContext = this.buildContentContext(theme);
    const onOpenChange = this.onOpenChangeHandler;

    // Build the content - pass null for GladeContext since we're in layout phase
    // Most dialog content doesn't need GladeContext; if it does, user should
    // build it before passing to dialog().content()
    const content = this.contentBuilder!(null as unknown as GladeContext);
    if (content instanceof GladeDialogContent) {
      content.setContext(contentContext);
    }

    // Create anchored element for centering
    const anchoredContent = anchored().centerInWindow().child(content);

    // Create backdrop click handler
    const backdropClickHandler: ClickHandler = () => {
      if (config.closeOnBackdropClick && onOpenChange) {
        onOpenChange(false);
      }
      return { stopPropagation: true };
    };

    // Create escape key handler
    const escapeKeyHandler: KeyHandler = (event) => {
      if (config.closeOnEscape && event.key === "Escape" && onOpenChange) {
        onOpenChange(false);
        return { stopPropagation: true };
      }
      return { stopPropagation: false };
    };

    // Create backdrop with centered content
    const backdrop = div()
      .absolute()
      .inset(0)
      .bg(config.backdropColor)
      .flex()
      .itemsCenter()
      .justifyCenter()
      .occludeMouse()
      .onClick(backdropClickHandler)
      .onKeyDown(escapeKeyHandler)
      .child(anchoredContent);

    // Wrap in deferred with priority 2 (dialogs)
    const deferredDialog = deferred(backdrop).priority(2);

    return {
      deferred: deferredDialog,
      anchored: anchoredContent,
      backdrop,
      content,
    };
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DialogRequestState> {
    const theme = cx.getTheme();

    // Build dialog overlay if open
    let dialogContentLayoutId: LayoutId | null = null;
    let dialogContentElementId: GlobalElementId | null = null;
    let dialogContentRequestState: unknown = null;
    let dialogContentElement: GladeElement<unknown, unknown> | null = null;
    let anchoredElement: AnchoredElement | null = null;
    let backdropElement: GladeDiv | null = null;
    let deferredElement: DeferredElement | null = null;

    if (this.openValue && this.contentBuilder) {
      const overlay = this.buildDialogOverlay(theme);
      deferredElement = overlay.deferred;
      anchoredElement = overlay.anchored;
      backdropElement = overlay.backdrop;
      dialogContentElement = overlay.content;

      // Layout the deferred element (which contains backdrop -> anchored -> content)
      dialogContentElementId = cx.allocateChildId();
      const dialogCx: RequestLayoutContext = { ...cx, elementId: dialogContentElementId };
      const dialogResult = deferredElement.requestLayout(dialogCx);
      dialogContentLayoutId = dialogResult.layoutId;
      dialogContentRequestState = dialogResult.requestState;
    }

    if (!this.triggerElement) {
      const layoutId = cx.requestLayout({ width: 0, height: 0 }, []);
      return {
        layoutId,
        requestState: {
          dialogLayoutId: layoutId,
          triggerLayoutId: layoutId,
          triggerElementId: cx.elementId,
          triggerRequestState: undefined,
          dialogContentLayoutId,
          dialogContentElementId,
          dialogContentRequestState,
          dialogContentElement,
          anchoredElement,
          backdropElement,
          deferredElement,
        },
      };
    }

    const triggerElementId = cx.allocateChildId();
    const triggerCx: RequestLayoutContext = { ...cx, elementId: triggerElementId };
    const triggerResult = this.triggerElement.requestLayout(triggerCx);

    const layoutId = cx.requestLayout(
      {
        display: "flex",
        flexDirection: "column",
      },
      [triggerResult.layoutId]
    );

    return {
      layoutId,
      requestState: {
        dialogLayoutId: layoutId,
        triggerLayoutId: triggerResult.layoutId,
        triggerElementId,
        triggerRequestState: triggerResult.requestState,
        dialogContentLayoutId,
        dialogContentElementId,
        dialogContentRequestState,
        dialogContentElement,
        anchoredElement,
        backdropElement,
        deferredElement,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DialogRequestState
  ): DialogPrepaintState {
    const {
      dialogLayoutId,
      triggerLayoutId,
      triggerElementId,
      triggerRequestState,
      dialogContentLayoutId,
      dialogContentElementId,
      dialogContentRequestState,
      anchoredElement,
      backdropElement,
      deferredElement,
    } = requestState;

    // Get trigger bounds and adjust for scroll offset.
    // The parent passes scroll-adjusted bounds for the dialog wrapper.
    // We need to apply the same scroll adjustment to the trigger.
    const dialogLayoutBounds = cx.getBounds(dialogLayoutId);
    const triggerLayoutBounds = cx.getBounds(triggerLayoutId);

    // The trigger's position relative to the dialog wrapper (in layout space)
    const relativeX = triggerLayoutBounds.x - dialogLayoutBounds.x;
    const relativeY = triggerLayoutBounds.y - dialogLayoutBounds.y;

    // Apply scroll adjustment: use the scroll-adjusted dialog bounds as base
    const triggerBounds: Bounds = {
      x: bounds.x + relativeX,
      y: bounds.y + relativeY,
      width: triggerLayoutBounds.width,
      height: triggerLayoutBounds.height,
    };

    // Prepaint trigger
    let triggerPrepaintState: unknown;
    let triggerHitTestNode: HitTestNode | null = null;

    if (this.triggerElement) {
      const triggerCx = cx.withElementId(triggerElementId);
      triggerPrepaintState = this.triggerElement.prepaint(
        triggerCx,
        triggerBounds,
        triggerRequestState
      );
      triggerHitTestNode =
        (triggerPrepaintState as { hitTestNode?: HitTestNode } | undefined)?.hitTestNode ?? null;
    }

    // Create hitbox for trigger click handling
    const onOpenChange = this.onOpenChangeHandler;
    const currentOpen = this.openValue;

    const triggerClickHandler: ClickHandler = () => {
      if (onOpenChange) {
        onOpenChange(!currentOpen);
      }
    };

    cx.insertHitbox(triggerBounds, HitboxBehavior.Normal, "pointer");

    // Wrap trigger hit test to add click handler
    const wrappedTriggerHitTest: HitTestNode = {
      bounds: triggerBounds,
      handlers: {
        click: triggerClickHandler,
      },
      focusHandle: triggerHitTestNode?.focusHandle ?? null,
      scrollHandle: triggerHitTestNode?.scrollHandle ?? null,
      keyContext: triggerHitTestNode?.keyContext ?? null,
      children: triggerHitTestNode?.children ?? [],
    };

    // Prepaint dialog overlay if open
    // This registers the deferred draw entry which will paint after normal elements
    if (
      deferredElement &&
      anchoredElement &&
      backdropElement &&
      dialogContentLayoutId !== null &&
      dialogContentElementId !== null &&
      cx.getWindowSize
    ) {
      // Set window size on the backdrop so it covers the full window
      const windowSize = cx.getWindowSize();
      backdropElement.w(windowSize.width).h(windowSize.height);

      // Set window size on the anchored element for centering
      anchoredElement.setWindowSize(windowSize);

      // Prepaint the deferred element - this registers it in the deferred draw queue
      const dialogBounds = cx.getBounds(dialogContentLayoutId);
      const dialogCx = cx.withElementId(dialogContentElementId);
      deferredElement.prepaint(
        dialogCx,
        dialogBounds,
        dialogContentRequestState as Parameters<typeof deferredElement.prepaint>[2]
      );
    }

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [wrappedTriggerHitTest],
    };

    return {
      triggerElementId,
      triggerPrepaintState,
      triggerBounds,
      hitTestNode,
    };
  }

  paint(cx: PaintContext, _bounds: Bounds, prepaintState: DialogPrepaintState): void {
    const { triggerElementId, triggerPrepaintState, triggerBounds } = prepaintState;

    // Paint trigger only - dialog is painted by DialogManager in deferred pass
    if (this.triggerElement) {
      const triggerCx = cx.withElementId(triggerElementId);
      this.triggerElement.paint(triggerCx, triggerBounds, triggerPrepaintState);
    }
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new dialog wrapper.
 *
 * @example
 * dialog()
 *   .open(isOpen)
 *   .onOpenChange((open) => { isOpen = open; cx.notify(); })
 *   .trigger(button)
 *   .content(
 *     dialogContent()
 *       .header(dialogHeader().title("Confirm Action"))
 *       .body(div().child(text("Are you sure?")))
 *       .footer(dialogFooter().cancel("Cancel").confirm("OK"))
 *   )
 */
export function dialog(): GladeDialog {
  return new GladeDialog();
}

/**
 * Create dialog content container.
 */
export function dialogContent(): GladeDialogContent {
  return new GladeDialogContent();
}

/**
 * Create dialog header.
 */
export function dialogHeader(): GladeDialogHeader {
  return new GladeDialogHeader();
}

/**
 * Create dialog footer.
 */
export function dialogFooter(): GladeDialogFooter {
  return new GladeDialogFooter();
}
