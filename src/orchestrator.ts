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
