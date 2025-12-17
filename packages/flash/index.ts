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
  ScrollHandleId,
  Point,
  Size,
  Bounds,
  Color,
  FlashTask,
  ContentMask,
  TransformationMatrix,
  ScrollOffset,
  ScrollState,
} from "./types.ts";

export {
  rgb,
  rgba,
  color,
  boundsContains,
  boundsIntersect,
  boundsIsEmpty,
  IDENTITY_TRANSFORM,
  translateTransform,
  scaleTransform,
  rotateTransform,
  multiplyTransform,
  transformPoint,
  rotateAroundTransform,
  scaleAroundTransform,
  createScrollState,
  clampScrollOffset,
  isScrollable,
} from "./types.ts";

// Layout engine
export type { LayoutId, AvailableSpace, AvailableSpaceValue } from "./layout.ts";

export { FlashLayoutEngine, definite, minContent, maxContent } from "./layout.ts";

// Entity system
export {
  FlashHandle,
  FlashViewHandle,
  FocusHandle,
  ScrollHandle,
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
  BorderStyle,
} from "./styles.ts";

export {
  StyleBuilder,
  SHADOW_DEFINITIONS,
  overflowAllowsScroll,
  overflowClipsContent,
} from "./styles.ts";

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
  ElementDebugMeta,
} from "./element.ts";

export {
  FlashElement,
  FlashContainerElement,
  FlashTextElement,
  FlashImageElement,
  text,
  img,
} from "./element.ts";
export {
  canvas,
  CanvasElement,
  type CanvasPrepaint,
  type CanvasPaint,
  type CanvasOptionsWithPrepaint,
  type CanvasOptionsWithoutPrepaint,
} from "./canvas.ts";

// Div element
export { FlashDiv, div } from "./div.ts";

// Scene and GPU primitives
export type {
  RectPrimitive,
  ShadowPrimitive,
  GlyphPrimitive,
  TextPrimitive,
  ImagePrimitive,
  PathPrimitive,
  PathVertex,
  UnderlinePrimitive,
  UnderlineStyle,
  SceneLayer,
  DrawOrder,
} from "./scene.ts";

export { FlashScene } from "./scene.ts";

// Spatial indexing
export { BoundsTree } from "./bounds_tree.ts";

// Text system
export type {
  GlyphCacheKey,
  CachedGlyph,
  TextRun,
  ShapedText,
  GlyphInstance,
  GlyphAtlasConfig,
} from "./text.ts";

export { GlyphAtlas, TextSystem, TextPipeline } from "./text.ts";

// Text input state helpers
export type {
  SelectionRange,
  CompositionRange,
  TextInputSnapshot,
  TextInputHistory,
  TextInputState,
  TextInputStateInit,
  TextHitTestResult,
  SelectionBehavior,
  SelectionAnchor,
  PointerSelectionSession,
  TextSelectionRect,
} from "./text.ts";
export {
  createTextInputState,
  captureSnapshot,
  pushHistory,
  undo,
  redo,
  restoreSnapshot,
  setSelection,
  setComposition,
  setFocused,
  setPreferredCaretX,
  normalizeSelection,
  applyHitTestSelection,
  selectWordAtHit,
  selectLineAtHit,
  beginSelection,
  updateSelectionWithAnchor,
  startPointerSelection,
  updatePointerSelection,
  computeRangeRects,
  computeSelectionRects,
  computeCompositionRects,
  computeCaretRect,
  caretPrimitive,
  selectionPrimitives,
  compositionUnderlines,
} from "./text.ts";
export { renderTextDecorations } from "./text_input_render.ts";

// Event dispatch
export type {
  FlashMouseEvent,
  FlashClickEvent,
  FlashKeyEvent,
  FlashScrollEvent,
  FlashTextInputEvent,
  Modifiers,
  EventResult,
  MouseHandler,
  ClickHandler,
  KeyHandler,
  TextInputHandler,
  ScrollHandler,
  EventHandlers,
  HitTestNode,
} from "./dispatch.ts";

