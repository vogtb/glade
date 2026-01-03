export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export const LogLevel: Record<LogLevel, LogLevel> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "fatal",
};

export type LogRecord = {
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  callsite?: Callsite;
};

type Formatter = (record: LogRecord) => string;

type Config = {
  moduleName: string;
  lowestLevel: LogLevel;
  formatter: Formatter;
  includeCallsite: boolean;
};

type Logger = {
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  debug: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  fatal: (message: string, data?: unknown) => void;
};

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const defaultFormatter: Formatter = (record) => {
  const data = record.data ?? {};
  const hasData = Object.keys(data).length > 0;
  const tail = hasData ? ` ${JSON.stringify(data)}` : "";

  const moduleLabel = record.callsite
    ? `${record.callsite.moduleName}:${record.callsite.line}`
    : record.module;

  const timestamp = new Date(record.timestamp).toISOString();

  return `${timestamp} [${moduleLabel}] ${record.level.toUpperCase()} ${record.message}${tail}`;
};

let config: Config = {
  moduleName: "logging",
  lowestLevel: "debug",
  formatter: defaultFormatter,
  includeCallsite: true,
};

export function configure(options?: {
  moduleName?: string;
  lowestLevel?: LogLevel;
  formatter?: Formatter;
  includeCallsite?: boolean;
}): void {
  config = {
    moduleName: options?.moduleName ?? "logging",
    lowestLevel: options?.lowestLevel ?? "debug",
    formatter: options?.formatter ?? defaultFormatter,
    includeCallsite: options?.includeCallsite ?? true,
  };
}

export function dispose(): void {
  config = {
    moduleName: "logging",
    lowestLevel: "debug",
    formatter: defaultFormatter,
    includeCallsite: true,
  };
}

function shouldLog(level: LogLevel): boolean {
  const currentRank = levelRank[level];
  const lowestRank = levelRank[config.lowestLevel];

  return currentRank >= lowestRank;
}

type Callsite = {
  filePath: string;
  fileName: string;
  packageName?: string;
  line: number;
  column: number;
  moduleName: string;
};

type RawLocation = {
  filePath: string;
  line: number;
  column: number;
};

function moduleNameFromPath(filePath: string): string {
  const segments = filePath.split("/").filter((segment) => segment.length > 0);
  const fileName = segments[segments.length - 1] ?? filePath;
  const packagesIndex = segments.lastIndexOf("packages");
  const packageName = packagesIndex >= 0 ? segments[packagesIndex + 1] : undefined;

  if (packageName) {
    return `${packageName}/${fileName}`;
  }

  const parentDir = segments[segments.length - 2];
  if (parentDir) {
    return `${parentDir}/${fileName}`;
  }

  return fileName;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeData(data?: unknown): Record<string, unknown> | undefined {
  if (data === undefined) {
    return;
  }

  if (isPlainRecord(data)) {
    return data;
  }

  if (data instanceof Map) {
    return { value: Array.from(data.entries()) };
  }

  if (data instanceof Set) {
    return { value: Array.from(data.values()) };
  }

  return { value: data };
}

function extractLocation(stackLine: string): RawLocation | undefined {
  let locationPart = stackLine.trim();
  const atIndex = locationPart.indexOf("at ");
  if (atIndex >= 0) {
    locationPart = locationPart.slice(atIndex + 3);
  }

  const openParenIndex = locationPart.lastIndexOf("(");
  const closeParenIndex = locationPart.lastIndexOf(")");
  if (openParenIndex >= 0 && closeParenIndex > openParenIndex) {
    locationPart = locationPart.slice(openParenIndex + 1, closeParenIndex);
  }

  locationPart = locationPart.trim();
  if (locationPart.startsWith("file://")) {
    locationPart = locationPart.slice("file://".length);
  }

  const match = /(.+):(\d+):(\d+)$/.exec(locationPart);
  if (!match) {
    return;
  }

  const filePath = match[1];
  const lineText = match[2];
  const columnText = match[3];
  if (!filePath || !lineText || !columnText) {
    return;
  }

  const lineNumber = Number.parseInt(lineText, 10);
  const columnNumber = Number.parseInt(columnText, 10);
  if (Number.isNaN(lineNumber) || Number.isNaN(columnNumber)) {
    return;
  }

  return {
    filePath,
    line: lineNumber,
    column: columnNumber,
  };
}

function isLoggingFrame(stackLine: string): boolean {
  return (
    stackLine.includes("/packages/logging/") ||
    stackLine.includes("packages/logging/") ||
    stackLine.includes("/logging/logging.ts") ||
    stackLine.includes("logging/logging.ts")
  );
}

function callsiteFromStack(stack?: string): Callsite | undefined {
  if (!stack) {
    return;
  }

  const lines = stack.split("\n").slice(1);
  const locations: RawLocation[] = [];
  for (const line of lines) {
    if (isLoggingFrame(line)) {
      continue;
    }

    const location = extractLocation(line);
    if (!location) {
      continue;
    }

    locations.push(location);
  }

  if (locations.length === 0) {
    return;
  }

  const firstLocation = locations[0];
  if (!firstLocation) {
    return;
  }

  const preferred =
    locations.find((location) => location.filePath.includes("/packages/")) ??
    locations.find((location) => location.filePath.includes("packages/")) ??
    firstLocation;

  const filePath = preferred.filePath;
  const moduleName = moduleNameFromPath(filePath);
  const segments = filePath.split("/").filter((segment) => segment.length > 0);
  const fileName = segments[segments.length - 1] ?? filePath;
  const packagesIndex = segments.lastIndexOf("packages");
  const packageName = packagesIndex >= 0 ? segments[packagesIndex + 1] : undefined;

  return {
    filePath,
    fileName,
    packageName,
    line: preferred.line,
    column: preferred.column,
    moduleName,
  };
}

function write(level: LogLevel, message: string, data?: unknown): void {
  if (!shouldLog(level)) {
    return;
  }

  // NOTE: Parsing the error stack to get the callsite data is not very
  // performant, and requires `--sourcemap=inline` when compiling / bundling
  // with Bun. If we're ever using the default logger on a hot path, we'll
  // definitely see performance degradation. If I don't find the callsite data
  // useful in the logging, I may just remove it all together and use static
  // const loggers in all files.
  const callsite = config.includeCallsite ? callsiteFromStack(new Error().stack) : undefined;
  const moduleName = callsite?.moduleName ?? config.moduleName;
  const recordData = normalizeData(data);

  const record: LogRecord = {
    timestamp: Date.now(),
    level,
    module: moduleName,
    message,
    data: recordData,
    callsite,
  };

  const line = config.formatter(record);
  if (level === "debug") {
    console.debug(line);
  } else if (level === "info") {
    console.info(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.error(line);
  }
}

export const log: Logger = {
  info(message: string, data?: unknown): void {
    write("info", message, data);
  },
  warn(message: string, data?: unknown): void {
    write("warn", message, data);
  },
  debug(message: string, data?: unknown): void {
    write("debug", message, data);
  },
  error(message: string, data?: unknown): void {
    write("error", message, data);
  },
  fatal(message: string, data?: unknown): void {
    write("fatal", message, data);
  },
};

const globalScope: typeof globalThis & { log?: Logger } = globalThis;
if (!globalScope.log) {
  globalScope.log = log;
}
