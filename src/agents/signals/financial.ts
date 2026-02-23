import { DiscoveredAccount, Signal, SignalType } from '../../types';
import { getSignalStrength } from '../../config/scoring';
import { runSignalAgent } from './base';

export async function runFinancialAgent(account: DiscoveredAccount): Promise<Signal | null> {
  return runSignalAgent(account, SignalType.FINANCIAL_MA, (results) => {
    if (results.length === 0) return null;
    const r = results[0];
    return {
      type: SignalType.FINANCIAL_MA,
      strength: getSignalStrength(SignalType.FINANCIAL_MA),
      headline: r.title,
      sourceUrls: results.slice(0, 3).map((x) => x.url),
      rawText: r.text,
    };
  });
}
