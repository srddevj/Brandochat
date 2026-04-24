import type { Request } from 'express'

/** Path params for `/wa/:workspaceId/*` routes. */
export type WorkspaceParams = { workspaceId: string }

/** Request after workspace membership has been verified. */
export type AuthenticatedWorkspaceRequest = Request<WorkspaceParams> & {
  accessToken: string
  userId: string
}

export function readWorkspaceId(req: Request): string {
  const raw = (req.params as Partial<WorkspaceParams>).workspaceId
  const id = raw != null ? String(raw).trim() : ''
  if (!id) {
    throw new Error('workspaceId route parameter is required')
  }
  return id
}
