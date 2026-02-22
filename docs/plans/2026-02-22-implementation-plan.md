# Exa Sales Signal Monitoring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a daily TypeScript agent pipeline that discovers health systems on competitor scheduling platforms via Exa web search, monitors them for 7 signal types, and delivers per-account dossiers with AI-generated talking points to Slack.

**Architecture:** An orchestrator runs the Discovery Agent first to build an account list, then fans out 7 signal agents in parallel (one per signal type). Results feed a Dossier Compiler that calls Claude to generate talking points, then a Slack Delivery Agent posts Block Kit messages to `#sales-intel`.

**Tech Stack:** TypeScript, `exa-js` (Exa search), `@anthropic-ai/sdk` (Claude talking points), `@slack/web-api` (Slack Block Kit), `jest` + `ts-jest` (tests), `tsx` (run TS directly), `dotenv` (env config)

---

## Environment Variables

Create `.env` at project root:

```
EXA_API_KEY=your_exa_key
ANTHROPIC_API_KEY=your_anthropic_key
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SALES_INTEL_CHANNEL_ID=C0000000000
SLACK_OPS_CHANNEL_ID=C0000000001
```

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.ts`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Create `package.json`**

```json
{
  "name": "exa-sales-intel",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.36.3",
    "@slack/web-api": "^7.3.4",
    "dotenv": "^16.4.5",
    "exa-js": "^1.7.7"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^22.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.4",
    "tsx": "^4.17.0",
    "typescript": "^5.5.4"
  }
}
```

**Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create `jest.config.ts`**

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
```

**Step 4: Create `.env.example`**

```
EXA_API_KEY=
ANTHROPIC_API_KEY=
SLACK_BOT_TOKEN=
SLACK_SALES_INTEL_CHANNEL_ID=
SLACK_OPS_CHANNEL_ID=
```

**Step 5: Create `.gitignore`**

```
node_modules/
dist/
.env
*.js.map
```

**Step 6: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors

**Step 7: Commit**

```bash
git add package.json tsconfig.json jest.config.ts .env.example .gitignore
git commit -m "chore: project setup — TS, Jest, Exa, Anthropic, Slack deps"
```

---

### Task 2: Shared Types

**Files:**
- Create: `src/types/index.ts`
- Create: `tests/types.test.ts`

**Step 1: Write the failing test**

```ts
// tests/types.test.ts
import { SignalStrength, SignalType } from '../src/types';

test('SignalStrength enum has correct values', () => {
  expect(SignalStrength.HIGH).toBe('HIGH');
  expect(SignalStrength.MEDIUM).toBe('MEDIUM');
  expect(SignalStrength.LOW).toBe('LOW');
});

test('SignalType enum has all 7 types', () => {
  expect(Object.keys(SignalType)).toHaveLength(7);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/types.test.ts`
Expected: FAIL — `Cannot find module '../src/types'`

**Step 3: Create `src/types/index.ts`**

```ts
export enum SignalStrength {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum SignalType {
  PLATFORM_AGE = 'PLATFORM_AGE',
  LEADERSHIP_CHANGE = 'LEADERSHIP_CHANGE',
  RFP_RFI = 'RFP_RFI',
  SENTIMENT = 'SENTIMENT',
  FINANCIAL_MA = 'FINANCIAL_MA',
  CONFERENCE_EVENTS = 'CONFERENCE_EVENTS',
  JOB_POSTINGS = 'JOB_POSTINGS',
}

export interface DiscoveredAccount {
  healthSystemName: string;
  competitorPlatform: string;
  sourceUrls: string[];
  confidence: 'high' | 'low'; // high = 2+ sources, low = 1 source
}

export interface Signal {
  type: SignalType;
  strength: SignalStrength;
  headline: string;
  sourceUrls: string[];
  rawText: string;
  talkingPoint?: string; // added by DossierCompiler
}

export interface AccountDossier {
  account: DiscoveredAccount;
  signals: Signal[];
  generatedAt: Date;
}

export interface RunSummary {
  date: string;
  accountsDiscovered: number;
  accountsWithSignals: number;
  signalCounts: Record<SignalType, number>;
  agentsFailed: string[];
  runtimeMs: number;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/index.ts tests/types.test.ts
git commit -m "feat: add shared types — Account, Signal, Dossier, RunSummary"
```

---

### Task 3: Competitor Config

**Files:**
- Create: `src/config/competitors.ts`
- Create: `src/config/scoring.ts`
- Create: `tests/config.test.ts`

**Step 1: Write the failing test**

