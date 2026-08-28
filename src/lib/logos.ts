import logoSlugs from '../data/logos.json';

// Mirrors the inline `new Set(logoSlugs as string[])` MapIsland.astro builds for
// pins — pulled out so cards and store pages can gate on the same 332-chip set
// without duplicating it. tests/unit/logos.test.ts is what keeps this set honest
// against the actual public/logos/*.webp files.
export const LOGO_SLUGS: ReadonlySet<string> = new Set(logoSlugs as string[]);

export function hasLogo(slug: string): boolean {
  return LOGO_SLUGS.has(slug);
}
