import { exhaustiveSwitch } from "@glade/utils";

export const LogLevel: Record<LogLevel, LogLevel> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "fatal",
} as const;

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export type LogRecord = {
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
};

type Formatter = (record: LogRecord) => string;

type Config = {
  moduleName: string;
  lowestLevel: LogLevel;
  formatter: Formatter;
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

  return `${record.module} ${record.level.toUpperCase()} ${record.message}${tail}`;
};

let config: Config = {
  moduleName: "logging",
  lowestLevel: "debug",
  formatter: defaultFormatter,
};

export function configure(options?: {
  moduleName?: string;
  lowestLevel?: LogLevel;
  formatter?: Formatter;
}): void {
  config = {
    moduleName: options?.moduleName ?? "logging",
    lowestLevel: options?.lowestLevel ?? "debug",
    formatter: options?.formatter ?? defaultFormatter,
  };
}

export function dispose(): void {
  config = {
    moduleName: "logging",
    lowestLevel: "debug",
    formatter: defaultFormatter,
  };
}

function shouldLog(level: LogLevel): boolean {
  const currentRank = levelRank[level];
  const lowestRank = levelRank[config.lowestLevel];

  return currentRank >= lowestRank;
}

function write(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) {
    return;
  }

  const record: LogRecord = {
    timestamp: Date.now(),
    level,
    module: config.moduleName,
    message,
    data,
  };

  const line = config.formatter(record);
  exhaustiveSwitch({ type: level })({
    debug: console.debug(line),
    info: console.info(line),
    warn: console.warn(line),
    error: console.error(line),
    fatal: console.error(line),
  });

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
