import { describe, it, expect } from 'vitest';
import { baseDomain, itemMatchesUrl, uriMatches } from '../src/matching.js';

describe('URL/host matching', () => {
  it('Host mode keeps every subdomain separate (the fayber.dev fix)', () => {
    expect(uriMatches('ai.fayber.dev', 'https://ai.fayber.dev/login', 'host')).toBe(true);
    expect(uriMatches('ai.fayber.dev', 'https://hub.fayber.dev/login', 'host')).toBe(false);
    expect(uriMatches('https://ai.fayber.dev', 'https://ai.fayber.dev/x/y', 'host')).toBe(true);
  });

  it('Base-domain mode groups all subdomains', () => {
    expect(uriMatches('ai.fayber.dev', 'https://hub.fayber.dev/login', 'base_domain')).toBe(true);
    expect(uriMatches('ai.fayber.dev', 'https://fayber.dev', 'base_domain')).toBe(true);
    expect(uriMatches('ai.fayber.dev', 'https://other.com', 'base_domain')).toBe(false);
  });

  it('Exact mode matches origin + path only', () => {
    expect(uriMatches('https://x.com/login', 'https://x.com/login?a=1', 'exact')).toBe(true);
    expect(uriMatches('https://x.com/login', 'https://x.com/account', 'exact')).toBe(false);
  });

  it('Never mode never matches', () => {
    expect(uriMatches('x.com', 'https://x.com', 'never')).toBe(false);
  });

  it('baseDomain handles multi-part suffixes', () => {
    expect(baseDomain('ai.fayber.dev')).toBe('fayber.dev');
    expect(baseDomain('shop.example.co.uk')).toBe('example.co.uk');
    expect(baseDomain('example.com')).toBe('example.com');
  });

  it('itemMatchesUrl matches if ANY uri matches', () => {
    expect(itemMatchesUrl(['a.com', 'b.com'], 'host', 'https://b.com/x')).toBe(true);
    expect(itemMatchesUrl(['a.com', 'b.com'], 'host', 'https://c.com/x')).toBe(false);
  });
});
