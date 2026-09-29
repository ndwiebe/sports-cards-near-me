# The SCNM weekly job — plain English

This is the automated Sunday-morning check that looks for new and changed card
shows and handles them for you. As of the 2026-09-26 decision ("newly found
shows post automatically"), **new and changed SHOWS go onto your shop/show
spreadsheet (the "sheet") and live site by themselves, with no approval
needed** — Nathan decided a first run finding 71 new shows made one-by-one
approval impossible inside a 15-minutes-a-week budget, and every change is
still fully undoable. **Shop (store) changes are unaffected** and still queue
for your OK, per the original trial, until at least 2026-10-10.

## What runs, and when

Every Sunday at 7:00 AM (your Mac's local time), if the Mac is on:

1. **Look for new and changed card shows.** It re-checks TCDB (the
   trading-card-show listing site) the same way the existing
   `scripts/refresh-shows.py` tool already does by hand, and sorts what it
   finds into: brand-new shows, shows with a changed venue/address/hours,
   maybe-duplicate shows, and possible extra days of an existing multi-day
   show.
2. **Turn the clear-cut ones into changes; hold the uncertain ones.** A
   brand-new show becomes an "add this row" change. A changed show becomes an
   "update this field" change on its existing row. An extra day becomes an
   "extend this show's end date" change, but ONLY when it can confidently
   match an existing show by name, city AND venue — otherwise, like a
   possible duplicate, it goes on a "held for a closer look" list instead and
   is never written anywhere.
3. **Run it through the sheet-change engine.** For SHOWS from this scrape,
   the engine writes the add/update straight to the sheet — no approval
   needed, even during the shop-changes trial. For shop (store) changes
   found by other automation, the safety gate from the original trial still
   applies: everything queues for your OK until 2026-10-10. Either way, the
   engine's other safety checks (does the sheet still look like what the
   change expected, does a delete shrink the sheet too much) still run before
   anything is written, and every applied change gets an undo command.
4. **After a real run that changed the live sheet, publish it to the live
   site.** Saving to the sheet alone isn't enough to update
   sportscardsnearme.ca — see "Pushing `redesign` does NOT publish" in this
   repo's `CLAUDE.md`. This step runs the same production-publish command
   (`gh workflow run site --ref main`) you'd otherwise run by hand. If that
   can't run (the `gh` command-line tool isn't signed in, for example), the
   summary says so plainly — but the site still rebuilds on its own every day
   at 9:00 AM UTC either way, so a change lands on the live site with
   tomorrow's daily build even without this step succeeding.
5. **Write this week's summary** (the "digest") — a short, plain-English
   write-up of what it posted automatically, what's held for a closer look,
   what's waiting on you (shop changes only, for now), whether the publish
   step worked, and anything that broke.
6. **Deliver the summary two ways:** a copy saved into your notes vault, and
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

The summary's **"What changed automatically"** section leads with a plain
count — "Posted automatically: 3 new shows, 2 updates" — then lists each one
with its own undo command, so you can put any single show back exactly the
way it was without touching anything else. Its **"Held for a closer look —
no action needed"** section lists anything TCDB found that wasn't
confident enough to post on its own (a possible duplicate, or an extra day
that couldn't be matched to an existing show) — nothing here was written
anywhere, so there's nothing to undo; it's just there so you know it was seen,
not silently dropped. A shop (store) change still waiting for your OK shows up
under **"Waiting for your approval"** with the exact command to approve it —
copy-paste it into a terminal, nothing to remember.

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

One thing outside this job's control, already tracked in
`~/jarvis-memory/_ops/WAITING-ON-NATHAN.md`:

1. **The automation's Google login needs to be given access to the real
   sheet.** Until you share the sheet with
   `scnm-sheet-bot@scnm-automation.iam.gserviceaccount.com` as an Editor, the
   live step of this job can't read or write it — the weekly summary will say
   so honestly rather than pretending it checked. Until then, the `--dry-run`
   flag (which uses a harmless **test copy** of the sheet instead) is the only
   way to exercise this pipeline end to end — including proving the new-shows
   autopost policy actually writes and can be undone (see
   `docs/superpowers/plans/2026-09-23-q4-sheet-automation.md` for how that was
   proven against the test copy).

The code that lets this job write to the real sheet ("live mode") is already
merged in, along with the "new shows post automatically" policy — that part
is done, not pending.

## What this job deliberately does NOT do

- It never edits `src/data/*.json` directly (those are generated from the
  sheet by a separate build step). It DOES write new/changed SHOWS straight
  to the real sheet once it has access (see above) — that's the whole point
  of the 2026-09-26 decision — but it never writes a shop (store) change
  without your OK first, and it never deletes, merges or renames anything on
  its own; those stay queued for a person regardless of source or sheet.
- It never commits or pushes anything to GitHub, and it never edits a GitHub
  Actions workflow file. The one GitHub-facing thing it CAN do is trigger the
  existing, already-reviewed production-publish workflow
  (`gh workflow run site --ref main`) after a real run changes the live
  sheet — the same command you'd otherwise run by hand, not a new one. It
  works entirely inside its own private copy of the repo otherwise (see
  "Where the job runs," below), and everything it writes there (the change
  log, the digests, the research files) stays local until a person decides to
  commit it — same as how you already review-and-commit `refresh-shows.py`'s
  output by hand today.
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
- **The production-publish step needs `gh` (the GitHub command-line tool)
  signed in** in whatever account runs this job (launchd jobs don't always
  see the same sign-in as your everyday Terminal). If it isn't, the summary's
  **"Getting this week's show changes live"** section says so plainly rather
  than silently skipping it — and because the site also rebuilds on its own
  every day at 9:00 AM UTC, any show change still reaches the live site the
  next day even when this step can't run.
- **Matching a changed or extended show back to the right existing row is
  automatic, not perfect.** It's the same city/date/venue matching
  `refresh-shows.py` itself already uses to decide something is CHANGED or a
  possible multi-day extension in the first place, re-checked against
  `src/data/shows.json`. When it can't confidently find (or extend) the right
  row, the row goes to "Held for a closer look" instead of guessing — so the
  failure mode is "nothing happened, a person should look," never "the wrong
  show got changed."
