/**
 * FlashApp - the central state owner for Flash applications.
 *
 * FlashApp owns all entities, manages the effect queue, and coordinates
 * the render cycle across windows.
 */

import type { EntityId, WindowId, FocusId, FlashTask, ScrollOffset } from "./types.ts";
import {
  FlashHandle,
  FlashViewHandle,
  FocusHandle,
  ScrollHandle,
  ObserverHandle,
  SubscriberHandle,
  type EntityMeta,
  type SubscriberCallback,
} from "./entity.ts";
import type { FlashEffect, FlashContext, FlashEntityContext, FlashViewContext } from "./context.ts";
import type { FlashView } from "./element.ts";
import { FlashWindow, type WindowOptions, type FlashPlatform } from "./window.ts";

/**
 * Options for creating a FlashApp.
 */
export interface FlashAppOptions {
  platform: FlashPlatform;
}

/**
 * The central owner of all state in a Flash application.
 */
export class FlashApp {
  private platform: FlashPlatform;
  private device: GPUDevice | null = null;
  private format: GPUTextureFormat;

  // Entity storage
  private entities: Map<EntityId, unknown> = new Map();
  private entityMeta: Map<EntityId, EntityMeta> = new Map();
  private nextEntityId = 0;

  // Windows
  private windows: Map<WindowId, FlashWindow> = new Map();
  private nextWindowId = 0;
  private dirtyWindows: Set<WindowId> = new Set();

  // Focus
  private nextFocusId = 0;

  // Effect queue
  private pendingEffects: FlashEffect[] = [];
  private isFlushingEffects = false;

  // Observers
  private nextObserverId = 0;
  private nextSubscriberId = 0;

  // Frame loop
  private running = false;
  private frameId: number | null = null;
  private lastInputTime = 0;

  constructor(options: FlashAppOptions) {
    this.platform = options.platform;
    this.format = this.platform.getPreferredCanvasFormat();
  }

  /**
   * Initialize the app - must be called before opening windows.
   */
  async initialize(): Promise<void> {
    this.device = await this.platform.requestDevice();

    this.device.lost.then((info) => {
      console.error("WebGPU device lost:", info.message);
    });
  }

