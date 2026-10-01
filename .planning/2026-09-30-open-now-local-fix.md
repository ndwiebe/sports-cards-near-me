# Open-now CI fix — local only

Source runtime: Codex. Delegated from session 01a0f3f9-ad4e-70ee-b1ca-fb890ef5c01d.

Isolated checkout: `/Users/nathanwiebe/Documents/Codex/2026-09-30/task/sports-cards-near-me`
Branch: `fix/open-now-deterministic`. Base: `66ca8147b633910c43def32e165e114f4a5e4ad6`.
No commits, pushes, PRs (pull requests), merges, deployments or external writes performed.
Original checkout and its modified stores data left untouched. DMC and SlabBook untouched.

## Confirmed cause

The failing run https://github.com/ndwiebe/sports-cards-near-me/actions/runs/36739120439
reports a main commit, but its checkout step explicitly tests redesign at the base above.
September 29 run 36590968982 tested that same source under Node 22.23.2 and passed.
September 30 used Node 22.23.3. Its tzdb (time-zone database) is 2026c, versus 2026a
in the older local runtimes. The original test passes locally under 2026a and fails
under the exact CI Node 22.23.3 runtime, reproduced on this Mac.

https://data.iana.org/time-zones/tzdb-2026c/NEWS records Alberta moving to permanent
UTC-6 in 2026. At 2026-12-06T15:30Z, newer data reads Edmonton as 09:30, correctly
open for a 09:00 opening; older data reads 08:30. The supplied timestamp is fixed,
but its future local-time interpretation changed. This is not Date.now() leakage.

## Change

Only `tests/unit/open-now.test.ts` changes behavior. Use historical Sunday
2025-12-07T15:30Z for the Alberta/Saskatchewan comparison, keeping the original
closed/open expectations and wrong-zone protection. Explain why future dates
are inappropriate for this comparison. Add three cases changing the system
clock while keeping the supplied instant fixed; restore fake timers in finally.
Application code and zone mappings remain unchanged so visitor runtimes can
use their available time-zone rules.

## Verification

Dependencies installed from package-lock via `npm ci --offline --ignore-scripts --no-audit --no-fund`.
Node 22.23.3 downloaded to `/tmp/node-v22.23.3-darwin-arm64` for exact CI runtime testing.

- Original focused suite: Node 22.23.3, 24 pass / 1 fail; older local runtime, 25 pass.
- Fixed focused suite: 28 pass with both 2026a and 2026c time-zone data.
- Full suite: 48 files / 606 tests pass under Node 22.23.3 and Node 26.3.0.
- `npm run typecheck`: pass.
- `npm run build` under Node 22.23.3: pass, 1,592 pages.
- `npm run test:e2e` under Node 22.23.3: 121 pass / 11 conditional skips,
  including desktop and mobile-375 projects. Localhost/browser launch required
  sandbox escalation, approved automatically. Initial sandbox-only attempt could
  not bind localhost; approved rerun passed.
- New clock tests all fail if localClock is deliberately changed to read new Date()
  instead of the supplied instant. Temporary mutation restored; full suite rerun passes.
- `git diff --check`: pass.

Logs: `/tmp/scnm-tests22.log`, `/tmp/scnm-tests26.log`, `/tmp/scnm-build.log`, `/tmp/scnm-e2e.log`.
Local build used committed data, without re-baking from external sheets or configuring
Mapbox. Token-dependent map behavior and live production remain unverified.

## Publication steps — require Nathan's approval

1. Recheck remote redesign for intervening changes; integrate them locally and rerun checks.
2. Verify git identity is Nathan Wiebe <dominathan@gmail.com>. Stage explicit test and
   handoff paths and commit locally. Keep any SESSIONS.md log commit separate per repo rules.
3. Push feature branch: `git push -u origin fix/open-now-deterministic`.
4. Open a PR targeting redesign, review and approve it, then merge into redesign.
   Do not target main: site source is built from redesign. Existing workflow always
   checks out redesign, so it does not independently validate a feature branch PR.
5. The redesign merge triggers the build/Cloudflare preview workflow. Watch it with
   `gh run watch <run-id> --exit-status`.
6. With explicit production approval, `gh workflow run site --ref main`, identify its
   new run ID, then `gh run watch <run-id> --exit-status`. This publishes redesign to
   production. Verify the live site and workflow test/build/browser results.

The daily main schedule also publishes redesign, so approving the redesign merge
permits the next scheduled production rebuild to include this fix. No workflow changes
are needed for this test-only fix. Do not dispatch anything during this local task.

## Publication authorization — 2026-10-01

Nathan approved publishing and merging this fix through the parent task. Remote redesign
remained at the tested base on fresh fetch. Other open PRs are outside scope. Repeat
verification passed: 606 unit tests, typecheck, 1,592-page build; browser results recorded
in the final task response. Normal merge-triggered CI is authorized. No separate workflow
dispatch is authorized or planned. The local-only statements above describe the initial
September 30 handoff, before this approval.
