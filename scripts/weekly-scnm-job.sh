#!/opt/homebrew/bin/bash
# SCNM weekly job: show discovery -> sheet-change engine (review mode) -> weekly digest.
#
# Steps, each with its own hard timeout (this Mac has no GNU `timeout`/`gtimeout`
# installed, so `run_with_timeout` below wraps python3's subprocess timeout instead):
#   1. Preflight: dedicated checkout synced + clean, AI Chrome reachable, sheet
#      service-account key present.
#   2. scripts/refresh-shows.py -- the existing TCDB discovery scrape.
#   3. scripts/refresh-shows-to-payload.ts -- converts its NEW rows into the
#      sheet-change engine's ProposedChange payload (source refresh-shows.py,
#      so they classify low-risk -- see src/lib/refresh-shows-payload.ts).
#   4. scripts/sheet-change-engine.ts process ... --live (or, in --dry-run,
#      against the TEST COPY sheet, never the live one).
#   5. scripts/weekly-digest.ts -- the plain-English weekly summary.
#   6. Delivery: copy the digest into the vault, try to email it, and if
#      anything above couldn't run, say so in the digest rather than looking
#      like a quiet "nothing new" week (the silence contract -- see
#      ~/jarvis-memory/decisions/2026/2026-08-06-monitoring-contract-silence-must-be-proven.md).
#
# WHY A DEDICATED CLONE, NOT ONE OF THE EXISTING scnm-* WORKTREES:
#   ~/Projects/8-Web-Apps/scnm-* are Claude Code session working copies -- always
#   possibly mid-edit, and this repo's own worktrees share ONE git object store
#   and stash stack (`git worktree list` in any of them shows the others). This
#   job instead owns a private, full `git clone` at $HOME/.scnm-weekly-job/repo
#   that no interactive session ever touches or even knows about, fetched and
#   hard-reset to origin/redesign at the top of every run. A `git worktree add`
#   off an existing checkout was considered and rejected for exactly the shared-
#   object-store/stash reason a Claude Code session already has to guard
#   against with explicit-path-only staging (see this repo's CLAUDE.md §3). A
#   plain `git clone` has none of that shared state, and nothing in this
#   script ever runs `git add`, stages, commits or pushes anything -- see
#   docs/superpowers/plans/2026-09-23-q4-shows.md Task 3b's own "deliberately
#   does not commit the payload automatically" note; this job produces
#   reviewable files (the change log, the digest) and leaves them uncommitted
#   in that dedicated clone, same as that plan describes for a human today.
#
# Schedule: launchd com.nathan.scnm-weekly (ops/launchd/com.nathan.scnm-weekly.plist),
#   Sunday 07:00 local. See docs/ops/scnm-weekly-job.md for install/uninstall.
# Dry run: bash scripts/weekly-scnm-job.sh --dry-run
#   Runs discovery, the conversion and the digest for real, but the engine
#   step targets the TEST COPY sheet (--sheet-id, no SCNM_ALLOW_LIVE_SHEET) --
#   never the live directory sheet.
set -euo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
REPO_REMOTE="https://github.com/ndwiebe/sports-cards-near-me.git"
JOB_HOME="$HOME/.scnm-weekly-job"
JOB_REPO="$JOB_HOME/repo"
LOCK="$JOB_HOME/.weekly-job.lock"
LOG_DIR="$HOME/Library/Logs/scnm-weekly"
KEY_FILE="${SCNM_SHEET_KEY_FILE:-$HOME/.config/scnm/sheet-bot.json}"
# TEST COPY of the directory sheet -- see docs/superpowers/plans/2026-09-23-q4-sheet-automation.md
# §6. Never the live sheet id (14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I).
TEST_SHEET_ID="19cppWFlfberuPQvd6AKmeGNoSDsbcvzvHBSunP2pjus"
VAULT_DIGEST_DIR="$HOME/jarvis-memory/06-SportsCardsNearMe/digests"
NOTIFY_EMAIL="dominathan@gmail.com"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    *) echo "unknown argument: $arg (only --dry-run is recognized)" >&2; exit 2 ;;
  esac
done

# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