  /**
   * Open a new window with the given root view.
   */
  async openWindow<V extends FlashView>(
    options: WindowOptions,
    rootViewInit: (cx: FlashContext) => FlashViewHandle<V>
  ): Promise<FlashWindow> {
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

    const window = new FlashWindow(
      windowId,
      this.platform,
      this.device,
      this.format,
      renderTarget,
      rootView as FlashViewHandle<FlashView>,
      () => this.createContext(),
      <V extends FlashView>(handle: FlashViewHandle<V>) => this.readEntity(handle) as V
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
  }

  // ============ Entity Management ============

  private allocateEntityId(): EntityId {
    return this.nextEntityId++ as EntityId;
  }

  newEntity<T>(initializer: (cx: FlashEntityContext<T>) => T): FlashHandle<T> {
    const id = this.allocateEntityId();
    const cx = this.createEntityContext<T>(id);
    const state = initializer(cx);

    this.entities.set(id, state);
    this.entityMeta.set(id, {
      observers: new Set(),
      subscribers: new Map(),
      dropHandlers: [],
    });

    return new FlashHandle<T>(id);
  }

  newView<V extends FlashView>(initializer: (cx: FlashEntityContext<V>) => V): FlashViewHandle<V> {
    const handle = this.newEntity(initializer);
    return new FlashViewHandle<V>(handle.id);
  }

  readEntity<T>(handle: FlashHandle<T>): Readonly<T> {
    const state = this.entities.get(handle.id);
    if (state === undefined) {
      throw new Error(`Entity ${handle.id} not found`);
    }
    return state as Readonly<T>;
  }

  updateEntity<T, R>(handle: FlashHandle<T>, f: (state: T, cx: FlashEntityContext<T>) => R): R {
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

  dropEntity(handle: FlashHandle<unknown>): void {
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
    handle: FlashHandle<T>,
    callback: (observed: Readonly<T>, cx: FlashContext) => void
  ): ObserverHandle {
    const meta = this.entityMeta.get(handle.id);
    if (!meta) {
      throw new Error(`Entity ${handle.id} not found`);
    }

    const id = this.nextObserverId++;
    const observerHandle = new ObserverHandle(id, handle.id, (cx: FlashContext) => {
      const state = this.readEntity(handle);
      callback(state, cx);
    });

    meta.observers.add(observerHandle);
    return observerHandle;
  }

  subscribe<T, E>(
    handle: FlashHandle<T>,
    eventType: string,
    callback: (event: E, cx: FlashContext) => void
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

  setScrollOffset(handle: ScrollHandle, offset: ScrollOffset): void {
    const window = this.windows.get(handle.windowId);
    window?.setScrollOffset(handle.id, offset);
  }

  scrollBy(handle: ScrollHandle, deltaX: number, deltaY: number): void {
    const window = this.windows.get(handle.windowId);
    window?.scrollBy(handle.id, deltaX, deltaY);
  }

  // ============ Effect Queue ============

  queueEffect(effect: FlashEffect): void {
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

  private processEffect(effect: FlashEffect): void {
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
        this.dropEntity(new FlashHandle(effect.entityId));
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
      this.scheduleFrame();
    });
  }

  private frame(_time: number): void {
    // Flush pending effects
    this.flushEffects();

    // Render and present dirty windows
    for (const windowId of this.dirtyWindows) {
      const window = this.windows.get(windowId);
      if (!window) {
        continue;
      }
      if (window.isClosed()) {
        this.windows.delete(windowId);
        continue;
      }
      window.render((entityId, windowId, win) => this.createViewContext(entityId, windowId, win));
      window.present();
    }
    this.dirtyWindows.clear();
  }

  markWindowDirty(windowId: WindowId): void {
    this.dirtyWindows.add(windowId);
  }

  recordInputTime(): void {
    this.lastInputTime = this.platform.now();
  }

  // ============ Context Factory ============

  private createContext(): FlashAppContext {
    return new FlashAppContext(this);
  }

  private createEntityContext<T>(entityId: EntityId): FlashEntityContextImpl<T> {
    return new FlashEntityContextImpl<T>(this, entityId);
  }

  createViewContext<V extends FlashView>(
    entityId: EntityId,
    windowId: WindowId,
    window: FlashWindow
  ): FlashViewContext<V> {
    return new FlashViewContextImpl<V>(this, entityId, windowId, window);
  }
}

// ============ Context Implementations ============

class FlashAppContext implements FlashContext {
  constructor(protected app: FlashApp) {}

  readEntity<T>(handle: FlashHandle<T>): Readonly<T> {
    return this.app.readEntity(handle);
  }

  newEntity<T>(initializer: (cx: FlashEntityContext<T>) => T): FlashHandle<T> {
    return this.app.newEntity(initializer);
  }

  newView<V extends FlashView>(initializer: (cx: FlashEntityContext<V>) => V): FlashViewHandle<V> {
    return this.app.newView(initializer);
  }

  updateEntity<T, R>(handle: FlashHandle<T>, f: (state: T, cx: FlashEntityContext<T>) => R): R {
    return this.app.updateEntity(handle, f);
  }

  observe<T>(
    handle: FlashHandle<T>,
    callback: (observed: Readonly<T>, cx: FlashContext) => void
  ): ObserverHandle {
    return this.app.observe(handle, callback);
  }

  subscribe<T, E>(
    handle: FlashHandle<T>,
    eventType: string,
    callback: (event: E, cx: FlashContext) => void
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

  setScrollOffset(handle: ScrollHandle, offset: ScrollOffset): void {
    this.app.setScrollOffset(handle, offset);
  }

  scrollBy(handle: ScrollHandle, deltaX: number, deltaY: number): void {
    this.app.scrollBy(handle, deltaX, deltaY);
  }

  spawn<T>(_future: Promise<T>): FlashTask<T> {
    throw new Error("TODO: implement spawn");
  }

  markWindowDirty(windowId: WindowId): void {
    this.app.markWindowDirty(windowId);
  }
}

class FlashEntityContextImpl<T> extends FlashAppContext implements FlashEntityContext<T> {
  constructor(
    app: FlashApp,
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

class FlashViewContextImpl<V extends FlashView>
  extends FlashEntityContextImpl<V>
  implements FlashViewContext<V>
{
  private _focusHandle: FocusHandle | null = null;

  constructor(
    app: FlashApp,
    entityId: EntityId,
    readonly windowId: WindowId,
    readonly window: FlashWindow
  ) {
    super(app, entityId);
  }

  listener<E>(
    handler: (view: V, event: E, window: FlashWindow, cx: FlashEntityContext<V>) => void
  ): (event: E, window: FlashWindow, cx: FlashContext) => void {
    const entityId = this.entityId;

    return (event: E, window: FlashWindow, cx: FlashContext) => {
      const handle = new FlashHandle<V>(entityId);
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