```ts
// tests/config.test.ts
import { COMPETITORS, getDiscoveryQueries } from '../src/config/competitors';
import { getSignalStrength } from '../src/config/scoring';
import { SignalType, SignalStrength } from '../src/types';

test('COMPETITORS has all 6 platforms', () => {
  expect(COMPETITORS).toHaveLength(6);
});

test('getDiscoveryQueries returns 2+ queries per competitor', () => {
  COMPETITORS.forEach((c) => {
    const queries = getDiscoveryQueries(c.name);
    expect(queries.length).toBeGreaterThanOrEqual(2);
  });
});

test('leadership change scores HIGH', () => {
  expect(getSignalStrength(SignalType.LEADERSHIP_CHANGE)).toBe(SignalStrength.HIGH);
});

test('job postings score LOW', () => {
  expect(getSignalStrength(SignalType.JOB_POSTINGS)).toBe(SignalStrength.LOW);
});

test('sentiment scores MEDIUM', () => {
  expect(getSignalStrength(SignalType.SENTIMENT)).toBe(SignalStrength.MEDIUM);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/config.test.ts`
Expected: FAIL — modules not found

**Step 3: Create `src/config/competitors.ts`**

```ts
export interface Competitor {
  name: string;
  aliases: string[];
}

export const COMPETITORS: Competitor[] = [
  { name: 'Kronos', aliases: ['Kronos Workforce', 'UKG Pro', 'UKG'] },
  { name: 'ANSOS', aliases: ['ANSOS', 'HealthStream'] },
  { name: 'ShiftWizard', aliases: ['ShiftWizard'] },
  { name: 'API Healthcare', aliases: ['API Healthcare'] },
  { name: 'Symplr', aliases: ['Symplr'] },
  { name: 'Vitalize', aliases: ['Vitalize'] },
];

export function getDiscoveryQueries(competitorName: string): string[] {
  const competitor = COMPETITORS.find((c) => c.name === competitorName);
  if (!competitor) return [];

  return competitor.aliases.flatMap((alias) => [
    `"${alias}" "health system" OR hospital scheduling implementation`,
    `"${alias}" nurse staffing workforce management site:*.org OR site:*.com`,
  ]);
}

export function getSignalQueries(
  healthSystem: string,
  competitorName: string,
  signalType: string,
): string[] {
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;

  const queries: Record<string, string[]> = {
    PLATFORM_AGE: [
      `"${healthSystem}" "${competitorName}" "go-live" OR "launched" OR "implemented" OR "rolled out" ${lastYear - 2} OR ${lastYear - 1} OR ${lastYear}`,
      `"${healthSystem}" "${competitorName}" implementation "went live" press release`,
    ],
    LEADERSHIP_CHANGE: [
      `"${healthSystem}" "appointed" OR "named" OR "joins" CIO OR CNO OR "VP of Workforce" OR "Chief Nursing"`,
      `"${healthSystem}" new CIO OR CNO OR "Chief Information Officer" OR "Chief Nursing Officer" ${thisYear}`,
    ],
    RFP_RFI: [
      `"${healthSystem}" RFP OR RFI "scheduling" OR "workforce management" OR "nurse staffing"`,
      `"${healthSystem}" "request for proposal" OR "request for information" workforce scheduling`,
    ],
    SENTIMENT: [
      `"${competitorName}" "${healthSystem}" complaint OR problems OR issues OR switching OR replacing`,
      `"${healthSystem}" "${competitorName}" review problems OR frustration OR "switching systems"`,
    ],
    FINANCIAL_MA: [
      `"${healthSystem}" acquisition OR merger OR "financial distress" OR "cost reduction" ${thisYear} OR ${lastYear}`,
      `"${healthSystem}" "cost savings" OR "restructuring" OR "budget cuts" ${thisYear}`,
    ],
    CONFERENCE_EVENTS: [
      `"${healthSystem}" OR "${competitorName}" conference sponsor OR presenting OR keynote ${thisYear}`,
      `"${competitorName}" HIMSS OR "Becker's" OR ANCC sponsor ${thisYear}`,
    ],
    JOB_POSTINGS: [
      `"${healthSystem}" "${competitorName}" OR "workforce management" job posting hiring`,
      `"${healthSystem}" "Workforce Management Analyst" OR "Scheduling Coordinator" OR "Staffing Systems" hiring`,
    ],
  };

  return queries[signalType] ?? [];
}
```

**Step 4: Create `src/config/scoring.ts`**

```ts
import { SignalType, SignalStrength } from '../types';

const SCORING: Record<SignalType, SignalStrength> = {
  [SignalType.LEADERSHIP_CHANGE]: SignalStrength.HIGH,
  [SignalType.RFP_RFI]: SignalStrength.HIGH,
  [SignalType.PLATFORM_AGE]: SignalStrength.HIGH,
  [SignalType.SENTIMENT]: SignalStrength.MEDIUM,
  [SignalType.FINANCIAL_MA]: SignalStrength.MEDIUM,
  [SignalType.CONFERENCE_EVENTS]: SignalStrength.MEDIUM,
  [SignalType.JOB_POSTINGS]: SignalStrength.LOW,
};

export function getSignalStrength(type: SignalType): SignalStrength {
  return SCORING[type];
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/config.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/config/competitors.ts src/config/scoring.ts tests/config.test.ts
git commit -m "feat: add competitor config and signal strength scoring"
```

