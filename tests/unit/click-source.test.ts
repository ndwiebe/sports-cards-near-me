import { describe, expect, it } from 'vitest';
import { sourceCityFromReferrer } from '../../worker/event-schema.js';

const origin = 'https://sportscardsnearme.ca';
describe('immediate city attribution', () => {
  it('retains only the city path, excluding query strings and fragments', () => {
    expect(sourceCityFromReferrer(`${origin}/alberta/edmonton/?q=private#section`, origin)).toBe('alberta/edmonton');
  });
  it.each(['', 'https://google.com/search?q=cards', 'https://sportscardsnearme.ca.evil/alberta/edmonton/', `${origin}/store/a-shop/`, `${origin}/guides/card-grading-101/`, `${origin}/alberta/`, `${origin}/pokemon/edmonton/`])('leaves other arrivals unattributed: %s', referrer => {
    expect(sourceCityFromReferrer(referrer, origin)).toBe('unknown');
  });
});
