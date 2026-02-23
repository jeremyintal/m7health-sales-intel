import { DiscoveredAccount, Signal, SignalType } from '../../types';
import { getSignalStrength } from '../../config/scoring';
import { runSignalAgent } from './base';

export async function runJobsAgent(account: DiscoveredAccount): Promise<Signal | null> {
  return runSignalAgent(account, SignalType.JOB_POSTINGS, (results) => {
    if (results.length === 0) return null;
    const r = results[0];
    return {
      type: SignalType.JOB_POSTINGS,
      strength: getSignalStrength(SignalType.JOB_POSTINGS),
      headline: r.title,
      sourceUrls: results.slice(0, 3).map((x) => x.url),
      rawText: r.text,
    };
  });
}
