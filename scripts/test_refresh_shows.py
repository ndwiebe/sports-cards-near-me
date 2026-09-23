import importlib.util
import unittest
from collections import Counter
from pathlib import Path

spec = importlib.util.spec_from_file_location('refresh', Path(__file__).with_name('refresh-shows.py'))
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)


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
