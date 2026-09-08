import { writeFile } from 'node:fs/promises';
import stores from '../src/data/stores.json';
import { PROVINCES } from '../src/lib/types';

const paths = [...new Set(stores.map(store => {
  const province = PROVINCES[store.province as keyof typeof PROVINCES];
  return `${province.slug}/${store.citySlug}`;
}))].sort();
await writeFile('worker/city-paths.json', `${JSON.stringify(paths, null, 2)}\n`);
