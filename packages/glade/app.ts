/**
 * GladeApp - the central state owner for Glade applications.
 *
 * GladeApp owns all entities, manages the effect queue, and coordinates
 * the render cycle across windows.
 */

import type { EntityId, WindowId, FocusId, GladeTask, ScrollOffset, Bounds } from "./types.ts";
import type { ColorSchemeProvider, ColorScheme } from "@glade/core";
import { createStaticColorSchemeProvider } from "@glade/core";
import {
  GladeHandle,
  GladeViewHandle,
  FocusHandle,
  ScrollHandle,
  ObserverHandle,
  SubscriberHandle,
  type EntityMeta,
  type SubscriberCallback,
} from "./entity.ts";
import type { GladeEffect, GladeContext, GladeEntityContext, GladeViewContext } from "./context.ts";
import type { GladeView } from "./element.ts";
import { GladeWindow, type WindowOptions, type GladePlatform } from "./window.ts";
import { ThemeManager, type ThemeConfig, type Theme, type ThemeOverrides } from "./theme.ts";

/**
 * Options for creating a GladeApp.
 */
export interface GladeAppOptions {
  platform: GladePlatform;
  theme?: ThemeConfig | Theme;
  colorSchemeProvider?: ColorSchemeProvider;
}

/**
 * The central owner of all state in a Glade application.
 */
export class GladeApp {
  private platform: GladePlatform;
  private device: GPUDevice | null = null;
  private format: GPUTextureFormat;
  private colorSchemeProvider: ColorSchemeProvider;
  private themeManager: ThemeManager;
  private colorSchemeCleanup: (() => void) | null = null;

  // Entity storage
  private entities: Map<EntityId, unknown> = new Map();
  private entityMeta: Map<EntityId, EntityMeta> = new Map();
  private nextEntityId = 0;

  // Windows
  private windows: Map<WindowId, GladeWindow> = new Map();
  private nextWindowId = 0;
  private dirtyWindows: Set<WindowId> = new Set();

  // Focus
  private nextFocusId = 0;

  // Effect queue
  private pendingEffects: GladeEffect[] = [];
  private isFlushingEffects = false;

  // Observers
  private nextObserverId = 0;
  private nextSubscriberId = 0;

  // Frame loop
  private running = false;
  private frameId: number | null = null;
  private lastInputTime = 0;

  constructor(options: GladeAppOptions) {
    this.platform = options.platform;
    this.format = this.platform.getPreferredCanvasFormat();
    this.colorSchemeProvider =
      options.colorSchemeProvider ?? createStaticColorSchemeProvider("dark");
    this.themeManager = new ThemeManager(this.colorSchemeProvider.get(), options.theme);
  }

  /**
   * Initialize the app - must be called before opening windows.
   */
  async initialize(): Promise<void> {
    this.device = await this.platform.requestDevice();

    this.device.lost.then((info) => {
      console.error("WebGPU device lost:", info.message);
    });

    if (!this.colorSchemeCleanup) {
      this.colorSchemeCleanup = this.colorSchemeProvider.subscribe((scheme) => {
        this.themeManager.setSystemScheme(scheme);
        this.markAllWindowsDirty();
      });
    }
  }

  /**
   * Open a new window with the given root view.
   */
  async openWindow<V extends GladeView>(
    options: WindowOptions,
    rootViewInit: (cx: GladeContext) => GladeViewHandle<V>
  ): Promise<GladeWindow> {
    if (!this.device) {
      throw new Error("App not initialized. Call initialize() first.");
    }

    const windowId = this.nextWindowId++ as WindowId;
    const cx = this.createContext();
    const rootView = rootViewInit(cx);

    const renderTarget = this.platform.createRenderTarget({
      width: options.width,
      height: options.height,
      title: options.title,
    });

    const window = new GladeWindow(
      windowId,
      this.platform,
      this.device,
      this.format,
      renderTarget,
      rootView as GladeViewHandle<GladeView>,
      () => this.createContext(),
      <V extends GladeView>(handle: GladeViewHandle<V>) => this.readEntity(handle) as V,
      () => this.handleWindowClosed(windowId)
    );

    this.windows.set(windowId, window);
    this.markWindowDirty(windowId);

    return window;
  }

