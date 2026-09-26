#!/usr/bin/env python3
"""Emails a digest file through the `gws` CLI (Google Workspace access already
signed in as Nathan on this Mac).

WHY THIS EXISTS
    The weekly SCNM job (scripts/weekly-scnm-job.sh) tries to email the digest
    to Nathan as a convenience on top of the vault copy, which is the copy of
    record. This is a thin wrapper because `gws` itself is a raw Google API
    client (`gws gmail users messages send --json '{"raw": "..."}'`) that
    wants a base64url-encoded RFC 2822 message, not plain text -- building
    that by hand in bash on every run would be fragile and hard to read.

WHAT IT DOES NOT DO
    Never raises past its own process boundary: a `gws` failure (not signed
    in, network down, quota) prints a clear reason on stderr and exits
    non-zero. The caller (weekly-scnm-job.sh) is responsible for recording
    that failure in the digest rather than treating "no email" as silent
    success -- see the "silence contract" decision,
    ~/jarvis-memory/decisions/2026/2026-08-06-monitoring-contract-silence-must-be-proven.md.

USAGE
    python3 scripts/send-digest-email.py --to dominathan@gmail.com \\
        --subject "SCNM weekly digest -- 2026-09-28" --body-file docs/digests/2026-09-28-weekly-digest.md
"""
from __future__ import annotations

import argparse
import base64
import json
import subprocess
import sys
from email.message import EmailMessage


def fail(msg: str) -> None:
    print(f'send-digest-email FAILED: {msg}', file=sys.stderr)
    sys.exit(1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--to', required=True)
    ap.add_argument('--subject', required=True)
    ap.add_argument('--body-file', required=True, help='plain-text/markdown file to send as the email body')
    args = ap.parse_args()

    try:
        body = open(args.body_file, encoding='utf-8').read()
    except OSError as exc:
        fail(f'could not read {args.body_file}: {exc}')
        return

    msg = EmailMessage()
    msg['To'] = args.to
    msg['Subject'] = args.subject
    # The digest is markdown, but a plain-text body renders it perfectly
    # readably in any mail client -- not worth a markdown-to-HTML dependency
    # for a weekly summary email.
    msg.set_content(body)
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode('ascii')

    payload = json.dumps({'raw': raw})
    proc = subprocess.run(
        ['gws', 'gmail', 'users', 'messages', 'send', '--params', '{"userId": "me"}', '--json', payload],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        fail(f'gws exited {proc.returncode}: {proc.stderr.strip()[:500] or proc.stdout.strip()[:500]}')
        return
    try:
        resp = json.loads(proc.stdout)
    except json.JSONDecodeError:
        fail(f'gws returned unparseable output: {proc.stdout.strip()[:500]}')
        return
    if 'error' in resp:
        fail(f'Gmail API error: {json.dumps(resp["error"])[:500]}')
        return
    print(f'sent (message id {resp.get("id", "?")})')


if __name__ == '__main__':
    main()
