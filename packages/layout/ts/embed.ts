/**
 * Bun macro to embed files at build time. This runs during bundling and
 * inlines the result.
 */
export async function embedAsBase64(path: string): Promise<string> {
  const file = Bun.file(new URL(path, import.meta.url).pathname);
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