# Runs a command with a hard wall-clock timeout. This Mac has no GNU
# `timeout`/`gtimeout` (checked 2026-09-26 -- neither is installed), so this
# wraps python3's own subprocess timeout instead, which is always present
# (scripts/refresh-shows.py already requires python3). Exits 124 on a
# timeout, matching GNU timeout's convention, so callers can tell "timed out"
# from "ran and failed" the same way either tool would report it.
run_with_timeout() {  # secs cmd [args...]
  local secs="$1"
  shift
  python3 - "$secs" "$@" <<'PY'
import subprocess, sys
secs = float(sys.argv[1])
cmd = sys.argv[2:]
try:
    sys.exit(subprocess.run(cmd, timeout=secs).returncode)
except subprocess.TimeoutExpired:
    sys.exit(124)
PY
}

# Appends (or replaces, by name) one entry in the run's job-status file, in
# the exact shape scripts/weekly-digest.ts's JobStatus reads
# (docs/digests/job-status.json). Writing this is what turns "couldn't check
# something" into a visible line in the digest's "Anything failing" section
# instead of a quiet, misleading "nothing new this week".
append_status() {  # name ok|failing [note]
  local name="$1" status="$2" note="${3:-}"
  python3 - "$STATUS_FILE" "$name" "$status" "$note" "$RUN_ISO" <<'PY'
import json, sys
path, name, status, note, run_iso = sys.argv[1:6]
try:
    data = json.load(open(path))
except (OSError, json.JSONDecodeError):
    data = []
entry = {"name": name, "status": status, "lastRun": run_iso}
if note:
    entry["note"] = note
data = [d for d in data if d.get("name") != name] + [entry]
json.dump(data, open(path, "w"), indent=2)
PY
}

# For failures so total the job can't even produce a digest (e.g. the
# dedicated checkout is broken). A routine "Chrome is asleep" week is NOT
# this -- that's handled by append_status + still running the digest.
fail_hard() {  # message
  echo "FATAL: $1"
  mkdir -p "$HOME/jarvis-memory/_ops"
  echo "- [ ] $(date +%Y-%m-%d) | SCNM weekly job could not run | $1 (see $LOG for the full run log)" \
    >> "$HOME/jarvis-memory/_ops/WAITING-ON-NATHAN.md"
  exit 1
}

# ---------------------------------------------------------------------------
# Logging + overlap guard (same pattern as the existing
# ~/.claude/skills/social-post/scripts/weekly-content-prep.sh launchd job)
# ---------------------------------------------------------------------------
mkdir -p "$JOB_HOME" "$LOG_DIR"
find "$LOG_DIR" -name '*.log' -mtime +90 -delete 2>/dev/null || true
LOG="$LOG_DIR/$(date +%Y-%m-%d-%H%M)$([ "$DRY_RUN" = "1" ] && echo '-dryrun').log"
exec >>"$LOG" 2>&1
echo "=== scnm-weekly-job start $(date) (dry_run=$DRY_RUN) ==="

if [ -f "$LOCK" ]; then
  if [ -n "$(find "$LOCK" -mmin -180 2>/dev/null)" ]; then
    echo "lock present and fresh -- another run is active; exiting"
    exit 0
  fi
  echo "stale lock -- removing"
  rm -f "$LOCK"
fi
touch "$LOCK"

TODAY="$(date +%Y-%m-%d)"
RUN_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STATUS_FILE="$(mktemp -t scnm-job-status)"
echo "[]" > "$STATUS_FILE"
trap 'rm -f "$LOCK" "$STATUS_FILE"' EXIT

# ---------------------------------------------------------------------------
# Preflight: dedicated checkout, synced + clean
# ---------------------------------------------------------------------------
if [ ! -d "$JOB_REPO/.git" ]; then
  echo "no dedicated checkout yet -- cloning $REPO_REMOTE into $JOB_REPO"
  git clone --origin origin "$REPO_REMOTE" "$JOB_REPO" || fail_hard "could not clone $REPO_REMOTE into $JOB_REPO"
fi
cd "$JOB_REPO"

if ! git fetch origin redesign; then
  append_status "repo-sync" "failing" "could not fetch origin/redesign in the dedicated checkout -- network or GitHub auth problem"
  fail_hard "git fetch origin redesign failed in $JOB_REPO"
fi

