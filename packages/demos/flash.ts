/**
 * Flash GUI Demo
 *
 * Demonstrates the Flash UI framework's GPU-accelerated rendering
 * with rectangles, rounded corners, borders, and shadows.
 * Now using the div() element API with Tailwind-like styling.
 */

import type { WebGPUContext } from "@glade/core";
import {
  FlashScene,
  FlashRenderer,
  RectPipeline,
  ShadowPipeline,
  FlashLayoutEngine,
  TextSystem,
  TextPipeline,
  rgb,
  rgba,
  div,
  type FlashDiv,
  type Bounds,
  type Color,
  type GlyphInstance,
  SHADOW_DEFINITIONS,
  rotateAroundTransform,
  scaleAroundTransform,
  multiplyTransform,
  type TransformationMatrix,
} from "@glade/flash";
import { toColorObject } from "@glade/flash/types.ts";
import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };

// Embed font as base64 at build time via Bun macro
const interFontBase64 = COMPTIME_embedAsBase64(
  "../../assets/InterVariable.ttf"
) as unknown as string;

/**
 * Decode base64 to Uint8Array (works in both browser and Node/Bun)
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export interface FlashDemoResources {
  renderer: FlashRenderer;
  rectPipeline: RectPipeline;
  shadowPipeline: ShadowPipeline;
  textPipeline: TextPipeline | null;
  textSystem: TextSystem | null;
  scene: FlashScene;
  layoutEngine: FlashLayoutEngine;
  scrollOffset: { x: number; y: number };
  scrollMaxY: number;
  currentCursor: string;
  fontLoaded: boolean;
}

/**
 * Simple layout/paint system for the demo.
 * This directly renders div trees to the scene without the full FlashApp framework.
 */
interface DivRenderContext {
  scene: FlashScene;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  setCursor: (cursor: string) => void;
}

/**
 * Render a div element tree directly to the scene.
 * This is a simplified version of what FlashWindow does.
 */
function renderDiv(
  element: FlashDiv,
  bounds: Bounds,
  ctx: DivRenderContext,
  transform?: TransformationMatrix
): void {
  // Access internal styles via a workaround (in a real app, we'd use the proper paint context)
  // TypeScript's private is only compile-time, so runtime access works
  const elementAny = element as unknown as {
    styles: Record<string, unknown>;
    hoverStyles: Record<string, unknown> | null;
    activeStyles: Record<string, unknown> | null;
  };
  const styles = elementAny.styles || {};
  const elementTransform = styles.transform as TransformationMatrix | undefined;

  // Compose transforms if both are present
  const effectiveTransform = elementTransform
    ? transform
      ? multiplyTransform(transform, elementTransform)
      : elementTransform
    : transform;

  const isHovered =
    ctx.mouseX >= bounds.x &&
    ctx.mouseX < bounds.x + bounds.width &&
    ctx.mouseY >= bounds.y &&
    ctx.mouseY < bounds.y + bounds.height;

  const isActive = isHovered && ctx.mouseDown;

  // Get effective styles (apply hover/active overrides)
  let effectiveStyles = { ...styles };
  const hoverStyles = elementAny.hoverStyles;
  const activeStyles = elementAny.activeStyles;

  if (isHovered && hoverStyles) {
    effectiveStyles = { ...effectiveStyles, ...hoverStyles };
  }
  if (isActive && activeStyles) {
    effectiveStyles = { ...effectiveStyles, ...activeStyles };
  }

  // Update cursor if hovered and element has a cursor style
  const cursor = effectiveStyles.cursor as string | undefined;
  if (isHovered && cursor) {
    ctx.setCursor(cursor);
  }

  // Paint shadow
  const shadow = effectiveStyles.shadow as string | undefined;
  if (shadow && shadow !== "none") {
    const def = SHADOW_DEFINITIONS[shadow as keyof typeof SHADOW_DEFINITIONS];
    if (def) {
      ctx.scene.addShadow({
        x: bounds.x,
        y: bounds.y + def.offsetY,
        width: bounds.width,
        height: bounds.height,
        cornerRadius: (effectiveStyles.borderRadius as number) ?? 0,
        color: { r: 0, g: 0, b: 0, a: def.opacity },
        blur: def.blur,
        offsetX: 0,
        offsetY: def.offsetY,
        transform: effectiveTransform,
      });
    }
  }

  // Paint background
  const bgColor = effectiveStyles.backgroundColor as Color | undefined;

  // Debug: count renders per frame
  const debugState = renderDiv as unknown as { debugCount: number; logged: boolean };
  debugState.debugCount = (debugState.debugCount || 0) + 1;

  if (bgColor) {
    ctx.scene.addRect({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      color: toColorObject(bgColor),
      cornerRadius: (effectiveStyles.borderRadius as number) ?? 0,
      borderWidth: (effectiveStyles.borderWidth as number) ?? 0,
      borderColor: toColorObject(
        (effectiveStyles.borderColor as Color) ?? { r: 0, g: 0, b: 0, a: 0 }
      ),
      transform: effectiveTransform,
    });
  }

  // Paint border (if no background but has border)
  const borderWidth = effectiveStyles.borderWidth as number | undefined;
  const borderColor = effectiveStyles.borderColor as Color | undefined;
  if (borderWidth && borderColor && !bgColor) {
    ctx.scene.addRect({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      color: { r: 0, g: 0, b: 0, a: 0 },
      cornerRadius: (effectiveStyles.borderRadius as number) ?? 0,
      borderWidth,
      borderColor: toColorObject(borderColor),
      transform: effectiveTransform,
    });
  }
}

/**
 * Initialize the Flash demo.
 */
export function initFlashDemo(ctx: WebGPUContext, format: GPUTextureFormat): FlashDemoResources {
  const { device } = ctx;

  // Create renderer
  const renderer = new FlashRenderer(device, format, {
    clearColor: { r: 0.08, g: 0.08, b: 0.12, a: 1.0 },
  });

  // Create pipelines
  const rectPipeline = new RectPipeline(device, format, renderer.getUniformBindGroupLayout());
  const shadowPipeline = new ShadowPipeline(device, format, renderer.getUniformBindGroupLayout());

  // Set pipelines on renderer
  renderer.setRectPipeline(rectPipeline);
  renderer.setShadowPipeline(shadowPipeline);

  // Create text system and pipeline (will initialize font asynchronously)
  const textSystem = new TextSystem(device);
  const textPipeline = new TextPipeline(device, format, textSystem);
  renderer.setTextPipeline(textPipeline, textSystem);

  // Create scene
  const scene = new FlashScene();

  // Create layout engine (Taffy-powered flexbox)
  const layoutEngine = new FlashLayoutEngine();

  // Initialize scroll offset
  const scrollOffset = { x: 0, y: 0 };

  // Calculate max scroll for the scroll demo
  // Content: 12 items * (35 height + 8 gap) + 20 padding = 536
  // Viewport: 180
  // Max scroll: 536 - 180 = 356
  const numItems = 12;
  const itemHeight = 35;
  const itemGap = 8;
  const itemPadding = 10;
  const contentHeight = numItems * (itemHeight + itemGap) + itemPadding * 2;
  const viewportHeight = 180;
  const scrollMaxY = Math.max(0, contentHeight - viewportHeight);

  return {
    renderer,
    rectPipeline,
    shadowPipeline,
    textPipeline,
    textSystem,
    scene,
    layoutEngine,
    scrollOffset,
    scrollMaxY,
    currentCursor: "default",
    fontLoaded: false,
  };
}

