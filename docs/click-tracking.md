# Click tracking

The tracker records accepted selections of Directions, Call and Website on shop pages.
These are actions, not unique visitors, completed calls, store visits or purchases.
Repeated selections count separately. No cookies or visitor profiles are used.

## Separate event records

Each accepted request writes one independent key in the existing Cloudflare KV namespace:

```
events:{storeSlug}:{directions|call|website}:{YYYY-MM}:{sourceCity|unknown}:{randomUUID} = 1
```

The random identifier belongs to one action, never to a visitor or session. The stored
fields contain no IP address, precise timestamp, full referrer or browser identifier.
Cloudflare still receives ordinary network request information. The privacy page
explains this distinction.

Separate keys prevent concurrent requests from overwriting the same counter. One
hundred concurrent accepted requests are covered by a local regression test. This
uses the existing namespace and one write per action, with no counter read. Storage
now grows by one small record per action. No new service or subscription is provisioned.

KV is eventually consistent, so recent events can appear late in reports. Bot filtering
is heuristic. Delivery failures, repeated taps and forged requests are still possible.
Recorded actions are not proof of human visitors or sales. Never send test clicks to
the live counter. Localhost is accepted by the existing origin policy, so a local test
must use a mocked destination or unset tracking configuration.

## City attribution

The browser includes only the path of the immediately preceding SCNM city page.
Queries and fragments are removed. External referrers, category pages, shop pages,
guides and direct arrivals produce `unknown`. No browser storage follows a visitor.
The Worker checks the city against `worker/city-paths.json`, generated from directory
cities. Unknown paths still count as actions, with no city attribution.

For example, an Edmonton city page leading to a Sherwood Park shop is recorded with
source `alberta/edmonton` and destination Sherwood Park. The destination address never
supplies a missing source city. Internal navigation to a listing is not counted as an
outbound action. A missing or suppressed referrer stays unattributed.

Refresh the allowlist before a Worker release with:

```
node --import tsx scripts/bake-click-cities.ts
```

Cities added after the Worker release remain unattributed until its next release.

## Historical counters

The original tracker began August 28, 2026. Its keys have this form:

```
clicks:{storeSlug}:{directions|call}:{YYYY-MM}
```

Those values are approximate. The former read, increment, write sequence lost updates
under concurrency. A local reproduction accepted ten requests but stored one increment.
This proves a possible undercount, not the amount lost in production. Cloudflare
[documents KV consistency limits](https://developers.cloudflare.com/kv/concepts/how-kv-works/).

The new Worker never changes old counters. They retain their original values and have
no city attribution. Reports label them as legacy data and do not silently combine
them with event records. Missing historical website clicks or city sources cannot be
reconstructed.

## Reports

```
python3 scripts/click-report.py
```

Requires authenticated Wrangler. The command reads both prefixes from remote KV.
It produces the existing `click-report-YYYY-MM-DD.csv` for legacy totals and a separate
`click-events-report-YYYY-MM-DD.csv` with source city, destination city, month and
individual action types. Authentication failures and malformed event values fail
explicitly. No event records is not proof the tracker is healthy.

Wrangler [lists all matching keys](https://developers.cloudflare.com/kv/reference/kv-commands/).
The script reads each value, so report time and read volume grow with the event count.
Keep this internal and revisit aggregation if volume grows materially.

## Commercial gate and rollout

PLAN.md requires 90 days of Search Console history for the city page, roughly 100+
impressions and 20+ outbound listing clicks per month. The counter start date does
not establish the city's Search Console history. New attribution starts with the
verified release, not retrospectively. Outreach remains paused.

Deploy the site disclosure and client, then deploy the Worker through the existing
`deploy-click-tracker` workflow. Both workflows check out `redesign`. The site requires
a fresh `site` dispatch from `main` to reach production. Website actions sent during
the brief interval before the Worker update are rejected by the old Worker. Mark the
measurement start only after both releases succeed. Verify live script wiring and
Worker deployment logs without adding synthetic actions to production.
