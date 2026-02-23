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
