/**
 * Core function that wraps any function with performance timing measurements
 */
function measurePerformance<T extends (...args: unknown[]) => unknown>(
  label: string,
  fn: T,
  thisArg: unknown,
  args: unknown[]
): ReturnType<T> {
  const tick = performance.now();
  const startMark = `${label}-start-${tick}`;
  const endMark = `${label}-end-${tick}`;

  const finalizeMeasurement = () => {
    performance.mark(endMark);
    performance.measure(label, startMark, endMark);
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
  };

  performance.mark(startMark);

  try {
    const result = fn.apply(thisArg, args);

    if (result instanceof Promise) {
      return result.finally(finalizeMeasurement) as ReturnType<T>;
    }

    finalizeMeasurement();
    return result as ReturnType<T>;
  } catch (error) {
    finalizeMeasurement();
    throw error;
  }
}

/**
 * Performance timing decorator for methods that lets us measure execution
 * time using the Performance API.
 */
export function perf(label?: string): MethodDecorator {
  return function <T>(
    _target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> | void {
    const originalMethod = descriptor.value;

    if (typeof originalMethod !== "function") {
      throw new Error("@perf decorator can only be applied to methods");
    }

    const methodName = String(propertyKey);
    const measureName = label ?? methodName;

    descriptor.value = function (this: unknown, ...args: unknown[]): unknown {
      return measurePerformance(
        measureName,
        originalMethod as (...args: unknown[]) => unknown,
        this,
        args
      );
    } as T;

    return descriptor;
  };
}

/**
 * Wraps a function with performance timing measurements returning a function
 * with the same type.
 */
export function withPerf<T extends (...args: unknown[]) => unknown>(label: string, fn: T): T {
  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    return measurePerformance(label, fn, this, args);
  } as T;
}
