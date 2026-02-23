import { DiscoveredAccount, Signal, SignalType } from '../../types';
import { getSignalStrength } from '../../config/scoring';
import { runSignalAgent } from './base';
import { ExaResult } from '../../lib/exa';

const CURRENT_YEAR = new Date().getFullYear();

function isInRenewalWindow(publishedDate: string | undefined, text: string): boolean {
  // Check published date first
  if (publishedDate) {
    const year = new Date(publishedDate).getFullYear();
    const age = CURRENT_YEAR - year;
    return age >= 2 && age <= 4;
  }
  // Fallback: look for year mentions in text
  for (let y = CURRENT_YEAR - 4; y <= CURRENT_YEAR - 2; y++) {
    if (text.includes(String(y))) return true;
  }
  return false;
}

export async function runPlatformAgeAgent(account: DiscoveredAccount): Promise<Signal | null> {
  return runSignalAgent(account, SignalType.PLATFORM_AGE, (results) => {
    const relevant = results.filter((r) =>
      isInRenewalWindow(r.publishedDate, r.title + ' ' + r.text),
    );
    if (relevant.length === 0) return null;

    const best = relevant[0];
    return {
      type: SignalType.PLATFORM_AGE,
      strength: getSignalStrength(SignalType.PLATFORM_AGE),
      headline: `${account.healthSystemName} went live on ${account.competitorPlatform} ~${CURRENT_YEAR - new Date(best.publishedDate ?? `${CURRENT_YEAR - 3}-01-01`).getFullYear()} years ago`,
      sourceUrls: [...new Set(relevant.map((r) => r.url))],
      rawText: best.text,
    };
  });
}
