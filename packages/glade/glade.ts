/**
 * Glade - A GPU-accelerated UI framework for TypeScript.
 *
 * Inspired by Zed's GPUI, Glade provides:
 * - Centralized state ownership with handle-based access
 * - Effect queue for deferred updates
 * - Declarative UI with Tailwind-like styling API
 * - GPU-native rendering via WebGPU
 * - Cross-platform support (browser and native)
 *
 * TODO: organize these exports
 *
 * @module @glade/glade
 */

// Core types
export type { Theme, ThemeFonts } from "./theme";
export { createDefaultTheme, DEFAULT_THEME_FONTS, resolveTheme, ThemeManager } from "./theme";
export type {
  Bounds,
  ContentMask,
  EntityId,
  FocusId,
  GladeTask,
  Point,
  ScrollHandleId,
  ScrollOffset,
  ScrollState,
  Size,
  TransformationMatrix,
  WindowId,
} from "./types";
export {
  boundsContains,
  boundsIntersect,
  boundsIsEmpty,
  clampScrollOffset,
  createScrollState,
  IDENTITY_TRANSFORM,
  isScrollable,
  multiplyTransform,
  rotateAroundTransform,
  rotateTransform,
  scaleAroundTransform,
  scaleTransform,
  transformPoint,
  translateTransform,
} from "./types";

// Layout engine
export type { AvailableSpace, AvailableSpaceValue, LayoutId } from "./layout";
export { definite, GladeLayoutEngine, maxContent, minContent } from "./layout";

// Entity system
export type { EntityMeta, ObserverCallback, SubscriberCallback } from "./entity";
export {
  FocusHandle,
  GladeHandle,
  GladeViewHandle,
  ObserverHandle,
  ScrollHandle,
  SubscriberHandle,
} from "./entity";

// Context system
export type {
  GladeContext,
  GladeEffect,
  GladeEntityContext,
  GladeReadContext,
  GladeViewContext,
  GladeWindowContext,
} from "./context";

// Styles
export type {
  AlignItems,
  AlignSelf,
  BorderStyle,
  CursorStyle,
  Display,
  FlexDirection,
  FlexWrap,
  JustifyContent,
  ObjectFit,
  Overflow,
  Position,
  ShadowPreset,
  Styles,
  TextAlign,
} from "./styles";
export {
  overflowAllowsScroll,
  overflowClipsContent,
  SHADOW_DEFINITIONS,
  StyleBuilder,
} from "./styles";

// Scrollbar
export type {
  ScrollbarConfig,
  ScrollbarDragState,
  ScrollbarVisibility,
  ThumbMetrics,
} from "./scrollbar";
export {
  calculateDragScrollOffset,
  calculateHorizontalTrackBounds,
  calculateThumbBounds,
  calculateThumbMetrics,
  calculateVerticalTrackBounds,
  DEFAULT_SCROLLBAR_CONFIG,
  getThumbColor,
  isPointInThumb,
  thumbPositionToScrollOffset,
  trackClickToScrollOffset,
} from "./scrollbar";

// Elements
export {
  canvas,
  CanvasElement,
  type CanvasOptionsWithoutPrepaint,
  type CanvasOptionsWithPrepaint,
  type CanvasPaint,
  type CanvasPrepaint,
} from "./canvas";
export type {
  DispatchNodeId,
  ElementDebugMeta,
  GladeRenderOnce,
  GladeView,
  GlobalElementId,
  NoState,
  PaintContext,
  PrepaintContext,
  RequestLayoutContext,
  RequestLayoutResult,
} from "./element";
export {
  GladeContainerElement,
  GladeElement,
  GladeImageElement,
  GladeTextElement,
  img,
  text,
} from "./element";

// Div element
export { div, GladeDiv } from "./div";

// Divider element
export { divider, GladeDivider } from "./divider";

// Monospace text helpers
export type { MonoVariant } from "./mono";
export { code, mono, MonoElement, pre } from "./mono";

