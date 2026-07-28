export interface GuideMeta {
  slug: string;
  title: string;
  dek: string;
  /** Omit when the page has no dedicated cover image yet — the grid falls back to a plain panel. */
  cover?: string;
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
  {
    slug: 'your-first-card-show',
    title: 'Your First Card Show: What to Expect',
    dek: 'What actually happens at a Canadian card show, how to handle cards politely, cash vs. card, and how to spot a real deal.',
    cover: 'guide-first-card-show',
  },
  {
    slug: 'selling-your-collection',
    title: 'Selling a Collection You Inherited (or Outgrew)',
    dek: 'How to tell if an old collection is worth anything, and the realistic ways to sell it, ranked by effort vs. return.',
    cover: 'guide-selling-your-collection',
  },
  {
    slug: 'card-grading-101',
    title: 'Card Grading 101: Should You Get a Card Graded?',
    dek: 'The 1–10 scale explained, raw vs. slabbed value, and the math behind deciding whether a specific card is worth grading.',
    cover: 'guide-grading-101',
  },
  {
    slug: 'psa-grading-mississauga',
    title: 'PSA Grading Drop-Off in Mississauga',
    dek: "Address, hours, and how the in-person submission process works at PSA's Canadian receiving centre.",
  },
  {
    slug: 'how-much-are-my-sports-cards-worth',
    title: 'How Much Are My Sports Cards Worth?',
    dek: "What actually drives a card's value, how to check real comps, and where to get an honest read before you sell.",
  },
  {
    slug: 'pokemon-tcg-shops-canada',
    title: 'Pokémon & TCG Shops in Canada',
    dek: "How many shops in our sports card directory also carry Pokémon and other trading card games, and where.",
  },
];
