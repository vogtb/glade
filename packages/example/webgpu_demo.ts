import { div, text, webgpuHost, type WebGPUHost } from "@glade/flash";
import { colors } from "@glade/utils";
import { createHexagonHost } from "@glade/demos/hexagon";
import { createMetaballHost } from "@glade/demos/metaball";
import { createParticleHost } from "@glade/demos/particle";
import { createRaymarchHost } from "@glade/demos/raymarch";
import { createTerrainHost } from "@glade/demos/terrain";
import { createGalaxyHost } from "@glade/demos/galaxy";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

type WebGPUDemoId = "hexagon" | "metaball" | "particle" | "raymarch" | "terrain" | "galaxy";

const HEIGHT = 400;
const WIDTH = 400;

const DEMO_METADATA: Array<{ id: WebGPUDemoId; label: string; desc: string }> = [
  { id: "hexagon", label: "Hexagon", desc: "Animated hexagon with mouse interaction" },
  { id: "metaball", label: "Metaball", desc: "Organic blob simulation" },
  { id: "particle", label: "Particle", desc: "Orbiting particle system" },
  { id: "raymarch", label: "Raymarch", desc: "3D raymarched scene" },
  { id: "terrain", label: "Terrain", desc: "Procedural terrain flyover" },
  { id: "galaxy", label: "Galaxy", desc: "Particle physics with compute shaders" },
];

const hostCache = new Map<WebGPUDemoId, WebGPUHost>();

function getHost(id: WebGPUDemoId, device: GPUDevice, format: GPUTextureFormat): WebGPUHost {
  const cached = hostCache.get(id);
  if (cached) {
    return cached;
  }

  let host: WebGPUHost;
  switch (id) {
    case "hexagon":
      host = createHexagonHost(device, format, WIDTH, HEIGHT);
      break;
    case "metaball":
      host = createMetaballHost(device, format, WIDTH, HEIGHT);
      break;
    case "particle":
      host = createParticleHost(device, format, WIDTH, HEIGHT);
      break;
    case "raymarch":
      host = createRaymarchHost(device, format, WIDTH, HEIGHT);
      break;
    case "terrain":
      host = createTerrainHost(device, format, WIDTH, HEIGHT);
      break;
    case "galaxy":
      host = createGalaxyHost(device, format, WIDTH, HEIGHT);
      break;
  }

  hostCache.set(id, host);
  return host;
}

export const WEBGPU_DEMO: Demo = {
  name: "WebGPU",
  renderElement: (cx, state): DemoItem[] => {
    const device = cx.window.getDevice();
    const format = cx.window.getFormat();
    const currentHost = getHost(state.selectedWebGPUDemo, device, format);
    const currentDemo = DEMO_METADATA.find((d) => d.id === state.selectedWebGPUDemo);

    const selectorButton = (demo: (typeof DEMO_METADATA)[number]) => {
      const isSelected = state.selectedWebGPUDemo === demo.id;
      return div()
        .flex()
        .flexCol()
        .gap(4)
        .p(10)
        .bg(isSelected ? colors.black.x700 : colors.black.x900)
        .rounded(3)
        .border(2)
        .borderColor(isSelected ? colors.blue.x600 : colors.black.x700)
        .cursorPointer()
        .onMouseDown(() => {
          state.setSelectedWebGPUDemo(demo.id);
          cx.notify();
        })
        .children(
          text(demo.label)
            .weight(isSelected ? 600 : HEIGHT)
            .color(colors.white.default),
          text(demo.desc).size(11).color(colors.black.x400)
        );
    };

    return [
      text("WebGPU Demos").size(28),
      SPACER_10PX,
      text("Custom WebGPU rendering embedded within Flash UI layout").size(16),
      SPACER_10PX,
      div().h(1).bg(colors.black.x600),
      SPACER_10PX,

      div()
        .flex()
        .flexRow()
        .gap(24)
        .children(
          div()
            .flex()
            .flexCol()
            .gap(8)
            .children(
              webgpuHost(currentHost, WIDTH, HEIGHT).rounded(12),
              text(currentDemo?.label ?? "")
                .size(16)
                .weight(600),
              text(currentDemo?.desc ?? "")
                .size(13)
                .color(colors.black.x400)
            ),
          div()
            .flex()
            .flexCol()
            .gap(12)
            .children(
              text("Select Demo").weight(600),
              div()
                .grid()
                .gridCols(2)
                .gap(8)
                .children(...DEMO_METADATA.map(selectorButton))
            )
        ),

      SPACER_10PX,
      div().h(1).bg(colors.black.x700),
      SPACER_10PX,

      div()
        .flex()
        .flexCol()
        .gap(8)
        .p(16)
        .bg(colors.black.x900)
        .rounded(8)
        .children(
          text("How it works").size(16).weight(600).color(colors.white.default),
          text("Each demo implements the WebGPUHost interface and renders to its own texture.")
            .size(13)
            .color(colors.black.x300),
          text("Flash samples these textures during its render pass, enabling full compositing.")
            .size(13)
            .color(colors.black.x300),
          text("Mouse coordinates are automatically transformed to local demo space.")
            .size(13)
            .color(colors.black.x300)
        ),
    ];
  },
};
