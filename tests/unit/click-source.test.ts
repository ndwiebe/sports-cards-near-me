import { describe, expect, it } from 'vitest';
import { sourceCityFromReferrer, sourceCityForClick } from '../../worker/event-schema.js';

const origin = 'https://sportscardsnearme.ca';
describe('immediate city attribution', () => {
  it('retains only the city path, excluding query strings and fragments', () => {
    expect(sourceCityFromReferrer(`${origin}/alberta/edmonton/?q=private#section`, origin)).toBe('alberta/edmonton');
  });
  it.each(['', 'https://google.com/search?q=cards', 'https://sportscardsnearme.ca.evil/alberta/edmonton/', `${origin}/store/a-shop/`, `${origin}/guides/card-grading-101/`, `${origin}/alberta/`, `${origin}/pokemon/edmonton/`])('leaves other arrivals unattributed: %s', referrer => {
    expect(sourceCityFromReferrer(referrer, origin)).toBe('unknown');
  });
});

describe('tap on the current page', () => {
  it('credits the city page the tap happened on', () => {
    expect(sourceCityForClick('/alberta/edmonton/', 'https://google.com/', origin)).toBe('alberta/edmonton');
  });
  it('falls back to the referrer when the current page is not a city page', () => {
    expect(sourceCityForClick('/store/a-shop/', `${origin}/ontario/toronto/`, origin)).toBe('ontario/toronto');
  });
  it('stays unknown for non-city pages with no city referrer', () => {
    expect(sourceCityForClick('/pokemon/edmonton/', 'https://google.com/', origin)).toBe('unknown');
  });
});
