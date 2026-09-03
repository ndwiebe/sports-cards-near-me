#!/usr/bin/env python3
"""Tests for click-report.py, against saved fixtures -- never the live network.

fixtures/kv-key-list-sample.json and fixtures/kv-values-sample.json are a saved sample
of real `wrangler kv key list --remote` / `wrangler kv key get --remote` output (shape
confirmed against the actual CLICKS namespace 2026-09-03), extended with a malformed
key and an orphan slug that don't currently exist in production, to exercise those
paths deliberately.

Run: python3 scripts/test_click_report.py
"""
import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
FIXTURES = SCRIPTS_DIR / 'fixtures'

# click-report.py has a hyphen in its name, so it can't be `import click_report` --
# load it directly from the file instead.
spec = importlib.util.spec_from_file_location('click_report', SCRIPTS_DIR / 'click-report.py')
click_report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(click_report)


def load_fixture(name):
    return json.loads((FIXTURES / name).read_text())


class ParseKeyTests(unittest.TestCase):
    def test_valid_key(self):
        self.assertEqual(
            click_report.parse_key('clicks:some-shop-ottawa:directions:2026-08'),
            ('some-shop-ottawa', 'directions', '2026-08'),
        )

    def test_rejects_unknown_method(self):
        self.assertIsNone(click_report.parse_key('clicks:some-shop-ottawa:website:2026-08'))

    def test_rejects_wrong_month_shape(self):
        self.assertIsNone(click_report.parse_key('clicks:some-shop-ottawa:directions:2026-8'))

    def test_rejects_extra_segment(self):
        self.assertIsNone(click_report.parse_key('clicks:some-shop-ottawa:directions:2026-08:extra'))

    def test_rejects_missing_prefix(self):
        self.assertIsNone(click_report.parse_key('some-shop-ottawa:directions:2026-08'))


class BuildRowsTests(unittest.TestCase):
    def setUp(self):
        key_list = load_fixture('kv-key-list-sample.json')
        values = load_fixture('kv-values-sample.json')
        self.key_counts = {item['name']: int(values[item['name']]) for item in key_list}
        stores = load_fixture('stores-sample.json')
        self.store_index = {s['slug']: (s['name'], s['city']) for s in stores}

    def test_malformed_key_flagged_not_counted(self):
        rows, malformed = click_report.build_rows(self.key_counts, self.store_index)
        self.assertIn('clicks:carsncards-com-ottawa:directions:2026-08:extra', malformed)
        # The malformed key is the only Aug activity on record for this store, and it must
        # not manufacture a row -- there is no confirmed August count for this store.
        aug_rows = [r for r in rows if r['slug'] == 'carsncards-com-ottawa' and r['month'] == '2026-08']
        self.assertEqual(aug_rows, [])

    def test_orphan_slug_flagged_with_no_crash(self):
        rows, _ = click_report.build_rows(self.key_counts, self.store_index)
        orphan = next(r for r in rows if r['slug'] == 'some-closed-shop-nowhere')
        self.assertTrue(orphan['orphan'])
        self.assertEqual(orphan['name'], 'some-closed-shop-nowhere')  # falls back to slug, never blank
        self.assertEqual(orphan['call'], 1)

    def test_directions_and_call_combine_but_report_separately(self):
        rows, _ = click_report.build_rows(self.key_counts, self.store_index)
        sept_row = next(r for r in rows if r['slug'] == 'carsncards-com-ottawa' and r['month'] == '2026-09')
        self.assertEqual(sept_row['directions'], 3)
        self.assertEqual(sept_row['call'], 1)
        self.assertEqual(sept_row['combined'], 4)

    def test_known_store_resolves_name_and_city(self):
        rows, _ = click_report.build_rows(self.key_counts, self.store_index)
        row = next(r for r in rows if r['slug'] == 'face-to-face-games-toronto')
        self.assertEqual(row['name'], 'Face to Face Games')
        self.assertEqual(row['city'], 'Toronto')
        self.assertFalse(row['orphan'])

    def test_one_row_per_slug_month_not_per_possible_combination(self):
        rows, _ = click_report.build_rows(self.key_counts, self.store_index)
        # 5 distinct (slug, month) pairs across the fixture, not one row per store.
        self.assertEqual(len(rows), 6)


