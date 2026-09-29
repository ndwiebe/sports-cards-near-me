import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('refresh_ratings', Path(__file__).with_name('refresh-ratings.py'))
refresh_ratings = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh_ratings)


class RatingCellTest(unittest.TestCase):
    def test_rating_cell_for_with_count(self):
        self.assertEqual(refresh_ratings.rating_cell_for(4.4, 100), '4.4 (100)')

    def test_rating_cell_for_without_count(self):
        self.assertEqual(refresh_ratings.rating_cell_for(4.4, None), '4.4')

    def test_rating_cell_for_no_rating(self):
        self.assertEqual(refresh_ratings.rating_cell_for(None, None), '')

    def test_existing_rating_cell_from_store(self):
        self.assertEqual(refresh_ratings.existing_rating_cell({'rating': 4.8, 'reviewCount': 33}), '4.8 (33)')
        self.assertEqual(refresh_ratings.existing_rating_cell({'rating': 4.8}), '4.8')
        self.assertEqual(refresh_ratings.existing_rating_cell({}), '')


def make_store(**over):
    store = {
        'slug': 'sample-shop-calgary',
        'name': 'Sample Shop',
        'city': 'Calgary',
        'province': 'AB',
        'address': '123 Main St',
    }
    store.update(over)
    return store


def make_place(**over):
    place = {
        'id': 'places/abc',
        'displayName': {'text': 'Sample Shop'},
        'formattedAddress': '123 Main St, Calgary, AB',
        'businessStatus': 'OPERATIONAL',
    }
    place.update(over)
    return place


