/**
 * A row-count guard shared by any bake script that turns a sheet tab into a JSON
 * data file. `stores.ts` already has its own `assertCountSane` (an absolute floor
 * plus a 10% drop check), because a store directory is never legitimately empty.
 * Shows and resellers are different: an empty sheet is a real, legitimate state
 * for both (see the "NO count guard" comments this replaces in `bake-shows.ts`
 * and `bake-resellers.ts`), so an absolute floor would be wrong for them.
 *
 * What both scripts actually lacked protection against isn't editorial shrink --
 * it's a sheet READ going sideways (wrong tab, truncated response, an auth
 * hiccup) silently baking a near-empty file over a real one. This guard catches
 * that without policing normal data changes: it only fires on a *comparison*
 * (never on an absolute floor), and it does nothing when there is no previous
 * count to compare against, or when the previous count was itself zero.
 */
export function assertNoUnexpectedShrink(
  label: string,
  next: number,
  prev: number | null,
  { dropRatio = 0.5 }: { dropRatio?: number } = {},
): void {
  if (prev === null || prev === 0) return;
  if (next < prev * dropRatio) {
    const pct = Math.round((1 - dropRatio) * 100);
    throw new Error(`bake guard: ${label} ${next} is a >${pct}% drop from previous ${prev}`);
  }
}
