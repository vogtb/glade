/**
 * This is a weird hack to get around the fact that the node webcrypto module
 * has some incompatibilities w/ the types on `getRandomValues`. Note that
 * the line for `(null as any as typeof globalThis.crypto)` will error out.
 * I don't think this is an issue for browsers or the server, so I'm cool with
 * it as-is.
 */
export const cryptoApi =
  globalThis.crypto !== undefined &&
  Boolean(globalThis.crypto.randomUUID) &&
  Boolean(globalThis.crypto.getRandomValues)
    ? globalThis.crypto
    : (null as unknown as typeof globalThis.crypto);

/**
 * Generate an alpha-numeric lower-case string of a given length.
 */
export const genBase36Id = (len: number) => {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = len; i > 0; --i) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

export const MAX_INT_64 = BigInt("9223372036854775807");
export const MIN_INT_64 = BigInt("-9223372036854775808");

/**
 * Generate a random signed 64-bit integer (between MIN_INT_64 and MAX_INT_64).
 */
export const randomInt64 = () => {
  const bytes = cryptoApi.getRandomValues(new Uint8Array(8));
  const view = new DataView(bytes.buffer);
  return view.getBigInt64(0, false);
};

/**
 * Generate a random positive 64-bit integer (between 0 and MAX_INT_64).
 */
export const randomPositiveInt64 = () => {
  const bytes = cryptoApi.getRandomValues(new Uint8Array(8));
  const view = new DataView(bytes.buffer);
  const value = view.getBigUint64(0, false);
  return value >> 1n;
};
