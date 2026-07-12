export interface GuideMeta {
  slug: string;
  title: string;
  dek: string;
  cover: string;
}

export const GUIDES: GuideMeta[] = [
  {
    slug: 'psa-grading-submissions-canada',
    title: 'PSA Grading for Canadian Collectors',
    dek: 'What grading actually means, why the border adds a step, and the three ways Canadians get cards into PSA slabs.',
    cover: 'guide-psa-submissions',
  },
  {
    slug: 'best-card-shops-alberta',
    title: 'Best Card Shops in Alberta',
    dek: "Alberta's top-rated sports card shops, ranked straight from our directory by Google rating and review count.",
    cover: 'guide-best-alberta',
  },
];
