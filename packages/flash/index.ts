/**
 * Flash - A GPU-accelerated UI framework for TypeScript.
 *
 * Inspired by Zed's GPUI, Flash provides:
 * - Centralized state ownership with handle-based access
 * - Effect queue for deferred updates
 * - Declarative UI with Tailwind-like styling API
 * - GPU-native rendering via WebGPU
 * - Cross-platform support (browser and native)
 *
 * @module @glade/flash
 */

// Core types
export type {
  EntityId,
  WindowId,
  FocusId,
  Point,
  Size,
  Bounds,
  Color,
  FlashTask,
  ContentMask,
} from "./types.ts";

export { rgb, rgba, color, boundsContains, boundsIntersect, boundsIsEmpty } from "./types.ts";

// Layout engine
export type { LayoutId, AvailableSpace, AvailableSpaceValue } from "./layout.ts";

export { FlashLayoutEngine, definite, minContent, maxContent } from "./layout.ts";

// Entity system
export {
  FlashHandle,
  FlashViewHandle,
  FocusHandle,
  ObserverHandle,
  SubscriberHandle,
} from "./entity.ts";

export type { EntityMeta, ObserverCallback, SubscriberCallback } from "./entity.ts";

// Context system
export type {
  FlashEffect,
  FlashReadContext,
  FlashContext,
  FlashEntityContext,
  FlashViewContext,
  FlashWindowContext,
} from "./context.ts";

// Styles
export type {
  Styles,
  Display,
  FlexDirection,
  FlexWrap,
  AlignItems,
  JustifyContent,
  AlignSelf,
  Position,
  Overflow,
  TextAlign,
  Cursor,
  ShadowPreset,
} from "./styles.ts";

export { StyleBuilder, SHADOW_DEFINITIONS } from "./styles.ts";

// Elements
export type {
  FlashView,
  FlashRenderOnce,
  RequestLayoutContext,
  PrepaintContext,
  PaintContext,
  GlobalElementId,
  DispatchNodeId,
  NoState,
  RequestLayoutResult,
} from "./element.ts";

export { FlashElement, FlashContainerElement, FlashTextElement, text } from "./element.ts";

// Div element
export { FlashDiv, div } from "./div.ts";

// Scene and GPU primitives
export type {
  RectPrimitive,
  ShadowPrimitive,
  GlyphPrimitive,
  ImagePrimitive,
  SceneLayer,
} from "./scene.ts";

export { FlashScene } from "./scene.ts";

// Event dispatch
export type {
  FlashMouseEvent,
  FlashClickEvent,
  FlashKeyEvent,
  FlashScrollEvent,
  Modifiers,
  EventResult,
  MouseHandler,
  ClickHandler,
  KeyHandler,
  ScrollHandler,
  EventHandlers,
  HitTestNode,
} from "./dispatch.ts";

export { hitTest, dispatchMouseEvent, dispatchClickEvent, dispatchKeyEvent } from "./dispatch.ts";

// Window
export type { WindowOptions, FlashPlatform, FlashRenderTarget } from "./window.ts";

export { FlashWindow } from "./window.ts";

// App
export type { FlashAppOptions } from "./app.ts";

export { FlashApp } from "./app.ts";

// Mouse utilities
export type { MouseState, DragTracker } from "./mouse.ts";

export { coreModsToFlashMods } from "./mouse.ts";

// Keyboard utilities
export type { Keystroke } from "./keyboard.ts";

export { Key, parseKeystroke, matchesKeystroke, formatKeystroke } from "./keyboard.ts";

// Focus management
export { FocusStack, FocusNavigator, FocusContextStack } from "./focus.ts";

// Action system
export type { Action, KeyBinding } from "./actions.ts";

export {
  ActionRegistry,
  Keymap,
  KeyDispatcher,
  BuiltinActions,
  createDefaultKeymap,
} from "./actions.ts";

// Renderer
export type { RendererConfig } from "./renderer.ts";

export { FlashRenderer, PREMULTIPLIED_ALPHA_BLEND, STANDARD_ALPHA_BLEND } from "./renderer.ts";

// Pipelines
export { RectPipeline } from "./rect.ts";

export { ShadowPipeline } from "./shadow.ts";

// Buffer utilities
export {
  DynamicBuffer,
  BufferPool,
  StagingBuffer,
  UniformBufferManager,
  BufferFactory,
} from "./buffers.ts";
