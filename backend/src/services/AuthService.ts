import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { config } from '../config';
import { AppError } from '../errors';
import { getUserWithRolesAndPerms } from '../lib/userHelpers';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends TokenPair {
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
    roles: string[];
    permissions: string[];
    mustChangePassword: boolean;
  };
}

function parseDays(s: string): number {
  const match = s.match(/^(\d+)d$/);
  return match ? parseInt(match[1], 10) : 30;
}

function generateAccessToken(userId: number): string {
  return jwt.sign({ sub: userId, type: 'access' }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

async function generateRefreshToken(userId: number): Promise<string> {
  const raw = crypto.randomBytes(40).toString('hex');
  const prefix = raw.slice(0, 8);
  const hash = await bcrypt.hash(raw, 10);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parseDays(config.jwt.refreshExpiresIn));

  await prisma.refreshToken.create({
    data: { tokenPrefix: prefix, tokenHash: hash, userId, expiresAt },
  });
  return raw;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
    throw new AppError('UNAUTHORIZED', 'Invalid username or password', 401);
  }
  if (!user.isActive) {
    throw new AppError('FORBIDDEN', 'Account is disabled', 403);
  }

  const { roles, permissions } = await getUserWithRolesAndPerms(user.id);
  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      roles,
      permissions,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function refreshTokens(rawToken: string): Promise<TokenPair> {
  const prefix = rawToken.slice(0, 8);

  const record = await prisma.refreshToken.findUnique({
    where: { tokenPrefix: prefix },
  });

  if (
    !record ||
    record.revokedAt ||
    record.expiresAt < new Date() ||
    !(await bcrypt.compare(rawToken, record.tokenHash))
  ) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || !user.isActive) {
    throw new AppError('UNAUTHORIZED', 'User not found or disabled', 401);
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);
  return { accessToken, refreshToken };
}

export async function logout(userId: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  if (!(await bcrypt.compare(oldPassword, user.hashedPassword))) {
    throw new AppError('UNAUTHORIZED', 'Current password is incorrect', 401);
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword: hashed, mustChangePassword: false },
  });

  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: number) {
  const { user, roles, permissions } = await getUserWithRolesAndPerms(userId);
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    roles,
    permissions,
    mustChangePassword: user.mustChangePassword,
  };
}
