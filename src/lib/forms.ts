/**
 * The Google Form URLs, in one place on purpose.
 *
 * These IDs are long random strings that were pasted by hand into five spots
 * across four files, and the wrong one has been pasted twice — 2026-07-29
 * (every "Add a show" link opened the reseller form) and 2026-08-07 (the
 * trailing "Suggest it" line on show pages opened the store form, which on an
 * individual show page was the ONLY submission link). Both times, real
 * submissions went to the wrong form for weeks before anyone noticed.
 *
 * A magic string duplicated five times is a bug with a delay fuse. Import from
 * here instead of pasting, and `tests/unit/forms.test.ts` fails the build if a
 * show page ever links at the store form again.
 */

/** Add a card show to the calendar. */
export const SHOW_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSd01E8-9smZTn-frEx5S3ad8R89y7LmUThYXuEAi_8GffcViA/viewform';

/** Suggest a new shop, correct a listing, or claim one. Reached via /suggest/. */
export const STORE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeuDSpremAwIczTb4Leu1B4-5-niUrgYPCd2QKADmzmRnU4-A/viewform';

/** Become a verified reseller. This is the one actually linked from /resellers/join/. */
export const RESELLER_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdYwjJ2Fk1X5VDcgeuVQw5oEXvVDMune9QWfc_Nxjkp6R54xQ/viewform';

/**
 * A DEAD duplicate of the reseller form. Drive holds three copies of it; this is
 * the one that got pasted onto every show page and caused the 2026-07-29 bug.
 * Kept named so the test below can assert it never returns to a page — deleting
 * the copies in Drive is the real cleanup, still outstanding.
 */
export const STALE_RESELLER_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScRyvOUWQCBNnQBIfdDU2MVkqfgM4uy9HsEz7Tf5bWYA7H3kQ/viewform';