// Text input element
export {
  GladeTextInput,
  renderTextDecorations,
  TEXT_INPUT_CONTEXT,
  textInput,
  TextInputController,
} from "./input";

// Scene and GPU primitives
export type { UnderlineStyle } from "./element";
export type {
  DrawOrder,
  GlyphPrimitive,
  ImagePrimitive,
  PathPrimitive,
  PathVertex,
  RectPrimitive,
  SceneLayer,
  ShadowPrimitive,
  TextPrimitive,
  UnderlinePrimitive,
} from "./scene";
export { GladeScene } from "./scene";

// Spatial indexing
export { BoundsTree } from "./bounds";

// Text system
export type {
  CachedGlyph,
  GlyphAtlasConfig,
  GlyphCacheKey,
  GlyphInstance,
  ShapedText,
  TextRun,
} from "./text";
export { GlyphAtlas, TextPipeline, TextSystem } from "./text";

// Text input state helpers
export type {
  CompositionRange,
  PointerSelectionSession,
  SelectionAnchor,
  SelectionBehavior,
  SelectionRange,
  TextHitTestResult,
  TextInputHistory,
  TextInputSnapshot,
  TextInputState,
  TextInputStateInit,
  TextSelectionRect,
} from "./text";
export {
  applyHitTestSelection,
  beginSelection,
  captureSnapshot,
  caretPrimitive,
  compositionUnderlines,
  computeCaretRect,
  computeCompositionRects,
  computeRangeRects,
  computeSelectionRects,
  createTextInputState,
  hitTestText,
  normalizeSelection,
  pushHistory,
  redo,
  restoreSnapshot,
  selectionPrimitives,
  selectLineAtHit,
  selectWordAtHit,
  setComposition,
  setFocused,
  setPreferredCaretX,
  setSelection,
  startPointerSelection,
  undo,
  updatePointerSelection,
  updateSelectionWithAnchor,
  valueWithComposition,
} from "./text";

// Event dispatch
export type {
  ClickHandler,
  EventHandlers,
  EventResult,
  GladeClickEvent,
  GladeKeyEvent,
  GladeMouseEvent,
  GladeScrollEvent,
  GladeTextInputEvent,
  HitTestNode,
  KeyHandler,
  MouseHandler,
  ScrollHandler,
  TextInputHandler,
} from "./dispatch";
export {
  buildKeyContextChain,
  dispatchClickEvent,
  dispatchKeyEvent,
  dispatchMouseEvent,
  dispatchScrollEvent,
  getFocusedPath,
  hitTest,
} from "./dispatch";

// Hitbox system
export type { Hitbox, HitboxFrame, HitboxId, HitTest } from "./hitbox";
export {
  createHitboxFrame,
  createHitTest,
  GroupHitboxes,
  HitboxBehavior,
  insertHitbox,
  isHitboxHovered,
  performHitTest,
  shouldHitboxHandleScroll,
} from "./hitbox";

// Window
export type { WindowOptions } from "./window";
export { GladeWindow } from "./window";

// Re-export platform types from core
export type { DecodedImageData, GladePlatform, GladeRenderTarget, Modifiers } from "@glade/core";
export { coreModsToGladeMods } from "@glade/core";

