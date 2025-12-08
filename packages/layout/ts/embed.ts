/**
 * Bun macro to embed files at build time. This runs during bundling and
 * inlines the result.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck Don't type check this because it's just a Bun embed macro.
export async function embedAsBase64(path: string): Promise<string> {
  const file = Bun.file(new URL(path, import.meta.url).pathname);
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
