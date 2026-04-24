import type { NextFunction, Request, RequestHandler, Response } from 'express'

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<void>

/**
 * Wraps an async Express handler so rejected promises become `next(err)`
 * and are handled by the centralized error middleware.
 */
export function asyncHandler(fn: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next)
  }
}
