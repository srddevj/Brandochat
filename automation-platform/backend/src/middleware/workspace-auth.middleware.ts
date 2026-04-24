import type { NextFunction, Request, Response } from 'express'
import { createUserClient } from '../lib/supabase-clients.js'
import type { AuthenticatedWorkspaceRequest, WorkspaceParams } from '../types/express.js'

/**
 * Requires `Authorization: Bearer <Supabase access token>` and verifies
 * the user is a member of `workspaceId` (RLS on `workspace_members`).
 */
export async function requireWorkspaceMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization bearer token' })
    return
  }

  const token = header.slice('Bearer '.length).trim()
  const supabase = createUserClient(token)
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    res.status(401).json({ error: 'Invalid or expired session' })
    return
  }

  const workspaceId = (req.params as Partial<WorkspaceParams>).workspaceId
  if (!workspaceId) {
    res.status(400).json({ error: 'workspaceId is required' })
    return
  }

  const { data: membership, error: memberError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', authData.user.id)
    .maybeSingle()

  if (memberError || !membership) {
    res.status(403).json({ error: 'You are not a member of this workspace' })
    return
  }

  const authed = req as AuthenticatedWorkspaceRequest
  authed.accessToken = token
  authed.userId = authData.user.id
  next()
}
