import { searchWithRetry } from '../lib/exa';
import { COMPETITORS, getDiscoveryQueries } from '../config/competitors';
import { DiscoveredAccount } from '../types';

// Heuristic: extract a health system name from result title/text.
// Matches capitalized-word sequences ending in Health, Hospital, etc.
// Searches title first to avoid greedy over-matching in longer text.
const HEALTH_SYSTEM_PATTERN =
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Health System|Health|Hospital|Medical Center|Healthcare|Clinic|Hospitals))/;

function extractHealthSystemName(title: string, text: string): string | null {
  const titleMatch = title.match(HEALTH_SYSTEM_PATTERN);
  if (titleMatch) return titleMatch[1].trim();
  const textMatch = text.match(HEALTH_SYSTEM_PATTERN);
  if (textMatch) return textMatch[1].trim();
  return null;
}

export async function runDiscoveryAgent(): Promise<DiscoveredAccount[]> {
  // Map of "healthSystem|competitor" -> sources collected
  const accountMap = new Map<string, { account: DiscoveredAccount; sources: Set<string> }>();

  for (const competitor of COMPETITORS) {
    const queries = getDiscoveryQueries(competitor.name);

    for (const query of queries) {
      const results = await searchWithRetry(query, 10);

      for (const result of results) {
        const name = extractHealthSystemName(result.title, result.text);
        if (!name) continue;

        const key = `${name.toLowerCase()}|${competitor.name}`;

        if (!accountMap.has(key)) {
          accountMap.set(key, {
            account: {
              healthSystemName: name,
              competitorPlatform: competitor.name,
              sourceUrls: [],
              confidence: 'low',
            },
            sources: new Set(),
          });
        }

        const entry = accountMap.get(key)!;
        if (!entry.sources.has(result.url)) {
          entry.sources.add(result.url);
          entry.account.sourceUrls.push(result.url);
        }

        // Upgrade to high confidence once we have 2+ distinct sources
        if (entry.sources.size >= 2) {
          entry.account.confidence = 'high';
        }
      }
    }
  }

  return Array.from(accountMap.values()).map((e) => e.account);
}