// App
export type { Action, KeyBinding } from "./actions";
export type { GladeAppOptions } from "./app";
export { GladeApp } from "./app";
export type {
  ActiveDialog,
  DialogActionHandler,
  DialogBuilder,
  DialogConfig,
  DialogContentContext,
  DialogOpenChangeHandler,
  DialogRegistration,
} from "./dialog";
export {
  DEFAULT_DIALOG_CONFIG,
  dialog,
  dialogConfig,
  DialogConfigBuilder,
  dialogContent,
  dialogFooter,
  dialogHeader,
  DialogManager,
  GladeDialog,
  GladeDialogContent,
  GladeDialogFooter,
  GladeDialogHeader,
} from "./dialog";
export type {
  ActiveDrag,
  CanDropPredicate,
  DragHandler,
  DragId,
  DragPayload,
  DropHandler,
  DropTarget,
} from "./drag";
export { dragPayload, dragPayloadWithPreview, DragTracker } from "./drag";
export { FocusContextStack, FocusNavigator, FocusStack } from "./focus";
export type { Keystroke } from "./keyboard";
export { formatKeystroke, Key, matchesKeystroke, parseKeystroke } from "./keyboard";
export { MouseState } from "./mouse";
export type {
  ActivePopover,
  PopoverAlign,
  PopoverBuilder,
  PopoverConfig,
  PopoverCorner,
  PopoverRegistration,
  PopoverSide,
} from "./popover";
export {
  DEFAULT_POPOVER_CONFIG,
  popoverConfig,
  PopoverConfigBuilder,
  PopoverManager,
} from "./popover";
export type { TabStop, TabStopConfig } from "./tab";
export { FocusContextManager, FocusRestoration, TabStopRegistry } from "./tab";
export type {
  ActiveTooltip,
  TooltipBuilder,
  TooltipConfig,
  TooltipPosition,
  TooltipRegistration,
} from "./tooltip";
export {
  DEFAULT_TOOLTIP_CONFIG,
  tooltipConfig,
  TooltipConfigBuilder,
  TooltipManager,
} from "./tooltip";

// Hotkeys utilities
export {
  ActionRegistry,
  BuiltinActions,
  createDefaultKeymap,
  KeyDispatcher,
  Keymap,
} from "./actions";
export {
  formatHotkey,
  Hotkey,
  hotkey,
  type HotkeyCombo,
  HotkeyDebugger,
  type HotkeyDisposable,
  type HotkeyHandler,
  HotkeyManager,
  type HotkeyOptions,
  hotkeys,
  isHotkeyPressed,
} from "./hotkeys";
export type { RendererConfig } from "./renderer";
export { GladeRenderer, PREMULTIPLIED_ALPHA_BLEND, STANDARD_ALPHA_BLEND } from "./renderer";

// Pipelines
export { RectPipeline } from "./rect";
export { ShadowPipeline } from "./shadow";

// Path rendering
export type { PathCommand, TessellatedPath } from "./path";
export { path, PathBuilder, PathPipeline } from "./path";

// Underline rendering
export { UnderlinePipeline } from "./underline";

// Image rendering
export type { DecodedImage, ImageAtlasConfig, ImageId, ImageInstance, ImageTile } from "./image";
export { ImageAtlas, ImagePipeline } from "./image";

// WebGPU Host rendering
export type { RenderTexture, WebGPUHost, WebGPUHostInput } from "./host";
export { createRenderTexture, HostTexturePipeline, webgpuHost, WebGPUHostElement } from "./host";
export type { HostTexturePrimitive } from "./scene";

// Buffer utilities
export {
  BufferFactory,
  BufferPool,
  DynamicBuffer,
  StagingBuffer,
  UniformBufferManager,
} from "./buffers";

// Inspector/Debug Mode
export type { ElementDebugInfo, InspectorState } from "./inspector";
export { createInspector, createInspectorState, Inspector, INSPECTOR_COLORS } from "./inspector";

// Virtual scrolling - UniformList (fixed height)
export type { ScrollToStrategy, UniformListItemProps, UniformListRenderItem } from "./uniform_list";
export { UniformList, uniformList } from "./uniform_list";

// Virtual scrolling - List (variable height)
export type {
  ListAlignment,
  ListItemProps,
  ListOffset,
  ListRenderItem,
  ListScrollEvent,
} from "./list";
export { createListState, List, list, type ListMeasureItem, ListState } from "./list";

// Table elements
export {
  GladeTable,
  GladeTableCell,
  GladeTableRow,
  GladeTableSection,
  table,
  tbody,
  td,
  tfoot,
  th,
  thead,
  tr,
} from "./table";

