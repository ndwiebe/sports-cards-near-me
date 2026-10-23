import importlib.util
import contextlib
import csv
import io
import json
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from collections import Counter
from datetime import date
from pathlib import Path

spec = importlib.util.spec_from_file_location('refresh', Path(__file__).with_name('refresh-shows.py'))
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)


class ProvincePageReadinessTest(unittest.TestCase):
    def ready(self, title, challenge=False):
        # Execute the actual browser predicate; no network or signed-in browser.
        script = 'const document = ' + json.dumps({'title': title}) + ';\n'
        script += 'document.querySelector = () => ' + ('({})' if challenge else 'null') + ';\n'
        script += 'process.stdout.write(JSON.stringify((' + refresh.LIST_READY_JS + ')()));'
        return json.loads(subprocess.check_output(['node', '-e', script], text=True))

    def test_challenge_is_not_an_empty_province(self):
        self.assertFalse(self.ready('Just a moment...'))

    def test_challenge_markup_blocks_a_partly_loaded_list(self):
        self.assertFalse(self.ready('Card Shows in Ontario | Trading Card Database', True))

    def test_loaded_province_can_be_read_even_without_show_links(self):
        self.assertTrue(self.ready('Card Shows in Ontario | Trading Card Database'))

    def test_unexpected_tcdb_page_is_not_a_province(self):
        self.assertFalse(self.ready('Trading Card Database'))

    def scrape_with_challenge(self, clears_after):
        def run_script(script):
            setup = '''
let polls = 0;
const document = {querySelector: () => null};
Object.defineProperty(document, 'title', {get: () => polls >= CLEARS_AFTER
  ? 'Card Shows in Ontario | Trading Card Database' : 'Just a moment...'});
const page = {
  goto: async () => {},
  waitForTimeout: async () => { polls++; },
  title: async () => document.title,
  evaluate: async (fn, province) => province ? [] : fn(),
};
const browser = {getPage: async () => page};
'''.replace('CLEARS_AFTER', str(clears_after))
            return subprocess.check_output(
                ['node', '-e', setup + '\n(async () => {' + script + '\n})();'], text=True)

        with patch.dict(refresh.PROVINCES, {'Ontario': 'ON'}, clear=True), patch.object(refresh, 'run_js', run_script):
            return refresh.scrape_lists(None)

    def test_transient_challenge_is_waited_out_before_accepting_empty_list(self):
        rows, status = self.scrape_with_challenge(3)
        self.assertEqual(rows, [])
        self.assertEqual(status, {'Ontario': 'empty'})

    def test_persistent_challenge_is_reported_as_error_not_empty(self):
        rows, status = self.scrape_with_challenge(100)
        self.assertEqual(rows, [])
        self.assertIn('error: Error: TCDB province list not ready', status['Ontario'])
        self.assertIn('Just a moment...', status['Ontario'])


