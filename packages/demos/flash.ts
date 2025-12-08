/**
 * Flash GUI Demo
 *
 * Demonstrates the Flash UI framework's GPU-accelerated rendering
 * with rectangles, rounded corners, borders, and shadows.
 */

import type { WebGPUContext } from "@glade/core";
import { FlashScene, FlashRenderer, RectPipeline, ShadowPipeline, rgb, rgba } from "@glade/flash";

export interface FlashDemoResources {
  renderer: FlashRenderer;
  rectPipeline: RectPipeline;
  shadowPipeline: ShadowPipeline;
  scene: FlashScene;
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
  buildDemoScene(scene, ctx.width, ctx.height, time, mouseX, mouseY);

  // Render scene
  const textureView = context.getCurrentTexture().createView();
  renderer.render(scene, textureView, ctx.width, ctx.height);

  // Present if needed (native contexts)
  if ("present" in context && typeof context.present === "function") {
    (context as unknown as { present: () => void }).present();
  }
}

/**
 * Build the demo UI scene with various Flash elements.
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

  // Background panel with shadow
  scene.addShadow({
    x: centerX - 300,
    y: centerY - 200,
    width: 600,
    height: 400,
    cornerRadius: 16,
    color: { r: 0, g: 0, b: 0, a: 0.5 },
    blur: 30,
    offsetX: 0,
    offsetY: 10,
  });

  scene.addRect({
    x: centerX - 300,
    y: centerY - 200,
    width: 600,
    height: 400,
    color: { r: 0.15, g: 0.15, b: 0.2, a: 1 },
    cornerRadius: 16,
    borderWidth: 1,
    borderColor: { r: 0.3, g: 0.3, b: 0.4, a: 1 },
  });

  // Title bar
  scene.addRect({
    x: centerX - 300,
    y: centerY - 200,
    width: 600,
    height: 50,
    color: { r: 0.12, g: 0.12, b: 0.18, a: 1 },
    cornerRadius: 16,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });

  // Cover bottom corners of title bar
  scene.addRect({
    x: centerX - 300,
    y: centerY - 160,
    width: 600,
    height: 10,
    color: { r: 0.12, g: 0.12, b: 0.18, a: 1 },
    cornerRadius: 0,
    borderWidth: 0,
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
  });

  // Window controls (circles)
  const controlColors = [
    rgb(0xff5f56), // Red
    rgb(0xffbd2e), // Yellow
    rgb(0x27c93f), // Green
  ];

  for (let i = 0; i < 3; i++) {
    const size = 28; // Doubled size for testing
    scene.addRect({
      x: centerX - 280 + i * 40,
      y: centerY - 190,
      width: size,
      height: size,
      color: controlColors[i]!,
      cornerRadius: size / 2,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }

  // Animated buttons row
  const buttonWidth = 120;
  const buttonHeight = 40;
  const buttonSpacing = 20;
  const buttonsStartX = centerX - (3 * buttonWidth + 2 * buttonSpacing) / 2;
  const buttonsY = centerY - 80;

  const buttonColors = [
    { bg: rgb(0x3b82f6), hover: rgb(0x2563eb) }, // Blue
    { bg: rgb(0x10b981), hover: rgb(0x059669) }, // Green
    { bg: rgb(0xf59e0b), hover: rgb(0xd97706) }, // Amber
  ];

  for (let i = 0; i < 3; i++) {
    const btnX = buttonsStartX + i * (buttonWidth + buttonSpacing);
    const isHovered =
      mouseX >= btnX &&
      mouseX <= btnX + buttonWidth &&
      mouseY >= buttonsY &&
      mouseY <= buttonsY + buttonHeight;

    // Button shadow
    scene.addShadow({
      x: btnX,
      y: buttonsY,
      width: buttonWidth,
      height: buttonHeight,
      cornerRadius: 8,
      color: { r: 0, g: 0, b: 0, a: 0.3 },
      blur: isHovered ? 15 : 8,
      offsetX: 0,
      offsetY: isHovered ? 4 : 2,
    });

    // Button rect
    const btnColor = buttonColors[i]!;
    scene.addRect({
      x: btnX,
      y: buttonsY + (isHovered ? -2 : 0),
      width: buttonWidth,
      height: buttonHeight,
      color: isHovered ? btnColor.hover : btnColor.bg,
      cornerRadius: 8,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }

  // Card grid
  const cardWidth = 160;
  const cardHeight = 100;
  const cardSpacing = 20;
  const cardsStartX = centerX - (3 * cardWidth + 2 * cardSpacing) / 2;
  const cardsY = centerY + 20;

  for (let i = 0; i < 3; i++) {
    const cardX = cardsStartX + i * (cardWidth + cardSpacing);

    // Animated offset based on time
    const phase = time * 2 + i * 0.8;
    const yOffset = Math.sin(phase) * 5;

    // Card shadow
    scene.addShadow({
      x: cardX,
      y: cardsY + yOffset,
      width: cardWidth,
      height: cardHeight,
      cornerRadius: 12,
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      blur: 20,
      offsetX: 0,
      offsetY: 8,
    });

    // Card background
    const hue = (i * 0.15 + time * 0.1) % 1;
    const cardColor = hslToRgb(hue, 0.6, 0.5);

    scene.addRect({
      x: cardX,
      y: cardsY + yOffset,
      width: cardWidth,
      height: cardHeight,
      color: cardColor,
      cornerRadius: 12,
      borderWidth: 2,
      borderColor: { ...cardColor, a: 0.3 },
    });

    // Inner decoration
    scene.addRect({
      x: cardX + 15,
      y: cardsY + yOffset + 15,
      width: cardWidth - 30,
      height: 8,
      color: { r: 1, g: 1, b: 1, a: 0.3 },
      cornerRadius: 4,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });

    scene.addRect({
      x: cardX + 15,
      y: cardsY + yOffset + 30,
      width: (cardWidth - 30) * 0.6,
      height: 6,
      color: { r: 1, g: 1, b: 1, a: 0.2 },
      cornerRadius: 3,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });
  }

  // Mouse follower circle
  const followerSize = 30 + Math.sin(time * 3) * 5;
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

  scene.addRect({
    x: mouseX - followerSize / 2,
    y: mouseY - followerSize / 2,
    width: followerSize,
    height: followerSize,
    color: rgb(0x6366f1),
    cornerRadius: followerSize / 2,
    borderWidth: 2,
    borderColor: { r: 1, g: 1, b: 1, a: 0.5 },
  });

  // Corner decorations (animated)
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

    scene.addRect({
      x: corner.x,
      y: corner.y,
      width: cornerSize,
      height: cornerSize,
      color: { r: 0.2 * pulse, g: 0.2 * pulse, b: 0.3 * pulse, a: 0.5 },
      cornerRadius: 12,
      borderWidth: 1,
      borderColor: { r: 0.4, g: 0.4, b: 0.6, a: 0.5 * pulse },
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
