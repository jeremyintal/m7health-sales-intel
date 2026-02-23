import Exa from 'exa-js';

export interface ExaResult {
  title: string;
  url: string;
  text: string;
  publishedDate?: string;
}

let _client: Exa | null = null;

function getClient(): Exa {
  if (!_client) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) throw new Error('EXA_API_KEY is not set');
    _client = new Exa(apiKey);
  }
  return _client;
}

export async function searchWithRetry(
  query: string,
  numResults = 5,
): Promise<ExaResult[]> {
  const client = getClient();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await client.searchAndContents(query, {
        numResults,
        type: 'neural',
        useAutoprompt: true,
        text: { maxCharacters: 1000 },
      });
      return (response.results ?? []).map((r: any) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        text: r.text ?? '',
        publishedDate: r.publishedDate,
      }));
    } catch (err) {
      if (attempt === 2) {
        console.error(`Exa search failed after 2 attempts for query: "${query}"`, err);
        return [];
      }
      // Exponential backoff: wait 2s before retry
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  return [];
}