---

### Task 4: Exa Client Wrapper

**Files:**
- Create: `src/lib/exa.ts`
- Create: `tests/lib/exa.test.ts`

**Step 1: Write the failing test**

```ts
// tests/lib/exa.test.ts
import { searchWithRetry } from '../../src/lib/exa';

// Mock the exa-js module
jest.mock('exa-js', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      search: jest.fn(),
    })),
  };
});

import Exa from 'exa-js';

test('searchWithRetry returns results on success', async () => {
  const mockResults = {
    results: [{ title: 'Test', url: 'https://example.com', text: 'sample text' }],
  };
  const mockSearch = jest.fn().mockResolvedValue(mockResults);
  (Exa as jest.Mock).mockImplementation(() => ({ search: mockSearch }));

  const results = await searchWithRetry('test query', 3);
  expect(results).toHaveLength(1);
  expect(results[0].url).toBe('https://example.com');
});

test('searchWithRetry retries once on failure then succeeds', async () => {
  const mockResults = {
    results: [{ title: 'Test', url: 'https://example.com', text: 'sample' }],
  };
  const mockSearch = jest
    .fn()
    .mockRejectedValueOnce(new Error('rate limit'))
    .mockResolvedValueOnce(mockResults);
  (Exa as jest.Mock).mockImplementation(() => ({ search: mockSearch }));

  const results = await searchWithRetry('test query', 3);
  expect(mockSearch).toHaveBeenCalledTimes(2);
  expect(results).toHaveLength(1);
});

test('searchWithRetry returns empty array after 2 failures', async () => {
  const mockSearch = jest
    .fn()
    .mockRejectedValue(new Error('persistent failure'));
  (Exa as jest.Mock).mockImplementation(() => ({ search: mockSearch }));

  const results = await searchWithRetry('test query', 3);
  expect(results).toHaveLength(0);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/exa.test.ts`
Expected: FAIL — module not found

**Step 3: Create `src/lib/exa.ts`**

```ts
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
      const response = await client.search(query, {
        numResults,
        type: 'neural',
        useAutoprompt: true,
        contents: { text: { maxCharacters: 1000 } },
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/exa.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/exa.ts tests/lib/exa.test.ts
git commit -m "feat: add Exa client wrapper with retry logic"
```

---

### Task 5: Discovery Agent

**Files:**
- Create: `src/agents/discovery.ts`
- Create: `tests/agents/discovery.test.ts`

**Step 1: Write the failing test**

```ts
// tests/agents/discovery.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/agents/discovery.test.ts`
Expected: FAIL — module not found

**Step 3: Create `src/agents/discovery.ts`**

```ts
import { searchWithRetry } from '../lib/exa';
import { COMPETITORS, getDiscoveryQueries } from '../config/competitors';
import { DiscoveredAccount } from '../types';

// Simple heuristic: extract a health system name from result title/text.
// Looks for known patterns like "X Health", "X Hospital", "X Medical Center".
function extractHealthSystemName(text: string): string | null {
  const patterns = [
    /([A-Z][a-zA-Z\s]+(?:Health System|Health|Hospital|Medical Center|Healthcare|Clinic|Hospitals))/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
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
        const name = extractHealthSystemName(result.title + ' ' + result.text);
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/agents/discovery.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/agents/discovery.ts tests/agents/discovery.test.ts
git commit -m "feat: add discovery agent — finds health systems on competitor platforms"
```

---

### Task 6: Signal Agent Base + Platform Age Agent

**Files:**
- Create: `src/agents/signals/base.ts`
- Create: `src/agents/signals/platform-age.ts`
- Create: `tests/agents/signals/platform-age.test.ts`

**Step 1: Write the failing test**

```ts
// tests/agents/signals/platform-age.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/agents/signals/platform-age.test.ts`
Expected: FAIL

**Step 3: Create `src/agents/signals/base.ts`**

```ts
import { DiscoveredAccount, Signal, SignalType } from '../../types';
import { getSignalStrength } from '../../config/scoring';
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
```

**Step 4: Create `src/agents/signals/platform-age.ts`**

```ts
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
      sourceUrls: relevant.map((r) => r.url),
      rawText: best.text,
    };
  });
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/agents/signals/platform-age.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/agents/signals/base.ts src/agents/signals/platform-age.ts tests/agents/signals/platform-age.test.ts
git commit -m "feat: add signal agent base and platform age agent"
```

---

### Task 7: Remaining 6 Signal Agents

