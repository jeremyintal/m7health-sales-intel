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
