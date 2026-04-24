import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { createHealthRouter } from './routes/health.routes.js'
import { createWaRouter } from './routes/wa.routes.js'

export function createApp(): Express {
  const app = express()

  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json())

  app.use(createHealthRouter())
  app.use('/wa/:workspaceId', createWaRouter())

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: message })
  })

  return app
}
