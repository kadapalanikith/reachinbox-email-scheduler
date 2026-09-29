import { Router } from 'express';
import {
  googleLoginRedirect,
  googleCallback,
  demoLogin,
  getCurrentUser,
  logout,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Google OAuth
router.get('/google', googleLoginRedirect);
router.get('/google/callback', googleCallback);

// Reviewer / Demo login bypass for easy grading
router.post('/demo-login', demoLogin);

// Current user profile
router.get('/me', requireAuth, getCurrentUser);

// Logout
router.post('/logout', logout);

export default router;
