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

  return `[${moduleLabel}] ${record.level.toUpperCase()} ${record.message}${tail}`;
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

  const lineNumber = Number.parseInt(match[2], 10);
  const columnNumber = Number.parseInt(match[3], 10);
  if (Number.isNaN(lineNumber) || Number.isNaN(columnNumber)) {
    return;
  }

  return {
    filePath: match[1],
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

  const preferred =
    locations.find((location) => location.filePath.includes("/packages/")) ??
    locations.find((location) => location.filePath.includes("packages/")) ??
    locations[0];

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

function write(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) {
    return;
  }

  const callsite = config.includeCallsite ? callsiteFromStack(new Error().stack) : undefined;
  const moduleName = callsite?.moduleName ?? config.moduleName;
  const recordData = data;

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

export const log = {
  info(message: string, data?: Record<string, unknown>): void {
    write("info", message, data);
  },
  warn(message: string, data?: Record<string, unknown>): void {
    write("warn", message, data);
  },
  debug(message: string, data?: Record<string, unknown>): void {
    write("debug", message, data);
  },
  error(message: string, data?: Record<string, unknown>): void {
    write("error", message, data);
  },
  fatal(message: string, data?: Record<string, unknown>): void {
    write("fatal", message, data);
  },
};