  /**
   * Start the main run loop.
   */
  run(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.scheduleFrame();
  }

  /**
   * Stop the run loop.
   */
  stop(): void {
    this.running = false;
    if (this.frameId !== null) {
      this.platform.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    if (this.colorSchemeCleanup) {
      this.colorSchemeCleanup();
      this.colorSchemeCleanup = null;
    }
  }

  // ============ Entity Management ============

  private allocateEntityId(): EntityId {
    return this.nextEntityId++ as EntityId;
  }

  newEntity<T>(initializer: (cx: GladeEntityContext<T>) => T): GladeHandle<T> {
    const id = this.allocateEntityId();
    const cx = this.createEntityContext<T>(id);
    const state = initializer(cx);

    this.entities.set(id, state);
    this.entityMeta.set(id, {
      observers: new Set(),
      subscribers: new Map(),
      dropHandlers: [],
    });

    return new GladeHandle<T>(id);
  }

  newView<V extends GladeView>(initializer: (cx: GladeEntityContext<V>) => V): GladeViewHandle<V> {
    const handle = this.newEntity(initializer);
    return new GladeViewHandle<V>(handle.id);
  }

  readEntity<T>(handle: GladeHandle<T>): Readonly<T> {
    const state = this.entities.get(handle.id);
    if (state === undefined) {
      throw new Error(`Entity ${handle.id} not found`);
    }
    return state as Readonly<T>;
  }

  updateEntity<T, R>(handle: GladeHandle<T>, f: (state: T, cx: GladeEntityContext<T>) => R): R {
    const state = this.entities.get(handle.id);
    if (state === undefined) {
      throw new Error(`Entity ${handle.id} not found`);
    }

    // Lease pattern: temporarily remove to prevent reentrant access
    this.entities.delete(handle.id);

    try {
      const cx = this.createEntityContext<T>(handle.id);
      const result = f(state as T, cx);
      return result;
    } finally {
      // Restore (entity may have been dropped during update)
      if (!this.entities.has(handle.id)) {
        this.entities.set(handle.id, state);
      }
    }
  }

  dropEntity(handle: GladeHandle<unknown>): void {
    const meta = this.entityMeta.get(handle.id);
    if (meta) {
      // Run drop handlers
      for (const handler of meta.dropHandlers) {
        handler();
      }
      this.entityMeta.delete(handle.id);
    }
    this.entities.delete(handle.id);
  }

  // ============ Observations ============

  observe<T>(
    handle: GladeHandle<T>,
    callback: (observed: Readonly<T>, cx: GladeContext) => void
  ): ObserverHandle {
    const meta = this.entityMeta.get(handle.id);
    if (!meta) {
      throw new Error(`Entity ${handle.id} not found`);
    }

    const id = this.nextObserverId++;
    const observerHandle = new ObserverHandle(id, handle.id, (cx: GladeContext) => {
      const state = this.readEntity(handle);
      callback(state, cx);
    });

    meta.observers.add(observerHandle);
    return observerHandle;
  }

  subscribe<T, E>(
    handle: GladeHandle<T>,
    eventType: string,
    callback: (event: E, cx: GladeContext) => void
  ): SubscriberHandle {
    const meta = this.entityMeta.get(handle.id);
    if (!meta) {
      throw new Error(`Entity ${handle.id} not found`);
    }

    const id = this.nextSubscriberId++;
    const subscriberHandle = new SubscriberHandle(
      id,
      handle.id,
      eventType,
      callback as SubscriberCallback<unknown>
    );

    let subscribers = meta.subscribers.get(eventType);
    if (!subscribers) {
      subscribers = new Set();
      meta.subscribers.set(eventType, subscribers);
    }
    subscribers.add(subscriberHandle);

    return subscriberHandle;
  }

  // ============ Focus ============

  newFocusHandle(windowId: WindowId): FocusHandle {
    const id = this.nextFocusId++ as FocusId;
    return new FocusHandle(id, windowId);
  }

  isFocused(handle: FocusHandle): boolean {
    const window = this.windows.get(handle.windowId);
    return window?.isFocused(handle.id) ?? false;
  }

  focusFirstChild(handle: FocusHandle): void {
    const window = this.windows.get(handle.windowId);
    window?.focusFirstChild(handle.id);
  }

  focusNextSibling(handle: FocusHandle): void {
    const window = this.windows.get(handle.windowId);
    window?.focusNextSibling(handle.id);
  }

  saveFocus(windowId: WindowId): void {
    const window = this.windows.get(windowId);
    window?.saveFocus();
  }

  restoreFocus(windowId: WindowId): void {
    const window = this.windows.get(windowId);
    window?.restoreFocus();
  }

  // ============ Scroll ============

  newScrollHandle(windowId: WindowId): ScrollHandle {
    const window = this.windows.get(windowId);
    if (!window) {
      throw new Error(`Window ${windowId} not found`);
    }
    const id = window.allocateScrollHandleId();
    return new ScrollHandle(id, windowId);
  }

  getScrollOffset(handle: ScrollHandle): ScrollOffset {
    const window = this.windows.get(handle.windowId);
    return window?.getScrollOffset(handle.id) ?? { x: 0, y: 0 };
  }

  getScrollViewport(handle: ScrollHandle): Bounds {
    const window = this.windows.get(handle.windowId);
    return window?.getScrollViewport(handle.id) ?? { x: 0, y: 0, width: 0, height: 0 };
  }

  setScrollOffset(handle: ScrollHandle, offset: ScrollOffset): void {
    const window = this.windows.get(handle.windowId);
    window?.setScrollOffset(handle.id, offset);
  }

  scrollBy(handle: ScrollHandle, deltaX: number, deltaY: number): void {
    const window = this.windows.get(handle.windowId);
    window?.scrollBy(handle.id, deltaX, deltaY);
  }

  // ============ Effect Queue ============

  queueEffect(effect: GladeEffect): void {
    this.pendingEffects.push(effect);
  }

  flushEffects(): void {
    if (this.isFlushingEffects) {
      return;
    }
    this.isFlushingEffects = true;

    try {
      while (this.pendingEffects.length > 0) {
        const effect = this.pendingEffects.shift()!;
        this.processEffect(effect);
      }
    } finally {
      this.isFlushingEffects = false;
    }
  }

  private processEffect(effect: GladeEffect): void {
    switch (effect.type) {
      case "notify":
        this.processNotify(effect.entityId);
        break;
      case "emit":
        this.processEmit(effect.entityId, effect.eventType, effect.event);
        break;
      case "focus":
        this.processFocus(effect.windowId, effect.focusId);
        break;
      case "blur":
        this.processBlur(effect.windowId, effect.focusId);
        break;
      case "release":
        this.dropEntity(new GladeHandle(effect.entityId));
        break;
      case "callback":
        effect.callback();
        break;
    }
  }

  private processNotify(entityId: EntityId): void {
    const meta = this.entityMeta.get(entityId);
    if (!meta) {
      return;
    }

    const cx = this.createContext();
    for (const observer of meta.observers) {
      observer.callback(cx);
    }

    // If this is a view, mark its window dirty
    for (const window of this.windows.values()) {
      if (window.containsView(entityId)) {
        this.markWindowDirty(window.id);
        break;
      }
    }
  }

  private processEmit(entityId: EntityId, eventType: string, event: unknown): void {
    const meta = this.entityMeta.get(entityId);
    if (!meta) {
      return;
    }

    const subscribers = meta.subscribers.get(eventType);
    if (!subscribers) {
      return;
    }

    const cx = this.createContext();
    for (const subscriber of subscribers) {
      subscriber.callback(event, cx);
    }
  }

  private processFocus(windowId: WindowId, focusId: FocusId): void {
    const window = this.windows.get(windowId);
    if (window) {
      window.setFocus(focusId);
    }
  }

  private processBlur(windowId: WindowId, focusId: FocusId): void {
    const window = this.windows.get(windowId);
    if (window) {
      window.clearFocus(focusId);
    }
  }

  // ============ Frame Loop ============

  private scheduleFrame(): void {
    this.frameId = this.platform.requestAnimationFrame((time) => {
      if (!this.running) {
        return;
      }
      this.frame(time);
      if (this.running) {
        this.scheduleFrame();
      }
    });
  }

  private frame(_time: number): void {
    // Flush pending effects
    this.flushEffects();

    // Always render all windows every frame (needed for animations like cursor blink)
    for (const [windowId, window] of this.windows) {
      if (window.isClosed()) {
        this.windows.delete(windowId);
        continue;
      }
      window.render((entityId, windowId, win) => this.createViewContext(entityId, windowId, win));
      window.present();
    }
    this.dirtyWindows.clear();

    if (this.windows.size === 0) {
      this.stop();
    }
  }

  markWindowDirty(windowId: WindowId): void {
    this.dirtyWindows.add(windowId);
  }

  private markAllWindowsDirty(): void {
    for (const windowId of this.windows.keys()) {
      this.markWindowDirty(windowId);
    }
  }

  private handleWindowClosed(windowId: WindowId): void {
    this.windows.delete(windowId);
    if (this.windows.size === 0) {
      this.stop();
    }
  }

  recordInputTime(): void {
    this.lastInputTime = this.platform.now();
  }

  getTheme(): Theme {
    return this.themeManager.getTheme();
  }

  getSystemColorScheme(): ColorScheme {
    return this.themeManager.getSystemScheme();
  }

  setTheme(config: Theme | ThemeConfig): void {
    if ("background" in config) {
      this.themeManager.setTheme(config);
    } else {
      this.themeManager.setThemeConfig(config);
    }
    this.markAllWindowsDirty();
  }

  setThemeScheme(scheme: ColorScheme | "system"): void {
    this.themeManager.setOverrideScheme(scheme);
    this.markAllWindowsDirty();
  }

  setThemeOverrides(overrides: ThemeOverrides): void {
    this.themeManager.setOverrides(overrides);
    this.markAllWindowsDirty();
  }

  // ============ Context Factory ============

  private createContext(): GladeAppContext {
    return new GladeAppContext(this);
  }

  private createEntityContext<T>(entityId: EntityId): GladeEntityContextImpl<T> {
    return new GladeEntityContextImpl<T>(this, entityId);
  }

  createViewContext<V extends GladeView>(
    entityId: EntityId,
    windowId: WindowId,
    window: GladeWindow
  ): GladeViewContext<V> {
    return new GladeViewContextImpl<V>(this, entityId, windowId, window);
  }
}

// ============ Context Implementations ============

class GladeAppContext implements GladeContext {
  constructor(protected app: GladeApp) {}

