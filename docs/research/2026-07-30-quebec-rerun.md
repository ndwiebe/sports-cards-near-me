# Quebec rerun — the zero was a tooling failure, and there are 52 candidates

Date: 2026-07-30. The 2026-07-28 Quebec pass returned zero shops, but that agent had
**no working search at all**, so the zero was never evidence of absence. This pass
re-ran it with working tools.

**Result: 52 unmatched candidates, 18 of them in towns SCNM does not cover at all.**
Nothing has been imported. See `qc-candidates-2026-07-30.csv`.

## What actually worked

**`nearmetcg.com/search?province=Quebec` — 111 stores in one request.** This is far
higher leverage than town-by-town directory searching and should be the first move for
any province rerun. It is a real Canadian TCG index, province-filterable, and renders
fine in a browser.

**PagesJaunes was disappointing here**, contrary to expectation:
- Category searches are near-useless — "cartes de collection" in Drummondville returned
  **1** result, and that result was an anonymous `confidentiel confidentiel` listing,
  while SCNM already knows of **3** shops in that town.
- It *does* contain the shops — searching `Collecto-Sports` by name found it — so the
  data is there but the category taxonomy doesn't surface it.
- Broad terms work but bring noise: `jeux` returned 24 results led by Canadian Tire.
- **Verdict:** good for confirming a *known* name, weak for *discovering* unknown shops.
  Update the expectation in `RESEARCH-TOOLING-NOTES.md` accordingly.

## Calibration — the list is NOT clean, do not bulk-import

I deliberately verified the **four most doubtful** names (worst case, not a
representative sample). Of four:

| Candidate | Verdict | Why |
|---|---|---|
| Roudoudou (Rimouski) | **EXCLUDE** | Toy/puzzle shop. Art, stickers, bath, toys, casse-tête. No cards. Straight miscategorisation. |
| Presstine Marketing (Dorval) | **HOLD** | Genuinely a trading-card business — but an *office* that ships. Not walk-in retail. |
| CF31 BREAK (Sainte-Thérèse) | **HOLD** | Real sports-card operation (9.4K followers, 4.9★/52) but "boutique en ligne" with drop-off/pickup, not a storefront. Its own name says *dépôt et ramassage*. |
| Jeuxjubes (Sainte-Thérèse) | **LIKELY INCLUDE** | Board-game + candy shop that explicitly carries *cartes de collection*, real walk-in locations. |

So even one clean directory contains toy shops, mail-order offices, and online breakers
mixed in with real storefronts. The existing standard handles all of these correctly —
*low confidence = doubt about whether it exists or is walk-in* — but only if each row is
actually checked.

## The 18 in uncovered towns (highest value — new city pages)

Baie-Comeau · Boisbriand · Charlemagne · Chicoutimi · Dorval · Mascouche · Quebec City ·
Rimouski · Saint-Hubert · Saint-Isidore-de-Laprairie · Saint-Laurent (×2) · Sainte-Julie ·
Sainte-Thérèse (×3) · Shawinigan · St-Bruno-de-Montarville · Verdun

Three big-box entries were dropped on sight (Toys"R"Us ×2, Walmart) per the existing
bad-pattern rules.

## Known traps in this specific list

- **Same shop, two languages.** "Cartes Sportives Temple De La Renommée" and "Sport Cards
  Hall Of Fame" both appear in Dollard-Des-Ormeaux — almost certainly one business listed
  twice. Check before adding either.
- **`Boutique Imaginaire` is a chain** (Sherbrooke, St-Bruno, Trois-Rivières). Multiple
  locations are legitimate; make sure they're distinct addresses, not stale listings.
- **nearmetcg is TCG-first.** Many entries are Pokémon/Magic shops that may carry no sports
  cards. In scope for SCNM, which covers both — but relevant to how they're described.

## Recommendation

This is a real lead, not a finished job. It wants one dedicated session to verify the 52
against their own websites — the same verify-each-shop discipline used on the five
non-card removals — starting with the 18 in uncovered towns, since each of those unlocks
a new city page.
