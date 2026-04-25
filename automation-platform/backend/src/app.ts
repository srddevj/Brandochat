import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { createCalendlyWebhookRouter } from './routes/calendly-webhook.routes.js'
import { createCalendlyRouter } from './routes/calendly.routes.js'
import { createHealthRouter } from './routes/health.routes.js'
import { createWaRouter } from './routes/wa.routes.js'
import { createWebhookRouter } from './routes/webhook.routes.js'

export function createApp(): Express {
  const app = express()

  app.use(cors({ origin: true, credentials: true }))
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        ;(req as { rawBody?: string }).rawBody = buf.toString('utf8')
      },
    }),
  )

  app.use(createHealthRouter())
  app.use('/webhooks', createWebhookRouter())
  app.use('/integrations/calendly/webhook', createCalendlyWebhookRouter())
  app.use('/wa/:workspaceId', createWaRouter())
  app.use('/integrations/:workspaceId/calendly', createCalendlyRouter())

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: message })
  })

  return app
}
