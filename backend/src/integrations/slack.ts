import { WebClient } from '@slack/web-api';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';

export function getSlackAuthUrl(state: string): string {
  if (!env.SLACK_CLIENT_ID) {
    throw new Error('SLACK_CLIENT_ID is not configured');
  }

  const scopes = ['chat:write', 'incoming-webhook'];
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: scopes.join(','),
    redirect_uri: env.SLACK_REDIRECT_URI,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(code: string, userId: string) {
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    throw new Error('Slack OAuth client credentials are missing');
  }

  const client = new WebClient();
  const response = await client.oauth.v2.access({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    code,
    redirect_uri: env.SLACK_REDIRECT_URI,
  });

  if (!response.ok || !response.access_token) {
    throw new Error(`Slack OAuth failed: ${response.error || 'Unknown error'}`);
  }

  const accessToken = response.access_token as string;
  const teamId = (response.team as any)?.id || 'unknown';
  const teamName = (response.team as any)?.name || 'Slack Workspace';
  const channelId = (response.incoming_webhook as any)?.channel_id || null;
  const channelName = (response.incoming_webhook as any)?.channel || null;
  const webhookUrl = (response.incoming_webhook as any)?.url || null;

  // Persist connection in DB for this user
  const connection = await prisma.slackConnection.upsert({
    where: { userId },
    update: {
      accessToken,
      teamId,
      teamName,
      channelId,
      channelName,
      webhookUrl,
      updatedAt: new Date(),
    },
    create: {
      userId,
      accessToken,
      teamId,
      teamName,
      channelId,
      channelName,
      webhookUrl,
    },
  });

  return connection;
}

export async function disconnectSlack(userId: string) {
  return prisma.slackConnection.deleteMany({
    where: { userId },
  });
}

export async function getSlackStatus(userId: string) {
  const connection = await prisma.slackConnection.findUnique({
    where: { userId },
    select: {
      teamName: true,
      channelName: true,
      createdAt: true,
    },
  });

  return {
    connected: !!connection,
    connection,
  };
}

export interface RateLimitSlackAlert {
  userId: string;
  senderEmail: string;
  hourlyLimit: number;
  currentWindow: string;
  queuedForNextWindow: number;
}

export async function sendSlackRateLimitAlert(data: RateLimitSlackAlert): Promise<boolean> {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId: data.userId },
    });

    if (!connection) {
      console.log(`[Slack] No Slack connection for user ${data.userId}. Skipping rate limit notification.`);
      return false;
    }

    const client = new WebClient(connection.accessToken);

    const messageText = `⚠️ Email rate limit reached for ${data.senderEmail}`;
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Email Rate Limit Reached',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Sender:*\n\`${data.senderEmail}\``,
          },
          {
            type: 'mrkdwn',
            text: `*Hourly Limit:*\n${data.hourlyLimit} emails/hour`,
          },
          {
            type: 'mrkdwn',
            text: `*Current Window:*\n${data.currentWindow}`,
          },
          {
            type: 'mrkdwn',
            text: `*Rescheduled for Next Window:*\n${data.queuedForNextWindow} emails`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Jobs have been automatically delayed to the next window. No emails were dropped or failed.',
          },
        ],
      },
    ];

    if (connection.webhookUrl) {
      // Use incoming webhook if available
      const response = await fetch(connection.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText, blocks }),
      });
      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }
    } else if (connection.channelId) {
      await client.chat.postMessage({
        channel: connection.channelId,
        text: messageText,
        blocks,
      });
    } else {
      console.warn('[Slack] Neither webhookUrl nor channelId available on Slack connection.');
      return false;
    }

    console.log(`[Slack] Rate limit alert sent successfully to ${connection.teamName}`);
    return true;
  } catch (error: any) {
    console.error(`[Slack Error] Could not send rate limit notification: ${error.message}`);
    return false;
  }
}