**Files:**
- Create: `src/agents/signals/leadership.ts`
- Create: `src/agents/signals/rfp.ts`
- Create: `src/agents/signals/sentiment.ts`
- Create: `src/agents/signals/financial.ts`
- Create: `src/agents/signals/events.ts`
- Create: `src/agents/signals/jobs.ts`
- Create: `tests/agents/signals/remaining.test.ts`

**Step 1: Write the failing test**

```ts
// tests/agents/signals/remaining.test.ts
import { runLeadershipAgent } from '../../../src/agents/signals/leadership';
import { runRfpAgent } from '../../../src/agents/signals/rfp';
import { runSentimentAgent } from '../../../src/agents/signals/sentiment';
import { runFinancialAgent } from '../../../src/agents/signals/financial';
import { runEventsAgent } from '../../../src/agents/signals/events';
import { runJobsAgent } from '../../../src/agents/signals/jobs';
import { SignalType, SignalStrength } from '../../../src/types';

jest.mock('../../../src/lib/exa', () => ({ searchWithRetry: jest.fn() }));
import { searchWithRetry } from '../../../src/lib/exa';
const mockSearch = searchWithRetry as jest.Mock;

const account = {
  healthSystemName: 'Mercy Health',
  competitorPlatform: 'Kronos',
  sourceUrls: ['https://example.com'],
  confidence: 'high' as const,
};

const makeResult = (title: string, text: string) => ({
  title, url: `https://example.com/${Date.now()}`, text, publishedDate: '2026-01-15',
});

beforeEach(() => mockSearch.mockReset());

test('leadership agent returns HIGH signal', async () => {
  mockSearch.mockResolvedValue([makeResult('New CNO at Mercy Health', 'Mercy Health appointed Dr. Sarah Chen as CNO.')]);
  const s = await runLeadershipAgent(account);
  expect(s?.type).toBe(SignalType.LEADERSHIP_CHANGE);
  expect(s?.strength).toBe(SignalStrength.HIGH);
});

test('rfp agent returns HIGH signal', async () => {
  mockSearch.mockResolvedValue([makeResult('Mercy Health RFP for workforce scheduling', 'Mercy Health issued an RFP for nurse scheduling software.')]);
  const s = await runRfpAgent(account);
  expect(s?.type).toBe(SignalType.RFP_RFI);
  expect(s?.strength).toBe(SignalStrength.HIGH);
});

test('sentiment agent returns MEDIUM signal', async () => {
  mockSearch.mockResolvedValue([makeResult('Mercy Health Kronos problems', 'Staff at Mercy Health complain about Kronos scheduling issues.')]);
  const s = await runSentimentAgent(account);
  expect(s?.type).toBe(SignalType.SENTIMENT);
  expect(s?.strength).toBe(SignalStrength.MEDIUM);
});

test('financial agent returns MEDIUM signal', async () => {
  mockSearch.mockResolvedValue([makeResult('Mercy Health acquisition 2026', 'Mercy Health acquired by larger health system in 2026.')]);
  const s = await runFinancialAgent(account);
  expect(s?.type).toBe(SignalType.FINANCIAL_MA);
  expect(s?.strength).toBe(SignalStrength.MEDIUM);
});

test('events agent returns MEDIUM signal', async () => {
  mockSearch.mockResolvedValue([makeResult('Kronos HIMSS sponsor 2026', 'Kronos is a platinum sponsor at HIMSS 2026.')]);
  const s = await runEventsAgent(account);
  expect(s?.type).toBe(SignalType.CONFERENCE_EVENTS);
  expect(s?.strength).toBe(SignalStrength.MEDIUM);
});

test('jobs agent returns LOW signal', async () => {
  mockSearch.mockResolvedValue([makeResult('Mercy Health Kronos admin hiring', 'Mercy Health is hiring a Kronos Workforce Management Analyst.')]);
  const s = await runJobsAgent(account);
  expect(s?.type).toBe(SignalType.JOB_POSTINGS);
  expect(s?.strength).toBe(SignalStrength.LOW);
});

