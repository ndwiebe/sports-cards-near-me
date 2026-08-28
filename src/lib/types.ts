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
  // Absent means open. Only ever set to 'closed' from the sheet, by a human who
  // checked — never written from Google's businessStatus, which reports moved and
  // rebranded shops as permanently closed too. Closed shops keep their page (with a
  // banner and noindex) but are split out of stores.json entirely, so no listing,
  // count, map or guide can show one. See scripts/bake-stores.ts.
  status?: 'closed' | undefined;
}
