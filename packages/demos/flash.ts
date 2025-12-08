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
  layoutEngine: FlashLayoutEngine;
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

  // Create layout engine (Taffy-powered flexbox)
  const layoutEngine = new FlashLayoutEngine();

  return {
    renderer,
    rectPipeline,
    shadowPipeline,
    scene,
    layoutEngine,
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
  const { renderer, scene, layoutEngine } = resources;

  // Clear scene for new frame
  scene.clear();
  layoutEngine.clear();

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

  buildDemoScene(scene, layoutEngine, logicalWidth, logicalHeight, time, mouseX, mouseY);

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

  // ============ Clipping Demo (demonstrates content masking) ============

  buildClippingDemo(scene, width, time, ctx);

  // ============ Flexbox Layout Demo (using Taffy layout engine) ============

  buildFlexboxDemo(scene, layoutEngine, width, height, time, ctx);
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