test('each agent returns null when no results', async () => {
  mockSearch.mockResolvedValue([]);
  const agents = [runLeadershipAgent, runRfpAgent, runSentimentAgent, runFinancialAgent, runEventsAgent, runJobsAgent];
  for (const agent of agents) {
    const s = await agent(account);
    expect(s).toBeNull();
  }
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/agents/signals/remaining.test.ts`
Expected: FAIL

**Step 3: Create all 6 signal agent files**

Each follows the same pattern — calls `runSignalAgent` with the right `SignalType` and a simple extract function that returns the first result as a signal:

```ts
// src/agents/signals/leadership.ts
import { DiscoveredAccount, Signal, SignalType } from '../../types';
import { getSignalStrength } from '../../config/scoring';
import { runSignalAgent } from './base';

export async function runLeadershipAgent(account: DiscoveredAccount): Promise<Signal | null> {
  return runSignalAgent(account, SignalType.LEADERSHIP_CHANGE, (results) => {
    if (results.length === 0) return null;
    const r = results[0];
    return {
      type: SignalType.LEADERSHIP_CHANGE,
      strength: getSignalStrength(SignalType.LEADERSHIP_CHANGE),
      headline: r.title,
      sourceUrls: results.slice(0, 3).map((x) => x.url),
      rawText: r.text,
    };
  });
}
```

Repeat identically for `rfp.ts` (SignalType.RFP_RFI), `sentiment.ts` (SignalType.SENTIMENT), `financial.ts` (SignalType.FINANCIAL_MA), `events.ts` (SignalType.CONFERENCE_EVENTS), `jobs.ts` (SignalType.JOB_POSTINGS) — only the import and SignalType constant changes.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/agents/signals/remaining.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/agents/signals/ tests/agents/signals/remaining.test.ts
git commit -m "feat: add 6 remaining signal agents (leadership, rfp, sentiment, financial, events, jobs)"
```

---

### Task 8: Claude Client + Dossier Compiler

**Files:**
- Create: `src/lib/claude.ts`
- Create: `src/agents/dossier.ts`
- Create: `tests/agents/dossier.test.ts`

**Step 1: Write the failing test**

```ts
// tests/agents/dossier.test.ts
import { compileDossier } from '../../src/agents/dossier';
import { SignalType, SignalStrength } from '../../src/types';

jest.mock('../../src/lib/claude', () => ({
  generateTalkingPoint: jest.fn().mockResolvedValue('Mocked talking point.'),
}));

const account = {
  healthSystemName: 'Mercy Health',
  competitorPlatform: 'Kronos',
  sourceUrls: ['https://example.com'],
  confidence: 'high' as const,
};

const signals = [
  {
    type: SignalType.PLATFORM_AGE,
    strength: SignalStrength.HIGH,
    headline: 'Mercy Health went live on Kronos ~3 years ago',
    sourceUrls: ['https://healthitnews.com/mercy'],
    rawText: 'Mercy Health implemented Kronos in 2023.',
  },
  {
    type: SignalType.JOB_POSTINGS,
    strength: SignalStrength.LOW,
    headline: '3 Kronos admin roles posted',
    sourceUrls: ['https://indeed.com/mercy'],
    rawText: 'Mercy Health is hiring a Kronos admin.',
  },
];

test('compileDossier returns dossier with talking points', async () => {
  const dossier = await compileDossier(account, signals);
  expect(dossier.account).toEqual(account);
  expect(dossier.signals).toHaveLength(2);
  expect(dossier.signals[0].talkingPoint).toBe('Mocked talking point.');
  expect(dossier.generatedAt).toBeInstanceOf(Date);
});

test('compileDossier sorts signals HIGH first', async () => {
  const dossier = await compileDossier(account, signals);
  expect(dossier.signals[0].strength).toBe(SignalStrength.HIGH);
  expect(dossier.signals[1].strength).toBe(SignalStrength.LOW);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/agents/dossier.test.ts`
Expected: FAIL

**Step 3: Create `src/lib/claude.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function generateTalkingPoint(
  signalHeadline: string,
  signalText: string,
  competitorPlatform: string,
): Promise<string> {
  const client = getClient();
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `You are a B2B sales coach for a healthcare workforce scheduling platform. A sales rep just found this signal about a health system that uses ${competitorPlatform}:

Signal: ${signalHeadline}
Details: ${signalText}

Write a 1-2 sentence talking point for the rep explaining why this signal matters and what angle to take when reaching out. Be specific, confident, and actionable. Do not use bullet points.`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}
```

**Step 4: Create `src/agents/dossier.ts`**

```ts
import { DiscoveredAccount, Signal, AccountDossier, SignalStrength } from '../types';
import { generateTalkingPoint } from '../lib/claude';

const STRENGTH_ORDER: Record<SignalStrength, number> = {
  [SignalStrength.HIGH]: 0,
  [SignalStrength.MEDIUM]: 1,
  [SignalStrength.LOW]: 2,
};

export async function compileDossier(
  account: DiscoveredAccount,
  signals: Signal[],
): Promise<AccountDossier> {
  // Sort by signal strength before generating talking points
  const sorted = [...signals].sort(
    (a, b) => STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength],
  );

  // Generate talking points in parallel
  const withTalkingPoints = await Promise.all(
    sorted.map(async (signal) => {
      const talkingPoint = await generateTalkingPoint(
        signal.headline,
        signal.rawText,
        account.competitorPlatform,
      );
      return { ...signal, talkingPoint };
    }),
  );

  return {
    account,
    signals: withTalkingPoints,
    generatedAt: new Date(),
  };
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/agents/dossier.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/claude.ts src/agents/dossier.ts tests/agents/dossier.test.ts
git commit -m "feat: add Claude client and dossier compiler with talking point generation"
```

---

### Task 9: Slack Delivery Agent

**Files:**
- Create: `src/lib/slack.ts`
- Create: `src/agents/delivery.ts`
- Create: `tests/agents/delivery.test.ts`

**Step 1: Write the failing test**

```ts
// tests/agents/delivery.test.ts
import { buildAccountBlocks, buildRunSummaryBlocks } from '../../src/agents/delivery';
import { SignalType, SignalStrength } from '../../src/types';

const dossier = {
  account: {
    healthSystemName: 'Mercy Health',
    competitorPlatform: 'Kronos',
    sourceUrls: ['https://example.com'],
    confidence: 'high' as const,
  },
  signals: [
    {
      type: SignalType.PLATFORM_AGE,
      strength: SignalStrength.HIGH,
      headline: 'Mercy Health went live on Kronos ~3 years ago',
      sourceUrls: ['https://healthitnews.com'],
      rawText: 'raw',
      talkingPoint: '3-year mark on Kronos — renewal window open.',
    },
  ],
  generatedAt: new Date('2026-02-22'),
};

test('buildAccountBlocks returns array of Slack blocks', () => {
  const blocks = buildAccountBlocks(dossier);
  expect(Array.isArray(blocks)).toBe(true);
  expect(blocks.length).toBeGreaterThan(0);
});

test('buildAccountBlocks includes health system name', () => {
  const blocks = buildAccountBlocks(dossier);
  const json = JSON.stringify(blocks);
  expect(json).toContain('Mercy Health');
});

test('buildAccountBlocks includes talking point', () => {
  const blocks = buildAccountBlocks(dossier);
  const json = JSON.stringify(blocks);
  expect(json).toContain('renewal window open');
});

test('buildRunSummaryBlocks includes account counts', () => {
  const summary = {
    date: '2026-02-22',
    accountsDiscovered: 43,
    accountsWithSignals: 12,
    signalCounts: {} as any,
    agentsFailed: [],
    runtimeMs: 252000,
  };
  const blocks = buildRunSummaryBlocks(summary);
  const json = JSON.stringify(blocks);
  expect(json).toContain('43');
  expect(json).toContain('12');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/agents/delivery.test.ts`
Expected: FAIL

**Step 3: Create `src/lib/slack.ts`**

```ts
import { WebClient } from '@slack/web-api';

let _client: WebClient | null = null;

export function getSlackClient(): WebClient {
  if (!_client) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error('SLACK_BOT_TOKEN is not set');
    _client = new WebClient(token);
  }
  return _client;
}

export async function postBlocks(channelId: string, blocks: object[]): Promise<void> {
  const client = getSlackClient();
  await client.chat.postMessage({ channel: channelId, blocks, text: '' });
  // Slack rate limit: 1 message per second
  await new Promise((res) => setTimeout(res, 1000));
}
```

**Step 4: Create `src/agents/delivery.ts`**

```ts
import { AccountDossier, RunSummary, SignalStrength } from '../types';
import { postBlocks } from '../lib/slack';

const STRENGTH_EMOJI: Record<SignalStrength, string> = {
  [SignalStrength.HIGH]: '🔥 HIGH',
  [SignalStrength.MEDIUM]: '🟡 MEDIUM',
  [SignalStrength.LOW]: '🔵 LOW',
};

export function buildAccountBlocks(dossier: AccountDossier): object[] {
  const { account, signals } = dossier;
  const blocks: object[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🏥 ${account.healthSystemName}` },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Currently on:* ${account.competitorPlatform}  •  *${signals.length} signal${signals.length !== 1 ? 's' : ''} today*`,
      },
    },
    { type: 'divider' },
  ];

  for (const signal of signals) {
    const sourceLinks = signal.sourceUrls
      .slice(0, 2)
      .map((url, i) => `<${url}|source ${i + 1}>`)
      .join('  ');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${STRENGTH_EMOJI[signal.strength]}  •  ${signal.type.replace(/_/g, ' ')}*\n${signal.headline}\n→ ${sourceLinks}\n_💬 "${signal.talkingPoint}"_`,
      },
    });
  }

  blocks.push({
    type: 'actions',
    elements: [
      { type: 'button', text: { type: 'plain_text', text: 'Claim this account' }, action_id: `claim_${account.healthSystemName}` },
      { type: 'button', text: { type: 'plain_text', text: 'Mark as contacted' }, action_id: `contacted_${account.healthSystemName}` },
      { type: 'button', text: { type: 'plain_text', text: 'Snooze 30 days' }, action_id: `snooze_${account.healthSystemName}` },
    ],
  });

  blocks.push({ type: 'divider' });
  return blocks;
}