/**
 * Load fonts for the Flash demo.
 * Call this once after initFlashDemo.
 * Uses embedded font data (via Bun macro) for cross-platform compatibility.
 */
export function loadFlashDemoFonts(resources: FlashDemoResources): void {
  if (resources.fontLoaded || !resources.textSystem) {
    return;
  }

  try {
    const fontData = base64ToBytes(interFontBase64);
    resources.textSystem.registerFont("Inter", fontData);
    resources.fontLoaded = true;
    console.log("Loaded Inter font for text rendering");
  } catch (e) {
    console.warn("Failed to load font:", e);
  }
}

/**
 * Handle scroll input for the Flash demo.
 */
export function handleFlashScroll(
  resources: FlashDemoResources,
  deltaX: number,
  deltaY: number
): void {
  // Positive delta = scroll down = increase offset (see content below)
  // This matches natural scrolling (two-finger swipe up -> see content below)
  resources.scrollOffset.x += deltaX;
  resources.scrollOffset.y += deltaY;
  // Clamp scroll offset to valid range
  resources.scrollOffset.x = Math.max(0, Math.min(resources.scrollOffset.x, 0)); // No horizontal scroll
  resources.scrollOffset.y = Math.max(0, Math.min(resources.scrollOffset.y, resources.scrollMaxY));
}

/**
 * Render the Flash demo.
 */
export function renderFlashDemo(
  ctx: WebGPUContext,
  resources: FlashDemoResources,
  time: number,
  _deltaTime: number,
  mouseX: number,
  mouseY: number
): void {
  const { context } = ctx;
  const { renderer, scene, layoutEngine, scrollOffset } = resources;

  // Clear scene for new frame
  scene.clear();
  layoutEngine.clear();

  // Reset cursor to default at start of frame
  resources.currentCursor = "default";

  // Build UI scene
  // Reset debug counter each frame
  const debugState = renderDiv as unknown as { debugCount: number; logged: boolean };
  debugState.debugCount = 0;

  // Use logical coordinates (window size) for UI, not framebuffer size
  // For native contexts, windowWidth/windowHeight are logical coordinates
  // For browser contexts, width/height are already logical (canvas dimensions)
  // Mouse coordinates from GLFW are always in window (logical) coordinates
  const ctxAny = ctx as {
    windowWidth?: number;
    windowHeight?: number;
    setCursor?: (style: string) => void;
  };
  const logicalWidth = ctxAny.windowWidth ?? ctx.width;
  const logicalHeight = ctxAny.windowHeight ?? ctx.height;

  buildDemoScene(
    scene,
    layoutEngine,
    logicalWidth,
    logicalHeight,
    time,
    mouseX,
    mouseY,
    scrollOffset,
    (cursor: string) => {
      resources.currentCursor = cursor;
    },
    resources.textSystem,
    resources.fontLoaded
  );

  // Apply cursor to platform
  if (ctxAny.setCursor) {
    ctxAny.setCursor(resources.currentCursor);
  }

  // Render scene - use logical coordinates for UI, framebuffer size for GPU viewport
  const texture = context.getCurrentTexture();
  // Debug: log texture size once
  const flashDebug = renderFlashDemo as unknown as { loggedTextureSize?: boolean };
  if (!flashDebug.loggedTextureSize) {
    flashDebug.loggedTextureSize = true;
    console.log(
      `Texture size: ${texture.width}x${texture.height}, ctx.size: ${ctx.width}x${ctx.height}`
    );
  }
  const textureView = texture.createView();
  renderer.render(scene, textureView, logicalWidth, logicalHeight, ctx.width, ctx.height);

  // Present if needed (native contexts)
  if ("present" in context && typeof context.present === "function") {
    (context as unknown as { present: () => void }).present();
  }
}

/**
 * Build the demo UI scene with various Flash elements.
 * Demonstrates both low-level scene primitives and div() element API.
 */
