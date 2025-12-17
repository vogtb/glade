/**
 * Bun macro to embed files at build time. This runs during bundling and
 * inlines the result.
 *
 * TODO: we currently have to do `as unknown as string` when calling this,
 * but we _should_ not have to do that.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck Don't type check this because it's just a Bun embed macro.
export async function COMPTIME_embedAsBase64(path: string): Promise<string> {
  const file = Bun.file(path);
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
