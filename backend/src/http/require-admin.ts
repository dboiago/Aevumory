/**
 * Fastify Auth Hook: require-admin
 *
 * Gates admin/corrective endpoints behind a short-lived opaque session token
 * (see AdminAuthService). The token travels as a plain HttpOnly cookie; since
 * validity is checked against the server-side session map (not decoded
 * client-side), the cookie does not need to be cryptographically signed.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AdminAuthService } from '../services/admin-auth.service.js';
import { ADMIN_SESSION_TTL_MS } from '../services/admin-auth.service.js';

export const ADMIN_SESSION_COOKIE = 'aev_admin_session';

export const createRequireAdminHook = (adminAuthService: AdminAuthService) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = parseCookies(request.headers.cookie)[ADMIN_SESSION_COOKIE];
    if (!adminAuthService.validateSession(token)) {
      reply.code(401).send({ error: 'Admin authentication required' });
    }
  };
};

export const setAdminSessionCookie = (reply: FastifyReply, token: string, secure: boolean): void => {
  const attributes = [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}`,
    'SameSite=Strict',
  ];
  if (secure) attributes.push('Secure');
  reply.header('set-cookie', attributes.join('; '));
};

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}
