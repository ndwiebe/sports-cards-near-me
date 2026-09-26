# The SCNM weekly job — plain English

This is the automated Sunday-morning check that looks for new card shows and
tells you about it. It never changes your shop/show spreadsheet (the "sheet")
by itself — the most it ever does on its own is queue a suggestion for you to
say yes or no to.

## What runs, and when

Every Sunday at 7:00 AM (your Mac's local time), if the Mac is on:

1. **Look for new card shows.** It re-checks TCDB (the trading-card-show
   listing site) the same way the existing `scripts/refresh-shows.py` tool
   already does by hand.
2. **Turn any brand-new shows into a suggestion.** Each new show becomes one
   proposed change for step 3, tagged as coming from `refresh-shows.py` so it
   counts as a routine, low-risk suggestion rather than something risky.
3. **Run it through the sheet-change engine, in review mode.** This is the
   safety gate: right now (and until at least 2026-10-10, per your own
   decision) *everything* it finds — even a routine new show — gets queued
   for your OK rather than written to the sheet automatically. Nothing lands
   on the real sheet without you approving it first.
4. **Write this week's summary** (the "digest") — a short, plain-English
   write-up of what it found, what's waiting on you, and anything that broke.
5. **Deliver the summary two ways:** a copy saved into your notes vault, and
   an emailed copy to dominathan@gmail.com (best-effort — if email fails, the
   vault copy still has everything and says so).

If any of these steps couldn't run — the Mac was asleep, the browser wasn't
open, TCDB blocked it, or something errored — the summary says so in plain
words ("Couldn't check X because Y"). It's built to never look like "nothing
new this week" when the truth is "we couldn't check."

## Where to find this week's summary

Two copies are made every week, both under the same name style,
`YYYY-MM-DD-scnm-weekly.md` / `YYYY-MM-DD-weekly-digest.md`:

- **Your notes vault (the one to read):**
  `~/jarvis-memory/06-SportsCardsNearMe/digests/YYYY-MM-DD-scnm-weekly.md`
  — this one syncs automatically to your other machine, so you'll see it
  there too.
- **Your email inbox** (dominathan@gmail.com) — same content, sent as a
  best-effort extra copy. If it doesn't arrive, check the vault copy first;
  it will say plainly if the email failed and why.

A suggestion waiting for your OK shows up in the summary with the exact
command to approve it — copy-paste it into a terminal, nothing to remember.

## How to tell if it actually ran

- **Quick check:** does today's file exist in the vault folder above? If
  it's missing on a Sunday afternoon, the job likely didn't run at all (Mac
  off/asleep at 7 AM — see "Wake behavior" below).
- **The summary's own "Anything failing" section** tells you if it ran but
  hit a snag (browser not open, TCDB blocked it, the automation account
  wasn't set up yet, etc.) — that's the honest version of "it ran, but
  couldn't finish."
- **Full technical log**, if you want the raw detail: a new file appears
  each week in `~/Library/Logs/scnm-weekly/`, named by the run's date and
  time (e.g. `2026-10-05-0700.log`). ("`~/Library/Logs`" is just the folder
  macOS itself uses for background-app logs — you already have folders like
  it for other apps.)

## Wake behavior

If the Mac is asleep or off at 7:00 AM Sunday, macOS's own scheduler
(**launchd** — the built-in "run this at a certain time" system, similar in
spirit to what other operating systems call a cron job) runs the job once,
soon after the Mac next wakes up, rather than skipping that week outright.
Either way, if the browser wasn't open by the time it ran, the summary says
plainly that show discovery couldn't be checked that week.

## Turning it on (one-time setup — do this yourself, it's not automatic)

This is deliberately a manual, reviewable step — nothing installs itself.

```bash
# 1. One-time: create the job's own private working copy of the repo and
#    prove the pipeline runs (safe — this step never touches the real sheet):
cd /Users/nathanwiebe/Projects/8-Web-Apps/scnm-q4-macjob   # or wherever this PR has landed
bash scripts/weekly-scnm-job.sh --dry-run
tail -50 ~/Library/Logs/scnm-weekly/*.log   # confirm it ran cleanly

# 2. Install the schedule:
cp ops/launchd/com.nathan.scnm-weekly.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.nathan.scnm-weekly.plist

# 3. Optional: trigger it once immediately instead of waiting for Sunday,
#    to see a real scheduled run end-to-end:
launchctl start com.nathan.scnm-weekly
```

## Turning it off

```bash
launchctl unload ~/Library/LaunchAgents/com.nathan.scnm-weekly.plist
rm ~/Library/LaunchAgents/com.nathan.scnm-weekly.plist
```

This only stops future Sunday runs. It does not touch anything the job has
already written (past digests, the vault copies, or anything already queued
for your approval in the sheet-change engine's log).

## Before this can touch the real sheet at all

Two things outside this job's control, both already tracked in
`~/jarvis-memory/_ops/WAITING-ON-NATHAN.md`:

1. **The automation's Google login needs to be given access to the real
   sheet.** Until you share the sheet with
   `scnm-sheet-bot@scnm-automation.iam.gserviceaccount.com` as an Editor, the
   live step of this job can't read or write it — the weekly summary will say
   so honestly rather than pretending it checked.
2. **The code that lets this job write to the real sheet ("live mode")** is
   being built in a separate, parallel piece of work and merges in
   afterward. Until it does, the `--dry-run` flag (which uses a harmless
   **test copy** of the sheet instead) is the only way to exercise this
   pipeline end to end.

## What this job deliberately does NOT do

- It never edits `src/data/*.json` (those are generated from the sheet by a
  separate build step) and never touches the live sheet without the
  "everything needs your OK" gate described above.
- It never commits or pushes anything to GitHub. It works entirely inside
  its own private copy of the repo (see "Where the job runs," below), and
  everything it writes there (the change log, the digests, the research
  files) stays local until a person decides to commit it — same as how you
  already review-and-commit `refresh-shows.py`'s output by hand today.
- It never runs inside any of your `~/Projects/8-Web-Apps/scnm-*` working
  folders — those are where Claude Code sessions work, and could be mid-edit
  at any time. It keeps its own separate copy at `~/.scnm-weekly-job/repo`,
  invisible to and untouched by any interactive session.

## Where the job runs (technical, for the curious)

The job keeps a private, full copy of this GitHub repository at
`~/.scnm-weekly-job/repo`, on the `redesign` branch (the same branch the live
site is built from). Every run re-downloads the latest version of that
branch before doing anything else, so the job always uses today's code and
today's data — including picking up future improvements to the job script
itself once they're on GitHub. This copy is exclusively the job's own; no
interactive Claude Code session ever works there.

## Known limitations, honestly

- The research files `refresh-shows.py` writes each week (the raw CSV/report
  of what it found) accumulate locally in the job's private copy and are
  never committed — unlike the historical "human runs it, reviews the CSV,
  commits it" process. If you want those in git history going forward,
  someone needs to periodically copy them over and commit by hand, or this
  job needs a follow-up to do that safely (a real decision to make, not
  something to automate quietly).
- TCDB (the show-listing site) sometimes returns nothing if your browser has
  a lot of tabs/windows open (~40+) — `refresh-shows.py`'s own code has
  warned about this since August. If a week's summary says discovery failed
  with "every province returned zero rows," closing some browser tabs before
  the next Sunday run is worth trying.
