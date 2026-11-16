# Notification Center — Rules, Records, And Dashboard

Status: implementation contract for `/admin/notify/*`.
Owner: sdkwork-messaging.
Scope: email and SMS provider configuration, scenario routing rules, send
records, and the notification-center dashboard.

## 1. Scenario routing rules

A rule is one ordered fallback chain per `(tenant, organization, channel,
scenario)`. The four scenarios are fixed:

| Scenario | Purpose |
| --- | --- |
| `default` | Catch-all when a business event does not match a dedicated scenario. |
| `verification_code` | Login, registration, and identity verification; highest deliverability expectation. |
| `system_notification` | Orders, alerts, and other transactional system events. |
| `marketing` | Campaign and bulk promotion; isolate sender reputation. |

Industry-aligned invariants:

1. **Ordered failover.** Steps are tried in order; delivery falls through to the
   next step when a step is disabled, the identity is disabled, the provider
   account lacks credentials, or the provider returns a failure.
2. **Three independent signals per step.**
   - `identityEnabled` is the sender/signature switch in the channel tab.
   - `accountEnabled` is the owning provider account switch.
   - `stepEnabled` belongs to the rule and answers "may this scenario use this
     identity?". A disabled step stays in place so it can be re-activated
     without losing its position.
   Each step also exposes `hasSecret` so an operator can see that the identity is
   enabled while its provider account is disabled or its credentials have not
   been entered yet. Seeded accounts intentionally start without credentials, so
   "Credentials missing" is an expected pre-go-live signal rather than a rule
   error.
3. **Rule-level kill switch.** A disabled rule is skipped and the scenario falls
   back to `default`. A disabled rule may keep an empty chain.
4. **No silent dead rules.** An **enabled** rule must contain at least one
   `stepEnabled` step. The API rejects `enabled=true` with an empty or fully
   disabled chain; the console blocks the save and explains why.
5. **No duplicate steps.** A chain contains each identity at most once; both the
   API and the console reject duplicates.
6. **Known identities only.** Steps must reference a live sender/signature of
   the same tenant/organization; unknown ids are rejected.
7. **Default-first recommendation.** The seeded default provider is the head of
   every chain (Tencent Enterprise Mail for email, Tencent Cloud SMS for SMS).
   The console's "Recommended order" action reuses the `default` chain order.
8. **Non-destructive initialization.** One-click provider initialization appends
   a missing identity as an enabled step and preserves existing step switches;
   it never overwrites operator routing decisions.

### Wire shape

`chain_json` accepts both the legacy bare-id array and the current object form;
new writes use the object form:

```json
[
  { "id": "950000000213", "enabled": true },
  { "id": "950000000201", "enabled": false }
]
```

`PUT /backend/v3/api/messaging/{email|sms}/send_rules/{scenario}` accepts
`{ "steps": [{ "senderId"|"signatureId": "…", "enabled": true }], "enabled": true,
"expectedVersion": "3" }` and uses optimistic concurrency.

## 2. Send records

`messaging_outbound_message` is the record anchor; `messaging_outbound_delivery`
holds ordered provider attempts.

- Email records: `GET /backend/v3/api/messaging/email/send_records`.
- SMS records: `GET /backend/v3/api/messaging/sms/send_records`.
- Detail (with attempt timeline): `GET …/send_records/{recordId}`.

Filters: `status`, `q` (target/subject/body), `from`, `to` (RFC3339 or
`YYYY-MM-DD`; date-only `to` covers the whole day), `page`, `page_size`.

Record fields include target masked value, subject/body preview, status,
scenario (from `payload_json.scenario`, default `default`), template code,
latest provider and provider message id, latest error, attempt count, and
created/sent/delivered/failed timestamps. The detail response adds the full body
and the ordered attempt list.

Status vocabulary: `accepted`, `queued`, `sent`, `delivered`, `failed`,
`opened`, `cancelled`, `expired`. The delivery worker owns message status
transitions; records never invent a terminal status from a stale message row.

## 3. Notification dashboard

`GET /backend/v3/api/messaging/dashboard?range=7|30|90` aggregates the same
records over a rolling UTC window:

- totals: total, email, sms, delivered, failed, pending
  (`accepted|queued|sent`);
- success rate: `delivered + opened` over
  `delivered + opened + failed` (0 when the denominator is empty);
- by channel, status, scenario (payload), and latest provider;
- daily UTC trend buckets, including zero-filled days;
- the five most recent failed records.

The console renders the aggregation as KPI cards, a daily trend, status/
scenario/provider breakdowns, and a recent-failure list. It does not recompute
metrics client-side.

## 4. Non-goals for this phase

- Per-provider rate limits, quiet hours, and weighted routing (the chain is a
  deterministic ordered failover).
- Cross-tenant template catalogs.
- Provider webhook ingestion of delivery receipts; the worker updates delivery
  and message status.
