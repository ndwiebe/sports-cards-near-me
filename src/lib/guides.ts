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
    dek: "Alberta's highest-ranked sports card shops, ordered straight from our directory by Google rating weighted for review volume.",
    cover: 'guide-best-alberta',
  },
  {
    slug: 'best-card-shops-edmonton',
    title: 'Best Card Shops in Edmonton',
    dek: "Edmonton's highest-ranked sports card shops, ordered straight from our directory by Google rating weighted for review volume.",
  },
  {
    slug: 'best-card-shops-calgary',
    title: 'Best Card Shops in Calgary',
    dek: "Calgary's highest-ranked sports card shops, ordered straight from our directory by Google rating weighted for review volume.",
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
    slug: 'tax-on-selling-sports-cards-canada',
    title: 'Do I Have to Pay Tax When I Sell Sports Cards in Canada?',
    dek: 'When a card sale is tax-free, when it’s a capital gain, and when the CRA calls it a business — the $1,000 rule, GST/HST, and why losses usually can’t be claimed.',
  },
  {
    slug: 'are-you-running-a-card-business',
    title: 'Are You Running a Card Business, or Just Collecting?',
    dek: 'The same ten questions the CRA effectively asks, answered honestly — whether you land as a casual seller or a business decides which tax rules and deductions actually apply to you.',
  },
  {
    slug: 'sports-card-tax-deductions-canada',
    title: 'What Can You Deduct When You Sell Sports Cards in Canada?',
    dek: 'Every expense a card-selling business can actually claim — grading fees, shipping, supplies, home workspace — and the ones that don’t count, with real numbers.',
  },
  {
    slug: 'record-keeping-for-card-sellers',
    title: 'Record-Keeping for Canadian Card Sellers: What CRA Actually Wants',
    dek: 'What CRA actually expects you to keep, for how long, and the five-field minimum that covers you without a weekend of guessing in March.',
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
  {
    slug: 'card-grading-companies-canada',
    title: 'PSA vs Beckett vs SGC vs CGC: Card Grading in Canada',
    dek: 'Which graders have a Canadian drop-off, which ship across the border, what each costs and how long each takes — plus the Canadian graders that skip the border entirely.',
  },
  {
    slug: 'are-old-hockey-cards-worth-anything',
    title: 'Are My Old Hockey Cards Worth Anything?',
    dek: 'The honest answer for most 1990s cards, why the "junk wax era" happened, and which old hockey cards actually are valuable.',
  },
  {
    slug: 'how-to-spot-fake-sports-cards',
    title: 'How to Spot Fake Sports Cards',
    dek: 'Practical, checkable signs a card or graded slab might be counterfeit — print quality, card stock, fake holograms, and cert lookups.',
  },
];
