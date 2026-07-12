import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { validateChartImages } from "@workspace/api-zod";

const createTrade = vi.fn();
const deleteTrade = vi.fn();
const invalidateQueries = vi.fn();
const setQueryData = vi.fn();
const toast = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  getListTradesQueryKey: () => ["/api/trades"],
  useCreateTrade: () => ({ mutateAsync: createTrade, isPending: false }),
  useDeleteTrade: () => ({ mutateAsync: deleteTrade }),
  useListTrades: () => ({ data: [] }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ tierLevel: 2, appMode: "full" }),
}));

vi.mock("@/contexts/PlannerContext", () => ({
  usePlanner: () => ({
    isRoutineComplete: true,
    plannerLoaded: true,
    tradePlanDefaults: {},
  }),
}));

vi.mock("@/contexts/AppConfigContext", () => ({
  useAppConfig: () => ({ getNumber: (_key: string, fallback: number) => fallback }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast }));
vi.mock("@/hooks/useAITrigger", () => ({ dispatchAITrigger: vi.fn() }));
vi.mock("@/components/CoolDownOverlay", () => ({ recordTradeResult: vi.fn() }));
vi.mock("@/components/FrostedGateOverlay", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/DemoSnapshots", () => ({ JournalDemoSnapshot: () => <div /> }));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
}));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/ui/slider", () => ({
  Slider: ({ value, onValueChange }: { value: number[]; onValueChange: (value: number[]) => void }) => (
    <input aria-label="Stress level" type="range" value={value[0]} onChange={(event) => onValueChange([Number(event.target.value)])} />
  ),
}));

const { default: SmartJournal } = await import("../../artifacts/web/src/pages/SmartJournal");

function button(container: HTMLElement, text: string): HTMLButtonElement {
  const match = [...container.querySelectorAll("button")].find((item) => item.textContent?.trim() === text);
  if (!match) throw new Error(`Missing button: ${text}`);
  return match;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function upload(container: HTMLElement, label: string, file: File) {
  const input = container.querySelector<HTMLInputElement>(`input[aria-label="Upload ${label} chart"]`);
  if (!input) throw new Error(`Missing input: ${label}`);
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

function preview(container: HTMLElement, label: string) {
  return container.querySelector<HTMLImageElement>(`img[alt="${label} chart preview"]`);
}

describe("Smart Journal production file controls", () => {
  let host: HTMLDivElement;
  let root: Root;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let unhandled: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    createTrade.mockReset().mockResolvedValue({ id: 41, pair: "NQ1!" });
    deleteTrade.mockReset();
    invalidateQueries.mockReset().mockResolvedValue(undefined);
    setQueryData.mockReset();
    toast.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    unhandled = vi.fn();
    window.addEventListener("unhandledrejection", unhandled);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    const queryClient = new QueryClient();
    queryClient.invalidateQueries = invalidateQueries;
    queryClient.setQueryData = setQueryData;
    await act(async () => root.render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}><SmartJournal /></QueryClientProvider>
      </MemoryRouter>,
    ));
    await click(button(host, "Log New Trade"));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    window.removeEventListener("unhandledrejection", unhandled);
    consoleError.mockRestore();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  test("accepts, previews, independently removes, replaces, and submits three compressed images once", async () => {
    await upload(host, "Higher timeframe", new File(["jpeg"], "higher.jpg", { type: "image/jpeg" }));
    await upload(host, "Setup timeframe", new File(["png"], "setup.png", { type: "image/png" }));
    await upload(host, "Entry timeframe", new File(["webp"], "entry.webp", { type: "image/webp" }));

    const higherBefore = preview(host, "Higher timeframe");
    const setupBefore = preview(host, "Setup timeframe");
    const entryBefore = preview(host, "Entry timeframe");
    if (!higherBefore || !setupBefore || !entryBefore) throw new Error(host.textContent || "Missing previews");
    expect(higherBefore?.src).toMatch(/^data:image\/webp;base64,/);
    expect(setupBefore?.src).toMatch(/^data:image\/webp;base64,/);
    expect(entryBefore?.src).toMatch(/^data:image\/webp;base64,/);
    expect(new Set([higherBefore?.src, setupBefore?.src, entryBefore?.src]).size).toBe(3);
    for (const field of ["higherTimeframeChart", "setupTimeframeChart", "entryTimeframeChart"]) {
      expect(host.querySelector(`label[for="chart-${field}"]`)).not.toBeNull();
    }

    await click(host.querySelector('[aria-label="Remove Setup timeframe chart"]') as HTMLButtonElement);
    expect(preview(host, "Setup timeframe")).toBeNull();
    expect(preview(host, "Higher timeframe")?.src).toBe(higherBefore?.src);
    expect(preview(host, "Entry timeframe")?.src).toBe(entryBefore?.src);

    await upload(host, "Setup timeframe", new File(["replacement"], "setup-replacement.webp", { type: "image/webp" }));
    const setupAfter = preview(host, "Setup timeframe");
    expect(setupAfter?.src).toMatch(/^data:image\/webp;base64,/);
    expect(setupAfter?.src).not.toBe(setupBefore?.src);
    expect(preview(host, "Higher timeframe")?.src).toBe(higherBefore?.src);
    expect(preview(host, "Entry timeframe")?.src).toBe(entryBefore?.src);

    await click(button(host, "Save Trade"));
    expect(createTrade).toHaveBeenCalledTimes(1);
    const payload = createTrade.mock.calls[0][0].data;
    expect(payload.higherTimeframeChart).toBe(higherBefore?.src);
    expect(payload.setupTimeframeChart).toBe(setupAfter?.src);
    expect(payload.entryTimeframeChart).toBe(entryBefore?.src);
    expect(validateChartImages(payload)).toBeNull();
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("Maximum update depth");
    expect(unhandled).not.toHaveBeenCalled();
  });

  test("submits a no-image entry once with all chart fields null", async () => {
    await click(button(host, "Save Trade"));
    expect(createTrade).toHaveBeenCalledTimes(1);
    expect(createTrade.mock.calls[0][0].data).toMatchObject({
      higherTimeframeChart: null,
      setupTimeframeChart: null,
      entryTimeframeChart: null,
    });
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("Maximum update depth");
    expect(unhandled).not.toHaveBeenCalled();
  });
});
