---
date: 2026-09-04
project: scnm
about: the TCG-only ranking question, and why "backfill the data first" turns out not to be enough
decision_owner: Nathan
---

# TCG-only shops in sports-card rankings — recommendation

## The question, open since July

Roughly a third of the directory sells only trading-card games (Pokémon, Magic, Yu-Gi-Oh, Lorcana)
and no sports cards, yet those shops rank alongside sports-card specialists on sports-card pages. A
board-game café with 513 reviews can outrank a specialist. Should they be tiered below, excluded, or
left alone?

## What the directory actually looks like (678 shops, measured 2026-09-04)

| | shops | share |
|---|---|---|
| TCG only | 233 | 34% |
| Sells both | 196 | 29% |
| Sports only | 136 | 20% |
| **No category data at all** | **96** | **14%** |
| Other tags only | 17 | 3% |

## The finding that changes the answer

The standing advice — *backfill the missing data first, then tier* — was right in spirit and does not
finish the job. I ran `scan-sports-evidence.py` against all 81 uncategorised shops that have a
website:

- **18** produced usable evidence from the shop's own site (12 TCG-only, 3 both, 2 sports, 1 mixed).
- **42** returned no category evidence at all.
- **16** were unreachable (blocked, dead domain, JavaScript-only).
- A further **15** shops have no website to scan in the first place.

**After the scan, 78 shops — 11.5% of the directory — are still uncategorised, and no amount of
further scanning closes that.** A shop with no website cannot be scanned, and "no evidence found" is
our gap, not a fact about the business.

So the choice is not "tier now or tier after the backfill". It is: **what does the tiering rule do
about a shop we know nothing about?** That question never goes away.

## Recommendation

**Tier, but demote only on positive evidence — never on silence.**

1. A shop drops below sports-card specialists on a sports-card page **only when we have positive
   evidence it sells TCG and no sports cards.** That is 233 shops today, plus the 12 the scan just
   evidenced.
2. **A shop with no category data stays in the normal pool.** It is not promoted and not demoted.
   This is the site's existing standing rule applied to ranking: absence of data is never a negative
   claim about a business. Demoting 78 shops for having a thin record would punish exactly the small,
   website-less shops least able to fix it — and several of them have "Sports Cards" in their own
   business name.
3. **Do not exclude TCG shops.** 29% of the directory sells both, the site already has Pokémon city
   pages where a TCG shop is the correct answer, and a collector standing in an unfamiliar town may
   well still want to know the Pokémon shop is there.
4. Apply the 18 evidenced categories from `2026-09-04-category-backfill.csv` — after a human reads
   them. The scanner's own docstring is explicit that its output is a proposal, never an applied
   change, and that rule is not worth breaking for 18 rows.

## Why not the simpler options

- **Leave it alone** — the specific complaint is real: on a page a collector reached by searching for
  sports cards, a shop that sells no sports cards should not be the top answer.
- **Exclude TCG-only shops** — throws away real businesses a visitor may want, and would misfire on
  every shop whose category data we simply don't have.
- **Tier everything, treating unknown as TCG** — the version that looks tidiest in code and is the
  one genuine mistake available here. It converts our own data gap into a public claim about 78
  businesses.

## What Nathan still has to decide

Whether to accept the asymmetry in point 2. It means the ranking is knowingly imperfect for 78 shops
— some of which probably *are* TCG-only and will keep outranking a specialist — in exchange for never
demoting a business because we failed to find its website. That trade is the same one the site
already makes everywhere else, which is why it is the recommendation.
