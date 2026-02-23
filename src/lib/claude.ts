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
