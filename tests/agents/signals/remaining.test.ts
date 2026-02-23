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