  readEntity<T>(handle: GladeHandle<T>): Readonly<T> {
    return this.app.readEntity(handle);
  }

  getTheme(): Theme {
    return this.app.getTheme();
  }

  getSystemColorScheme(): ColorScheme {
    return this.app.getSystemColorScheme();
  }

  setTheme(config: Theme | ThemeConfig): void {
    this.app.setTheme(config);
  }

  setThemeScheme(scheme: ColorScheme | "system"): void {
    this.app.setThemeScheme(scheme);
  }

  setThemeOverrides(overrides: ThemeOverrides): void {
    this.app.setThemeOverrides(overrides);
  }

  newEntity<T>(initializer: (cx: GladeEntityContext<T>) => T): GladeHandle<T> {
    return this.app.newEntity(initializer);
  }

  newView<V extends GladeView>(initializer: (cx: GladeEntityContext<V>) => V): GladeViewHandle<V> {
    return this.app.newView(initializer);
  }

  updateEntity<T, R>(handle: GladeHandle<T>, f: (state: T, cx: GladeEntityContext<T>) => R): R {
    return this.app.updateEntity(handle, f);
  }

  observe<T>(
    handle: GladeHandle<T>,
    callback: (observed: Readonly<T>, cx: GladeContext) => void
  ): ObserverHandle {
    return this.app.observe(handle, callback);
  }

