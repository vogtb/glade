/**
 * Inspector/Debug Mode for Glade.
 *
 * Provides visual debugging tools inspired by browser DevTools and GPUI's inspector:
 * - Element bounds visualization with colored outlines
 * - Element selection for inspection
 * - Computed styles display
 * - Element tree navigation
 */

import type { Bounds, Point } from "./types.ts";
import type { Styles } from "./styles.ts";
import type { GlobalElementId } from "./element.ts";
import type { GladeScene } from "./scene.ts";
import type { HitTestNode } from "./dispatch.ts";
import type { TextSystem } from "./text.ts";
import type { ColorObject } from "@glade/utils";

/**
 * Debug info attached to elements during render.
 */
export interface ElementDebugInfo {
  /** Unique element ID */
  elementId: GlobalElementId;
  /** Computed bounds after layout */
  bounds: Bounds;
  /** Applied styles */
  styles: Partial<Styles>;
  /** Element type name (e.g., "GladeDiv", "GladeTextElement") */
  typeName: string;
  /** Optional source location (file:line) */
  sourceLocation?: string;
  /** Child element debug info */
  children: ElementDebugInfo[];
  /** Depth in the element tree */
  depth: number;
}

/**
 * Inspector state.
 */
export interface InspectorState {
  /** Whether inspector mode is enabled */
  enabled: boolean;
  /** Currently hovered element ID */
  hoveredElementId: GlobalElementId | null;
  /** Currently selected element ID for detailed inspection */
  selectedElementId: GlobalElementId | null;
  /** Show element bounds outlines */
  showBounds: boolean;
  /** Show element IDs */
  showIds: boolean;
  /** Show padding/margin guides */
  showSpacing: boolean;
  /** Highlight hovered element */
  highlightHover: boolean;
  /** Element info panel position */
  infoPanelPosition: "top-right" | "bottom-right" | "bottom-left" | "top-left";
}

/**
 * Colors used for inspector visualization.
 */
export const INSPECTOR_COLORS: {
  bounds: ColorObject;
  boundsHover: ColorObject;
  boundsSelected: ColorObject;
  padding: ColorObject;
  margin: ColorObject;
  content: ColorObject;
  text: ColorObject;
  textShadow: ColorObject;
  panelBg: ColorObject;
  panelBorder: ColorObject;
} = {
  bounds: { r: 0.2, g: 0.6, b: 1.0, a: 0.8 },
  boundsHover: { r: 1.0, g: 0.4, b: 0.2, a: 0.9 },
  boundsSelected: { r: 0.2, g: 1.0, b: 0.4, a: 1.0 },
  padding: { r: 0.2, g: 0.8, b: 0.4, a: 0.3 },
  margin: { r: 1.0, g: 0.6, b: 0.2, a: 0.3 },
  content: { r: 0.6, g: 0.8, b: 1.0, a: 0.2 },
  text: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
  textShadow: { r: 0.0, g: 0.0, b: 0.0, a: 0.8 },
  panelBg: { r: 0.1, g: 0.1, b: 0.15, a: 0.95 },
  panelBorder: { r: 0.3, g: 0.3, b: 0.4, a: 1.0 },
};

/**
 * Default inspector state.
 */
export function createInspectorState(): InspectorState {
  return {
    enabled: false,
    hoveredElementId: null,
    selectedElementId: null,
    showBounds: true,
    showIds: true,
    showSpacing: false,
    highlightHover: true,
    infoPanelPosition: "top-right",
  };
}

/**
 * Inspector manages debug visualization for a window.
 */
export class Inspector {
  private state: InspectorState;
  private elementRegistry: Map<GlobalElementId, ElementDebugInfo> = new Map();
  private flatElementList: ElementDebugInfo[] = [];
  private glyphsWarmedUp = false;

  constructor() {
    this.state = createInspectorState();
  }

  /**
   * Pre-warm glyph atlas with characters used by the inspector.
   * Call this once when inspector is first enabled to avoid blinking.
   */
  warmUpGlyphs(_textSystem: TextSystem): void {
    // Disabled for debugging
    this.glyphsWarmedUp = true;
  }

  /**
   * Toggle inspector mode on/off.
   */
  toggle(): void {
    this.state.enabled = !this.state.enabled;
    if (!this.state.enabled) {
      this.state.hoveredElementId = null;
      this.state.selectedElementId = null;
    }
  }

  /**
   * Check if inspector is enabled.
   */
  isEnabled(): boolean {
    return this.state.enabled;
  }

  /**
   * Set inspector enabled state.
   */
  setEnabled(enabled: boolean): void {
    this.state.enabled = enabled;
    if (!enabled) {
      this.state.hoveredElementId = null;
      this.state.selectedElementId = null;
    }
  }

