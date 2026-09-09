---
id: doc-008
title: Rate limit proxy topology and RATE_LIMIT_TRUSTED_HOPS
type: guide
created_date: '2026-09-09 14:10'
---

## Expected production topology (v1)

The app is a single Node process (decision-006 / decision-016) deployed
behind **exactly one** trusted reverse proxy that appends the real peer
address to `X-Forwarded-For` before forwarding to this app.

```
client -> [reverse proxy, appends real peer IP to XFF] -> app (Node process)
```

With this topology, `RATE_LIMIT_TRUSTED_HOPS=1` (the default) is correct: the
key derivation in `clientKeyFromHeaders`
(`src/lib/public-read-rate-limit.ts`) reads the last entry of XFF, which is
the entry the trusted proxy appended.

## Variants and the correct value

| Topology | `RATE_LIMIT_TRUSTED_HOPS` |
|---|---|
| Single reverse proxy in front of the app (default v1 deploy) | `1` |
| CDN/edge proxy (e.g. Cloudflare) in front of that reverse proxy, both appending to XFF | `2` |
| App exposed directly to the internet, no proxy | No correct value exists. Every request's XFF is fully client-controlled or absent, so every request MUST fall into the shared untrusted bucket by design (`clientKeyFromHeaders` cannot trust any entry). This is intentional fail-closed behavior, not a bug to work around by lowering `hops`. |

`hops` must equal the number of reverse proxies between the client and this
app that (a) are trusted and (b) actually append the real peer address to
XFF. It is not "how many proxies exist" — a proxy that does not touch XFF
does not count.

## How a wrong value fails, and how it's detected

- **`hops` too low:** the key resolves to an internal proxy's own IP (or a
  value shared by unrelated clients), so many distinct real clients collapse
  into a small number of buckets and start seeing spurious 429s.
- **`hops` too high (most common misconfiguration in practice):** XFF never
  has enough entries, so `clientKeyFromHeaders` falls back to the shared
  `UNTRUSTED_KEY` bucket for effectively all traffic. The rate limiter keeps
  returning 200/429 and looks healthy — this failure mode is silent by
  default.

`src/lib/untrusted-traffic-monitor.ts` (ACM-084 / decision-029) makes the
second case observable: it logs a structured `console.warn` line
(`untrusted_traffic_high`) when the fraction of requests falling into the
untrusted bucket sustains at or above 50% over a 60s window (with a minimum
sample floor and hysteresis to avoid noise — see the module's doc comment
for exact thresholds). On seeing that log, check the deployment's actual
proxy topology against the table above and correct
`RATE_LIMIT_TRUSTED_HOPS`; the log should stop within one window of the fix
taking effect (`untrusted_traffic_recovered`).

## Related

- `src/lib/rate-limit-policy.ts` — declarative per-IP / untrusted budget
  table for every throttled surface (`publicRead`, `items`, `icon`).
- decision-016 — original XFF/hops key derivation and public-read limiter.
- decision-029 — untrusted-bucket budget parity and this monitor (ACM-084).
