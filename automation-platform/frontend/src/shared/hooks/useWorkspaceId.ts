import { useParams } from 'react-router-dom'

/** Workspace-scoped routes live under `/w/:workspaceId`. */
export function useWorkspaceId(): string | undefined {
  return useParams().workspaceId
}