class BuildProposedChangesTest(unittest.TestCase):
    def test_no_place_means_no_changes(self):
        self.assertEqual(refresh_ratings.build_proposed_changes(make_store(), None), [])

    def test_operational_place_with_no_diffs_yields_no_changes(self):
        store = make_store(rating=4.5, reviewCount=10, hours='Mon-Fri 9-5')
        place = make_place(rating=4.5, userRatingCount=10,
                            regularOpeningHours={'weekdayDescriptions': ['Mon-Fri 9-5']})
        self.assertEqual(refresh_ratings.build_proposed_changes(store, place), [])

    def test_closed_permanently_proposes_a_closure_for_a_store_not_already_closed(self):
        store = make_store()
        place = make_place(businessStatus='CLOSED_PERMANENTLY')
        changes = refresh_ratings.build_proposed_changes(store, place)
        closure = [c for c in changes if c['op']['column'] == 'Status']
        self.assertEqual(len(closure), 1)
        change = closure[0]
        self.assertEqual(change['sheet'], 'Stores')
        self.assertEqual(change['rowKey'], 'sample-shop-calgary')
        self.assertEqual(change['op']['kind'], 'update')
        self.assertEqual(change['op']['newValue'], 'closed')
        self.assertEqual(change['op']['oldValue'], '')
        self.assertEqual(change['source'], 'refresh-ratings.py')
        self.assertIn('CLOSED_PERMANENTLY', change['reason'])

    def test_closed_permanently_skips_a_store_already_marked_closed(self):
        store = make_store(status='closed')
        place = make_place(businessStatus='CLOSED_PERMANENTLY')
        changes = refresh_ratings.build_proposed_changes(store, place)
        self.assertEqual([c for c in changes if c['op']['column'] == 'Status'], [])

    def test_closed_permanently_still_proposes_closure_for_an_online_only_store(self):
        # 'online-only' isn't 'closed' -- Google saying the storefront is
        # permanently closed is new information even for a store already
        # flagged as online-only.
        store = make_store(status='online-only')
        place = make_place(businessStatus='CLOSED_PERMANENTLY')
        changes = refresh_ratings.build_proposed_changes(store, place)
        closure = [c for c in changes if c['op']['column'] == 'Status']
        self.assertEqual(len(closure), 1)
        self.assertEqual(closure[0]['op']['oldValue'], 'online-only')

    def test_operational_and_closed_temporarily_never_propose_a_closure(self):
        store = make_store()
        for status in ('OPERATIONAL', 'CLOSED_TEMPORARILY'):
            place = make_place(businessStatus=status)
            changes = refresh_ratings.build_proposed_changes(store, place)
            self.assertEqual([c for c in changes if c['op']['column'] == 'Status'], [])

    def test_rating_change_proposed_when_rating_differs(self):
        store = make_store(rating=4.0, reviewCount=5)
        place = make_place(rating=4.5, userRatingCount=12)
        changes = refresh_ratings.build_proposed_changes(store, place)
        rating_changes = [c for c in changes if c['op']['column'] == 'Rating']
        self.assertEqual(len(rating_changes), 1)
        change = rating_changes[0]
        self.assertEqual(change['op']['oldValue'], '4.0 (5)')
        self.assertEqual(change['op']['newValue'], '4.5 (12)')
        self.assertEqual(change['source'], 'refresh-ratings.py')

    def test_rating_change_proposed_when_only_review_count_differs(self):
        store = make_store(rating=4.5, reviewCount=5)
        place = make_place(rating=4.5, userRatingCount=99)
        changes = refresh_ratings.build_proposed_changes(store, place)
        rating_changes = [c for c in changes if c['op']['column'] == 'Rating']
        self.assertEqual(len(rating_changes), 1)
        self.assertEqual(rating_changes[0]['op']['newValue'], '4.5 (99)')

    def test_no_rating_change_when_place_has_no_rating(self):
        store = make_store(rating=4.5, reviewCount=5)
        place = make_place()  # no 'rating' key
        changes = refresh_ratings.build_proposed_changes(store, place)
        self.assertEqual([c for c in changes if c['op']['column'] == 'Rating'], [])

    def test_hours_change_proposed_when_hours_differ(self):
        store = make_store(hours='Mon-Fri 9-5')
        place = make_place(regularOpeningHours={'weekdayDescriptions': ['Monday: 11:00 AM - 7:00 PM']})
        changes = refresh_ratings.build_proposed_changes(store, place)
        hours_changes = [c for c in changes if c['op']['column'] == 'Hours']
        self.assertEqual(len(hours_changes), 1)
        self.assertEqual(hours_changes[0]['op']['oldValue'], 'Mon-Fri 9-5')
        self.assertEqual(hours_changes[0]['op']['newValue'], 'Monday: 11:00 AM - 7:00 PM')

    def test_no_hours_change_when_place_has_no_published_hours(self):
        store = make_store(hours='Mon-Fri 9-5')
        place = make_place()  # no regularOpeningHours
        changes = refresh_ratings.build_proposed_changes(store, place)
        self.assertEqual([c for c in changes if c['op']['column'] == 'Hours'], [])

    def test_a_closed_shop_can_also_get_a_rating_or_hours_update_in_the_same_pass(self):
        store = make_store(rating=4.0, reviewCount=5)
        place = make_place(businessStatus='CLOSED_PERMANENTLY', rating=4.2, userRatingCount=8)
        changes = refresh_ratings.build_proposed_changes(store, place)
        columns = sorted(c['op']['column'] for c in changes)
        self.assertEqual(columns, ['Rating', 'Status'])

    def test_every_change_is_a_valid_proposedchange_shape(self):
        store = make_store(rating=4.0, reviewCount=5, hours='old hours')
        place = make_place(businessStatus='CLOSED_PERMANENTLY', rating=4.5, userRatingCount=9,
                            regularOpeningHours={'weekdayDescriptions': ['new hours']})
        changes = refresh_ratings.build_proposed_changes(store, place)
        self.assertEqual(len(changes), 3)
        for change in changes:
            self.assertEqual(set(change.keys()), {'sheet', 'rowKey', 'op', 'source', 'reason'})
            self.assertEqual(change['sheet'], 'Stores')
            self.assertIsInstance(change['rowKey'], str)
            self.assertEqual(change['op']['kind'], 'update')
            self.assertEqual(set(change['op'].keys()), {'kind', 'column', 'oldValue', 'newValue'})
            self.assertIsInstance(change['reason'], str)
            self.assertTrue(change['reason'])


if __name__ == '__main__':
    unittest.main()