  /**
   * Get current inspector state.
   */
  getState(): Readonly<InspectorState> {
    return this.state;
  }

  /**
   * Update inspector options.
   */
  updateOptions(options: Partial<InspectorState>): void {
    Object.assign(this.state, options);
  }

  /**
   * Clear element registry for new frame.
   */
  beginFrame(): void {
    this.elementRegistry.clear();
    this.flatElementList = [];
  }

  /**
   * Register an element for inspection.
   */
  registerElement(info: ElementDebugInfo): void {
    this.elementRegistry.set(info.elementId, info);
    this.flatElementList.push(info);
  }

  /**
   * Get element info by ID.
   */
  getElementInfo(elementId: GlobalElementId): ElementDebugInfo | undefined {
    return this.elementRegistry.get(elementId);
  }

  /**
   * Get all registered elements.
   */
  getAllElements(): readonly ElementDebugInfo[] {
    return this.flatElementList;
  }

  /**
   * Find element at a point.
   */
  findElementAtPoint(point: Point): ElementDebugInfo | null {
    let found: ElementDebugInfo | null = null;
    let maxDepth = -1;

    for (const info of this.flatElementList) {
      const { bounds } = info;
      if (
        point.x >= bounds.x &&
        point.x < bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y < bounds.y + bounds.height
      ) {
        if (info.depth > maxDepth) {
          maxDepth = info.depth;
          found = info;
        }
      }
    }

    return found;
  }

  /**
   * Handle mouse move for hover detection.
   */
  handleMouseMove(point: Point): void {
    if (!this.state.enabled) {
      return;
    }

    const element = this.findElementAtPoint(point);
    this.state.hoveredElementId = element?.elementId ?? null;
  }

  /**
   * Handle click for element selection.
   */
  handleClick(point: Point): boolean {
    if (!this.state.enabled) {
      return false;
    }

    const element = this.findElementAtPoint(point);
    if (element) {
      this.state.selectedElementId = element.elementId;
      return true;
    }

    this.state.selectedElementId = null;
    return false;
  }

  /**
   * Get the currently selected element info.
   */
  getSelectedElement(): ElementDebugInfo | null {
    if (!this.state.selectedElementId) {
      return null;
    }
    return this.elementRegistry.get(this.state.selectedElementId) ?? null;
  }

  /**
   * Get the currently hovered element info.
   */
  getHoveredElement(): ElementDebugInfo | null {
    if (!this.state.hoveredElementId) {
      return null;
    }
    return this.elementRegistry.get(this.state.hoveredElementId) ?? null;
  }

  /**
   * Render inspector overlay onto the scene.
   */
  renderOverlay(
    scene: GladeScene,
    viewportWidth: number,
    viewportHeight: number,
    textSystem?: TextSystem
  ): void {
    if (!this.state.enabled) {
      return;
    }

    scene.pushLayer();

    if (this.state.showBounds) {
      this.renderBoundsOutlines(scene);
    }

    if (this.state.highlightHover && this.state.hoveredElementId) {
      this.renderHoverHighlight(scene);
    }

    if (this.state.selectedElementId) {
      this.renderSelectionHighlight(scene);
      this.renderInfoPanel(scene, viewportWidth, viewportHeight, textSystem);
    }

    if (this.state.showIds) {
      this.renderElementIds(scene);
    }

    scene.popLayer();
  }

  /**
   * Render bounds outlines for all elements.
   */
  private renderBoundsOutlines(scene: GladeScene): void {
    for (const info of this.flatElementList) {
      const { bounds, elementId } = info;

      const isHovered = elementId === this.state.hoveredElementId;
      const isSelected = elementId === this.state.selectedElementId;

      if (isSelected || isHovered) continue;

      scene.addRect({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        color: { r: 0, g: 0, b: 0, a: 0 },
        cornerRadius: 0,
        borderWidth: 1,
        borderColor: INSPECTOR_COLORS.bounds,
      });
    }
  }

  /**
   * Render hover highlight.
   */
  private renderHoverHighlight(scene: GladeScene): void {
    const info = this.getHoveredElement();
    if (!info) {
      return;
    }

    const { bounds } = info;

    scene.addRect({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      color: { ...INSPECTOR_COLORS.content, a: 0.15 },
      cornerRadius: 0,
      borderWidth: 2,
      borderColor: INSPECTOR_COLORS.boundsHover,
    });
  }

  /**
   * Render selection highlight.
   */
  private renderSelectionHighlight(scene: GladeScene): void {
    const info = this.getSelectedElement();
    if (!info) {
      return;
    }

    const { bounds, styles } = info;

    scene.addRect({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      color: { ...INSPECTOR_COLORS.content, a: 0.2 },
      cornerRadius: 0,
      borderWidth: 2,
      borderColor: INSPECTOR_COLORS.boundsSelected,
    });

    if (this.state.showSpacing) {
      this.renderSpacingGuides(scene, bounds, styles);
    }
  }