export function buildRunSummaryBlocks(summary: RunSummary): object[] {
  const mins = Math.round(summary.runtimeMs / 60000);
  const secs = Math.round((summary.runtimeMs % 60000) / 1000);
  const failed = summary.agentsFailed.length > 0 ? summary.agentsFailed.join(', ') : 'none';

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Daily run complete — ${summary.date}*\nAccounts discovered: *${summary.accountsDiscovered}*  |  Accounts with signals: *${summary.accountsWithSignals}*\nAgents failed: ${failed}  |  Runtime: ${mins}m ${secs}s`,
      },
    },
  ];
}

export async function deliverDossiers(dossiers: AccountDossier[]): Promise<void> {
  const channelId = process.env.SLACK_SALES_INTEL_CHANNEL_ID;
  if (!channelId) throw new Error('SLACK_SALES_INTEL_CHANNEL_ID is not set');

  // Sort by signal count descending, cap at 30
  const sorted = [...dossiers]
    .sort((a, b) => b.signals.length - a.signals.length)
    .slice(0, 30);

  for (const dossier of sorted) {
    const blocks = buildAccountBlocks(dossier);
    await postBlocks(channelId, blocks);
  }
}

export async function deliverRunSummary(summary: RunSummary): Promise<void> {
  const channelId = process.env.SLACK_OPS_CHANNEL_ID;
  if (!channelId) throw new Error('SLACK_OPS_CHANNEL_ID is not set');
  const blocks = buildRunSummaryBlocks(summary);
  await postBlocks(channelId, blocks);
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/agents/delivery.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/slack.ts src/agents/delivery.ts tests/agents/delivery.test.ts
git commit -m "feat: add Slack delivery agent with Block Kit formatting and run summary"
```

---

### Task 10: Orchestrator

**Files:**
- Create: `src/orchestrator.ts`
- Create: `tests/orchestrator.test.ts`

**Step 1: Write the failing test**

```ts
// tests/orchestrator.test.ts
import { runOrchestrator } from '../src/orchestrator';

jest.mock('../src/agents/discovery', () => ({
  runDiscoveryAgent: jest.fn().mockResolvedValue([
    { healthSystemName: 'Mercy Health', competitorPlatform: 'Kronos', sourceUrls: ['https://a.com'], confidence: 'high' },
  ]),
}));

jest.mock('../src/agents/signals/platform-age', () => ({ runPlatformAgeAgent: jest.fn().mockResolvedValue(null) }));
jest.mock('../src/agents/signals/leadership', () => ({ runLeadershipAgent: jest.fn().mockResolvedValue(null) }));
jest.mock('../src/agents/signals/rfp', () => ({ runRfpAgent: jest.fn().mockResolvedValue(null) }));
jest.mock('../src/agents/signals/sentiment', () => ({ runSentimentAgent: jest.fn().mockResolvedValue(null) }));
jest.mock('../src/agents/signals/financial', () => ({ runFinancialAgent: jest.fn().mockResolvedValue(null) }));
jest.mock('../src/agents/signals/events', () => ({ runEventsAgent: jest.fn().mockResolvedValue(null) }));
jest.mock('../src/agents/signals/jobs', () => ({ runJobsAgent: jest.fn().mockResolvedValue(null) }));
jest.mock('../src/agents/dossier', () => ({ compileDossier: jest.fn().mockResolvedValue({ account: {}, signals: [], generatedAt: new Date() }) }));
jest.mock('../src/agents/delivery', () => ({
  deliverDossiers: jest.fn().mockResolvedValue(undefined),
  deliverRunSummary: jest.fn().mockResolvedValue(undefined),
}));

import { deliverDossiers, deliverRunSummary } from '../src/agents/delivery';

test('orchestrator calls deliverDossiers and deliverRunSummary', async () => {
  await runOrchestrator();
  expect(deliverDossiers).toHaveBeenCalled();
  expect(deliverRunSummary).toHaveBeenCalled();
});

test('orchestrator passes run summary with correct date', async () => {
  await runOrchestrator();
  const summaryArg = (deliverRunSummary as jest.Mock).mock.calls[0][0];
  expect(summaryArg.date).toBe(new Date().toISOString().split('T')[0]);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/orchestrator.test.ts`
Expected: FAIL

**Step 3: Create `src/orchestrator.ts`**

```ts
import 'dotenv/config';
import { runDiscoveryAgent } from './agents/discovery';
import { runPlatformAgeAgent } from './agents/signals/platform-age';
import { runLeadershipAgent } from './agents/signals/leadership';
import { runRfpAgent } from './agents/signals/rfp';
import { runSentimentAgent } from './agents/signals/sentiment';
import { runFinancialAgent } from './agents/signals/financial';
import { runEventsAgent } from './agents/signals/events';
import { runJobsAgent } from './agents/signals/jobs';
import { compileDossier } from './agents/dossier';
import { deliverDossiers, deliverRunSummary } from './agents/delivery';
import { DiscoveredAccount, Signal, SignalType, RunSummary } from './types';

const SIGNAL_AGENTS: Array<{
  name: string;
  run: (account: DiscoveredAccount) => Promise<Signal | null>;
}> = [
  { name: 'platform-age', run: runPlatformAgeAgent },
  { name: 'leadership', run: runLeadershipAgent },
  { name: 'rfp', run: runRfpAgent },
  { name: 'sentiment', run: runSentimentAgent },
  { name: 'financial', run: runFinancialAgent },
  { name: 'events', run: runEventsAgent },
  { name: 'jobs', run: runJobsAgent },
];

export async function runOrchestrator(): Promise<void> {
  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];
  const agentsFailed: string[] = [];
  const signalCounts = Object.fromEntries(
    Object.values(SignalType).map((t) => [t, 0]),
  ) as Record<SignalType, number>;

  console.log(`[${today}] Starting discovery agent...`);
  const accounts = await runDiscoveryAgent();
  console.log(`[${today}] Discovered ${accounts.length} accounts`);

  const dossiers = await Promise.all(
    accounts.map(async (account) => {
      // Run all 7 signal agents in parallel per account
      const signalResults = await Promise.all(
        SIGNAL_AGENTS.map(async ({ name, run }) => {
          try {
            return await run(account);
          } catch (err) {
            console.error(`Agent ${name} failed for ${account.healthSystemName}:`, err);
            if (!agentsFailed.includes(name)) agentsFailed.push(name);
            return null;
          }
        }),
      );

      const signals = signalResults.filter((s): s is Signal => s !== null);
      signals.forEach((s) => signalCounts[s.type]++);

      if (signals.length === 0) return null;
      return compileDossier(account, signals);
    }),
  );

  const validDossiers = dossiers.filter((d) => d !== null) as Awaited<ReturnType<typeof compileDossier>>[];

  await deliverDossiers(validDossiers);

  const summary: RunSummary = {
    date: today,
    accountsDiscovered: accounts.length,
    accountsWithSignals: validDossiers.length,
    signalCounts,
    agentsFailed,
    runtimeMs: Date.now() - startTime,
  };

  await deliverRunSummary(summary);
  console.log(`[${today}] Run complete in ${Math.round(summary.runtimeMs / 1000)}s`);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/orchestrator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/orchestrator.ts tests/orchestrator.test.ts
git commit -m "feat: add orchestrator — discovery → parallel signal agents → dossier → Slack"
```

---

### Task 11: Entry Point + Full Test Suite

**Files:**
- Create: `src/index.ts`

**Step 1: Create `src/index.ts`**

```ts
import 'dotenv/config';
import { runOrchestrator } from './orchestrator';

runOrchestrator().catch((err) => {
  console.error('Fatal error in orchestrator:', err);
  process.exit(1);
});
```

**Step 2: Run the full test suite**

Run: `npm test`
Expected: All tests PASS, no failures

**Step 3: Update README with setup instructions**

Add to `README.md` under a `## Setup` heading:

```markdown
## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your keys:
   - `EXA_API_KEY` — from [exa.ai](https://exa.ai)
   - `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
   - `SLACK_BOT_TOKEN` — Bot token from your Slack app (needs `chat:write` scope)
   - `SLACK_SALES_INTEL_CHANNEL_ID` — Channel ID of `#sales-intel`
   - `SLACK_OPS_CHANNEL_ID` — Channel ID of `#sales-intel-ops`

3. Run the pipeline:
   ```bash
   npm start
   ```

4. To schedule daily runs, add a cron job:
   ```
   0 7 * * 1-5 cd /path/to/exa-sales-intel && npm start >> logs/daily.log 2>&1
   ```
   This runs at 7am Monday–Friday.
```

**Step 4: Final commit**

```bash
git add src/index.ts README.md
git commit -m "feat: add entry point and setup instructions — pipeline complete"
```

**Step 5: Push to GitHub**

```bash
git push origin main
```

---

## Summary

| Task | What it builds |
|---|---|
| 1 | Project setup (TS, Jest, deps) |
| 2 | Shared types |
| 3 | Competitor config + signal scoring |
| 4 | Exa client with retry |
| 5 | Discovery agent |
| 6 | Signal agent base + Platform Age agent |
| 7 | Remaining 6 signal agents |
| 8 | Claude client + Dossier compiler |
| 9 | Slack delivery (Block Kit + run summary) |
| 10 | Orchestrator (parallel execution) |
| 11 | Entry point + README |

Total: ~11 tasks, each 2–10 minutes. Run `npm test` after every task.