// Deferred element (overlay/popup support)
export type { DeferredDrawEntry } from "./deferred";
export { deferred, DeferredElement } from "./deferred";

// Anchored element (positioned overlays)
export type { AnchoredFitMode, AnchoredPositionMode, Corner, Edges } from "./anchored";
export { anchored, AnchoredElement, edges } from "./anchored";

// SVG rendering
export type { TessellatedMesh } from "./svg";
export { clearSvgCache, svg, SvgElement, SvgIcons } from "./svg";

// Icon element
export type { IconName } from "./icon";
export { GladeIcon, icon } from "./icon";

// Link element
export { GladeLink, link } from "./link";

// Checkbox element
export type { CheckedChangeHandler, CheckedState } from "./checkbox";
export { checkbox, GladeCheckbox } from "./checkbox";

// Radio group elements
export type { RadioValueChangeHandler } from "./radio";
export { GladeRadioGroup, GladeRadioGroupItem, radioGroup, radioItem } from "./radio";

// Switch element
export type { SwitchChangeHandler } from "./switch";
export { GladeSwitch, switchToggle, toggle } from "./switch";

// Tabs elements
export type { TabValueChangeHandler } from "./tabs";
export { GladeTab, GladeTabs, tab, tabs } from "./tabs";

// Dropdown menu elements
export type {
  DropdownAlign,
  DropdownCheckedChangeHandler,
  DropdownMenuContentPrepaintState,
  DropdownMenuContentRequestState,
  DropdownMenuContext,
  DropdownMenuState,
  DropdownOpenChangeHandler,
  DropdownSelectHandler,
  DropdownSide,
  DropdownValueChangeHandler,
  MenuItemElement,
} from "./dropdown";
export {
  dropdown,
  dropdownCheckbox,
  dropdownItem,
  dropdownLabel,
  dropdownRadio,
  dropdownRadioGroup,
  dropdownSeparator,
  dropdownSub,
  GladeDropdown,
  GladeDropdownCheckbox,
  GladeDropdownItem,
  GladeDropdownLabel,
  GladeDropdownMenuContent,
  GladeDropdownRadio,
  GladeDropdownRadioGroup,
  GladeDropdownSeparator,
  GladeDropdownSub,
} from "./dropdown";

// Right click (context) menu elements
export {
  GladeRightClickMenu,
  rightClickCheckbox,
  rightClickItem,
  rightClickLabel,
  rightClickMenu,
  rightClickRadio,
  rightClickRadioGroup,
  rightClickSeparator,
  rightClickSub,
} from "./right_click";

// Ideal text editor system
export * from "./button";
export type {
  CompositionState,
  DocumentOffset,
  DocumentPosition,
  HitTestResult,
  PositionedGlyph,
  SelectionGesture,
  SelectionMode,
  TextDocument,
  TextLine,
  TextRect,
  TextSelection,
  VisualPoint,
} from "./editor";
export {
  caretRect,
  collapseToAnchor,
  collapseToEnd,
  collapseToFocus,
  collapseToStart,
  createSelection,
  createTextDocument,
  extendTo,
  lineAtOffset,
  lineAtY,
  nextGrapheme,
  offset,
  offsetToPoint,
  offsetToPosition,
  pointToOffset,
  positionToOffset,
  prevGrapheme,
  selectAll as selectAllText,
  selectionRects,
  TextEditor,
  wordBoundaryLeft,
  wordBoundaryRight,
  wordEnd,
  wordStart,
} from "./editor";
export * from "./fps";
export * from "./header";

// Re-export logging
export { log } from "@glade/logging";

// Re-export utils
export { base64ToBytes, colors, rgb } from "@glade/utils";

// Re-export WebGPU constants from core
export {
  GPUBufferUsage,
  GPUColorWrite,
  GPUMapMode,
  GPUShaderStage,
  GPUTextureUsage,
} from "@glade/core";
