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
 * Bun macro to embed environment variables at build time.
 */
async function embedEnvVar(name: string, defaultValue?: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const value = process.env[name] ?? defaultValue;
  if (!value) {
    throw new Error(`comptime process.env.${name} is not set, no default provided`);
  }
  return value;
}

const BUILD_TIME: { value: null | string } = {
  value: null,
};

/**
 * Bun macro to embed the current build time as an ISO string.
 */
async function embedBuildTime(): Promise<string> {
  const now = new Date().toISOString();
  BUILD_TIME.value = BUILD_TIME.value ?? now;
  return BUILD_TIME.value!;
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

/**
 * Embeds an environment variable value at compile time, defaulting to a specific value.
 */
export const COMPTIME_envVar = embedEnvVar as (name: string, defaultValue?: string) => string;

/**
 * Embeds the current build time as an ISO string at compile time.
 */
export const COMPTIME_buildTime = embedBuildTime as () => string;
