/**
 * Fastify Auth Hook: require-admin
 *
 * Middleware hook for requiring admin PIN verification on protected endpoints.
 * Currently a placeholder for Phase 1; Phase 0 does not gate endpoints.
 *
 * Usage (in server.ts):
 *   fastify.register(requireAdminHook);
 *   fastify.post('/admin/tasks', { onRequest: [fastify.requireAdmin] }, handler);
 */

import type { FastifyInstance } from 'fastify';

export const createRequireAdminHook = () => {
  return async (request: any, reply: any) => {
    // Phase 0: This is a placeholder structure.
    // Phase 1 will implement:
    // - Extract admin_pin from request (header, body, or signed cookie)
    // - Hash and verify against stored admin_pin_hash
    // - Store verified session token in signed cookie
    // - Redirect to PIN setup if admin_pin_hash is NULL

    // For now, do nothing - endpoints are not gated
  };
};
