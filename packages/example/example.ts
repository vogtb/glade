import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };
import {
  createColorSchemeProvider,
  createFlashPlatform,
  createWebGPUContext,
  runWebGPURenderLoop,
} from "@glade/platform";
import { FlashApp, type FlashContext } from "@glade/flash";
import { MainView } from "./main.ts";

const interFontBase64 = COMPTIME_embedAsBase64("../../assets/InterVariable.ttf");

function base64ToBytes(base64: string): Uint8Array {
  if (typeof globalThis.atob === "function") {
    const decoded = globalThis.atob(base64);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  }

  const buffer = Buffer.from(base64, "base64");
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

async function main() {
  const ctx = await createWebGPUContext({
    width: 960,
    height: 540,
    title: "Glade Example",
  });

  const platform = createFlashPlatform(ctx);
  const colorSchemeProvider = createColorSchemeProvider();

  const app = new FlashApp({ platform, colorSchemeProvider });
  await app.initialize();

  const window = await app.openWindow(
    { width: ctx.width, height: ctx.height, title: "Glade Example" },
    (cx: FlashContext) => cx.newView(() => new MainView())
  );

  window.registerFont("Inter", base64ToBytes(interFontBase64));

  app.run();

  const tick = Reflect.get(platform, "tick");
  if (typeof tick === "function") {
    runWebGPURenderLoop(ctx, (time: number, _deltaTime: number) => {
      Reflect.apply(tick, platform, [time * 1000]);
    });
  }
}

main().catch((error) => {
  console.error(error);
  throw error;
});