export {
  hitTest,
  dispatchMouseEvent,
  dispatchClickEvent,
  dispatchKeyEvent,
  dispatchScrollEvent,
  buildKeyContextChain,
  getFocusedPath,
} from "./dispatch.ts";

// Hitbox system
export type { Hitbox, HitboxId, HitTest, HitboxFrame } from "./hitbox.ts";

export {
  HitboxBehavior,
  createHitboxFrame,
  createHitTest,
  insertHitbox,
  performHitTest,
  isHitboxHovered,
  shouldHitboxHandleScroll,
  GroupHitboxes,
} from "./hitbox.ts";

// Window
export type {
  WindowOptions,
  FlashPlatform,
  FlashRenderTarget,
  DecodedImageData,
} from "./window.ts";

export { FlashWindow } from "./window.ts";

// App
export type { FlashAppOptions } from "./app.ts";

export { FlashApp } from "./app.ts";

// Mouse utilities
export { MouseState, coreModsToFlashMods } from "./mouse.ts";

// Drag and drop
export type {
  DragId,
  DragHandler,
  DropHandler,
  CanDropPredicate,
  DragPayload,
  ActiveDrag,
  DropTarget,
} from "./drag.ts";

export { DragTracker, dragPayload, dragPayloadWithPreview } from "./drag.ts";

// Tooltip system
export type {
  TooltipPosition,
  TooltipConfig,
  TooltipBuilder,
  TooltipRegistration,
  ActiveTooltip,
} from "./tooltip.ts";

export {
  TooltipManager,
  TooltipConfigBuilder,
  tooltipConfig,
  DEFAULT_TOOLTIP_CONFIG,
} from "./tooltip.ts";

// Keyboard utilities
export type { Keystroke } from "./keyboard.ts";

export { Key, parseKeystroke, matchesKeystroke, formatKeystroke } from "./keyboard.ts";

// Focus management
export { FocusStack, FocusNavigator, FocusContextStack } from "./focus.ts";

// Tab stops and navigation
export type { TabStopConfig, TabStop } from "./tab_stop.ts";

export { TabStopRegistry, FocusContextManager, FocusRestoration } from "./tab_stop.ts";

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

// Path rendering
export type { PathCommand, TessellatedPath } from "./path.ts";

export { PathBuilder, PathPipeline, path } from "./path.ts";

// Underline rendering
export { UnderlinePipeline } from "./underline.ts";

// Image rendering
export type { ImageId, DecodedImage, ImageTile, ImageInstance, ImageAtlasConfig } from "./image.ts";

export { ImageAtlas, ImagePipeline } from "./image.ts";

// Buffer utilities
export {
  DynamicBuffer,
  BufferPool,
  StagingBuffer,
  UniformBufferManager,
  BufferFactory,
} from "./buffers.ts";

// Inspector/Debug Mode
export type { ElementDebugInfo, InspectorState } from "./inspector.ts";

export { Inspector, INSPECTOR_COLORS, createInspector, createInspectorState } from "./inspector.ts";

// Virtual scrolling - UniformList (fixed height)
export type {
  ScrollToStrategy,
  UniformListItemProps,
  UniformListRenderItem,
} from "./uniform_list.ts";

export { UniformList, uniformList } from "./uniform_list.ts";

// Virtual scrolling - List (variable height)
export type {
  ListAlignment,
  ListOffset,
  ListScrollEvent,
  ListItemProps,
  ListRenderItem,
} from "./list.ts";

export { List, ListState, list, createListState, type ListMeasureItem } from "./list.ts";

// Deferred element (overlay/popup support)
export type { DeferredDrawEntry } from "./deferred.ts";

export { DeferredElement, deferred } from "./deferred.ts";

// Anchored element (positioned overlays)
export type { Corner, AnchoredPositionMode, AnchoredFitMode, Edges } from "./anchored.ts";

export { AnchoredElement, anchored, edges } from "./anchored.ts";

// SVG rendering
export type { SvgPathCommand, ParsedSvgPath, ParsedSvg, TessellatedMesh } from "./svg.ts";

export { SvgElement, svg, parseSvg, SvgIcons, clearSvgCache } from "./svg.ts";
