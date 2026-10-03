# Uxbridge temporary schedule hold

Nathan approved the warning, recommendation suppression and normal production publication on 2026-10-03 at 16:49:53 UTC (messageSentinel_a8f541072af881919ebe55a28e678ac3; source thread 01a0fe5b-190d-7509-8ac8-2eea9f63d03b).

Exact page: /shows/uxbridge-sports-card-show-stouffville-2026-10-03/.
Attendee reported no apparent event at Goodwood Community Centre. Cancellation and a replacement date remain unconfirmed. TCDB 32430 points back to SCNM and is not independent evidence.

Mutation: `src/lib/shows.ts` contains the exact-slug editorial hold (temporary warning applied after sheet baking). `isRecommendedShow` excludes it from upcoming recommendation consumers, `showsThisWeekend` excludes it, `nextInSeries` skips it, and `showTimingLabel` withholds urgency. The detail page shows the warning, identifies the original details as pending verification, and withholds EventScheduled data and past-event claims. Source sheet and generated JSON remain unchanged. Remove the exact hold only after verification.

Local checks: typecheck, 608 unit tests and 1592-page build passed. Browser and release outcomes recorded after verification.
