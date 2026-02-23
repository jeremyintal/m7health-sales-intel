import { DiscoveredAccount, Signal, SignalType } from '../../types';
import { getSignalQueries } from '../../config/competitors';
import { searchWithRetry, ExaResult } from '../../lib/exa';

export async function runSignalAgent(
  account: DiscoveredAccount,
  signalType: SignalType,
  extractSignal: (results: ExaResult[], account: DiscoveredAccount) => Signal | null,
): Promise<Signal | null> {
  const queries = getSignalQueries(
    account.healthSystemName,
    account.competitorPlatform,
    signalType,
  );

  const allResults: ExaResult[] = [];
  for (const query of queries) {
    const results = await searchWithRetry(query, 5);
    allResults.push(...results);
  }

  if (allResults.length === 0) return null;
  return extractSignal(allResults, account);
}
