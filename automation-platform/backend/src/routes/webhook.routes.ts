import { Router } from 'express'
import { asyncHandler } from '../http/async-handler.js'
import { getServiceRoleClient } from '../lib/supabase-clients.js'
import { routeTrigger } from '../flow/triggerRouter.js'

export function createWebhookRouter(): Router {
  const router = Router()

  router.post(
    '/:token',
    asyncHandler(async (req, res) => {
      const token = String(req.params.token)
      const admin = getServiceRoleClient()
      const { data: hook, error } = await admin
        .from('webhook_triggers')
        .select('workspace_id, automation_id, secret')
        .eq('token', token)
        .single()

      if (error || !hook) {
        res.status(404).json({ error: 'Webhook not found' })
        return
      }

      const suppliedSecret = req.headers['x-webhook-secret']
      if (hook.secret && suppliedSecret !== hook.secret) {
        res.status(401).json({ error: 'Invalid webhook secret' })
        return
      }

      await routeTrigger(admin, {
        workspaceId: hook.workspace_id as string,
        type: 'webhook.received',
        payload: {
          automationId: hook.automation_id,
          body: req.body,
          headers: req.headers,
        },
      })

      res.json({ ok: true })
    }),
  )

  return router
}
