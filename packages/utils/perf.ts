export function timed<T extends (...args: unknown[]) => unknown>(
  fn: T,
  log: (t: ReturnType<T>, ms: number) => void
): ReturnType<T> {
  const start = performance.now();
  const result = fn() as ReturnType<T>;
  const delta = performance.now() - start;
  log(result, delta);
  return result;
}
