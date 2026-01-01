# FPS Overlay Component - Implementation Summary

## Problem Statement

The FPS overlay component was rendering in the **upper-left corner** instead of the configured **bottom-right corner**. The user wants a visual FPS counter that:

1. Shows a bar graph of the last 80 frames (1px per bar, representing potential FPS)
2. Shows the current FPS number in monospace font
3. Appears in a configurable corner (default: bottom-right) with configurable margin
4. Renders on top of all other content (as an overlay)
5. Does NOT capture mouse events (click-through)
6. Automatically tracks frame times (no manual `tick()` call needed)
7. Has styling: black background, rounded(3) corners, medium-gray border, white bars (red if < 30 FPS)

## Root Cause Analysis

### Why It Was Broken

The original implementation added `GladeFps` as a **child element** of the main div tree in `demos/main.ts`:

```typescript
return div()
  .children(
    // ... other children ...
    this.fpsOverlay  // <-- Added as a child of the div
  );
```

This caused the FPS component to go through the normal layout system, which computes bounds relative to the parent (starting at 0,0). Even though the component registered itself for deferred drawing with correct absolute bounds, it was ALSO being painted during the normal paint pass via the parent div's `paint()` method with layout bounds at (0,0).

### Why Tooltips/Popovers/Dialogs Work Correctly

These overlays work because they are **NOT children of the main element tree**. They are rendered by `GladeWindow` in **separate layout/prepaint/paint cycles** AFTER the main tree renders. See `window.ts`:

- `renderActiveTooltip()` - renders tooltips separately
- `renderActivePopover()` - renders popovers separately  
- `renderActiveDialog()` - renders dialogs separately

Each of these methods:
1. Builds the element
2. Runs its own `requestLayout` -> `prepaint` -> `paint` cycle
3. Uses absolute positioning based on window dimensions
4. Wraps in `DeferredElement` for proper z-ordering

## Solution Design

The FPS overlay should be rendered at the **window level**, not as part of any view's element tree.

### Architecture

1. **`GladeFps` class** (`packages/glade/fps.ts`): A simple painter class (NOT a `GladeElement`)
   - Tracks frame times internally via `recordFrame()`
   - Paints at given bounds via `paint(cx, bounds)`
   - No layout lifecycle methods

2. **`GladeWindow`** (`packages/glade/window.ts`): Manages the FPS overlay
   - Stores `fpsOverlay: GladeFps | null` and `fpsConfig: FpsConfig`
   - Provides `showFps(corner?, margin?)` and `hideFps()` public methods
   - Calls `renderFpsOverlay()` in the render loop after deferred elements

3. **Usage** (`packages/demos/main.ts`): Simply call `cx.window.showFps()`
   - No need to create or manage the FPS element
   - No need to add it as a child

## Current Implementation Status

### Files Modified

#### 1. `packages/glade/fps.ts` (REWRITTEN)

**Before**: Extended `GladeElement` with full lifecycle methods
**After**: Simple class with just `recordFrame()` and `paint()`

```typescript
export class GladeFps {
  private frameTimes: number[] = [];
  private lastFrameTime: number | null = null;
  private currentFps = 0;
  
  // Colors
  private bgColor: ColorObject = rgb(0x000000);
  private borderColor: ColorObject = rgb(gray.x600);
  private barColor: ColorObject = rgb(0xffffff);
  private barLowColor: ColorObject = rgb(red.x500);
  private textColor: ColorObject = rgb(0xffffff);

  getFps(): number { return this.currentFps; }
  
  recordFrame(): void {
    // Records current time, computes delta, updates frameTimes array
  }
  
  getSize(): { width: number; height: number } {
    return { width: 96, height: 24 };
  }
  
  paint(cx: PaintContext, bounds: Bounds): void {
    // Paints background, border, bar graph, and FPS text
  }
}

export function computeFpsBounds(
  windowWidth: number,
  windowHeight: number,
  config: FpsConfig
): Bounds {
  // Computes absolute position based on corner and margin
}
```

Constants:
- `COMPONENT_WIDTH = 96` (was 80, increased for text space)
- `COMPONENT_HEIGHT = 24`
- `BAR_GRAPH_WIDTH = 60`
- `FPS_TEXT_WIDTH = 36`
- `MAX_FRAMES = 80`
- `MAX_FPS = 120`

#### 2. `packages/glade/window.ts` (MODIFIED)

**Added imports:**
```typescript
import { GladeFps, computeFpsBounds, type FpsCorner, type FpsConfig } from "./fps.ts";
```

**Added private fields:**
```typescript
// FPS overlay (visual display)
private fpsOverlay: GladeFps | null = null;
private fpsConfig: FpsConfig = { corner: "bottom-right", margin: 8 };
```

**Added public methods:**
```typescript
showFps(corner?: FpsCorner, margin?: number): void {
  if (!this.fpsOverlay) {
    this.fpsOverlay = new GladeFps();
  }
  if (corner !== undefined) {
    this.fpsConfig.corner = corner;
  }
  if (margin !== undefined) {
    this.fpsConfig.margin = margin;
  }
}

hideFps(): void {
  this.fpsOverlay = null;
}

isFpsOverlayVisible(): boolean {
  return this.fpsOverlay !== null;
}
```

**Added private render method:**
```typescript
private renderFpsOverlay(): void {
  if (!this.fpsOverlay) {
    return;
  }

  // Record frame time for FPS calculation
  this.fpsOverlay.recordFrame();

  // Compute bounds based on corner and margin
  const bounds = computeFpsBounds(this.width, this.height, this.fpsConfig);

  // Use highest overlay priority so FPS renders on top of everything
  this.scene.beginOverlay(1000);

  // Create a paint context and paint the FPS overlay
  const fpsElementId = this.allocateElementId();
  const paintCx = this.createPaintContext(fpsElementId);
  this.fpsOverlay.paint(paintCx, bounds);

  this.scene.endOverlay();
}
```

