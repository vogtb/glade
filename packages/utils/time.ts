type TimeUnit =
  | "ms"
  | "millisecond"
  | "milliseconds"
  | "s"
  | "second"
  | "seconds"
  | "m"
  | "min"
  | "minute"
  | "minutes"
  | "h"
  | "hour"
  | "hours"
  | "d"
  | "day"
  | "days";

type TimeWithUnit = `${number}${TimeUnit}`;

const TIME_WITH_UNIT_REGEX = /^(\d+(?:\.\d+)?)([a-z]+)$/;

const TIME_UNIT_MS_CONVERSION: Record<TimeUnit, number> = {
  ms: 1,
  millisecond: 1,
  milliseconds: 1,
  s: 1000,
  second: 1000,
  seconds: 1000,
  m: 60 * 1000,
  min: 60 * 1000,
  minute: 60 * 1000,
  minutes: 60 * 1000,
  h: 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  hours: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
};

export function into(input: TimeWithUnit, to: TimeUnit): number {
  const match = input.match(TIME_WITH_UNIT_REGEX);
  if (!match) {
    throw new Error(`UNREACHABLE: Invalid time format: ${input}`);
  }

  const [, valueStr, unit] = match;
  const value = parseFloat(valueStr ?? "");
  const fromUnit = unit as TimeUnit;

  if (!(fromUnit in TIME_UNIT_MS_CONVERSION)) {
    throw new Error(`UNREACHABLE: Invalid time unit: ${fromUnit}`);
  }

  return (value * TIME_UNIT_MS_CONVERSION[fromUnit]) / TIME_UNIT_MS_CONVERSION[to];
}
