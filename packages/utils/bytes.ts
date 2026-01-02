export function base64ToBytes(base64: string): Uint8Array {
  const decoded = atob(base64);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const sign = bytes < 0 ? "-" : "";
  const absBytes = Math.abs(bytes);

  let unitIndex = 0;
  let value = absBytes;

  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  const formatted = value % 1 === 0 ? value.toString() : value.toFixed(1);
  return `${sign}${formatted}${BYTE_UNITS[unitIndex]}`;
}
