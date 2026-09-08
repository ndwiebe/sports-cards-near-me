import importlib.util
import unittest
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


if __name__ == '__main__':
    unittest.main()
