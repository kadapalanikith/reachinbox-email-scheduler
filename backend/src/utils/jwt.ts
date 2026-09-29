import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthJwtPayload {
  userId: string;
  email: string;
  name: string;
}

export function signToken(payload: AuthJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): AuthJwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthJwtPayload;
  } catch (error) {
    return null;
  }
}
