import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetUntrustedTrafficMonitorState,
  recordClientKeyOutcome,
} from "@/lib/untrusted-traffic-monitor";

const WINDOW_MS = 60_000;

function fillWindow(t0: number, total: number, untrusted: number): void {
  for (let i = 0; i < total; i++) {
    recordClientKeyOutcome(i < untrusted, t0 + i);
  }
}

describe("untrusted-traffic-monitor", () => {
  afterEach(() => {
    __resetUntrustedTrafficMonitorState();
    vi.restoreAllMocks();
  });

  it("does not log below the minimum sample floor even at 100% untrusted", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    __resetUntrustedTrafficMonitorState();

    const t0 = Date.now();
    fillWindow(t0, 49, 49);
    // Turn the window over without crossing the sample floor.
    recordClientKeyOutcome(true, t0 + WINDOW_MS);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("logs untrusted_traffic_high when the fraction crosses 0.5 with enough samples", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    __resetUntrustedTrafficMonitorState();

    const t0 = Date.now();
    fillWindow(t0, 100, 60);
    // Turn the window over to trigger evaluation of the completed window.
    recordClientKeyOutcome(false, t0 + WINDOW_MS);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [line] = warnSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(line);
    expect(parsed.event).toBe("untrusted_traffic_high");
    expect(parsed.untrustedFraction).toBeCloseTo(0.6, 1);
  });

  it("does not re-log every window while sustained, only after the re-log interval", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    __resetUntrustedTrafficMonitorState();

    let t = Date.now();
    fillWindow(t, 100, 60);
    t += WINDOW_MS;
    fillWindow(t, 100, 60); // turns previous window over -> first alert
    t += WINDOW_MS;
    fillWindow(t, 100, 60); // turns second window over -> still alerting, too soon to re-log

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("logs untrusted_traffic_recovered when the fraction drops below the recovery threshold", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    __resetUntrustedTrafficMonitorState();

    let t = Date.now();
    fillWindow(t, 100, 60);
    t += WINDOW_MS;
    fillWindow(t, 100, 5); // turns previous (alerting) window over -> first alert fires
    t += WINDOW_MS;
    fillWindow(t, 100, 5); // turns the low-fraction window over -> recovery

    expect(warnSpy).toHaveBeenCalledTimes(2);
    const events = warnSpy.mock.calls.map(([line]) => JSON.parse(line as string).event);
    expect(events).toEqual(["untrusted_traffic_high", "untrusted_traffic_recovered"]);
  });
});
