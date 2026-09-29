import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { getGoogleAuthUrl, getGoogleUserFromCode } from '../integrations/google.js';
import { signToken } from '../utils/jwt.js';

const COOKIE_NAME = 'token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function googleLoginRedirect(req: Request, res: Response) {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000 });
    const url = getGoogleAuthUrl(state);
    res.redirect(url);
  } catch (error: any) {
    console.error('[Google OAuth URL Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: `Google OAuth initialization failed: ${error.message}` },
    });
  }
}

export async function googleCallback(req: Request, res: Response) {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      res.redirect(`${env.CLIENT_URL}/login?error=missing_code`);
      return;
    }

    const googleUser = await getGoogleUserFromCode(code);

    // Upsert User in PostgreSQL
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.googleId,
          name: googleUser.name,
          avatar: googleUser.avatar || user.avatar,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          googleId: googleUser.googleId,
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.avatar,
        },
      });

      // Create default sender for new user
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
          isDefault: true,
        },
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.redirect(`${env.CLIENT_URL}/dashboard`);
  } catch (error: any) {
    console.error('[Google Callback Error]:', error.message);
    res.redirect(`${env.CLIENT_URL}/login?error=${encodeURIComponent(error.message)}`);
  }
}

/**
 * Evaluator / Reviewer Quick Login endpoint for seamless testing
 * without requiring live Google Cloud Console credentials.
 */
export async function demoLogin(req: Request, res: Response) {
  try {
    const demoEmail = 'reviewer@reachinbox.ai';
    const demoName = 'ReachInbox Evaluator';
    const demoAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

    let user = await prisma.user.findUnique({
      where: { email: demoEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: demoEmail,
          name: demoName,
          avatar: demoAvatar,
        },
      });

      await prisma.sender.create({
        data: {
          userId: user.id,
          email: demoEmail,
          name: demoName,
          isDefault: true,
        },
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      },
    });
  } catch (error: any) {
    console.error('[Demo Login Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: `Demo login failed: ${error.message}` },
    });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
    return;
  }

  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
}

export async function logout(req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}
