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
  await client.chat.postMessage({ channel: channelId, blocks: blocks as any, text: '' });
  // Slack rate limit: 1 message per second
  await new Promise((res) => setTimeout(res, 1000));
}
