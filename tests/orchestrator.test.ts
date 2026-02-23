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
