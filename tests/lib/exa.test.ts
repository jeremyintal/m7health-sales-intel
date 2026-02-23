// mockSearch must use "mock" prefix so Jest's hoisting can reference it in the factory
const mockSearch = jest.fn();

jest.mock('exa-js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    searchAndContents: mockSearch,
  })),
}));

import { searchWithRetry } from '../../src/lib/exa';

beforeEach(() => {
  mockSearch.mockReset();
  process.env.EXA_API_KEY = 'test-key';
});

test('searchWithRetry returns results on success', async () => {
  mockSearch.mockResolvedValue({
    results: [{ title: 'Test', url: 'https://example.com', text: 'sample text' }],
  });

  const results = await searchWithRetry('test query', 3);
  expect(results).toHaveLength(1);
  expect(results[0].url).toBe('https://example.com');
});

test('searchWithRetry retries once on failure then succeeds', async () => {
  jest.useFakeTimers();
  mockSearch
    .mockRejectedValueOnce(new Error('rate limit'))
    .mockResolvedValueOnce({
      results: [{ title: 'Test', url: 'https://example.com', text: 'sample' }],
    });

  const promise = searchWithRetry('test query', 3);
  await jest.runAllTimersAsync();
  const results = await promise;
  jest.useRealTimers();

  expect(mockSearch).toHaveBeenCalledTimes(2);
  expect(results).toHaveLength(1);
});

test('searchWithRetry returns empty array after 2 failures', async () => {
  jest.useFakeTimers();
  mockSearch.mockRejectedValue(new Error('persistent failure'));

  const promise = searchWithRetry('test query', 3);
  await jest.runAllTimersAsync();
  const results = await promise;
  jest.useRealTimers();

  expect(results).toHaveLength(0);
});
