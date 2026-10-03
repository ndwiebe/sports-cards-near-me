# Subtle show travel notice

Nathan approved “Ya, but it should be subtle and match the design” at 20:35:52 UTC October 3, 2026 (Sentinel_67268c8fa3548191835a6c96d71f5862).

Exact copy: “Plans can change. Confirm the date, hours and venue with the organizer before travelling, especially on the day of the show.”

Location: all show detail pages, directly below the details list (venue, address, hours, admission, recurring, organizer), above existing Website/Source links. Existing `text-sm`, `text-muted`, `max-w-prose`, spacing and line-height tokens; readable 14px regular paragraph. No alert role or banner on ordinary shows. The prominent Goodwood-specific warning and suppression remain unchanged. No new metadata, schema, backend, settings or external contact.

Validation: typecheck, 608 unit tests, 1671-page build, 123 browser tests passed (11 conditional skips). Visually inspected 375×812 mobile and 1280×900 desktop screenshots of the current Saint-Hyacinthe show: clean wrapping, no horizontal overflow. Existing source links remain adjacent and no organizer identity is invented.
