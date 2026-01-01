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
 * @module @glade/glade
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
  GladeTask,
  ContentMask,
  TransformationMatrix,
  ScrollOffset,
  ScrollState,
} from "./types";

export type { Theme, ThemeConfig, ThemeOverrides } from "./theme";
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
} from "./theme";

export {
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
} from "./types";

// Layout engine
export type { LayoutId, AvailableSpace, AvailableSpaceValue } from "./layout";

export { GladeLayoutEngine, definite, minContent, maxContent } from "./layout";

// Entity system
export {
  GladeHandle,
  GladeViewHandle,
  FocusHandle,
  ScrollHandle,
  ObserverHandle,
  SubscriberHandle,
} from "./entity";

export type { EntityMeta, ObserverCallback, SubscriberCallback } from "./entity";

// Context system
export type {
  GladeEffect,
  GladeReadContext,
  GladeContext,
  GladeEntityContext,
  GladeViewContext,
  GladeWindowContext,
} from "./context";

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
} from "./styles";

export {
  StyleBuilder,
  SHADOW_DEFINITIONS,
  overflowAllowsScroll,
  overflowClipsContent,
} from "./styles";

// Scrollbar
export type {
  ScrollbarConfig,
  ScrollbarDragState,
  ScrollbarVisibility,
  ThumbMetrics,
} from "./scrollbar";

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
} from "./scrollbar";

// Elements
export type {
  GladeView,
  GladeRenderOnce,
  RequestLayoutContext,
  PrepaintContext,
  PaintContext,
  GlobalElementId,
  DispatchNodeId,
  NoState,
  RequestLayoutResult,
  ElementDebugMeta,
} from "./element";

export {
  GladeElement,
  GladeContainerElement,
  GladeTextElement,
  GladeImageElement,
  text,
  img,
} from "./element";
export {
  canvas,
  CanvasElement,
  type CanvasPrepaint,
  type CanvasPaint,
  type CanvasOptionsWithPrepaint,
  type CanvasOptionsWithoutPrepaint,
} from "./canvas";

// Div element
export { GladeDiv, div } from "./div";

// Divider element
export { GladeDivider, divider } from "./divider";

// Monospace text helpers
export type { MonoVariant } from "./mono";
export { MonoElement, mono, code, pre } from "./mono";

// Text input element
export {
  GladeTextInput,
  textInput,
  TEXT_INPUT_CONTEXT,
  TextInputController,
  renderTextDecorations,
} from "./input";

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
  SceneLayer,
  DrawOrder,
} from "./scene";
export type { UnderlineStyle } from "./element";

export { GladeScene } from "./scene";

// Spatial indexing
export { BoundsTree } from "./bounds";

// Text system
export type {
  GlyphCacheKey,
  CachedGlyph,
  TextRun,
  ShapedText,
  GlyphInstance,
  GlyphAtlasConfig,
} from "./text";

export { GlyphAtlas, TextSystem, TextPipeline } from "./text";

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
} from "./text";
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
} from "./text";

// Event dispatch
export type {
  GladeMouseEvent,
  GladeClickEvent,
  GladeKeyEvent,
  GladeScrollEvent,
  GladeTextInputEvent,
  Modifiers,
  EventResult,
  MouseHandler,
  ClickHandler,
  KeyHandler,
  TextInputHandler,
  ScrollHandler,
  EventHandlers,
  HitTestNode,
} from "./dispatch";

export {
  hitTest,
  dispatchMouseEvent,
  dispatchClickEvent,
  dispatchKeyEvent,
  dispatchScrollEvent,
  buildKeyContextChain,
  getFocusedPath,
} from "./dispatch";

// Hitbox system
export type { Hitbox, HitboxId, HitTest, HitboxFrame } from "./hitbox";

export {
  HitboxBehavior,
  createHitboxFrame,
  createHitTest,
  insertHitbox,
  performHitTest,
  isHitboxHovered,
  shouldHitboxHandleScroll,
  GroupHitboxes,
} from "./hitbox";

// Window
export type { WindowOptions, GladePlatform, GladeRenderTarget, DecodedImageData } from "./window";

export { GladeWindow } from "./window";

// App
export type { GladeAppOptions } from "./app";

export { GladeApp } from "./app";

export { MouseState, coreModsToGladeMods } from "./mouse";

export type {
  DragId,
  DragHandler,
  DropHandler,
  CanDropPredicate,
  DragPayload,
  ActiveDrag,
  DropTarget,
} from "./drag";

export { DragTracker, dragPayload, dragPayloadWithPreview } from "./drag";

export type {
  TooltipPosition,
  TooltipConfig,
  TooltipBuilder,
  TooltipRegistration,
  ActiveTooltip,
} from "./tooltip";

export {
  TooltipManager,
  TooltipConfigBuilder,
  tooltipConfig,
  DEFAULT_TOOLTIP_CONFIG,
} from "./tooltip";

export type {
  PopoverSide,
  PopoverAlign,
  PopoverCorner,
  PopoverConfig,
  PopoverBuilder,
  PopoverRegistration,
  ActivePopover,
} from "./popover";

export {
  PopoverManager,
  PopoverConfigBuilder,
  popoverConfig,
  DEFAULT_POPOVER_CONFIG,
} from "./popover";

