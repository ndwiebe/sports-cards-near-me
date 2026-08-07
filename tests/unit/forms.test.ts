import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SHOW_FORM_URL, STORE_FORM_URL, RESELLER_FORM_URL } from '../../src/lib/forms';

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const showPages = filesUnder('src/pages/shows');
const read = (p: string) => readFileSync(p, 'utf8');

describe('submission forms', () => {
  it('the three form URLs are distinct — the whole bug class is one being mistaken for another', () => {
    expect(new Set([SHOW_FORM_URL, STORE_FORM_URL, RESELLER_FORM_URL]).size).toBe(3);
  });

  // The regression this exists to stop, twice over: 2026-07-29 every "Add a show"
  // link opened the RESELLER form; 2026-08-07 the trailing "Suggest it" line on
  // show pages opened the STORE form, and on an individual show page it was the
  // only submission link there was. Weeks of show submissions went to the wrong
  // place both times.
  it('no page under /shows/ links to the store or reseller form', () => {
    for (const path of showPages) {
      const body = read(path);
      expect(body.includes(STORE_FORM_URL), `${path} links to the STORE form`).toBe(false);
      expect(body.includes(RESELLER_FORM_URL), `${path} links to the RESELLER form`).toBe(false);
      expect(body.includes('href="/suggest/"'), `${path} links to /suggest/, which is the store form`).toBe(false);
    }
  });

  it('every show page that invites a submission points at the show form', () => {
    const inviting = showPages.filter((p) => /Add it|Add a show|Suggest it/i.test(read(p)));
    expect(inviting.length).toBeGreaterThan(0);
    for (const path of inviting) {
      expect(read(path).includes('SHOW_FORM_URL'), `${path} invites a submission without the show form`).toBe(true);
    }
  });

  it('form URLs are imported from src/lib/forms.ts, never pasted inline', () => {
    const pages = filesUnder('src/pages').concat(filesUnder('src/components'));
    for (const path of pages) {
      const body = read(path);
      const pasted = body.match(/https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+/g) ?? [];
      expect(pasted, `${path} pastes a form URL inline — import from lib/forms.ts instead`).toEqual([]);
    }
  });
});
