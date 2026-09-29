import { Request, Response } from 'express';
import {
  getSlackAuthUrl,
  exchangeSlackCode,
  disconnectSlack,
  getSlackStatus,
  sendSlackRateLimitAlert,
} from '../integrations/slack.js';
import { env } from '../config/env.js';

export async function connectSlackRedirect(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      return;
    }

    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
    const authUrl = getSlackAuthUrl(state);
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('[Slack Connect Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: `Slack OAuth initiation failed: ${error.message}` },
    });
  }
}

export async function slackOAuthCallback(req: Request, res: Response) {
  try {
    const { code, state, error: slackError } = req.query;

    if (slackError) {
      res.redirect(`${env.CLIENT_URL}/dashboard?slack_error=${encodeURIComponent(slackError as string)}`);
      return;
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      res.redirect(`${env.CLIENT_URL}/dashboard?slack_error=invalid_callback_params`);
      return;
    }

    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    const userId = decodedState.userId;

    if (!userId) {
      res.redirect(`${env.CLIENT_URL}/dashboard?slack_error=missing_user_state`);
      return;
    }

    await exchangeSlackCode(code, userId);

    res.redirect(`${env.CLIENT_URL}/dashboard?slack=connected`);
  } catch (error: any) {
    console.error('[Slack Callback Error]:', error.message);
    res.redirect(`${env.CLIENT_URL}/dashboard?slack_error=${encodeURIComponent(error.message)}`);
  }
}

export async function getStatus(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const status = await getSlackStatus(userId);
    res.status(200).json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}

export async function disconnect(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    await disconnectSlack(userId);
    res.status(200).json({ success: true, message: 'Slack disconnected successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}

export async function testSlackNotification(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const success = await sendSlackRateLimitAlert({
      userId,
      senderEmail: 'test-sender@reachinbox.ai',
      hourlyLimit: 100,
      currentWindow: 'Live Verification Window',
      queuedForNextWindow: 15,
    });

    if (!success) {
      res.status(400).json({
        success: false,
        error: { message: 'Slack notification could not be sent. Ensure Slack is connected.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Test Slack notification sent successfully!',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}
