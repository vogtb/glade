type StructureRecord<A extends { type: string }, R> = {
  [T in A as T["type"]]: R | ((value: T) => R);
};

export function exhaustiveSwitch<A extends { type: string }>(value: A) {
  return <R>(cases: StructureRecord<A, R>): R => {
    const type: A["type"] = value.type;
    const f = cases[type];
    if (typeof f !== "function") {
      return f as R;
    }
    return f(value);
  };
}

export function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}