# A dirty TRACKED file here means something touched this checkout outside
# this script -- it should never happen, since nothing else uses $JOB_REPO.
# Stop and ask for a manual look rather than silently discarding it with
# --hard (untracked files -- the change log, digests, research CSVs this job
# itself writes every week -- are expected and left alone; -uno hides them).
if [ -n "$(git status --porcelain -uno)" ]; then
  append_status "repo-sync" "failing" "the dedicated checkout has unexpected local changes to tracked files -- needs a manual look, not overwritten automatically"
  fail_hard "$JOB_REPO has unexpected tracked-file changes -- refusing to git reset --hard over them"
fi

git checkout -q redesign 2>/dev/null || git checkout -q -b redesign origin/redesign
git reset --hard origin/redesign >/dev/null
echo "repo synced to $(git rev-parse --short HEAD) (origin/redesign)"

echo "npm ci..."
if ! run_with_timeout 300 npm ci --silent; then
  append_status "repo-sync" "failing" "npm ci failed in the dedicated checkout (or took over 5 minutes)"
  fail_hard "npm ci failed in $JOB_REPO"
fi
append_status "repo-sync" "ok"

CHROME_OK=0
if curl -sf --max-time 5 http://127.0.0.1:9222/json/version >/dev/null 2>&1; then
  CHROME_OK=1
  append_status "chrome" "ok"
  echo "AI Chrome reachable on 127.0.0.1:9222"
else
  append_status "chrome" "failing" "AI Chrome is not reachable on 127.0.0.1:9222 -- it may be asleep, closed, or the Mac was off. TCDB (the card-show listing site this scrapes) blocks every other kind of access, so show discovery could not run this week."
  echo "AI Chrome NOT reachable -- discovery will be skipped this run"
fi

KEY_OK=0
if [ -f "$KEY_FILE" ]; then
  KEY_OK=1
  append_status "sheet-key" "ok"
else
  append_status "sheet-key" "failing" "The Google service-account key file was not found at $KEY_FILE -- the sheet-change engine step could not run against any sheet this week."
  echo "sheet key NOT found at $KEY_FILE -- engine step will be skipped this run"
fi

# ---------------------------------------------------------------------------
# Discovery: scripts/refresh-shows.py (only if Chrome is up)
# ---------------------------------------------------------------------------
PAYLOAD_CSV=""
if [ "$CHROME_OK" = "1" ]; then
  echo "running refresh-shows.py (hard timeout 20 min)..."
  DISCOVERY_LOG="$JOB_HOME/last-refresh-shows.log"
  if run_with_timeout 1200 python3 scripts/refresh-shows.py >"$DISCOVERY_LOG" 2>&1; then
    CANDIDATE="docs/research/${TODAY}-show-refresh-payload.csv"
    if [ -f "$CANDIDATE" ]; then
      PAYLOAD_CSV="$CANDIDATE"
      append_status "discovery" "ok"
      echo "discovery ok -- payload at $PAYLOAD_CSV"
    else
      append_status "discovery" "failing" "refresh-shows.py exited successfully but did not produce today's payload CSV ($CANDIDATE) -- see $DISCOVERY_LOG"
      echo "discovery produced no payload CSV -- see $DISCOVERY_LOG"
    fi
  else
    rc=$?
    if [ "$rc" -eq 124 ]; then
      append_status "discovery" "failing" "refresh-shows.py did not finish inside 20 minutes and was stopped -- TCDB may be slow, or Chrome may have too many open tabs (its own script warns above ~40). See $DISCOVERY_LOG."
    else
      append_status "discovery" "failing" "refresh-shows.py failed (exit $rc) -- see $DISCOVERY_LOG for the reason."
    fi
    echo "discovery failed (exit $rc) -- see $DISCOVERY_LOG"
    tail -n 20 "$DISCOVERY_LOG" || true
  fi
else
  echo "skipping discovery -- Chrome not reachable"
fi

# ---------------------------------------------------------------------------
# Convert NEW rows to the engine's payload shape
# ---------------------------------------------------------------------------
CHANGES_JSON=""
if [ -n "$PAYLOAD_CSV" ]; then
  CANDIDATE_JSON="docs/research/${TODAY}-scnm-weekly-proposed-changes.json"
  echo "converting new-show rows to a proposed-change payload..."
  if run_with_timeout 120 npx tsx scripts/refresh-shows-to-payload.ts "$PAYLOAD_CSV" --out "$CANDIDATE_JSON" --source refresh-shows.py; then
    CHANGES_JSON="$CANDIDATE_JSON"
    append_status "convert" "ok"
  else
    append_status "convert" "failing" "could not convert $PAYLOAD_CSV into a proposed-change payload -- see the run log ($LOG)"
    echo "conversion failed"
  fi
