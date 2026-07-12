export const CHART_IMAGE_FIELDS = [
  "higherTimeframeChart",
  "setupTimeframeChart",
  "entryTimeframeChart",
] as const;

export type ChartImageField = (typeof CHART_IMAGE_FIELDS)[number];

export const ALLOWED_CHART_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_CHART_IMAGE_BYTES = 450 * 1024;
export const MAX_AGGREGATE_CHART_IMAGE_BYTES = 1_200 * 1024;

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

function hasExpectedSignature(mime: string, base64: string): boolean {
  try {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const bytes: number[] = [];
    let buffer = 0;
    let bits = 0;
    for (const character of base64.slice(0, 24)) {
      if (character === "=") break;
      const value = alphabet.indexOf(character);
      if (value < 0) return false;
      buffer = (buffer << 6) | value;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buffer >> bits) & 0xff);
      }
    }
    if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (mime === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
    if (mime === "image/webp") {
      return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    }
    return false;
  } catch {
    return false;
  }
}

export function chartImageDecodedBytes(value: string): number | null {
  const match = DATA_URL_PATTERN.exec(value);
  if (!match || !ALLOWED_CHART_IMAGE_MIME_TYPES.includes(match[1] as typeof ALLOWED_CHART_IMAGE_MIME_TYPES[number])) {
    return null;
  }
  const base64 = match[2];
  if (!base64 || base64.length % 4 !== 0 || !hasExpectedSignature(match[1], base64)) return null;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length * 3) / 4 - padding;
}

export function validateChartImages(input: Partial<Record<ChartImageField, unknown>>): string | null {
  let aggregateBytes = 0;

  for (const field of CHART_IMAGE_FIELDS) {
    const value = input[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string" || value.length === 0) {
      return `${field} must be a non-empty JPEG, PNG, or WebP image data URL`;
    }
    const bytes = chartImageDecodedBytes(value);
    if (bytes === null || bytes === 0) {
      return `${field} must be a valid JPEG, PNG, or WebP image data URL`;
    }
    if (bytes > MAX_CHART_IMAGE_BYTES) {
      return `${field} exceeds the ${Math.floor(MAX_CHART_IMAGE_BYTES / 1024)} KB image limit`;
    }
    aggregateBytes += bytes;
  }

  if (aggregateBytes > MAX_AGGREGATE_CHART_IMAGE_BYTES) {
    return `Chart images exceed the ${Math.floor(MAX_AGGREGATE_CHART_IMAGE_BYTES / 1024)} KB combined limit`;
  }
  return null;
}
