/**
 * Bun macro to embed files at build time. This runs during bundling and
 * inlines the result.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck Don't type check this because it's just a Bun embed macro.
async function embedAsBase64(path: string): Promise<string> {
  const file = Bun.file(path);
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

/**
 * NOTE: When imported with `with { type: "macro" }` Bun will run the function
 * at compile-time as a non-async function. But if we export as Promise<string>
 * when we use it in code, typescript still checks it as a Promise<string>. To
 * avoid that, we just export it as a plain, sync function.
 *
 * NOTE: We also prefix this with COMPTIME_ to be extract clear that this fn
 * is executed, well, at compile time, otherwise it can be confusing.
 */
export const COMPTIME_embedAsBase64 = embedAsBase64 as (p: string) => string;
