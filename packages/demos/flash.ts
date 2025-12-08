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
  rgb,
  rgba,
  div,
  type FlashDiv,
  type Bounds,
  type Color,
  SHADOW_DEFINITIONS,
} from "@glade/flash";

export interface FlashDemoResources {
  renderer: FlashRenderer;
  rectPipeline: RectPipeline;
  shadowPipeline: ShadowPipeline;
  scene: FlashScene;
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
}

/**
 * Render a div element tree directly to the scene.
 * This is a simplified version of what FlashWindow does.
 */
function renderDiv(element: FlashDiv, bounds: Bounds, ctx: DivRenderContext): void {
  // Access internal styles via a workaround (in a real app, we'd use the proper paint context)
  // TypeScript's private is only compile-time, so runtime access works
  const elementAny = element as unknown as {
    styles: Record<string, unknown>;
    hoverStyles: Record<string, unknown> | null;
    activeStyles: Record<string, unknown> | null;
  };
  const styles = elementAny.styles || {};

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
      color: bgColor,
      cornerRadius: (effectiveStyles.borderRadius as number) ?? 0,
      borderWidth: (effectiveStyles.borderWidth as number) ?? 0,
      borderColor: (effectiveStyles.borderColor as Color) ?? { r: 0, g: 0, b: 0, a: 0 },
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
      borderColor,
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

  // Create scene
  const scene = new FlashScene();

  return {
    renderer,
    rectPipeline,
    shadowPipeline,
    scene,
  };
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
  const { renderer, scene } = resources;

  // Clear scene for new frame
  scene.clear();

  // Build UI scene
  // Reset debug counter each frame
  const debugState = renderDiv as unknown as { debugCount: number; logged: boolean };
  debugState.debugCount = 0;

  // Use logical coordinates (window size) for UI, not framebuffer size
  // For native contexts, windowWidth/windowHeight are logical coordinates
  // For browser contexts, width/height are already logical (canvas dimensions)
  // Mouse coordinates from GLFW are always in window (logical) coordinates
  const ctxAny = ctx as { windowWidth?: number; windowHeight?: number };
  const logicalWidth = ctxAny.windowWidth ?? ctx.width;
  const logicalHeight = ctxAny.windowHeight ?? ctx.height;

  buildDemoScene(scene, logicalWidth, logicalHeight, time, mouseX, mouseY);

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
  width: number,
  height: number,
  time: number,
  mouseX: number,
  mouseY: number
): void {
  const centerX = width / 2;
  const centerY = height / 2;

  // Create render context for div elements
  const ctx: DivRenderContext = { scene, mouseX, mouseY, mouseDown: false };

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
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
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
