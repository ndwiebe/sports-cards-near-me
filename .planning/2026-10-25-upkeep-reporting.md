# Upkeep reporting — local verified milestone, October 25, 2026

Branch: fix/ratings-proposal-reporting-oct25; isolated checkout scnm-upkeep-oct25; base bf26ee10. Existing source worktrees untouched. No shared owner was listed in the inspected primary SESSIONS table.

## Changes

- Preserve the ratings producer's ratings-refresh-payload.json in both the existing failure-surviving artifact and review PR, alongside CSVs. The proposal remains review-only; no importer/automatic application is added.
- Weekly digest and wrapper failure notes now distinguish a successful deployment request from a verified live result. Future daily builds are conditional, not guaranteed publication.
- Regression checks cover both reporting branches and the producer-to-artifact/PR path contract.

## Verification

Typecheck passed. 616 unit tests across 51 files passed. 72 Python tests passed. Shell syntax and git diff --check passed. Build passed with 1590 committed-data pages; this is not a refreshed production build. Independent Astra review: no blockers; 23 focused tests independently passed. No browser suite rerun for text/reporting-only changes; no live wrapper, paid Places refresh, email, sheet update or schedule change invoked.

## Current operational evidence

October 25 scheduled discovery completed 167 detail pages. Existing digest reports 33 new shows applied by the previously authorized job; this session did not make those edits. Latest production run 40198462065 independently succeeded, checked out bf26ee10, passed 615 unit / 131 browser checks and built 1708 pages. Public /shows/west-van-card-show-delta-2026-11-01/ independently returned 200 with expected address and Directions. Deployment is established by that run/live evidence, not inferred from sheet-bot changes.

Current digest still reports unavailable Cloudflare action data and failed Gmail delivery. These are access limitations, not zero activity. No credential retry/change attempted.

## Remaining release gate

Nathan approved publication and main workflow synchronization on October 25 at 14:41:54 UTC. Publication is in progress; record terminal outcomes separately. On approval, commit implementation and SESSIONS separately; publish reviewed PR to redesign and require CI. The ratings-refresh workflow definitions on main/redesign currently match exactly: blob 3a227c9e5be5d653b396b7d9fc0bdfdc9c311beb. The workflow-file change must also be reviewed/synchronized to main for the scheduled monthly workflow to use it. Do not merge all of redesign into stale main. No live ratings refresh is required for release testing because it consumes Places API calls and opens a review PR. Next normal scheduled execution must verify artifact retention; no success is claimed for that future run. Existing weekly job will pick up digest text through its normal redesign sync; do not run it merely to test copy because even --dry-run sends email.

Final supported quota: 97% weekly remaining, no secondary window, zero paid credits/fallback.
