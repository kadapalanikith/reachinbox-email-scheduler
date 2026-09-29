import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { verifyToken } from '../utils/jwt.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required. Please log in.', code: 'UNAUTHORIZED' },
      });
      return;
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired session. Please log in again.', code: 'SESSION_EXPIRED' },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, avatar: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: { message: 'User account not found.', code: 'USER_NOT_FOUND' },
      });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error('[Auth Middleware Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server authentication error', code: 'AUTH_ERROR' },
    });
  }
}