  subscribe<T, E>(
    handle: GladeHandle<T>,
    eventType: string,
    callback: (event: E, cx: GladeContext) => void
  ): SubscriberHandle {
    return this.app.subscribe(handle, eventType, callback);
  }

  isFocused(handle: FocusHandle): boolean {
    return this.app.isFocused(handle);
  }

  focus(handle: FocusHandle): void {
    this.app.queueEffect({ type: "focus", focusId: handle.id, windowId: handle.windowId });
  }

  blur(handle: FocusHandle): void {
    this.app.queueEffect({ type: "blur", focusId: handle.id, windowId: handle.windowId });
  }

  newFocusHandle(windowId: WindowId): FocusHandle {
    return this.app.newFocusHandle(windowId);
  }

  focusFirstChild(handle: FocusHandle): void {
    this.app.focusFirstChild(handle);
  }

  focusNextSibling(handle: FocusHandle): void {
    this.app.focusNextSibling(handle);
  }

  saveFocus(windowId: WindowId): void {
    this.app.saveFocus(windowId);
  }

  restoreFocus(windowId: WindowId): void {
    this.app.restoreFocus(windowId);
  }

  newScrollHandle(windowId: WindowId): ScrollHandle {
    return this.app.newScrollHandle(windowId);
  }

  getScrollOffset(handle: ScrollHandle): ScrollOffset {
    return this.app.getScrollOffset(handle);
  }