class StoreTotalsTests(unittest.TestCase):
    def test_sorted_by_combined_descending(self):
        rows = [
            {'slug': 'a', 'name': 'A Shop', 'city': 'X', 'orphan': False, 'month': '2026-08', 'directions': 1, 'call': 0, 'combined': 1},
            {'slug': 'b', 'name': 'B Shop', 'city': 'Y', 'orphan': False, 'month': '2026-08', 'directions': 5, 'call': 2, 'combined': 7},
            {'slug': 'b', 'name': 'B Shop', 'city': 'Y', 'orphan': False, 'month': '2026-09', 'directions': 1, 'call': 0, 'combined': 1},
        ]
        totals = click_report.store_totals(rows)
        self.assertEqual([t['slug'] for t in totals], ['b', 'a'])
        self.assertEqual(totals[0]['combined'], 8)  # 7 + 1 across both months


class MonthRangeTests(unittest.TestCase):
    def test_inclusive_range(self):
        self.assertEqual(
            click_report.month_range('2026-08', '2026-11'),
            ['2026-08', '2026-09', '2026-10', '2026-11'],
        )

    def test_crosses_year_boundary(self):
        self.assertEqual(
            click_report.month_range('2026-11', '2027-02'),
            ['2026-11', '2026-12', '2027-01', '2027-02'],
        )


class MonthlyTotalsTests(unittest.TestCase):
    def test_month_with_no_keys_reports_none_not_zero(self):
        rows = [
            {'slug': 'a', 'name': 'A', 'city': '', 'orphan': False, 'month': '2026-08', 'directions': 2, 'call': 0, 'combined': 2},
        ]
        totals = click_report.monthly_totals(rows, '2026-08', '2026-10')
        by_month = {t['month']: t for t in totals}
        self.assertEqual(by_month['2026-08']['combined'], 2)
        # No data for Sep/Oct in this fixture: must be None, never 0 -- a "0" here would
        # look like a measurement, when nothing was actually checked/recorded for it.
        self.assertIsNone(by_month['2026-09']['directions'])
        self.assertIsNone(by_month['2026-10']['combined'])


class JsoncTests(unittest.TestCase):
    def test_strips_whole_line_comments_and_stays_valid_json(self):
        real_config = (SCRIPTS_DIR.parent / 'worker' / 'wrangler.jsonc').read_text()
        parsed = json.loads(click_report.strip_jsonc_comments(real_config))
        self.assertEqual(parsed['name'], 'scnm-click-tracker')
        self.assertEqual(parsed['kv_namespaces'][0]['id'], '__KV_ID__')


class ResolveNamespaceIdTests(unittest.TestCase):
    def test_uses_configured_id_when_not_placeholder(self):
        real_config = (SCRIPTS_DIR.parent / 'worker' / 'wrangler.jsonc').read_text()
        filled = real_config.replace('__KV_ID__', 'deadbeef00112233deadbeef00112233')
        original_read_text = Path.read_text

        def fake_read_text(self, *a, **kw):
            if self == click_report.WRANGLER_CONFIG:
                return filled
            return original_read_text(self, *a, **kw)

        original_exists = Path.exists

        def fake_exists(self):
            if self == click_report.WRANGLER_CONFIG:
                return True
            return original_exists(self)

        called = {'run_wrangler_json': False}

        def fail_if_called(*a, **kw):
            called['run_wrangler_json'] = True
            raise AssertionError('should not shell out when the config already has a real id')

        Path.read_text = fake_read_text
        Path.exists = fake_exists
        original_lookup = click_report.run_wrangler_json
        click_report.run_wrangler_json = fail_if_called
        try:
            result = click_report.resolve_namespace_id()
        finally:
            Path.read_text = original_read_text
            Path.exists = original_exists
            click_report.run_wrangler_json = original_lookup

        self.assertEqual(result, 'deadbeef00112233deadbeef00112233')
        self.assertFalse(called['run_wrangler_json'])

    def test_falls_back_to_namespace_lookup_when_placeholder(self):
        namespaces = load_fixture('kv-namespace-list-sample.json')
        original_lookup = click_report.run_wrangler_json
        original_exists = Path.exists

        def fake_exists(self):
            if self == click_report.WRANGLER_CONFIG:
                return False  # simplest way to force the fallback path
            return original_exists(self)

        def fake_lookup(args, cwd=None):
            self.assertEqual(args, ['kv', 'namespace', 'list'])
            return namespaces

        Path.exists = fake_exists
        click_report.run_wrangler_json = fake_lookup
        try:
            result = click_report.resolve_namespace_id()
        finally:
            Path.exists = original_exists
            click_report.run_wrangler_json = original_lookup

        self.assertEqual(result, '67ed7ea5b1f44afaae3d9797d1c0b2a0')  # the real CLICKS id

    def test_raises_when_no_namespace_titled_clicks(self):
        original_lookup = click_report.run_wrangler_json
        original_exists = Path.exists

        def fake_exists(self):
            if self == click_report.WRANGLER_CONFIG:
                return False
            return original_exists(self)

        Path.exists = fake_exists
        click_report.run_wrangler_json = lambda args, cwd=None: [
            {'id': 'x', 'title': 'SOMETHING_ELSE'},
        ]
        try:
            with self.assertRaises(click_report.ClickReportError):
                click_report.resolve_namespace_id()
        finally:
            Path.exists = original_exists
            click_report.run_wrangler_json = original_lookup