  /**
   * Render padding/margin guides for selected element.
   */
  private renderSpacingGuides(scene: GladeScene, bounds: Bounds, styles: Partial<Styles>): void {
    const pt = styles.paddingTop ?? 0;
    const pr = styles.paddingRight ?? 0;
    const pb = styles.paddingBottom ?? 0;
    const pl = styles.paddingLeft ?? 0;

    if (pt > 0) {
      scene.addRect({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: pt,
        color: INSPECTOR_COLORS.padding,
        cornerRadius: 0,
        borderWidth: 0,
        borderColor: { r: 0, g: 0, b: 0, a: 0 },
      });
    }
    if (pb > 0) {
      scene.addRect({
        x: bounds.x,
        y: bounds.y + bounds.height - pb,
        width: bounds.width,
        height: pb,
        color: INSPECTOR_COLORS.padding,
        cornerRadius: 0,
        borderWidth: 0,
        borderColor: { r: 0, g: 0, b: 0, a: 0 },
      });
    }
    if (pl > 0) {
      scene.addRect({
        x: bounds.x,
        y: bounds.y + pt,
        width: pl,
        height: bounds.height - pt - pb,
        color: INSPECTOR_COLORS.padding,
        cornerRadius: 0,
        borderWidth: 0,
        borderColor: { r: 0, g: 0, b: 0, a: 0 },
      });
    }
    if (pr > 0) {
      scene.addRect({
        x: bounds.x + bounds.width - pr,
        y: bounds.y + pt,
        width: pr,
        height: bounds.height - pt - pb,
        color: INSPECTOR_COLORS.padding,
        cornerRadius: 0,
        borderWidth: 0,
        borderColor: { r: 0, g: 0, b: 0, a: 0 },
      });
    }
  }

  /**
   * Render element IDs near their bounds.
   */
  private renderElementIds(_scene: GladeScene): void {
    // Note: Text rendering in inspector would require access to the text system.
    // For now, element IDs are shown in the info panel when selected.
    // A full implementation would render small labels at element corners.
  }

  /**
   * Render info panel for selected element.
   */
  private renderInfoPanel(
    scene: GladeScene,
    viewportWidth: number,
    viewportHeight: number,
    textSystem?: TextSystem
  ): void {
    const info = this.getSelectedElement();
    if (!info) {
      return;
    }

    const panelWidth = 280;
    const panelHeight = 200;
    const margin = 16;

    let panelX: number;
    let panelY: number;

    switch (this.state.infoPanelPosition) {
      case "top-right":
        panelX = viewportWidth - panelWidth - margin;
        panelY = margin;
        break;
      case "bottom-right":
        panelX = viewportWidth - panelWidth - margin;
        panelY = viewportHeight - panelHeight - margin;
        break;
      case "bottom-left":
        panelX = margin;
        panelY = viewportHeight - panelHeight - margin;
        break;
      case "top-left":
      default:
        panelX = margin;
        panelY = margin;
        break;
    }

    scene.addShadow({
      x: panelX,
      y: panelY + 4,
      width: panelWidth,
      height: panelHeight,
      cornerRadius: 8,
      color: { r: 0, g: 0, b: 0, a: 0.4 },
      blur: 16,
      offsetX: 0,
      offsetY: 4,
    });

    scene.addRect({
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
      color: INSPECTOR_COLORS.panelBg,
      cornerRadius: 8,
      borderWidth: 1,
      borderColor: INSPECTOR_COLORS.panelBorder,
    });

    const headerHeight = 32;
    scene.addRect({
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: headerHeight,
      color: { r: 0.15, g: 0.15, b: 0.2, a: 1 },
      cornerRadius: 8,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });

    scene.addRect({
      x: panelX,
      y: panelY + headerHeight - 8,
      width: panelWidth,
      height: 8,
      color: { r: 0.15, g: 0.15, b: 0.2, a: 1 },
      cornerRadius: 0,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });

    scene.addRect({
      x: panelX,
      y: panelY + headerHeight,
      width: panelWidth,
      height: 1,
      color: INSPECTOR_COLORS.panelBorder,
      cornerRadius: 0,
      borderWidth: 0,
      borderColor: { r: 0, g: 0, b: 0, a: 0 },
    });

    // Render text content
    if (!textSystem) {
      return;
    }

    const fontSize = 12;
    const lineHeight = 16;
    const textPadding = 12;
    const fontFamily = "Inter";

    // Header title
    const headerGlyphs = textSystem.prepareGlyphInstances(
      info.typeName,
      panelX + textPadding,
      panelY + 10,
      14,
      18,
      INSPECTOR_COLORS.text,
      fontFamily
    );
    for (const glyph of headerGlyphs) {
      scene.addGlyph(glyph);
    }

    // Content lines
    let contentY = panelY + headerHeight + textPadding;
    const lines: string[] = [];

    lines.push(`ID: #${info.elementId}`);
    lines.push(
      `Bounds: ${info.bounds.x.toFixed(0)}, ${info.bounds.y.toFixed(0)} ${info.bounds.width.toFixed(0)}×${info.bounds.height.toFixed(0)}`
    );
    lines.push(`Depth: ${info.depth}`);

    // Add style info
    const styleLines = this.formatStyles(info.styles);
    if (styleLines.length > 0) {
      lines.push("");
      lines.push("Styles:");
      for (const style of styleLines.slice(0, 5)) {
        lines.push(`  ${style}`);
      }
    }

    for (const line of lines) {
      if (contentY > panelY + panelHeight - lineHeight) break;

      const glyphs = textSystem.prepareGlyphInstances(
        line,
        panelX + textPadding,
        contentY,
        fontSize,
        lineHeight,
        { r: 0.8, g: 0.8, b: 0.9, a: 1 },
        fontFamily
      );
      for (const glyph of glyphs) {
        scene.addGlyph(glyph);
      }
      contentY += lineHeight;
    }
  }