class DiscoveryOutputIntegrationTest(unittest.TestCase):
    """Run main's classification/writers against temporary fixtures only."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.out = self.root / 'output'
        self.out.mkdir()
        self.shows = self.root / 'shows.json'
        self.stores = self.root / 'stores.json'
        self.shows.write_text('[]')
        self.stores.write_text('[{"city":"Edmonton"}]')
        self.row = dict(province='Alberta', date='Saturday, October 24, 2026',
                        name='Fixture Expo', url='https://www.tcdb.com/CardShows.cfm?MODE=VIEW&ID=fixture',
                        venue='Fixture Hall', cityLine='Edmonton, Alberta', hours='10 AM - 4 PM')
        self.detail = dict(url=self.row['url'], ok=True, cityLine='Edmonton, Alberta',
                           street='123 Fixture St', venue='Fixture Hall', website='https://fixture.example/')
        self.patches = [patch.object(refresh, 'ROOT', self.root),
                        patch.object(refresh, 'SHOWS', self.shows),
                        patch.object(refresh, 'STORES', self.stores),
                        patch.object(refresh, 'OUTDIR', self.out),
                        patch.object(refresh, 'check_chrome'),
                        patch('sys.argv', ['refresh-shows.py'])]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

    def previous_outputs(self):
        for suffix in ('payload.csv', 'report.md', 'summary.json'):
            (self.out / f'{date.today().isoformat()}-show-refresh-{suffix}').write_bytes(b'previous valid discovery\n')
        return {p.name: p.read_bytes() for p in self.out.iterdir()}

    def test_persistent_challenge_preserves_previous_outputs(self):
        rows, status = ProvincePageReadinessTest().scrape_with_challenge(100)
        before = self.previous_outputs()
        with patch.object(refresh, 'scrape_lists', return_value=(rows, status)), \
             patch.object(refresh, 'scrape_details') as details, \
             contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as failure:
                refresh.main()
        self.assertEqual(failure.exception.code, 1)
        details.assert_not_called()
        self.assertEqual({p.name: p.read_bytes() for p in self.out.iterdir()}, before)

    def test_partial_province_failure_preserves_valid_outputs_and_source_data(self):
        before = self.previous_outputs()
        source_before = (self.shows.read_bytes(), self.stores.read_bytes())
        status = {'Alberta': '1 rows', 'Ontario': 'error: persistent challenge'}
        with patch.object(refresh, 'scrape_lists', return_value=([self.row], status)), \
             patch.object(refresh, 'scrape_details', return_value={self.row['url']: self.detail}) as details, \
             contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as errors:
            with self.assertRaises(SystemExit) as failure:
                refresh.main()
        self.assertEqual(failure.exception.code, 1)
        self.assertIn('Ontario', errors.getvalue())
        self.assertIn('no partial payload written', errors.getvalue())
        details.assert_not_called()
        self.assertEqual({p.name: p.read_bytes() for p in self.out.iterdir()}, before)
        self.assertEqual((self.shows.read_bytes(), self.stores.read_bytes()), source_before)

    def test_successful_full_path_writes_payload_report_and_summary_from_cached_details(self):
        cache = self.out / f'.show-refresh-cache-{date.today().isoformat()}.jsonl'
        cache.write_text(json.dumps(self.detail) + '\n')
        with patch.object(refresh, 'scrape_lists', return_value=([self.row], {'Alberta': '1 rows'})), \
             patch.object(refresh, 'run_js', side_effect=AssertionError('no live browser permitted')), \
             contextlib.redirect_stdout(io.StringIO()):
            refresh.main()
        prefix = self.out / f'{date.today().isoformat()}-show-refresh'
        with Path(str(prefix) + '-payload.csv').open() as f:
            rows = list(csv.DictReader(f))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['Show Name'], 'Fixture Expo')
        self.assertEqual(rows[0]['Address'], '123 Fixture St')
        self.assertEqual(rows[0]['_status'], 'NEW')
        summary = json.loads(Path(str(prefix) + '-summary.json').read_text())
        self.assertEqual(summary['new'], 1)
        self.assertEqual(summary['provinces_with_errors'], [])
        self.assertIn('Alberta: 1 rows', Path(str(prefix) + '-report.md').read_text())
        self.assertEqual(json.loads(self.shows.read_text()), [])
        self.assertEqual(cache.read_text(), json.dumps(self.detail) + '\n')


class EventIdentityTest(unittest.TestCase):
    def setUp(self):
        self.show = dict(slug='expo', name='Expo', city='Mississauga', province='ON',
                         venue='International Centre', startDate='2026-11-05', endDate='2026-11-08',
                         website='https://expo.example/', sourceUrl='https://tcdb.example/1')
        self.row = dict(name='Expo', city='Mississauga', province='Ontario',
                        venue='International Centre', iso='2026-11-06',
                        website='https://expo.example/', url='https://tcdb.example/2')

    def test_second_and_last_days_are_covered(self):
        for day in ('2026-11-06', '2026-11-08'):
            self.assertEqual(refresh.classify_row(dict(self.row, iso=day), [self.show])[0], 'COVERED-DAY')

    def test_next_event_is_new(self):
        self.assertEqual(refresh.classify_row(dict(self.row, iso='2026-12-06'), [self.show])[0], 'NEW')

    def test_same_city_date_different_promoter_requires_review(self):
        row = dict(self.row, name='Other Show', venue='Other Hall', website='https://other.example/')
        self.assertEqual(refresh.classify_row(row, [self.show])[0], 'REVIEW-IDENTITY')

    def test_province_is_part_of_identity(self):
        self.assertEqual(refresh.classify_row(dict(self.row, province='Alberta'), [self.show])[0], 'NEW')

    def test_source_id_selects_correct_show_among_same_day_events(self):
        other = dict(self.show, slug='other', name='Other', sourceUrl='https://tcdb.example/3')
        row = dict(self.row, iso='2026-11-05', url='https://tcdb.example/1')
        self.assertEqual(refresh.match_existing(row, [other, self.show])[0]['slug'], 'expo')

    def test_missing_source_urls_do_not_establish_identity(self):
        show = dict(self.show, sourceUrl=None)
        row = dict(self.row, name='Unrelated', venue='Elsewhere', website='', url=None)
        self.assertEqual(refresh.classify_row(row, [show])[0], 'REVIEW-IDENTITY')

    def test_shared_venue_without_identity_is_not_a_match(self):
        row = dict(self.row, name='Different Event', website='')
        self.assertEqual(refresh.classify_row(row, [self.show])[0], 'REVIEW-IDENTITY')

    def test_unresolved_duplicate_identity_is_not_chosen_arbitrarily(self):
        self.assertEqual(refresh.classify_row(self.row, [self.show, dict(self.show, slug='duplicate')])[0], 'REVIEW-IDENTITY')

    def test_new_adjacent_days_are_reviewed_not_two_new_events(self):
        rows = [dict(self.row, name='Mega DAY 1', iso='2027-02-06', _status='NEW'),
                dict(self.row, name='Mega DAY 2', iso='2027-02-07', _status='NEW')]
        refresh.flag_adjacent_new_days(rows)
        self.assertEqual([r['_status'] for r in rows], ['REVIEW-MULTIDAY'] * 2)

    def test_monthly_dates_and_other_promoters_stay_separate(self):
        rows = [dict(self.row, iso='2026-11-06', _status='NEW'),
                dict(self.row, iso='2026-12-06', _status='NEW'),
                dict(self.row, name='Another Show', iso='2026-11-07', _status='NEW')]
        refresh.flag_adjacent_new_days(rows)
        self.assertEqual([r['_status'] for r in rows], ['NEW'] * 3)


ALL_STATUSES = ('NEW', 'CHANGED', 'REVIEW-IDENTITY', 'REVIEW-MULTIDAY', 'PREVIOUSLY-REJECTED', 'KNOWN', 'COVERED-DAY')


class BuildSummaryTest(unittest.TestCase):
    """build_summary() is the one part of a weekly CI run this script can
    actually support today: a machine-readable outcome a workflow step can act
    on without parsing the markdown report. It is pure (no Chrome, no network) --
    the scrape itself still requires dev-browser against a signed-in Chrome, and
    stays out of CI. See docs/superpowers/plans/2026-09-23-q4-shows.md, Task 3b.
    """

    def counts(self, **over):
        base = {k: 0 for k in ALL_STATUSES}
        base.update(over)
        return Counter(base)

    def test_flags_needs_review_when_new_shows_appear(self):
        s = refresh.build_summary('2026-09-23', self.counts(NEW=2, KNOWN=10), [], {'Alberta': '5 rows'})
        self.assertEqual(s['new'], 2)
        self.assertTrue(s['needs_review'])

    def test_flags_needs_review_on_changed_or_identity_review_too(self):
        self.assertTrue(refresh.build_summary('d', self.counts(CHANGED=1), [], {})['needs_review'])
        self.assertTrue(refresh.build_summary('d', self.counts(**{'REVIEW-IDENTITY': 1}), [], {})['needs_review'])
        self.assertTrue(refresh.build_summary('d', self.counts(**{'REVIEW-MULTIDAY': 1}), [], {})['needs_review'])

    def test_quiet_run_needs_no_review(self):
        s = refresh.build_summary('2026-09-23', self.counts(KNOWN=40, **{'COVERED-DAY': 3}), [], {})
        self.assertFalse(s['needs_review'])

    def test_gone_upstream_is_counted_but_does_not_alone_force_review(self):
        # GONE is reported, never auto-deleted (see refresh-shows.py's own docstring) --
        # it's a fact for the digest, not something that should page anyone by itself.
        s = refresh.build_summary('2026-09-23', self.counts(KNOWN=5), [{'slug': 'x'}, {'slug': 'y'}], {})
        self.assertEqual(s['gone'], 2)
        self.assertFalse(s['needs_review'])

    def test_records_provinces_that_errored(self):
        s = refresh.build_summary('2026-09-23', self.counts(), [], {'Quebec': 'error: timeout', 'Alberta': '5 rows'})
        self.assertEqual(s['provinces_with_errors'], ['Quebec'])

    def test_carries_the_run_date(self):
        self.assertEqual(refresh.build_summary('2026-09-23', self.counts(), [], {})['date'], '2026-09-23')


if __name__ == '__main__':
    unittest.main()
