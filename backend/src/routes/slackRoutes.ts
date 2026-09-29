import { Router } from 'express';
import {
  connectSlackRedirect,
  slackOAuthCallback,
  getStatus,
  disconnect,
  testSlackNotification,
} from '../controllers/slackController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Slack OAuth Initiation & Callback
router.get('/connect', requireAuth, connectSlackRedirect);
router.get('/callback', slackOAuthCallback);

// Slack Status & Disconnect (Auth required)
router.get('/status', requireAuth, getStatus);
router.post('/disconnect', requireAuth, disconnect);
router.post('/test', requireAuth, testSlackNotification);

export default router;