fi

# ---------------------------------------------------------------------------
# Sheet-change engine: review mode. Dry run targets the TEST COPY sheet;
# a real run targets the live sheet exactly per the agreed CLI contract
# (the engine itself forces review-all on the live sheet until 2026-10-10 --
# see ~/jarvis-memory/decisions/2026/2026-09-23-scnm-q4-automation-calls.md).
# ---------------------------------------------------------------------------
if [ -n "$CHANGES_JSON" ]; then
  if [ "$KEY_OK" = "1" ]; then
    if [ "$DRY_RUN" = "1" ]; then
      echo "engine dry run against the TEST COPY sheet ($TEST_SHEET_ID)..."
      if SCNM_SHEET_KEY_FILE="$KEY_FILE" run_with_timeout 120 npx tsx scripts/sheet-change-engine.ts process "$CHANGES_JSON" --sheet-id "$TEST_SHEET_ID"; then
        append_status "engine" "ok" "dry run against the TEST COPY sheet, not the live one"
      else
        append_status "engine" "failing" "sheet-change-engine.ts failed against the TEST COPY sheet during a dry run -- see the run log ($LOG)"
      fi
    else
      echo "engine LIVE run against the real sheet (review-all, forced)..."
      if SCNM_SHEET_KEY_FILE="$KEY_FILE" SCNM_ALLOW_LIVE_SHEET=1 run_with_timeout 120 npx tsx scripts/sheet-change-engine.ts process "$CHANGES_JSON" --live; then
        append_status "engine" "ok"
      else
        append_status "engine" "failing" "sheet-change-engine.ts failed against the live sheet -- see the run log ($LOG). The engine only ever writes inside its own guarded process() call, so a failure here means nothing new was queued or applied this week, not a partial write."
      fi
    fi
  else
    echo "skipping the engine step -- no service-account key file"
  fi
else
  echo "skipping the engine step -- no new-show payload this run"
fi

# ---------------------------------------------------------------------------
# Digest
# ---------------------------------------------------------------------------
mkdir -p docs/digests
cp "$STATUS_FILE" docs/digests/job-status.json
DIGEST_REL="docs/digests/${TODAY}-weekly-digest.md"
echo "building the weekly digest..."
if ! run_with_timeout 60 npx tsx scripts/weekly-digest.ts --log docs/change-log/sheet-changes.jsonl --out "$DIGEST_REL"; then
  fail_hard "weekly-digest.ts itself failed to build -- see $LOG"
fi
DIGEST_ABS="$JOB_REPO/$DIGEST_REL"
echo "digest written to $DIGEST_ABS"

# ---------------------------------------------------------------------------
# Delivery: vault copy (copy of record) + best-effort email
# ---------------------------------------------------------------------------
mkdir -p "$VAULT_DIGEST_DIR"
VAULT_OUT="$VAULT_DIGEST_DIR/${TODAY}-scnm-weekly.md"
{
  echo "---"
  echo "date: $TODAY"
  echo "tags: [scnm, weekly-digest, automation]"
  echo "project: sportscardsnearme"
  echo "type: digest"
  echo "---"
  echo
  cat "$DIGEST_ABS"
} > "$VAULT_OUT"
echo "copied digest to vault: $VAULT_OUT"

echo "emailing digest to $NOTIFY_EMAIL..."
if run_with_timeout 60 python3 scripts/send-digest-email.py --to "$NOTIFY_EMAIL" \
     --subject "SCNM weekly digest — $TODAY" --body-file "$DIGEST_ABS"; then
  echo "email sent"
else
  EMAIL_NOTE="Email delivery failed this run (gws/Gmail) -- the digest is still saved in your vault at $VAULT_OUT. Check gws sign-in: \`gws gmail users messages list --params '{\"userId\":\"me\",\"maxResults\":1}'\`."
  echo "EMAIL FAILED: $EMAIL_NOTE"
  {
    echo
    echo "---"
    echo "_Note added by the weekly job: ${EMAIL_NOTE}_"
  } >> "$VAULT_OUT"
fi

echo "=== scnm-weekly-job done $(date) ==="
