import { Router } from 'express'
import { asyncHandler } from '../http/async-handler.js'
import { requireWorkspaceMember } from '../middleware/workspace-auth.middleware.js'
import { readWorkspaceId } from '../types/express.js'
import {
  disconnectWorkspace,
  ensureWorkspaceSocket,
  getQr,
  getSession,
} from '../wa/baileysSession.js'

export function createWaRouter(): Router {
  const router = Router({ mergeParams: true })
  router.use(requireWorkspaceMember)

  router.post(
    '/connect',
    asyncHandler(async (req, res) => {
      const workspaceId = readWorkspaceId(req)
      await ensureWorkspaceSocket(workspaceId)
      res.json({ ok: true })
    }),
  )

  router.get(
    '/status',
    asyncHandler(async (req, res) => {
      const workspaceId = readWorkspaceId(req)
      const session = getSession(workspaceId)
      const qr = getQr(workspaceId)
      res.json({
        pairing_status: session?.pairing_status ?? 'disconnected',
        qr,
        phone_label: session?.phoneLabel ?? null,
        last_error: session?.lastError ?? null,
      })
    }),
  )

  router.post(
    '/disconnect',
    asyncHandler(async (req, res) => {
      const workspaceId = readWorkspaceId(req)
      await disconnectWorkspace(workspaceId)
      res.json({ ok: true })
    }),
  )

  return router
}
