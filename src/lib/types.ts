export type ProvinceCode = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

export const PROVINCES: Record<ProvinceCode, { name: string; slug: string }> = {
  AB: { name: 'Alberta', slug: 'alberta' },
  BC: { name: 'British Columbia', slug: 'british-columbia' },
  MB: { name: 'Manitoba', slug: 'manitoba' },
  NB: { name: 'New Brunswick', slug: 'new-brunswick' },
  NL: { name: 'Newfoundland and Labrador', slug: 'newfoundland-and-labrador' },
  NS: { name: 'Nova Scotia', slug: 'nova-scotia' },
  NT: { name: 'Northwest Territories', slug: 'northwest-territories' },
  ON: { name: 'Ontario', slug: 'ontario' },
  PE: { name: 'Prince Edward Island', slug: 'prince-edward-island' },
  QC: { name: 'Quebec', slug: 'quebec' },
  SK: { name: 'Saskatchewan', slug: 'saskatchewan' },
  YT: { name: 'Yukon', slug: 'yukon' },
};

export interface Store {
  slug: string;
  name: string;
  city: string;
  citySlug: string;
  address: string;
  province: ProvinceCode;
  rating?: number | undefined;
  reviewCount?: number | undefined;
  hours?: string | undefined;
  phone?: string | undefined;
  website?: string | undefined;
  social?: string | undefined;
  services: string[];
  sports: string[];
  lat: number;
  lng: number;
  // Absent means open. 'online-only' is only ever set by a human in the sheet,
  // never derived. 'closed' can ALSO now be set automatically: Google's
  // businessStatus CLOSED_PERMANENTLY flag auto-closes a shop, with a
  // one-command undo, via the sheet-change engine (src/lib/sheet-change-engine.ts)
  // and the proposed-change payload scripts/refresh-ratings.py writes. This
  // overrides the 2026-08-27 "never derive status from businessStatus" rule,
  // per Nathan's 2026-09-23 decision
  // (~/jarvis-memory/decisions/2026/2026-09-23-scnm-q4-automation-calls.md),
  // made knowingly despite the known false-positive risk: Google also reports
  // moved or rebranded shops as permanently closed. Every auto-closure is
  // listed in the weekly digest with its undo command -- that visibility is
  // the safety net for that risk, not a reason to skip auto-closing.
  // Either explicit value keeps the shop's page (with a banner and noindex)
  // but splits it out of stores.json entirely, so no listing, count, map or
  // guide can show it. 'closed' means the business is gone; 'online-only'
  // means the storefront is gone but the business still trades online — the
  // page must say so, not claim it has permanently closed.
  // See scripts/bake-stores.ts.
  status?: 'closed' | 'online-only' | undefined;
  /** A visible "we haven't confirmed this" note shown on the shop's own page.
   * Set by hand in the sheet, never derived. Exists because the alternative to
   * publishing an unconfirmed listing is leaving a real business out entirely --
   * Nathan's call, 2026-09-04 -- and a listing that carries its own doubt is
   * honest in a way a silent one is not. Absent for almost every shop. */
  unverifiedNote?: string | undefined;
}