export type {
  DialogOpenChangeHandler,
  DialogActionHandler,
  DialogConfig,
  DialogBuilder,
  DialogRegistration,
  ActiveDialog,
  DialogContentContext,
} from "./dialog";

export {
  DialogManager,
  DialogConfigBuilder,
  dialogConfig,
  DEFAULT_DIALOG_CONFIG,
  GladeDialogHeader,
  GladeDialogFooter,
  GladeDialogContent,
  GladeDialog,
  dialog,
  dialogContent,
  dialogHeader,
  dialogFooter,
} from "./dialog";

export type { Keystroke } from "./keyboard";

export { Key, parseKeystroke, matchesKeystroke, formatKeystroke } from "./keyboard";

export { FocusStack, FocusNavigator, FocusContextStack } from "./focus";

export type { TabStopConfig, TabStop } from "./tab";

export { TabStopRegistry, FocusContextManager, FocusRestoration } from "./tab";

export type { Action, KeyBinding } from "./actions";

export {
  ActionRegistry,
  Keymap,
  KeyDispatcher,
  BuiltinActions,
  createDefaultKeymap,
} from "./actions";

export type { RendererConfig } from "./renderer";

export { GladeRenderer, PREMULTIPLIED_ALPHA_BLEND, STANDARD_ALPHA_BLEND } from "./renderer";

// Pipelines
export { RectPipeline } from "./rect";

export { ShadowPipeline } from "./shadow";

// Path rendering
export type { PathCommand, TessellatedPath } from "./path";

export { PathBuilder, PathPipeline, path } from "./path";

// Underline rendering
export { UnderlinePipeline } from "./underline";

// Image rendering
export type { ImageId, DecodedImage, ImageTile, ImageInstance, ImageAtlasConfig } from "./image";

export { ImageAtlas, ImagePipeline } from "./image";

// WebGPU Host rendering
export type { RenderTexture, WebGPUHost, WebGPUHostInput } from "./host";

export { createRenderTexture, HostTexturePipeline, WebGPUHostElement, webgpuHost } from "./host";

export type { HostTexturePrimitive } from "./scene";

// Buffer utilities
export {
  DynamicBuffer,
  BufferPool,
  StagingBuffer,
  UniformBufferManager,
  BufferFactory,
} from "./buffers";

// Inspector/Debug Mode
export type { ElementDebugInfo, InspectorState } from "./inspector";

export { Inspector, INSPECTOR_COLORS, createInspector, createInspectorState } from "./inspector";

// Virtual scrolling - UniformList (fixed height)
export type { ScrollToStrategy, UniformListItemProps, UniformListRenderItem } from "./uniform_list";

export { UniformList, uniformList } from "./uniform_list";

// Virtual scrolling - List (variable height)
export type {
  ListAlignment,
  ListOffset,
  ListScrollEvent,
  ListItemProps,
  ListRenderItem,
} from "./list";

export { List, ListState, list, createListState, type ListMeasureItem } from "./list";

// Table elements
export {
  GladeTable,
  GladeTableSection,
  GladeTableRow,
  GladeTableCell,
  table,
  thead,
  tbody,
  tfoot,
  tr,
  th,
  td,
} from "./table";

// Deferred element (overlay/popup support)
export type { DeferredDrawEntry } from "./deferred";

export { DeferredElement, deferred } from "./deferred";

// Anchored element (positioned overlays)
export type { Corner, AnchoredPositionMode, AnchoredFitMode, Edges } from "./anchored";

export { AnchoredElement, anchored, edges } from "./anchored";

// SVG rendering
export type { SvgPathCommand, ParsedSvgPath, ParsedSvg, TessellatedMesh } from "./svg";

export { SvgElement, svg, parseSvg, SvgIcons, clearSvgCache } from "./svg";

// Icon element
export type { IconName } from "./icon";

export { GladeIcon, icon } from "./icon";

// Link element
export { GladeLink, link } from "./link";

// Checkbox element
export type { CheckedState, CheckedChangeHandler } from "./checkbox";
export { GladeCheckbox, checkbox } from "./checkbox";

// Radio group elements
export type { RadioValueChangeHandler } from "./radio";
export { GladeRadioGroup, GladeRadioGroupItem, radioGroup, radioItem } from "./radio";

// Switch element
export type { SwitchChangeHandler } from "./switch";
export { GladeSwitch, switchToggle, toggle } from "./switch";

// Tabs elements
export type { TabValueChangeHandler } from "./tabs";
export { GladeTabs, GladeTab, tabs, tab } from "./tabs";

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
} from "./dropdown";
export {
  GladeDropdown,
  GladeDropdownItem,
  GladeDropdownSeparator,
  GladeDropdownLabel,
  GladeDropdownCheckbox,
  GladeDropdownRadio,
  GladeDropdownRadioGroup,
  GladeDropdownSub,
  GladeDropdownMenuContent,
  dropdown,
  dropdownItem,
  dropdownSeparator,
  dropdownLabel,
  dropdownCheckbox,
  dropdownRadio,
  dropdownRadioGroup,
  dropdownSub,
} from "./dropdown";

// Right click (context) menu elements
export {
  GladeRightClickMenu,
  rightClickMenu,
  rightClickItem,
  rightClickSeparator,
  rightClickLabel,
  rightClickCheckbox,
  rightClickRadio,
  rightClickRadioGroup,
  rightClickSub,
} from "./right_click";

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
} from "./editor";

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
} from "./editor";

export * from "./header";
