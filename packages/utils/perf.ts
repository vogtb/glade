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
      const startMark = `${measureName}-start-${performance.now()}`;
      const endMark = `${measureName}-end-${performance.now()}`;

      performance.mark(startMark);

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return result.finally(() => {
            performance.mark(endMark);
            performance.measure(measureName, startMark, endMark);
            performance.clearMarks(startMark);
            performance.clearMarks(endMark);
          });
        }

        performance.mark(endMark);
        performance.measure(measureName, startMark, endMark);
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);

        return result;
      } catch (error) {
        performance.mark(endMark);
        performance.measure(measureName, startMark, endMark);
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        throw error;
      }
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
    const startMark = `${label}-start-${performance.now()}`;
    const endMark = `${label}-end-${performance.now()}`;

    performance.mark(startMark);

    try {
      const result = fn.apply(this, args);

      if (result instanceof Promise) {
        return result.finally(() => {
          performance.mark(endMark);
          performance.measure(label, startMark, endMark);
          performance.clearMarks(startMark);
          performance.clearMarks(endMark);
        }) as ReturnType<T>;
      }

      performance.mark(endMark);
      performance.measure(label, startMark, endMark);
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);

      // this casting is okay, because we know what T is.
      return result as ReturnType<T>;
    } catch (error) {
      performance.mark(endMark);
      performance.measure(label, startMark, endMark);
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      throw error;
    }
  } as T;
}