**Called in render() method** (around line 1241):
```typescript
// Paint deferred elements in priority order (higher priority on top)
this.paintDeferredElements();

// Render FPS overlay (on top of everything except inspector)
this.renderFpsOverlay();  // <-- Added this call
```

#### 3. `packages/demos/main.ts` (MODIFIED)

**Removed:**
- `fps` import
- `GladeFps` type import
- `private fpsOverlay: GladeFps` field
- `this.fpsOverlay = fps().margin(8)` in constructor
- `this.fpsOverlay` from children list in render()

**Added:**
```typescript
private fpsEnabled = false;

render(cx: GladeViewContext<this>) {
  // ... scroll handle setup ...

  // Enable FPS overlay once
  if (!this.fpsEnabled) {
    cx.window.showFps();
    this.fpsEnabled = true;
  }

  return div()
    .children(
      // ... children WITHOUT fpsOverlay ...
    );
}
```

## Current Issue

The FPS overlay is **not visible at all** after the changes. Possible causes to investigate:

### Debugging Checklist

1. **Is `showFps()` being called?**
   - Add `console.log` in `showFps()` to verify it's called
   - Check that `this.fpsEnabled` flag logic works correctly

2. **Is `renderFpsOverlay()` being called?**
   - Add `console.log` at the start of `renderFpsOverlay()`
   - Verify `this.fpsOverlay` is not null

3. **Are the bounds correct?**
   - Log the computed bounds from `computeFpsBounds()`
   - Verify window width/height are valid (not 0)

4. **Is `scene.beginOverlay(1000)` working?**
   - Check if priority 1000 is handled correctly by the scene
   - Try a lower priority like 3 (after dialogs at 2)

5. **Is `paint()` being called and drawing anything?**
   - Add `console.log` in `GladeFps.paint()`
   - Verify `paintRect`, `paintBorder`, `paintGlyphs` are being called

6. **Is `recordFrame()` being called?**
   - The FPS values might all be 0 if `recordFrame()` isn't populating `frameTimes`

### Potential Fixes to Try

1. **Check overlay priority**: The scene might not handle priority 1000. Try:
   ```typescript
   this.scene.beginOverlay(3);  // Just above dialogs
   ```

2. **Check if PaintContext works without element lifecycle**: The `createPaintContext()` might expect certain state from prepaint. Compare with how `renderActiveTooltip()` creates its paint context.

3. **Verify the scene overlay system**: Check `scene.ts` to see how `beginOverlay()` and `endOverlay()` work, and what priorities are valid.

4. **Try rendering without overlay**: As a test, remove the `beginOverlay`/`endOverlay` calls to see if the FPS renders at all (it would be behind everything but should be visible).

## Key Files to Reference

- `/packages/glade/fps.ts` - The FPS component
- `/packages/glade/window.ts` - Window management, lines ~270 (fields), ~1241 (render call), ~1500 (renderFpsOverlay method), ~1390 (showFps/hideFps methods)
- `/packages/glade/scene.ts` - Scene overlay system (beginOverlay/endOverlay)
- `/packages/glade/element.ts` - PaintContext type definition
- `/packages/demos/main.ts` - Demo app using showFps()

## Related Patterns in Codebase

### How Tooltips Render (reference implementation)

```typescript
// In window.ts renderActiveTooltip()
private renderActiveTooltip(): HitTestNode | null {
  const activeTooltip = this.tooltipManager.getActiveTooltip();
  if (!activeTooltip || !activeTooltip.element) {
    return null;
  }

  // ... compute tooltip bounds ...

  // Create anchored wrapper for positioning
  const anchoredElement = new AnchoredElement();
  anchoredElement.anchor("top-left");
  anchoredElement.position({ x: tooltipBounds.x, y: tooltipBounds.y });
  anchoredElement.setWindowSize({ width: this.width, height: this.height });
  anchoredElement.child(freshTooltipElement);

  const deferredWrapper = new DeferredElement(anchoredElement);
  deferredWrapper.priority(0); // Tooltips render below menus

  // Run full layout/prepaint/paint cycle
  const wrappedElementId = this.allocateElementId();
  const wrappedRequestLayoutCx = this.createRequestLayoutContext(wrappedElementId);
  const { layoutId, requestState } = deferredWrapper.requestLayout(wrappedRequestLayoutCx);

  this.layoutEngine.computeLayoutWithMeasure(...);
  
  const wrappedBounds = this.layoutEngine.layoutBounds(wrappedLayoutId);
  const prepaintCx = this.createPrepaintContext(wrappedElementId);
  const prepaintState = deferredWrapper.prepaint(prepaintCx, wrappedBounds, requestState);

  const paintCx = this.createPaintContext(wrappedElementId);
  deferredWrapper.paint(paintCx, wrappedBounds, prepaintState);

  return prepaintState?.hitTestNode ?? null;
}
```

The FPS implementation skips the full lifecycle and just calls `paint()` directly. This might be the issue if `PaintContext` methods require state from earlier phases.

## Recommended Next Steps

1. Add console logging to trace the render path
2. Verify the overlay system accepts priority 1000
3. If direct painting doesn't work, consider wrapping FPS in a proper element with full lifecycle (like tooltips do)
4. Check if `paintRect`/`paintGlyphs` require any setup from prepaint phase