  getScrollViewport(handle: ScrollHandle): Bounds {
    return this.app.getScrollViewport(handle);
  }

  setScrollOffset(handle: ScrollHandle, offset: ScrollOffset): void {
    this.app.setScrollOffset(handle, offset);
  }

  scrollBy(handle: ScrollHandle, deltaX: number, deltaY: number): void {
    this.app.scrollBy(handle, deltaX, deltaY);
  }

  spawn<T>(_future: Promise<T>): GladeTask<T> {
    throw new Error("TODO: implement spawn");
  }

  markWindowDirty(windowId: WindowId): void {
    this.app.markWindowDirty(windowId);
  }
}

class GladeEntityContextImpl<T> extends GladeAppContext implements GladeEntityContext<T> {
  constructor(
    app: GladeApp,
    readonly entityId: EntityId
  ) {
    super(app);
  }

  notify(): void {
    this.app.queueEffect({ type: "notify", entityId: this.entityId });
  }

  emit<E>(eventType: string, event: E): void {
    this.app.queueEffect({
      type: "emit",
      entityId: this.entityId,
      eventType,
      event,
    });
  }

  onDrop(_callback: () => void): void {
    // Would need access to entityMeta - simplified for now
    console.warn("onDrop not yet implemented");
  }
}

class GladeViewContextImpl<V extends GladeView>
  extends GladeEntityContextImpl<V>
  implements GladeViewContext<V>
{
  private _focusHandle: FocusHandle | null = null;

  constructor(
    app: GladeApp,
    entityId: EntityId,
    readonly windowId: WindowId,
    readonly window: GladeWindow
  ) {
    super(app, entityId);
  }

  listener<E>(
    handler: (view: V, event: E, window: GladeWindow, cx: GladeEntityContext<V>) => void
  ): (event: E, window: GladeWindow, cx: GladeContext) => void {
    const entityId = this.entityId;

    return (event: E, window: GladeWindow, cx: GladeContext) => {
      const handle = new GladeHandle<V>(entityId);
      handle.update(cx, (view, ecx) => {
        handler(view, event, window, ecx);
      });
    };
  }

  focusHandle(): FocusHandle {
    if (!this._focusHandle) {
      this._focusHandle = this.newFocusHandle(this.windowId);
    }
    return this._focusHandle;
  }
}