class RunWranglerTests(unittest.TestCase):
    def test_auth_failure_gives_the_login_command(self):
        fake_result = subprocess.CompletedProcess(
            args=[], returncode=1, stdout='',
            stderr='X [ERROR] A request to the Cloudflare API failed.\n\n  Authentication error [code: 10000]\n',
        )
        original_run = subprocess.run
        subprocess.run = lambda *a, **kw: fake_result
        try:
            with self.assertRaises(click_report.ClickReportError) as ctx:
                click_report.run_wrangler(['kv', 'namespace', 'list'])
        finally:
            subprocess.run = original_run
        self.assertIn('wrangler login', str(ctx.exception))

    def test_non_auth_failure_shows_real_error_not_a_login_prompt(self):
        fake_result = subprocess.CompletedProcess(
            args=[], returncode=1, stdout='', stderr='X [ERROR] Something else entirely broke.\n',
        )
        original_run = subprocess.run
        subprocess.run = lambda *a, **kw: fake_result
        try:
            with self.assertRaises(click_report.ClickReportError) as ctx:
                click_report.run_wrangler(['kv', 'namespace', 'list'])
        finally:
            subprocess.run = original_run
        self.assertNotIn('wrangler login', str(ctx.exception))
        self.assertIn('Something else entirely broke', str(ctx.exception))


class GetValueTests(unittest.TestCase):
    def test_rejects_non_integer_value(self):
        original = click_report.run_wrangler
        click_report.run_wrangler = lambda *a, **kw: 'not-a-number\n'
        try:
            with self.assertRaises(click_report.ClickReportError):
                click_report.get_value('some-namespace-id', 'clicks:foo:directions:2026-08')
        finally:
            click_report.run_wrangler = original

    def test_parses_plain_integer_text(self):
        original = click_report.run_wrangler
        click_report.run_wrangler = lambda *a, **kw: '3\n'
        try:
            self.assertEqual(click_report.get_value('some-namespace-id', 'clicks:foo:directions:2026-08'), 3)
        finally:
            click_report.run_wrangler = original


class ListKeysUsesRemoteTests(unittest.TestCase):
    def test_passes_remote_flag(self):
        # Regression guard for the silent-empty-local-store trap found 2026-09-03:
        # omitting --remote makes a fully authenticated call read the empty local
        # persistence store instead of Cloudflare, with no error.
        seen = {}

        def fake_lookup(args, cwd=None):
            seen['args'] = args
            return []

        original = click_report.run_wrangler_json
        click_report.run_wrangler_json = fake_lookup
        try:
            click_report.list_keys('some-namespace-id')
        finally:
            click_report.run_wrangler_json = original
        self.assertIn('--remote', seen['args'])
        self.assertIn('--prefix=clicks:', seen['args'])


class WriteCsvTests(unittest.TestCase):
    def test_writes_expected_columns_and_rows(self):
        import csv
        import tempfile

        rows = [
            {'slug': 'a', 'name': 'A Shop', 'city': 'X', 'orphan': False, 'month': '2026-08', 'directions': 2, 'call': 1, 'combined': 3},
        ]
        with tempfile.TemporaryDirectory() as tmp:
            out_dir = Path(tmp) / 'docs' / 'research'
            path = click_report.write_csv(rows, out_dir=out_dir)
            self.assertTrue(path.exists())
            with path.open(newline='') as f:
                read_rows = list(csv.DictReader(f))
        self.assertEqual(len(read_rows), 1)
        self.assertEqual(read_rows[0]['name'], 'A Shop')
        self.assertEqual(read_rows[0]['directions'], '2')
        self.assertEqual(read_rows[0]['orphan'], 'False')


if __name__ == '__main__':
    sys.exit(unittest.main())
