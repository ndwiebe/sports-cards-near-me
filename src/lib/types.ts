export type ProvinceCode = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'ON' | 'PE' | 'QC' | 'SK';

export const PROVINCES: Record<ProvinceCode, { name: string; slug: string }> = {
  AB: { name: 'Alberta', slug: 'alberta' },
  BC: { name: 'British Columbia', slug: 'british-columbia' },
  MB: { name: 'Manitoba', slug: 'manitoba' },
  NB: { name: 'New Brunswick', slug: 'new-brunswick' },
  NL: { name: 'Newfoundland and Labrador', slug: 'newfoundland-and-labrador' },
  NS: { name: 'Nova Scotia', slug: 'nova-scotia' },
  ON: { name: 'Ontario', slug: 'ontario' },
  PE: { name: 'Prince Edward Island', slug: 'prince-edward-island' },
  QC: { name: 'Quebec', slug: 'quebec' },
  SK: { name: 'Saskatchewan', slug: 'saskatchewan' },
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
}
