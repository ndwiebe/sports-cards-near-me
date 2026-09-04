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
  // Absent means open. Only ever set from the sheet, by a human who checked —
  // never written from Google's businessStatus, which reports moved and rebranded
  // shops as permanently closed too. Either explicit value keeps the shop's page
  // (with a banner and noindex) but splits it out of stores.json entirely, so no
  // listing, count, map or guide can show it. 'closed' means the business is gone;
  // 'online-only' means the storefront is gone but the business still trades
  // online — the page must say so, not claim it has permanently closed.
  // See scripts/bake-stores.ts.
  status?: 'closed' | 'online-only' | undefined;
  /** A visible "we haven't confirmed this" note shown on the shop's own page.
   * Set by hand in the sheet, never derived. Exists because the alternative to
   * publishing an unconfirmed listing is leaving a real business out entirely --
   * Nathan's call, 2026-09-04 -- and a listing that carries its own doubt is
   * honest in a way a silent one is not. Absent for almost every shop. */
  unverifiedNote?: string | undefined;
}
