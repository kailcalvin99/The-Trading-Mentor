import { vi } from "vitest";

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
});
const storedValues = new Map<string, string>();
const testStorage: Storage = {
  get length() { return storedValues.size; },
  clear: () => storedValues.clear(),
  getItem: (key) => storedValues.get(key) ?? null,
  key: (index) => [...storedValues.keys()][index] ?? null,
  removeItem: (key) => { storedValues.delete(key); },
  setItem: (key, value) => { storedValues.set(key, String(value)); },
};
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: testStorage });
Object.defineProperty(window, "localStorage", { configurable: true, value: testStorage });

class TestImage {
  width = 320;
  height = 180;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

Object.defineProperty(globalThis, "Image", {
  configurable: true,
  value: TestImage,
});

let encodedImage = 0;
vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
  drawImage: vi.fn(),
}) as unknown as CanvasRenderingContext2D);
vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(() => {
  encodedImage += 1;
  const bytes = [0x52, 0x49, 0x46, 0x46, 0x08, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, encodedImage];
  return `data:image/webp;base64,${btoa(String.fromCharCode(...bytes))}`;
});