function buildDemoScene(
  scene: FlashScene,
  layoutEngine: FlashLayoutEngine,
  width: number,
  height: number,
  time: number,
  mouseX: number,
  mouseY: number,
  scrollOffset: { x: number; y: number },
  setCursor: (cursor: string) => void,
  textSystem: TextSystem | null,
  fontLoaded: boolean
): void {
  const centerX = width / 2;
  const centerY = height / 2;

  // Create render context for div elements
  const ctx: DivRenderContext = { scene, mouseX, mouseY, mouseDown: false, setCursor };

  // ============ Main Window Panel (using div API) ============

  // Background panel using div with shadow
  const panelX = centerX - 300;
  const panelY = centerY - 200;

  const panel = div()
    .bg({ r: 0.15, g: 0.15, b: 0.2, a: 1 })
    .rounded(16)
    .border(1)
    .borderColor({ r: 0.3, g: 0.3, b: 0.4, a: 1 })
    .shadowLg();

  renderDiv(panel, { x: panelX, y: panelY, width: 600, height: 400 }, ctx);

  // Title bar using div
  const titleBar = div().bg({ r: 0.12, g: 0.12, b: 0.18, a: 1 }).rounded(16);

  renderDiv(titleBar, { x: panelX, y: panelY, width: 600, height: 50 }, ctx);

  // Cover bottom corners of title bar
  const titleBarBottom = div().bg({ r: 0.12, g: 0.12, b: 0.18, a: 1 });

  renderDiv(titleBarBottom, { x: panelX, y: panelY + 40, width: 600, height: 10 }, ctx);

  // ============ Window Controls (using div API for circles) ============

  const controlColors = [
    rgb(0xff5f56), // Red - close
    rgb(0xffbd2e), // Yellow - minimize
    rgb(0x27c93f), // Green - maximize
  ];

  for (let i = 0; i < 3; i++) {
    const size = 16;
    const controlX = panelX + 20 + i * 24;
    const controlY = panelY + 18;

    const control = div().bg(controlColors[i]!).roundedFull(); // Makes it a circle

    // Debug: log first circle's data once
    if (i === 0) {
      const debugState = buildDemoScene as unknown as { loggedCircle?: boolean };
      if (!debugState.loggedCircle) {
        debugState.loggedCircle = true;
        console.log(`Circle: size=${size}, borderRadius=9999`);
      }
    }

    renderDiv(control, { x: controlX, y: controlY, width: size, height: size }, ctx);
  }

  // ============ Text Demo ============
  // Render text if font is loaded
  if (fontLoaded && textSystem) {
    // Title text
    const titleGlyphs = textSystem.prepareGlyphInstances(
      "Flash Text Rendering",
      panelX + 100,
      panelY + 30,
      18,
      24,
      { r: 1, g: 1, b: 1, a: 1 },
      "Inter"
    );
    for (const glyph of titleGlyphs) {
      scene.addGlyph(glyph as GlyphInstance);
    }

    // Description text
    const descGlyphs = textSystem.prepareGlyphInstances(
      "GPU-accelerated text with cosmic-text shaping",
      panelX + 20,
      panelY + 70,
      14,
      20,
      { r: 0.7, g: 0.7, b: 0.8, a: 1 },
      "Inter"
    );
    for (const glyph of descGlyphs) {
      scene.addGlyph(glyph as GlyphInstance);
    }

    // Animated text with color
    const animHue = (time * 0.2) % 1;
    const animColor = hslToRgb(animHue, 0.8, 0.6);
    const animGlyphs = textSystem.prepareGlyphInstances(
      "Rainbow Text Demo ✨",
      panelX + 20,
      panelY + 100,
      16,
      22,
      animColor,
      "Inter"
    );
    for (const glyph of animGlyphs) {
      scene.addGlyph(glyph as GlyphInstance);
    }
  }

  // ============ Interactive Buttons (using div with hover states) ============

  const buttonWidth = 120;
  const buttonHeight = 40;
  const buttonSpacing = 20;
  const buttonsStartX = centerX - (3 * buttonWidth + 2 * buttonSpacing) / 2;
  const buttonsY = centerY - 80;

  const buttonConfigs = [
    { bg: rgb(0x3b82f6), hover: rgb(0x2563eb), label: "Primary" },
    { bg: rgb(0x10b981), hover: rgb(0x059669), label: "Success" },
    { bg: rgb(0xf59e0b), hover: rgb(0xd97706), label: "Warning" },
  ];

  for (let i = 0; i < 3; i++) {
    const btnX = buttonsStartX + i * (buttonWidth + buttonSpacing);
    const config = buttonConfigs[i]!;

    // Create button with hover effect using div API
    const button = div()
      .bg(config.bg)
      .roundedLg()
      .shadowMd()
      .cursorPointer()
      .hover((s) => s.bg(config.hover).shadow("lg"));

    renderDiv(button, { x: btnX, y: buttonsY, width: buttonWidth, height: buttonHeight }, ctx);
  }

  // ============ Animated Cards (mix of div API and direct primitives) ============

  const cardWidth = 160;
  const cardHeight = 100;
  const cardSpacing = 20;
  const cardsStartX = centerX - (3 * cardWidth + 2 * cardSpacing) / 2;
  const cardsY = centerY + 20;

  for (let i = 0; i < 3; i++) {
    const cardX = cardsStartX + i * (cardWidth + cardSpacing);
    const phase = time * 2 + i * 0.8;
    const yOffset = Math.sin(phase) * 5;

    // Animated hue
    const hue = (i * 0.15 + time * 0.1) % 1;
    const cardColor = hslToRgb(hue, 0.6, 0.5);

    // Card using div API
    const card = div()
      .bg(cardColor)
      .roundedXl()
      .border(2)
      .borderColor({ ...cardColor, a: 0.3 })
      .shadowLg();

    renderDiv(card, { x: cardX, y: cardsY + yOffset, width: cardWidth, height: cardHeight }, ctx);

    // Inner decorations (skeleton lines) using div
    const line1 = div().bg({ r: 1, g: 1, b: 1, a: 0.3 }).rounded(4);
    renderDiv(
      line1,
      { x: cardX + 15, y: cardsY + yOffset + 15, width: cardWidth - 30, height: 8 },
      ctx
    );

    const line2 = div().bg({ r: 1, g: 1, b: 1, a: 0.2 }).rounded(3);
    renderDiv(
      line2,
      { x: cardX + 15, y: cardsY + yOffset + 30, width: (cardWidth - 30) * 0.6, height: 6 },
      ctx
    );
  }

  // ============ Mouse Follower (using div for the circle) ============

  const followerSize = 30 + Math.sin(time * 3) * 5;

  // Glow effect (still using primitives for blur)
  scene.addShadow({
    x: mouseX - followerSize / 2,
    y: mouseY - followerSize / 2,
    width: followerSize,
    height: followerSize,
    cornerRadius: followerSize / 2,
    color: rgba(0x6366f180),
    blur: 20,
    offsetX: 0,
    offsetY: 0,
  });

  // Follower circle using div
  const follower = div()
    .bg(rgb(0x6366f1))
    .roundedFull()
    .border(2)
    .borderColor({ r: 1, g: 1, b: 1, a: 0.5 });

  renderDiv(
    follower,
    {
      x: mouseX - followerSize / 2,
      y: mouseY - followerSize / 2,
      width: followerSize,
      height: followerSize,
    },
    ctx
  );

  // ============ Corner Decorations (using div with animation) ============

  const cornerSize = 60;
  const corners = [
    { x: 20, y: 20 },
    { x: width - 20 - cornerSize, y: 20 },
    { x: 20, y: height - 20 - cornerSize },
    { x: width - 20 - cornerSize, y: height - 20 - cornerSize },
  ];

  for (let i = 0; i < corners.length; i++) {
    const corner = corners[i]!;
    const pulse = 0.8 + Math.sin(time * 2 + i * 1.5) * 0.2;

    const cornerDiv = div()
      .bg({ r: 0.2 * pulse, g: 0.2 * pulse, b: 0.3 * pulse, a: 0.5 })
      .roundedXl()
      .border(1)
      .borderColor({ r: 0.4, g: 0.4, b: 0.6, a: 0.5 * pulse });

    renderDiv(cornerDiv, { x: corner.x, y: corner.y, width: cornerSize, height: cornerSize }, ctx);
  }

  // ============ Status Bar at Bottom (new element using div) ============

  const statusBar = div().bg({ r: 0.1, g: 0.1, b: 0.15, a: 0.9 }).roundedLg();

  renderDiv(statusBar, { x: panelX + 20, y: panelY + 350, width: 560, height: 30 }, ctx);

  // Status indicators
  const statusColors = [
    { color: rgb(0x22c55e), label: "Online" },
    { color: rgb(0xeab308), label: "Syncing" },
    { color: rgb(0x3b82f6), label: "Ready" },
  ];

  for (let i = 0; i < 3; i++) {
    const dotX = panelX + 40 + i * 80;
    const dotY = panelY + 358;

    const statusDot = div().bg(statusColors[i]!.color).roundedFull();

    renderDiv(statusDot, { x: dotX, y: dotY, width: 12, height: 12 }, ctx);
  }

  // ============ Clipping Demo (demonstrates content masking) ============

  buildClippingDemo(scene, width, time, ctx);

  // ============ Transform Demo (demonstrates rotation, scale, translation) ============

  buildTransformDemo(scene, width, height, time, ctx);

  // ============ Flexbox Layout Demo (using Taffy layout engine) ============

  buildFlexboxDemo(scene, layoutEngine, width, height, time, ctx);

  // ============ Scroll Demo (demonstrates scrollable content) ============

  buildScrollDemo(scene, width, height, scrollOffset, ctx);

  // ============ Hitbox Demo (demonstrates group hover and occlusion) ============

  buildHitboxDemo(scene, width, height, time, ctx);

  // ============ Cursor Demo (demonstrates cursor style changes) ============

  buildCursorDemo(scene, width, height, ctx);

  // ============ Drag & Drop Demo (demonstrates drag/drop API) ============

  buildDragDropDemo(scene, width, height, time, ctx);

  // ============ Tooltip Demo (demonstrates tooltip API) ============

  buildTooltipDemo(scene, width, height, time, ctx);
}

/**
 * Build a clipping demo to demonstrate content masking.
 * Shows content being clipped to a rounded rectangle region.
 */
