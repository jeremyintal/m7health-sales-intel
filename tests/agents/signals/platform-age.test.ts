import { runPlatformAgeAgent } from '../../../src/agents/signals/platform-age';
import { SignalType, SignalStrength } from '../../../src/types';

jest.mock('../../../src/lib/exa', () => ({
  searchWithRetry: jest.fn(),
}));

import { searchWithRetry } from '../../../src/lib/exa';
const mockSearch = searchWithRetry as jest.Mock;

const account = {
  healthSystemName: 'Mercy Health',
  competitorPlatform: 'Kronos',
  sourceUrls: ['https://example.com'],
  confidence: 'high' as const,
};

test('returns HIGH signal when go-live found within 2-3 years', async () => {
  mockSearch.mockResolvedValue([
    {
      title: 'Mercy Health Kronos go-live Q1 2023',
      url: 'https://healthitnews.com/mercy-kronos',
      text: 'Mercy Health went live on Kronos Workforce in Q1 2023.',
      publishedDate: '2023-02-15',
    },
  ]);

  const signal = await runPlatformAgeAgent(account);
  expect(signal).not.toBeNull();
  expect(signal?.type).toBe(SignalType.PLATFORM_AGE);
  expect(signal?.strength).toBe(SignalStrength.HIGH);
  expect(signal?.sourceUrls).toHaveLength(1);
});

test('returns null when no go-live found', async () => {
  mockSearch.mockResolvedValue([]);

  const signal = await runPlatformAgeAgent(account);
  expect(signal).toBeNull();
});
