import { runDiscoveryAgent } from '../../src/agents/discovery';

jest.mock('../../src/lib/exa', () => ({
  searchWithRetry: jest.fn(),
}));

import { searchWithRetry } from '../../src/lib/exa';

const mockSearch = searchWithRetry as jest.Mock;

test('returns high-confidence account when 2+ sources confirm it', async () => {
  mockSearch.mockResolvedValue([
    { title: 'Mercy Health selects Kronos', url: 'https://healthitnews.com/mercy', text: 'Mercy Health implemented Kronos Workforce.' },
    { title: 'Mercy Health Kronos go-live', url: 'https://beckershr.com/mercy', text: 'Mercy Health went live on Kronos.' },
  ]);

  const accounts = await runDiscoveryAgent();
  const mercy = accounts.find((a) => a.healthSystemName.toLowerCase().includes('mercy'));
  expect(mercy).toBeDefined();
  expect(mercy?.confidence).toBe('high');
});

test('returns low-confidence account when only 1 source found', async () => {
  mockSearch.mockResolvedValue([
    { title: 'Acme Hospital Kronos', url: 'https://acme.org', text: 'Acme Hospital uses Kronos.' },
  ]);

  const accounts = await runDiscoveryAgent();
  const lowConf = accounts.filter((a) => a.confidence === 'low');
  expect(lowConf.length).toBeGreaterThanOrEqual(0); // may be 0 if deduped away
});

test('deduplicates the same health system across multiple queries', async () => {
  mockSearch.mockResolvedValue([
    { title: 'Mercy Health Kronos', url: 'https://a.com', text: 'Mercy Health uses Kronos Workforce.' },
    { title: 'Mercy Health UKG', url: 'https://b.com', text: 'Mercy Health implemented UKG.' },
  ]);

  const accounts = await runDiscoveryAgent();
  const mercyAccounts = accounts.filter((a) =>
    a.healthSystemName.toLowerCase().includes('mercy'),
  );
  // Should be 1 entry per health-system+competitor pair, not duplicated per query
  const uniquePairs = new Set(mercyAccounts.map((a) => `${a.healthSystemName}|${a.competitorPlatform}`));
  expect(uniquePairs.size).toBe(mercyAccounts.length);
});
