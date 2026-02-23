import { DiscoveredAccount, Signal, SignalType } from '../../types';
import { getSignalStrength } from '../../config/scoring';
import { runSignalAgent } from './base';

export async function runRfpAgent(account: DiscoveredAccount): Promise<Signal | null> {
  return runSignalAgent(account, SignalType.RFP_RFI, (results) => {
    if (results.length === 0) return null;
    const r = results[0];
    return {
      type: SignalType.RFP_RFI,
      strength: getSignalStrength(SignalType.RFP_RFI),
      headline: r.title,
      sourceUrls: results.slice(0, 3).map((x) => x.url),
      rawText: r.text,
    };
  });
}
