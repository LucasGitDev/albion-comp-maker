/**
 * Observable signal for a misconfigured `RATE_LIMIT_TRUSTED_HOPS` (ACM-084 /
 * decision-029 section 4). A wrong hop count makes every request fall back
 * to the shared untrusted bucket — the limiter keeps returning 200/429 and
 * looks healthy, so this is the only place the misconfiguration becomes
 * visible.
 *
 * Instrumented from a single point, `clientKeyFromHeaders`
 * (`public-read-rate-limit.ts`), which every throttled surface calls
 * through — instrumenting each of the five call sites individually would be
 * easy to forget and would reintroduce the "case by case" problem this task
 * exists to fix.
 *
 * No metrics stack exists in this project (no OpenTelemetry/Prometheus/pino
 * — see decision-029). `console.warn` is the honest minimum: it disappears
 * if stdout isn't captured, but adding a metrics dependency for one signal
 * would be new technology without demonstrated need.
 */

const WINDOW_MS = 60_000;
// Below this many samples in a window, a single anonymous health check can
// produce a 100% untrusted fraction with no benign explanation to point to
// — not enough signal to act on.
const MIN_SAMPLES = 50;
const ALERT_THRESHOLD = 0.5;
// Deliberately below ALERT_THRESHOLD (dead band) so the state can't flap on
// every window when the fraction hovers near the alert line.
const RECOVERY_THRESHOLD = 0.2;
const RELOG_INTERVAL_MS = 15 * 60_000;

type MonitorStatus = "ok" | "alerting";

type MonitorState = {
  windowStart: number;
  total: number;
  untrusted: number;
  status: MonitorStatus;
  lastLogAt: number;
};

function initialState(now: number): MonitorState {
  return { windowStart: now, total: 0, untrusted: 0, status: "ok", lastLogAt: 0 };
}

let state: MonitorState = initialState(Date.now());

function currentTrustedHopsSetting(): string {
  return process.env.RATE_LIMIT_TRUSTED_HOPS ?? "1";
}

function logLine(event: "untrusted_traffic_high" | "untrusted_traffic_recovered", fraction: number): void {
  state.lastLogAt = state.windowStart;
  console.warn(
    JSON.stringify({
      event,
      untrustedFraction: Number(fraction.toFixed(3)),
      windowTotal: state.total,
      rateLimitTrustedHops: currentTrustedHopsSetting(),
      action:
        event === "untrusted_traffic_high"
          ? "Verify RATE_LIMIT_TRUSTED_HOPS matches the number of trusted reverse proxies appending to X-Forwarded-For."
          : "RATE_LIMIT_TRUSTED_HOPS traffic fraction back to normal.",
    }),
  );
}

/** Evaluates the just-completed window's counters against the thresholds. */
function evaluateWindow(): void {
  if (state.total < MIN_SAMPLES) return;

  const fraction = state.untrusted / state.total;

  if (state.status === "ok") {
    if (fraction >= ALERT_THRESHOLD) {
      state.status = "alerting";
      logLine("untrusted_traffic_high", fraction);
    }
    return;
  }

  // state.status === "alerting"
  if (fraction < RECOVERY_THRESHOLD) {
    state.status = "ok";
    logLine("untrusted_traffic_recovered", fraction);
    return;
  }

  if (state.windowStart - state.lastLogAt >= RELOG_INTERVAL_MS) {
    logLine("untrusted_traffic_high", fraction);
  }
}

/**
 * Records one `clientKeyFromHeaders` outcome. On a 60s window turn,
 * evaluates the just-completed window's fraction of untrusted-bucket
 * traffic and logs a transition/recurrence per the hysteresis above.
 */
export function recordClientKeyOutcome(isUntrusted: boolean, now: number = Date.now()): void {
  if (now - state.windowStart >= WINDOW_MS) {
    evaluateWindow();
    state = { windowStart: now, total: 0, untrusted: 0, status: state.status, lastLogAt: state.lastLogAt };
  }

  state.total += 1;
  if (isUntrusted) state.untrusted += 1;
}

/** Test-only helper to reset all monitor state between specs. */
export function __resetUntrustedTrafficMonitorState(): void {
  state = initialState(Date.now());
}