function buildClippingDemo(
  scene: FlashScene,
  width: number,
  time: number,
  _ctx: DivRenderContext
): void {
  // Position on the left side
  const clipDemoX = 20;
  const clipDemoY = 100;
  const clipWidth = 200;
  const clipHeight = 140;

  // Draw the clip container background (this is NOT clipped - shows the boundary)
  scene.addRect({
    x: clipDemoX,
    y: clipDemoY,
    width: clipWidth,
    height: clipHeight,
    color: { r: 0.15, g: 0.15, b: 0.2, a: 1 },
    cornerRadius: 16,
    borderWidth: 2,
    borderColor: { r: 0.4, g: 0.4, b: 0.6, a: 1 },
  });

  // Push a content mask - everything after this will be clipped
  scene.pushContentMask({
    bounds: { x: clipDemoX, y: clipDemoY, width: clipWidth, height: clipHeight },
    cornerRadius: 16,
  });

  // Draw animated bars that extend beyond the clip region
  const numBars = 8;
  const barHeight = 20;
  const barGap = 5;

  for (let i = 0; i < numBars; i++) {
    const phase = time * 2 + i * 0.4;
    const barWidth = 80 + Math.sin(phase) * 60;
    const barX = clipDemoX - 20 + Math.cos(phase * 0.7) * 30;
    const barY = clipDemoY + 10 + i * (barHeight + barGap);

    const hue = (i / numBars + time * 0.1) % 1;
    const barColor = hslToRgb(hue, 0.7, 0.5);

    scene.addRect({
      x: barX,
      y: barY,
      width: barWidth,
      height: barHeight,
      color: barColor,
      cornerRadius: 4,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }

  // Draw a circle that moves in and out of the clip region
  const circleRadius = 25;
  const circleX = clipDemoX + clipWidth / 2 + Math.sin(time * 1.5) * 120;
  const circleY = clipDemoY + clipHeight / 2;

  scene.addRect({
    x: circleX - circleRadius,
    y: circleY - circleRadius,
    width: circleRadius * 2,
    height: circleRadius * 2,
    color: { r: 1, g: 1, b: 1, a: 0.9 },
    cornerRadius: circleRadius,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });

  // Pop the content mask - back to normal rendering
  scene.popContentMask();

  // Label below the demo (not clipped)
  scene.addRect({
    x: clipDemoX,
    y: clipDemoY + clipHeight + 10,
    width: clipWidth,
    height: 24,
    color: { r: 0.1, g: 0.1, b: 0.15, a: 0.8 },
    cornerRadius: 4,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });
}

/**
 * Build a transform demo to show rotation, scale, and translation.
 */
function buildTransformDemo(
  scene: FlashScene,
  _width: number,
  height: number,
  time: number,
  ctx: DivRenderContext
): void {
  // Position below the clipping demo on the left side
  const demoX = 20;
  const demoY = height - 200;
  const demoWidth = 200;
  const demoHeight = 160;

  // Draw container background
  scene.addRect({
    x: demoX,
    y: demoY,
    width: demoWidth,
    height: demoHeight,
    color: { r: 0.12, g: 0.12, b: 0.18, a: 0.95 },
    cornerRadius: 12,
    borderWidth: 1,
    borderColor: { r: 0.3, g: 0.3, b: 0.4, a: 1 },
  });

  // ============ Rotating Rectangles ============
  const centerX = demoX + demoWidth / 2;
  const centerY = demoY + demoHeight / 2;

  // Draw multiple rotating rectangles with different phases
  const numRects = 4;
  const rectSize = 40;

  for (let i = 0; i < numRects; i++) {
    const angle = time * (1 + i * 0.3) + (i * Math.PI) / 2;
    const distance = 35 + i * 5;
    const rectX = centerX + Math.cos(angle) * distance - rectSize / 2;
    const rectY = centerY + Math.sin(angle) * distance - rectSize / 2;

    // Create rotation around the rect's center
    const rectCenterX = rectX + rectSize / 2;
    const rectCenterY = rectY + rectSize / 2;
    const rotationAngle = time * 2 + i * 0.5;
    const rotateTransform = rotateAroundTransform(rotationAngle, rectCenterX, rectCenterY);

    // Animated scale
    const scaleValue = 0.7 + Math.sin(time * 3 + i) * 0.3;
    const scaleT = scaleAroundTransform(scaleValue, scaleValue, rectCenterX, rectCenterY);

    // Combine rotation and scale
    const combinedTransform = multiplyTransform(rotateTransform, scaleT);

    const hue = (i / numRects + time * 0.1) % 1;
    const rectColor = hslToRgb(hue, 0.7, 0.5);

    const rectDiv = div().bg(rectColor).rounded(6);

    renderDiv(
      rectDiv,
      { x: rectX, y: rectY, width: rectSize, height: rectSize },
      ctx,
      combinedTransform
    );
  }

  // ============ Pulsing/Scaling Center Element ============
  const pulseScale = 0.8 + Math.sin(time * 4) * 0.2;
  const pulseSize = 30;
  const pulseX = centerX - pulseSize / 2;
  const pulseY = centerY - pulseSize / 2;

  const pulseTransform = scaleAroundTransform(pulseScale, pulseScale, centerX, centerY);

  const pulseDiv = div().bg(rgb(0xffffff)).roundedFull();

  renderDiv(
    pulseDiv,
    { x: pulseX, y: pulseY, width: pulseSize, height: pulseSize },
    ctx,
    pulseTransform
  );

  // Label below
  scene.addRect({
    x: demoX,
    y: demoY + demoHeight + 10,
    width: demoWidth,
    height: 24,
    color: { r: 0.1, g: 0.1, b: 0.15, a: 0.8 },
    cornerRadius: 4,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });
}

/**
 * Build a hitbox demo to demonstrate the new hitbox system features.
 * Shows:
 * - Group hover effects (hovering one element highlights others)
 * - Hitbox occlusion (modal blocking hover on elements behind)
 * - blockMouseExceptScroll behavior
 */
function buildHitboxDemo(
  scene: FlashScene,
  width: number,
  height: number,
  time: number,
  ctx: DivRenderContext
): void {
  // Position the hitbox demo panel - bottom right area
  const panelX = width - 280;
  const panelY = height - 220;
  const panelWidth = 260;
  const panelHeight = 200;

  // Panel background
  scene.addRect({
    x: panelX,
    y: panelY,
    width: panelWidth,
    height: panelHeight,
    color: { r: 0.12, g: 0.12, b: 0.18, a: 0.95 },
    cornerRadius: 12,
    borderWidth: 1,
    borderColor: { r: 0.3, g: 0.3, b: 0.4, a: 1 },
  });

  // Title bar
  scene.addRect({
    x: panelX + 10,
    y: panelY + 10,
    width: panelWidth - 20,
    height: 24,
    color: { r: 0.08, g: 0.08, b: 0.12, a: 1 },
    cornerRadius: 6,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });

  // ============ Group Hover Demo ============
  // Three buttons in a group - hovering one highlights all
  const groupY = panelY + 50;
  const buttonWidth = 70;
  const buttonHeight = 36;
  const buttonGap = 10;
  const groupStartX = panelX + (panelWidth - 3 * buttonWidth - 2 * buttonGap) / 2;

  // Use div() with .group() and .groupHover() for coordinated hover effects
  for (let i = 0; i < 3; i++) {
    const btnX = groupStartX + i * (buttonWidth + buttonGap);

    // Check if mouse is hovering any button in the group
    const isAnyHovered =
      ctx.mouseX >= groupStartX &&
      ctx.mouseX < groupStartX + 3 * buttonWidth + 2 * buttonGap &&
      ctx.mouseY >= groupY &&
      ctx.mouseY < groupY + buttonHeight;

    // Check if THIS button is hovered
    const isThisHovered =
      ctx.mouseX >= btnX &&
      ctx.mouseX < btnX + buttonWidth &&
      ctx.mouseY >= groupY &&
      ctx.mouseY < groupY + buttonHeight;

    // Group hover/active: all buttons get subtle highlight when any is hovered/clicked
    // Individual hover: the specific button gets stronger highlight
    const isAnyActive = isAnyHovered && ctx.mouseDown;
    const isThisActive = isThisHovered && ctx.mouseDown;

    let buttonColor: Color;
    let borderColor: Color;

    if (isThisActive) {
      // Direct active (mouse down) - brightest
      buttonColor = rgb(0x818cf8);
      borderColor = rgb(0xc7d2fe);
    } else if (isAnyActive) {
      // Group active - medium bright
      buttonColor = rgb(0x6366f1);
      borderColor = rgb(0xa5b4fc);
    } else if (isThisHovered) {
      // Direct hover - bright highlight
      buttonColor = rgb(0x6366f1);
      borderColor = rgb(0xa5b4fc);
    } else if (isAnyHovered) {
      // Group hover - subtle highlight
      buttonColor = rgb(0x4338ca);
      borderColor = rgb(0x6366f1);
    } else {
      // Normal state
      buttonColor = rgb(0x3730a3);
      borderColor = { r: 0.3, g: 0.3, b: 0.5, a: 1 };
    }

    // Create button using div() with group hover/active styling
    // Note: This demo shows the visual effect manually since renderDiv doesn't
    // use the full FlashApp framework with hitbox tracking
    // In the full framework, you would use:
    //   .group("button-group")
    //   .groupHover("button-group", s => s.bg(rgb(0x4338ca)))
    //   .groupActive("button-group", s => s.bg(rgb(0x6366f1)))
    const button = div()
      .bg(buttonColor)
      .rounded(8)
      .border(2)
      .borderColor(borderColor)
      .group("button-group")
      .groupHover("button-group", (s) => s.bg(rgb(0x4338ca)).borderColor(rgb(0x6366f1)))
      .groupActive("button-group", (s) => s.bg(rgb(0x6366f1)).borderColor(rgb(0xa5b4fc)));

    renderDiv(button, { x: btnX, y: groupY, width: buttonWidth, height: buttonHeight }, ctx);

    // Inner label indicator - brighter when active, medium when hovered
    const labelWidth = buttonWidth - 16;
    const labelHeight = 8;
    const labelAlpha = isThisActive ? 0.7 : isThisHovered ? 0.5 : isAnyActive ? 0.4 : 0.2;
    scene.addRect({
      x: btnX + 8,
      y: groupY + (buttonHeight - labelHeight) / 2,
      width: labelWidth,
      height: labelHeight,
      color: { r: 1, g: 1, b: 1, a: labelAlpha },
      cornerRadius: 4,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }

  // ============ Occlusion Demo ============
  // Shows how occludeMouse() blocks hover on elements behind
  const occlusionY = panelY + 100;

  // Background elements (would be blocked by overlay)
  for (let i = 0; i < 3; i++) {
    const elemX = panelX + 20 + i * 75;
    const elemWidth = 60;
    const elemHeight = 30;

    // Check if hovered (but in real hitbox system, occlusion would block this)
    const isHovered =
      ctx.mouseX >= elemX &&
      ctx.mouseX < elemX + elemWidth &&
      ctx.mouseY >= occlusionY &&
      ctx.mouseY < occlusionY + elemHeight;

    const elemColor = isHovered ? rgb(0x22c55e) : rgb(0x166534);

    scene.addRect({
      x: elemX,
      y: occlusionY,
      width: elemWidth,
      height: elemHeight,
      color: elemColor,
      cornerRadius: 6,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }

  // ============ Animated Occlusion Overlay ============
  // A semi-transparent overlay that moves back and forth
  // When over an element, it blocks hover (demonstrated visually)
  const overlayWidth = 80;
  const overlayHeight = 50;
  const overlayRange = panelWidth - overlayWidth - 40;
  const overlayX = panelX + 20 + (Math.sin(time * 1.5) * 0.5 + 0.5) * overlayRange;
  const overlayY = occlusionY - 10;

  // Check if mouse is over the overlay
  const isOverlayHovered =
    ctx.mouseX >= overlayX &&
    ctx.mouseX < overlayX + overlayWidth &&
    ctx.mouseY >= overlayY &&
    ctx.mouseY < overlayY + overlayHeight;

  // Overlay with occludeMouse() behavior indicator
  // In a real FlashApp, this would use .occludeMouse() to block elements behind
  const overlayDiv = div()
    .bg({ r: 0.1, g: 0.1, b: 0.2, a: 0.85 })
    .rounded(10)
    .border(2)
    .borderColor(isOverlayHovered ? rgb(0xf97316) : { r: 0.5, g: 0.5, b: 0.6, a: 0.8 })
    .occludeMouse(); // Would block mouse events for elements behind

  renderDiv(
    overlayDiv,
    { x: overlayX, y: overlayY, width: overlayWidth, height: overlayHeight },
    ctx
  );

  // Overlay indicator pattern (stripes to show it's an overlay)
  for (let i = 0; i < 3; i++) {
    scene.addRect({
      x: overlayX + 10 + i * 22,
      y: overlayY + overlayHeight / 2 - 2,
      width: 16,
      height: 4,
      color: { r: 1, g: 1, b: 1, a: isOverlayHovered ? 0.4 : 0.2 },
      cornerRadius: 2,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }

  // ============ Info Label ============
  scene.addRect({
    x: panelX + 10,
    y: panelY + panelHeight - 35,
    width: panelWidth - 20,
    height: 25,
    color: { r: 0.08, g: 0.08, b: 0.12, a: 0.9 },
    cornerRadius: 6,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });

  // "Hitbox Demo" text indicator dots
  for (let i = 0; i < 5; i++) {
    scene.addRect({
      x: panelX + 30 + i * 20,
      y: panelY + panelHeight - 26,
      width: 8,
      height: 8,
      color: hslToRgb((i / 5 + time * 0.2) % 1, 0.7, 0.5),
      cornerRadius: 4,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }
}

/**
 * Convert HSL to RGB color.
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number; a: number } {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
      }
      if (t < 1 / 2) {
        return q;
      }
      if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
      }
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r, g, b, a: 1 };
}

/**
 * Build a flexbox layout demo using the Taffy-powered layout engine.
 * Demonstrates real CSS flexbox layout with gap, justify-content, align-items, etc.
 */
function buildFlexboxDemo(
  scene: FlashScene,
  layoutEngine: FlashLayoutEngine,
  width: number,
  height: number,
  time: number,
  ctx: DivRenderContext
): void {
  // Position the flexbox demo panel on the right side
  const panelX = width - 280;
  const panelY = 100;
  const panelWidth = 260;
  const panelHeight = 400;

  // Panel background
  const panelBg = div()
    .bg({ r: 0.12, g: 0.12, b: 0.18, a: 0.95 })
    .rounded(12)
    .border(1)
    .borderColor({ r: 0.3, g: 0.3, b: 0.4, a: 1 })
    .shadowLg();

  renderDiv(panelBg, { x: panelX, y: panelY, width: panelWidth, height: panelHeight }, ctx);

  // Title
  const titleBg = div().bg({ r: 0.08, g: 0.08, b: 0.12, a: 1 }).rounded(8);
  renderDiv(titleBg, { x: panelX + 10, y: panelY + 10, width: panelWidth - 20, height: 30 }, ctx);

  // ============ Flexbox Row Layout ============
  // Create a row container with children that flex

  const rowContainerX = panelX + 15;
  const rowContainerY = panelY + 55;
  const rowContainerWidth = panelWidth - 30;
  const rowContainerHeight = 50;

  // Create child layout nodes first (bottom-up like GPUI)
  const rowChildren = [];
  const numRowItems = 4;
  const itemWidth = 40;
  const animatedGap = 8 + Math.sin(time * 2) * 4;

  for (let i = 0; i < numRowItems; i++) {
    const childId = layoutEngine.requestLayout({
      width: itemWidth,
      height: 40,
    });
    rowChildren.push(childId);
  }

  // Create parent container with flexbox row layout
  const rowContainerId = layoutEngine.requestLayout(
    {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: animatedGap,
      paddingTop: 5,
      paddingBottom: 5,
      paddingLeft: 5,
      paddingRight: 5,
    },
    rowChildren
  );

  // Compute layout
  layoutEngine.computeLayout(rowContainerId, rowContainerWidth, rowContainerHeight);

  // Render container background
  const rowContainer = div().bg({ r: 0.18, g: 0.18, b: 0.25, a: 1 }).rounded(8);
  renderDiv(
    rowContainer,
    { x: rowContainerX, y: rowContainerY, width: rowContainerWidth, height: rowContainerHeight },
    ctx
  );

  // Render children using computed layout bounds
  const rowColors = [rgb(0xef4444), rgb(0xf59e0b), rgb(0x22c93f), rgb(0x3b82f6)];
  for (let i = 0; i < rowChildren.length; i++) {
    const childBounds = layoutEngine.layoutBounds(rowChildren[i]!);
    const itemDiv = div().bg(rowColors[i]!).rounded(6);
    renderDiv(
      itemDiv,
      {
        x: rowContainerX + childBounds.x,
        y: rowContainerY + childBounds.y,
        width: childBounds.width,
        height: childBounds.height,
      },
      ctx
    );
  }

  // ============ Flexbox Column Layout ============

  layoutEngine.clear();

  const colContainerX = panelX + 15;
  const colContainerY = panelY + 120;
  const colContainerWidth = 80;
  const colContainerHeight = 260;

  // Create column children with varying flex-grow
  const colChildren = [];
  const colItemConfigs = [
    { height: 30, flexGrow: 0 },
    { height: 20, flexGrow: 1 },
    { height: 20, flexGrow: 2 },
    { height: 30, flexGrow: 0 },
  ];

  for (const config of colItemConfigs) {
    const childId = layoutEngine.requestLayout({
      height: config.height,
      flexGrow: config.flexGrow,
      flexShrink: 1,
    });
    colChildren.push(childId);
  }

  // Create column container
  const colContainerId = layoutEngine.requestLayout(
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
      gap: 8,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 8,
      paddingRight: 8,
    },
    colChildren
  );

  layoutEngine.computeLayout(colContainerId, colContainerWidth, colContainerHeight);

  // Render column container
  const colContainer = div().bg({ r: 0.15, g: 0.2, b: 0.25, a: 1 }).rounded(8);
  renderDiv(
    colContainer,
    { x: colContainerX, y: colContainerY, width: colContainerWidth, height: colContainerHeight },
    ctx
  );

  // Render column children
  const colColors = [rgb(0x8b5cf6), rgb(0x06b6d4), rgb(0x10b981), rgb(0xf97316)];
  for (let i = 0; i < colChildren.length; i++) {
    const childBounds = layoutEngine.layoutBounds(colChildren[i]!);
    const itemDiv = div().bg(colColors[i]!).rounded(4);
    renderDiv(
      itemDiv,
      {
        x: colContainerX + childBounds.x,
        y: colContainerY + childBounds.y,
        width: childBounds.width,
        height: childBounds.height,
      },
      ctx
    );
  }

  // ============ Centered Grid Layout ============

  layoutEngine.clear();

  const gridContainerX = panelX + 110;
  const gridContainerY = panelY + 120;
  const gridContainerWidth = 135;
  const gridContainerHeight = 260;

  // Create a 3x3 grid using nested flex containers
  const gridRows = [];
  const gridSize = 35;
  const gridGap = 6;

  for (let row = 0; row < 3; row++) {
    const rowCells = [];
    for (let col = 0; col < 3; col++) {
      const cellId = layoutEngine.requestLayout({
        width: gridSize,
        height: gridSize,
      });
      rowCells.push(cellId);
    }

    const rowId = layoutEngine.requestLayout(
      {
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: gridGap,
      },
      rowCells
    );
    gridRows.push({ id: rowId, cells: rowCells });
  }

  const gridContainerId = layoutEngine.requestLayout(
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      gap: gridGap,
      paddingTop: 10,
      paddingBottom: 10,
      paddingLeft: 10,
      paddingRight: 10,
    },
    gridRows.map((r) => r.id)
  );

  layoutEngine.computeLayout(gridContainerId, gridContainerWidth, gridContainerHeight);

  // Render grid container
  const gridContainer = div().bg({ r: 0.2, g: 0.15, b: 0.25, a: 1 }).rounded(8);
  renderDiv(
    gridContainer,
    {
      x: gridContainerX,
      y: gridContainerY,
      width: gridContainerWidth,
      height: gridContainerHeight,
    },
    ctx
  );

  // Render grid cells with animation
  for (let row = 0; row < gridRows.length; row++) {
    const rowData = gridRows[row]!;
    for (let col = 0; col < rowData.cells.length; col++) {
      const cellId = rowData.cells[col]!;
      const cellBounds = layoutEngine.layoutBounds(cellId);

      const phase = time * 3 + row * 0.5 + col * 0.7;
      const hue = ((row * 3 + col) / 9 + time * 0.1) % 1;
      const pulse = 0.7 + Math.sin(phase) * 0.3;
      const cellColor = hslToRgb(hue, 0.7, 0.5 * pulse);

      const cellDiv = div().bg(cellColor).rounded(6);
      renderDiv(
        cellDiv,
        {
          x: gridContainerX + cellBounds.x,
          y: gridContainerY + cellBounds.y,
          width: cellBounds.width,
          height: cellBounds.height,
        },
        ctx
      );
    }
  }
}

/**
 * Build a scroll demo to demonstrate scrollable content.
 * Shows a scrollable container with content that extends beyond the viewport.
 * Use mouse wheel to scroll the content.
 */
function buildScrollDemo(
  scene: FlashScene,
  width: number,
  _height: number,
  scrollOffset: { x: number; y: number },
  _ctx: DivRenderContext
): void {
  // Position at bottom-left area
  const containerX = 20;
  const containerY = 260;
  const containerWidth = 200;
  const containerHeight = 180;

  // Draw the scroll container background (visible boundary)
  scene.addRect({
    x: containerX,
    y: containerY,
    width: containerWidth,
    height: containerHeight,
    color: { r: 0.12, g: 0.14, b: 0.18, a: 1 },
    cornerRadius: 12,
    borderWidth: 2,
    borderColor: { r: 0.3, g: 0.4, b: 0.5, a: 1 },
  });

  // Draw a label above the container
  scene.addRect({
    x: containerX,
    y: containerY - 25,
    width: 140,
    height: 20,
    color: { r: 0.2, g: 0.3, b: 0.4, a: 0.8 },
    cornerRadius: 4,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });

  // Push content mask for clipping
  scene.pushContentMask({
    bounds: { x: containerX, y: containerY, width: containerWidth, height: containerHeight },
    cornerRadius: 12,
  });

  // Content items (many items that extend beyond the viewport)
  const numItems = 12;
  const itemHeight = 35;
  const itemGap = 8;
  const itemPadding = 10;
  const contentHeight = numItems * (itemHeight + itemGap) + itemPadding * 2;

  // Clamp scroll offset to content bounds
  const maxScroll = Math.max(0, contentHeight - containerHeight);
  const clampedScrollY = Math.min(Math.max(0, scrollOffset.y), maxScroll);

  // Draw content items with scroll offset applied
  for (let i = 0; i < numItems; i++) {
    const itemY = containerY + itemPadding + i * (itemHeight + itemGap) - clampedScrollY;
    const itemWidth = containerWidth - itemPadding * 2;

    // Skip items completely outside the viewport
    if (itemY + itemHeight < containerY || itemY > containerY + containerHeight) {
      continue;
    }

    // Calculate item color (gradient)
    const hue = i / numItems;
    const itemColor = hslToRgb(hue, 0.6, 0.45);

    scene.addRect({
      x: containerX + itemPadding,
      y: itemY,
      width: itemWidth,
      height: itemHeight,
      color: itemColor,
      cornerRadius: 8,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });

    // Inner highlight
    scene.addRect({
      x: containerX + itemPadding + 8,
      y: itemY + 8,
      width: itemWidth * 0.6,
      height: 6,
      color: { r: 1, g: 1, b: 1, a: 0.3 },
      cornerRadius: 3,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }

  // Pop the content mask
  scene.popContentMask();

  // Draw scroll indicator (scrollbar)
  if (contentHeight > containerHeight) {
    const scrollbarWidth = 6;
    const scrollbarX = containerX + containerWidth - scrollbarWidth - 4;
    const scrollbarHeight = containerHeight - 16;
    const thumbHeight = Math.max(20, (containerHeight / contentHeight) * scrollbarHeight);
    const thumbY = containerY + 8 + (clampedScrollY / maxScroll) * (scrollbarHeight - thumbHeight);

    // Scrollbar track
    scene.addRect({
      x: scrollbarX,
      y: containerY + 8,
      width: scrollbarWidth,
      height: scrollbarHeight,
      color: { r: 0.2, g: 0.2, b: 0.25, a: 0.5 },
      cornerRadius: 3,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });

    // Scrollbar thumb
    scene.addRect({
      x: scrollbarX,
      y: thumbY,
      width: scrollbarWidth,
      height: thumbHeight,
      color: { r: 0.5, g: 0.6, b: 0.7, a: 0.8 },
      cornerRadius: 3,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }
}

/**
 * Build a cursor demo to demonstrate different cursor styles.
 * Shows various interactive elements with different cursor types.
 */
function buildCursorDemo(
  scene: FlashScene,
  width: number,
  _height: number,
  ctx: DivRenderContext
): void {
  // Position in the upper middle
  const panelX = 260;
  const panelY = 20;
  const panelWidth = 200;
  const panelHeight = 180;

  // Panel background
  const panelBg = div()
    .bg({ r: 0.12, g: 0.12, b: 0.18, a: 0.95 })
    .rounded(12)
    .border(1)
    .borderColor({ r: 0.3, g: 0.3, b: 0.4, a: 1 })
    .shadowMd();

  renderDiv(panelBg, { x: panelX, y: panelY, width: panelWidth, height: panelHeight }, ctx);

  // Title background
  scene.addRect({
    x: panelX + 10,
    y: panelY + 8,
    width: panelWidth - 20,
    height: 22,
    color: { r: 0.08, g: 0.08, b: 0.12, a: 1 },
    cornerRadius: 6,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });

  // Title indicator dots (spell out "CURSORS")
  for (let i = 0; i < 7; i++) {
    scene.addRect({
      x: panelX + 25 + i * 22,
      y: panelY + 14,
      width: 10,
      height: 10,
      color: hslToRgb(i / 7, 0.7, 0.5),
      cornerRadius: 5,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }

  // Cursor demo items - each with a different cursor style
  const cursorItems = [
    { cursor: "pointer" as const, color: rgb(0x3b82f6), label: "pointer" },
    { cursor: "text" as const, color: rgb(0x10b981), label: "text" },
    { cursor: "grab" as const, color: rgb(0xf59e0b), label: "grab" },
    { cursor: "move" as const, color: rgb(0x8b5cf6), label: "move" },
    { cursor: "not-allowed" as const, color: rgb(0xef4444), label: "not-allowed" },
  ];

  const itemWidth = (panelWidth - 30) / 2 - 5;
  const itemHeight = 28;
  const startY = panelY + 40;

  for (let i = 0; i < cursorItems.length; i++) {
    const item = cursorItems[i]!;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const itemX = panelX + 10 + col * (itemWidth + 10);
    const itemY = startY + row * (itemHeight + 8);

    // Check if mouse is over this item
    const isHovered =
      ctx.mouseX >= itemX &&
      ctx.mouseX < itemX + itemWidth &&
      ctx.mouseY >= itemY &&
      ctx.mouseY < itemY + itemHeight;

    // Create button with appropriate cursor
    const itemDiv = div()
      .bg(isHovered ? { ...item.color, a: 0.9 } : { ...item.color, a: 0.7 })
      .rounded(6)
      .border(isHovered ? 2 : 1)
      .borderColor(isHovered ? { r: 1, g: 1, b: 1, a: 0.5 } : { ...item.color, a: 0.3 })
      .cursor(item.cursor);

    renderDiv(itemDiv, { x: itemX, y: itemY, width: itemWidth, height: itemHeight }, ctx);

    // Label indicator (small icon based on cursor type)
    const iconSize = 8;
    const iconX = itemX + itemWidth / 2 - iconSize / 2;
    const iconY = itemY + itemHeight / 2 - iconSize / 2;

    scene.addRect({
      x: iconX,
      y: iconY,
      width: iconSize,
      height: iconSize,
      color: { r: 1, g: 1, b: 1, a: isHovered ? 0.9 : 0.6 },
      cornerRadius: item.cursor === "pointer" ? iconSize / 2 : 2,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }

  // Info text area at bottom
  scene.addRect({
    x: panelX + 10,
    y: panelY + panelHeight - 30,
    width: panelWidth - 20,
    height: 22,
    color: { r: 0.08, g: 0.08, b: 0.12, a: 0.8 },
    cornerRadius: 6,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });

  // Hint dots
  for (let i = 0; i < 3; i++) {
    scene.addRect({
      x: panelX + panelWidth / 2 - 20 + i * 15,
      y: panelY + panelHeight - 22,
      width: 6,
      height: 6,
      color: { r: 0.5, g: 0.5, b: 0.6, a: 0.6 },
      cornerRadius: 3,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }
}

/**
 * Build a drag and drop demo.
 * Shows draggable items and drop zones with visual feedback.
 * Note: This is a visual representation - full drag/drop requires FlashApp.
 */
function buildDragDropDemo(
  scene: FlashScene,
  width: number,
  _height: number,
  time: number,
  ctx: DivRenderContext
): void {
  // Position below the scroll demo
  const panelX = 20;
  const panelY = 520;
  const panelWidth = 200;
  const panelHeight = 120;

  // Panel background
  const panelBg = div()
    .bg({ r: 0.12, g: 0.14, b: 0.18, a: 0.95 })
    .rounded(12)
    .border(1)
    .borderColor({ r: 0.35, g: 0.25, b: 0.45, a: 1 })
    .shadowMd();

  renderDiv(panelBg, { x: panelX, y: panelY, width: panelWidth, height: panelHeight }, ctx);

  // Title indicator
  scene.addRect({
    x: panelX + 10,
    y: panelY + 8,
    width: 80,
    height: 4,
    color: rgb(0xa855f7),
    cornerRadius: 2,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });

  // Draggable items
  const itemColors = [rgb(0xef4444), rgb(0xf59e0b), rgb(0x22c55e)];
  const itemSize = 30;
  const itemGap = 10;

  for (let i = 0; i < 3; i++) {
    const baseX = panelX + 20 + i * (itemSize + itemGap);
    const baseY = panelY + 25;

    // Animate items slightly to show they're interactive
    const wobble = Math.sin(time * 3 + i * 1.5) * 2;
    const itemX = baseX + wobble;

    const isHovered =
      ctx.mouseX >= itemX &&
      ctx.mouseX < itemX + itemSize &&
      ctx.mouseY >= baseY &&
      ctx.mouseY < baseY + itemSize;

    const itemDiv = div()
      .bg(itemColors[i]!)
      .rounded(6)
      .border(isHovered ? 2 : 0)
      .borderColor({ r: 1, g: 1, b: 1, a: 0.8 })
      .cursorPointer();

    renderDiv(itemDiv, { x: itemX, y: baseY, width: itemSize, height: itemSize }, ctx);

    if (isHovered) {
      ctx.setCursor("grab");
    }
  }

  // Drop zone
  const dropZoneX = panelX + 15;
  const dropZoneY = panelY + 70;
  const dropZoneWidth = panelWidth - 30;
  const dropZoneHeight = 35;

  const isOverDropZone =
    ctx.mouseX >= dropZoneX &&
    ctx.mouseX < dropZoneX + dropZoneWidth &&
    ctx.mouseY >= dropZoneY &&
    ctx.mouseY < dropZoneY + dropZoneHeight;

  // Drop zone with drag-over highlighting
  const dropZone = div()
    .bg(isOverDropZone ? rgba(0xa855f740) : rgba(0x40404040))
    .rounded(8)
    .border(2)
    .borderColor(isOverDropZone ? rgb(0xa855f7) : rgba(0x60606080));

  renderDiv(
    dropZone,
    { x: dropZoneX, y: dropZoneY, width: dropZoneWidth, height: dropZoneHeight },
    ctx
  );

  // Drop zone indicator dots
  for (let i = 0; i < 3; i++) {
    scene.addRect({
      x: dropZoneX + dropZoneWidth / 2 - 15 + i * 12,
      y: dropZoneY + dropZoneHeight / 2 - 3,
      width: 6,
      height: 6,
      color: isOverDropZone
        ? { r: 0.66, g: 0.33, b: 0.97, a: 0.8 }
        : { r: 0.5, g: 0.5, b: 0.5, a: 0.4 },
      cornerRadius: 3,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }
}

/**
 * Build a tooltip demo.
 * Shows elements with hover tooltips.
 * Note: This is a visual representation - full tooltips require FlashApp.
 */
function buildTooltipDemo(
  scene: FlashScene,
  width: number,
  _height: number,
  time: number,
  ctx: DivRenderContext
): void {
  // Position to the right of drag/drop demo
  const panelX = 240;
  const panelY = 520;
  const panelWidth = 180;
  const panelHeight = 120;

  // Panel background
  const panelBg = div()
    .bg({ r: 0.12, g: 0.16, b: 0.14, a: 0.95 })
    .rounded(12)
    .border(1)
    .borderColor({ r: 0.25, g: 0.45, b: 0.35, a: 1 })
    .shadowMd();

  renderDiv(panelBg, { x: panelX, y: panelY, width: panelWidth, height: panelHeight }, ctx);

  // Title indicator
  scene.addRect({
    x: panelX + 10,
    y: panelY + 8,
    width: 60,
    height: 4,
    color: rgb(0x22c55e),
    cornerRadius: 2,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });

  // Tooltip target buttons
  const buttonConfigs = [
    { label: "?", tooltip: "Help info" },
    { label: "i", tooltip: "Details" },
    { label: "★", tooltip: "Favorite" },
  ];

  for (let i = 0; i < buttonConfigs.length; i++) {
    const btnX = panelX + 25 + i * 50;
    const btnY = panelY + 30;
    const btnSize = 36;

    const isHovered =
      ctx.mouseX >= btnX &&
      ctx.mouseX < btnX + btnSize &&
      ctx.mouseY >= btnY &&
      ctx.mouseY < btnY + btnSize;

    // Button with hover effect
    const btn = div()
      .bg(isHovered ? rgb(0x22c55e) : rgba(0x22c55e60))
      .roundedFull()
      .border(isHovered ? 2 : 1)
      .borderColor(isHovered ? { r: 1, g: 1, b: 1, a: 0.9 } : rgb(0x22c55e))
      .cursorPointer();

    renderDiv(btn, { x: btnX, y: btnY, width: btnSize, height: btnSize }, ctx);

    if (isHovered) {
      ctx.setCursor("pointer");

      // Show tooltip above the button
      const tooltipWidth = 70;
      const tooltipHeight = 24;
      const tooltipX = btnX + btnSize / 2 - tooltipWidth / 2;
      const tooltipY = btnY - tooltipHeight - 8;

      // Tooltip background
      scene.addRect({
        x: tooltipX,
        y: tooltipY,
        width: tooltipWidth,
        height: tooltipHeight,
        color: { r: 0.1, g: 0.1, b: 0.12, a: 0.95 },
        cornerRadius: 6,
        borderWidth: 1,
        borderColor: { r: 0.4, g: 0.4, b: 0.45, a: 1 },
      });

      // Tooltip arrow (small triangle approximation with rect)
      scene.addRect({
        x: btnX + btnSize / 2 - 4,
        y: tooltipY + tooltipHeight - 1,
        width: 8,
        height: 8,
        color: { r: 0.1, g: 0.1, b: 0.12, a: 0.95 },
        cornerRadius: 2,
        borderWidth: 0,
        borderColor: { r: 0, g: 0, b: 0, a: 0 },
      });

      // Tooltip text indicator (dots for now since we don't have text rendering)
      const textDots = buttonConfigs[i]!.tooltip.length / 3;
      for (let j = 0; j < Math.min(textDots, 5); j++) {
        scene.addRect({
          x: tooltipX + 10 + j * 10,
          y: tooltipY + tooltipHeight / 2 - 2,
          width: 6,
          height: 4,
          color: { r: 0.9, g: 0.9, b: 0.9, a: 0.9 },
          cornerRadius: 2,
          borderWidth: 0,
          borderColor: { r: 0, g: 0, b: 0, a: 0 },
        });
      }
    }

    // Button icon indicator
    scene.addRect({
      x: btnX + btnSize / 2 - 6,
      y: btnY + btnSize / 2 - 6,
      width: 12,
      height: 12,
      color: isHovered ? { r: 0.1, g: 0.1, b: 0.1, a: 0.9 } : { r: 0.9, g: 0.9, b: 0.9, a: 0.7 },
      cornerRadius: i === 2 ? 6 : 2, // Star icon is round
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }

  // Info bar at bottom
  scene.addRect({
    x: panelX + 10,
    y: panelY + panelHeight - 35,
    width: panelWidth - 20,
    height: 22,
    color: { r: 0.08, g: 0.12, b: 0.1, a: 0.8 },
    cornerRadius: 6,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });

  // Pulsing indicator to show tooltip functionality
  const pulse = 0.5 + Math.sin(time * 2) * 0.3;
  scene.addRect({
    x: panelX + panelWidth / 2 - 20,
    y: panelY + panelHeight - 28,
    width: 40,
    height: 8,
    color: { r: 0.13, g: 0.77, b: 0.37, a: pulse },
    cornerRadius: 4,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });
}
