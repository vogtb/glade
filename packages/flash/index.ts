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

export type { Theme, ThemeConfig, ThemeOverrides } from "./theme.ts";
export {
  resolveTheme,
  ThemeManager,
  menuColors,
  inputColors,
  checkboxColors,
  radioColors,
  switchColors,
  linkColors,
  tabColors,
} from "./theme.ts";

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

// Scrollbar
export type {
  ScrollbarConfig,
  ScrollbarDragState,
  ScrollbarVisibility,
  ThumbMetrics,
} from "./scrollbar.ts";

export {
  DEFAULT_SCROLLBAR_CONFIG,
  calculateThumbMetrics,
  calculateVerticalTrackBounds,
  calculateHorizontalTrackBounds,
  calculateThumbBounds,
  thumbPositionToScrollOffset,
  trackClickToScrollOffset,
  calculateDragScrollOffset,
  isPointInThumb,
  getThumbColor,
} from "./scrollbar.ts";

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

// Divider element
export { FlashDivider, divider } from "./divider.ts";

// Monospace text helpers
export type { MonoVariant } from "./mono.ts";
export { MonoElement, mono, code, pre } from "./mono.ts";

// Text input element
export {
  FlashTextInput,
  textInput,
  TEXT_INPUT_CONTEXT,
  TextInputController,
  renderTextDecorations,
} from "./input.ts";

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
  valueWithComposition,
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
  hitTestText,
  caretPrimitive,
  selectionPrimitives,
  compositionUnderlines,
} from "./text.ts";

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

// Popover system
export type {
  PopoverSide,
  PopoverAlign,
  PopoverConfig,
  PopoverBuilder,
  PopoverRegistration,
  ActivePopover,
} from "./popover.ts";

export {
  PopoverManager,
  PopoverConfigBuilder,
  popoverConfig,
  DEFAULT_POPOVER_CONFIG,
} from "./popover.ts";

// Dialog system
export type {
  DialogOpenChangeHandler,
  DialogActionHandler,
  DialogConfig,
  DialogBuilder,
  DialogRegistration,
  ActiveDialog,
  DialogContentContext,
} from "./dialog.ts";

export {
  DialogManager,
  DialogConfigBuilder,
  dialogConfig,
  DEFAULT_DIALOG_CONFIG,
  FlashDialogHeader,
  FlashDialogFooter,
  FlashDialogContent,
  FlashDialog,
  dialog,
  dialogContent,
  dialogHeader,
  dialogFooter,
} from "./dialog.ts";

// Keyboard utilities
export type { Keystroke } from "./keyboard.ts";

export { Key, parseKeystroke, matchesKeystroke, formatKeystroke } from "./keyboard.ts";

// Focus management
export { FocusStack, FocusNavigator, FocusContextStack } from "./focus.ts";

// Tab stops and navigation
export type { TabStopConfig, TabStop } from "./tab.ts";

export { TabStopRegistry, FocusContextManager, FocusRestoration } from "./tab.ts";

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

// WebGPU Host rendering
export type { RenderTexture, WebGPUHost, WebGPUHostInput } from "./host.ts";

export { createRenderTexture, HostTexturePipeline, WebGPUHostElement, webgpuHost } from "./host.ts";

export type { HostTexturePrimitive } from "./scene.ts";

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

// Table elements
export {
  FlashTable,
  FlashTableSection,
  FlashTableRow,
  FlashTableCell,
  table,
  thead,
  tbody,
  tfoot,
  tr,
  th,
  td,
} from "./table.ts";

// Deferred element (overlay/popup support)
export type { DeferredDrawEntry } from "./deferred.ts";

export { DeferredElement, deferred } from "./deferred.ts";

// Anchored element (positioned overlays)
export type { Corner, AnchoredPositionMode, AnchoredFitMode, Edges } from "./anchored.ts";

export { AnchoredElement, anchored, edges } from "./anchored.ts";

// SVG rendering
export type { SvgPathCommand, ParsedSvgPath, ParsedSvg, TessellatedMesh } from "./svg.ts";

export { SvgElement, svg, parseSvg, SvgIcons, clearSvgCache } from "./svg.ts";

// Icon element
export type { IconName } from "./icon.ts";

export { FlashIcon, icon } from "./icon.ts";

// Link element
export { FlashLink, link } from "./link.ts";

// Checkbox element
export type { CheckedState, CheckedChangeHandler } from "./checkbox.ts";
export { FlashCheckbox, checkbox } from "./checkbox.ts";

// Radio group elements
export type { RadioValueChangeHandler } from "./radio.ts";
export { FlashRadioGroup, FlashRadioGroupItem, radioGroup, radioItem } from "./radio.ts";

// Switch element
export type { SwitchChangeHandler } from "./switch.ts";
export { FlashSwitch, switchToggle, toggle } from "./switch.ts";

// Tabs elements
export type { TabValueChangeHandler } from "./tabs.ts";
export { FlashTabs, FlashTab, tabs, tab } from "./tabs.ts";

// Dropdown menu elements
export type {
  DropdownOpenChangeHandler,
  DropdownSelectHandler,
  DropdownCheckedChangeHandler,
  DropdownValueChangeHandler,
  DropdownSide,
  DropdownAlign,
  DropdownMenuContentPrepaintState,
  DropdownMenuContentRequestState,
  DropdownMenuContext,
  DropdownMenuState,
  MenuItemElement,
} from "./dropdown.ts";
export {
  FlashDropdown,
  FlashDropdownItem,
  FlashDropdownSeparator,
  FlashDropdownLabel,
  FlashDropdownCheckbox,
  FlashDropdownRadio,
  FlashDropdownRadioGroup,
  FlashDropdownSub,
  FlashDropdownMenuContent,
  dropdown,
  dropdownItem,
  dropdownSeparator,
  dropdownLabel,
  dropdownCheckbox,
  dropdownRadio,
  dropdownRadioGroup,
  dropdownSub,
} from "./dropdown.ts";

// Right click (context) menu elements
export {
  FlashRightClickMenu,
  rightClickMenu,
  rightClickItem,
  rightClickSeparator,
  rightClickLabel,
  rightClickCheckbox,
  rightClickRadio,
  rightClickRadioGroup,
  rightClickSub,
} from "./right_click.ts";

// Ideal text editor system
export type {
  DocumentOffset,
  DocumentPosition,
  VisualPoint,
  PositionedGlyph,
  TextLine,
  TextDocument,
  TextSelection,
  CompositionState,
  SelectionMode,
  SelectionGesture,
  HitTestResult,
  TextRect,
} from "./editor.ts";

export {
  offset,
  createSelection,
  collapseToFocus,
  collapseToAnchor,
  collapseToStart,
  collapseToEnd,
  extendTo,
  selectAll as selectAllText,
  prevGrapheme,
  nextGrapheme,
  wordBoundaryLeft,
  wordBoundaryRight,
  wordStart,
  wordEnd,
  createTextDocument,
  lineAtOffset,
  lineAtY,
  offsetToPosition,
  positionToOffset,
  offsetToPoint,
  pointToOffset,
  selectionRects,
  caretRect,
  TextEditor,
} from "./editor.ts";