  /**
   * Format styles for display.
   */
  formatStyles(styles: Partial<Styles>): string[] {
    const lines: string[] = [];

    if (styles.display) lines.push(`display: ${styles.display}`);
    if (styles.flexDirection) lines.push(`flex-direction: ${styles.flexDirection}`);
    if (styles.alignItems) lines.push(`align-items: ${styles.alignItems}`);
    if (styles.justifyContent) lines.push(`justify-content: ${styles.justifyContent}`);
    if (styles.width !== undefined) lines.push(`width: ${styles.width}`);
    if (styles.height !== undefined) lines.push(`height: ${styles.height}`);
    if (styles.paddingTop !== undefined) lines.push(`padding-top: ${styles.paddingTop}`);
    if (styles.paddingRight !== undefined) lines.push(`padding-right: ${styles.paddingRight}`);
    if (styles.paddingBottom !== undefined) lines.push(`padding-bottom: ${styles.paddingBottom}`);
    if (styles.paddingLeft !== undefined) lines.push(`padding-left: ${styles.paddingLeft}`);
    if (styles.gap !== undefined) lines.push(`gap: ${styles.gap}`);
    if (styles.backgroundColor) {
      const c = styles.backgroundColor;
      lines.push(
        `background: rgba(${(c.r * 255) | 0}, ${(c.g * 255) | 0}, ${(c.b * 255) | 0}, ${c.a.toFixed(2)})`
      );
    }
    if (styles.borderRadius !== undefined) lines.push(`border-radius: ${styles.borderRadius}`);
    if (styles.borderWidth !== undefined) lines.push(`border-width: ${styles.borderWidth}`);

    return lines;
  }

  /**
   * Format element info for console output.
   */
  formatElementInfo(info: ElementDebugInfo): string {
    const lines: string[] = [];
    lines.push(`Element: ${info.typeName} (#${info.elementId})`);
    lines.push(
      `Bounds: ${info.bounds.x.toFixed(0)}, ${info.bounds.y.toFixed(0)} - ${info.bounds.width.toFixed(0)}×${info.bounds.height.toFixed(0)}`
    );
    if (info.sourceLocation) {
      lines.push(`Source: ${info.sourceLocation}`);
    }
    lines.push(`Depth: ${info.depth}`);
    lines.push(`Styles:`);
    for (const style of this.formatStyles(info.styles)) {
      lines.push(`  ${style}`);
    }
    return lines.join("\n");
  }

  /**
   * Log selected element info to console.
   */
  logSelectedElement(): void {
    const info = this.getSelectedElement();
    if (info) {
      console.log(this.formatElementInfo(info));
    } else {
      console.log("No element selected");
    }
  }

  /**
   * Build debug info tree from hit test tree.
   * This extracts element information from the rendered tree.
   */
  buildFromHitTestTree(
    roots: HitTestNode[],
    getElementInfo: (node: HitTestNode, depth: number) => ElementDebugInfo | null
  ): void {
    const walk = (node: HitTestNode, depth: number) => {
      const info = getElementInfo(node, depth);
      if (info) {
        this.registerElement(info);
      }

      for (const child of node.children) {
        walk(child, depth + 1);
      }
    };

    for (const root of roots) {
      walk(root, 0);
    }
  }
}

/**
 * Create a new inspector instance.
 */
export function createInspector(): Inspector {
  return new Inspector();
}
