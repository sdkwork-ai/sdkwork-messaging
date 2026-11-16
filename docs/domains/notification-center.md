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

## 2. Provider directory and initialization

The email and SMS account tabs render a provider directory containing every
provider in the shipped catalog, not only rows that already exist. Each card
shows the provider's local brand mark, the localized name and description, and
whether the provider is initialized, has credentials, and is enabled.

The install seed creates one account, one sender/signature identity, and one
ordered routing chain per provider for the canonical tenant, so a fresh
installation opens with every provider visible and only credentials missing.
For any other tenant/organization, or after a provider row was removed, the
directory's **Complete missing providers** action calls the same idempotent
provider initialization as the add-provider picker; it creates the account,
identity, and routing steps for every missing provider at once.

The add-provider picker initializes the selected provider before opening its
editor, so the operator edits the preset account rather than creating a bare
account row without a sender/signature or rule step. Brand marks are inline
local assets: official vendor glyphs where an openly licensed mark exists, and
official-wordmark/brand-color tiles for vendors without one. The console never
loads a remote logo.

## 3. Send records

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
created/sent/delivered/failed timestamps. The detail response adds the full body,
a tag-stripped `bodyText` rendering, and the ordered attempt list. The console
renders `bodyText` by default and keeps the raw HTML body behind an explicit
"View HTML source" disclosure, so operators never read markup by accident and
the console never injects stored HTML into the page.

Status vocabulary: `accepted`, `queued`, `sent`, `delivered`, `failed`,
`opened`, `cancelled`, `expired`. The delivery worker owns message status
transitions; records never invent a terminal status from a stale message row.

## 4. Notification dashboard

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

## 5. Non-goals for this phase

- Per-provider rate limits, quiet hours, and weighted routing (the chain is a
  deterministic ordered failover).
- Cross-tenant template catalogs.
- Provider webhook ingestion of delivery receipts; the worker updates delivery
  and message status.
