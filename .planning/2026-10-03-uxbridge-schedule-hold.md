# Uxbridge temporary schedule hold

Nathan approved the warning, recommendation suppression and normal production publication on 2026-10-03 at 16:49:53 UTC (messageSentinel_a8f541072af881919ebe55a28e678ac3; source thread 01a0fe5b-190d-7509-8ac8-2eea9f63d03b).

Exact page: /shows/uxbridge-sports-card-show-stouffville-2026-10-03/.
Attendee reported no apparent event at Goodwood Community Centre. Cancellation and a replacement date remain unconfirmed. TCDB 32430 points back to SCNM and is not independent evidence.

Mutation: `src/lib/shows.ts` contains the exact-slug editorial hold (temporary warning applied after sheet baking). `isRecommendedShow` excludes it from upcoming recommendation consumers, `showsThisWeekend` excludes it, `nextInSeries` skips it, and `showTimingLabel` withholds urgency. The detail page shows the warning, identifies the original details as pending verification, and withholds EventScheduled data and past-event claims. Source sheet and generated JSON remain unchanged. Remove the exact hold only after verification.

Local checks: typecheck, 608 unit tests and 1592-page build passed. Browser and release outcomes recorded after verification.

Fresh public-sheet bake: 285 shows (3 existing incomplete rows skipped); 1671-page build. 123 browser tests passed, 11 conditional skips, including warning page at 375px. Target absent from home, calendar, weekend and Ontario calendar recommendations, including metadata. Generated JSON not committed. PR: https://github.com/ndwiebe/sports-cards-near-me/pull/16

## Approved source wording update

Nathan requested “Update accordingly” at 20:17:52 UTC on October 3 (Sentinel_2824e0d3fdd88191a75ffe9d62036fda). Parent investigator verified TCDB 32430 at 20:16 UTC now says “Show has been removed or cancelled.” This wording does not distinguish actual cancellation from removal of an erroneous listing. No reason, organizer explanation or replacement date is confirmed. Warning now quotes the source status, keeps actual event status unconfirmed and links to the source. Existing recommendation and scheduled-event suppression remain. No emails sent.

Local validation: typecheck, 608 unit tests, 1671-page build; browser regression includes source wording, status caveat and source link at 375px.
