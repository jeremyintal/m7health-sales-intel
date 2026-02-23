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
