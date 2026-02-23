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
