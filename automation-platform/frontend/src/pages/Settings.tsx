import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useWorkspaceId } from '../shared/hooks/useWorkspaceId'
import { Button } from '../shared/ui/button'
import { FormError } from '../shared/ui/form-error'
import { FormField } from '../shared/ui/form-field'
import { PageHeader } from '../shared/ui/page-header'
import { TextInput } from '../shared/ui/text-input'

type SettingsSection = 'profile' | 'team' | 'labels' | 'contacts' | 'integrations'

type WorkspaceProfile = {
  id: string
  name: string
  slug: string | null
  description: string | null
  logo_url: string | null
  timezone: string | null
}

type MemberRow = {
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

type InvitationRow = {
  id: string
  email: string
  role: 'owner' | 'admin' | 'member'
  token: string
  status: 'pending' | 'accepted' | 'cancelled' | 'expired'
  expires_at: string
  created_at: string
}

type LabelRow = {
  id: string
  name: string
  color: string
  description: string | null
}

type ContactFieldType = 'string' | 'date' | 'datetime' | 'url' | 'integer'
type ContactFieldRow = {
  id: string
  key: string
  label: string
  type: ContactFieldType
  required: boolean
}

const sections: Array<{ id: SettingsSection; label: string; description: string }> = [
  { id: 'profile', label: 'Profile', description: 'Workspace name, identity, and defaults.' },
  { id: 'team', label: 'Team', description: 'Members, invites, and role planning.' },
  { id: 'labels', label: 'Labels', description: 'Conversation labels for inbox organization.' },
  { id: 'contacts', label: 'Contacts', description: 'Define workspace-wide custom fields for all contacts.' },
  { id: 'integrations', label: 'Integrations', description: 'Workspace channels and connected tools.' },
]

const contactFieldTypeOptions: ContactFieldType[] = ['string', 'date', 'datetime', 'url', 'integer']

const roleOptions = ['owner', 'admin', 'member'] as const

function toFieldKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export default function Settings() {
  const workspaceId = useWorkspaceId()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedSection = (searchParams.get('section') as SettingsSection | null) ?? 'profile'
  const [workspace, setWorkspace] = useState<WorkspaceProfile | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [invitations, setInvitations] = useState<InvitationRow[]>([])
  const [labels, setLabels] = useState<LabelRow[]>([])
  const [contactFields, setContactFields] = useState<ContactFieldRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState({ name: '', slug: '', description: '', logoUrl: '', timezone: 'UTC' })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<(typeof roleOptions)[number]>('member')
  const [labelName, setLabelName] = useState('')
  const [labelColor, setLabelColor] = useState('#10b981')
  const [labelDescription, setLabelDescription] = useState('')
  const [fieldKey, setFieldKey] = useState('')
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState<ContactFieldType>('string')
  const [fieldRequired, setFieldRequired] = useState(false)
  const [isFieldKeyManual, setIsFieldKeyManual] = useState(false)

  const activeSection = sections.some((section) => section.id === selectedSection) ? selectedSection : 'profile'

  const currentMember = useMemo(() => members.find((member) => member.user_id === user?.id) ?? null, [members, user?.id])
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  const loadSettings = useCallback(async () => {
    if (!workspaceId) return
    setError(null)
    const [workspaceResult, membersResult, invitationsResult, labelsResult, contactFieldsResult] = await Promise.all([
      supabase
        .from('workspaces')
        .select('id, name, slug, description, logo_url, timezone')
        .eq('id', workspaceId)
        .maybeSingle(),
      supabase.from('workspace_members').select('workspace_id, user_id, role, created_at').eq('workspace_id', workspaceId).order('created_at'),
      supabase
        .from('workspace_invitations')
        .select('id, email, role, token, status, expires_at, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      supabase.from('workspace_labels').select('id, name, color, description').eq('workspace_id', workspaceId).order('name'),
      supabase.from('workspace_contact_fields').select('id, key, label, type, required').eq('workspace_id', workspaceId).order('created_at'),
    ])

    if (workspaceResult.error) setError(workspaceResult.error.message)
    const nextWorkspace = (workspaceResult.data as WorkspaceProfile | null) ?? null
    setWorkspace(nextWorkspace)
    setProfileForm({
      name: nextWorkspace?.name ?? '',
      slug: nextWorkspace?.slug ?? '',
      description: nextWorkspace?.description ?? '',
      logoUrl: nextWorkspace?.logo_url ?? '',
      timezone: nextWorkspace?.timezone ?? 'UTC',
    })
    if (membersResult.error) setError(membersResult.error.message)
    else setMembers((membersResult.data as MemberRow[]) ?? [])
    if (invitationsResult.error) setError(invitationsResult.error.message)
    else setInvitations((invitationsResult.data as InvitationRow[]) ?? [])
    if (labelsResult.error) setError(labelsResult.error.message)
    else setLabels((labelsResult.data as LabelRow[]) ?? [])
    if (contactFieldsResult.error) setError(contactFieldsResult.error.message)
    else setContactFields((contactFieldsResult.data as ContactFieldRow[]) ?? [])
  }, [workspaceId])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  function selectSection(section: SettingsSection) {
    setSearchParams({ section })
  }

  function handleFieldLabelChange(value: string) {
    setFieldLabel(value)
    if (!isFieldKeyManual) setFieldKey(toFieldKey(value))
  }

  function handleFieldKeyChange(value: string) {
    setIsFieldKeyManual(true)
    setFieldKey(toFieldKey(value))
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!workspaceId) return
    setError(null)
    setNotice(null)
    const { error: saveErr } = await supabase
      .from('workspaces')
      .update({
        name: profileForm.name.trim(),
        slug: profileForm.slug.trim() || null,
        description: profileForm.description.trim() || null,
        logo_url: profileForm.logoUrl.trim() || null,
        timezone: profileForm.timezone.trim() || 'UTC',
      })
      .eq('id', workspaceId)
    if (saveErr) {
      setError(saveErr.message)
      return
    }
    setNotice('Workspace profile saved.')
    await loadSettings()
  }

  async function createInvitation(event: React.FormEvent) {
    event.preventDefault()
    if (!workspaceId) return
    setError(null)
    setNotice(null)
    const { error: inviteErr } = await supabase.from('workspace_invitations').insert({
      workspace_id: workspaceId,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      invited_by: user?.id ?? null,
    })
    if (inviteErr) {
      setError(inviteErr.message)
      return
    }
    setInviteEmail('')
    setInviteRole('member')
    setNotice('Invitation created. Copy the token/link from the pending invitation row.')
    await loadSettings()
  }

  async function cancelInvitation(invitationId: string) {
    const { error: cancelErr } = await supabase.from('workspace_invitations').update({ status: 'cancelled' }).eq('id', invitationId)
    if (cancelErr) {
      setError(cancelErr.message)
      return
    }
    await loadSettings()
  }

  async function updateMemberRole(member: MemberRow, role: MemberRow['role']) {
    const { error: roleErr } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', member.workspace_id)
      .eq('user_id', member.user_id)
    if (roleErr) {
      setError(roleErr.message)
      return
    }
    await loadSettings()
  }

  async function createLabel(event: React.FormEvent) {
    event.preventDefault()
    if (!workspaceId) return
    setError(null)
    const { error: labelErr } = await supabase.from('workspace_labels').insert({
      workspace_id: workspaceId,
      name: labelName.trim(),
      color: labelColor,
      description: labelDescription.trim() || null,
    })
    if (labelErr) {
      setError(labelErr.message)
      return
    }
    setLabelName('')
    setLabelColor('#10b981')
    setLabelDescription('')
    await loadSettings()
  }

  async function updateLabel(label: LabelRow, patch: Partial<LabelRow>) {
    const { error: updateErr } = await supabase.from('workspace_labels').update(patch).eq('id', label.id)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    await loadSettings()
  }

  async function deleteLabel(labelId: string) {
    const { error: deleteErr } = await supabase.from('workspace_labels').delete().eq('id', labelId)
    if (deleteErr) {
      setError(deleteErr.message)
      return
    }
    await loadSettings()
  }

  async function createContactField(event: React.FormEvent) {
    event.preventDefault()
    if (!workspaceId) return
    setError(null)
    const key = toFieldKey(fieldKey)
    const label = fieldLabel.trim()
    if (!key || !label) {
      setError('Field key and label are required.')
      return
    }
    const { error: createErr } = await supabase.from('workspace_contact_fields').insert({
      workspace_id: workspaceId,
      key,
      label,
      type: fieldType,
      required: fieldRequired,
    })
    if (createErr) {
      setError(createErr.message)
      return
    }
    setFieldKey('')
    setFieldLabel('')
    setFieldType('string')
    setFieldRequired(false)
    setIsFieldKeyManual(false)
    await loadSettings()
  }

  async function updateContactField(field: ContactFieldRow, patch: Partial<ContactFieldRow>) {
    const { error: updateErr } = await supabase.from('workspace_contact_fields').update(patch).eq('id', field.id)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    await loadSettings()
  }

  async function deleteContactField(fieldId: string) {
    const { error: deleteErr } = await supabase.from('workspace_contact_fields').delete().eq('id', fieldId)
    if (deleteErr) {
      setError(deleteErr.message)
      return
    }
    await loadSettings()
  }

  if (!workspaceId) return <p className="text-slate-500">Missing workspace.</p>

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="mb-3 rounded-xl bg-slate-950/50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Workspace settings</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{workspace?.name ?? 'Workspace'}</p>
        </div>
        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => selectSection(section.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                activeSection === section.id ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="font-medium">{section.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{section.description}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="space-y-6">
        <FormError message={error} />
        {notice ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p> : null}
        {activeSection === 'profile' ? (
          <ProfileSection canManage={canManage} form={profileForm} onChange={setProfileForm} onSubmit={saveProfile} />
        ) : null}
        {activeSection === 'team' ? (
          <TeamSection
            canManage={canManage}
            members={members}
            invitations={invitations}
            inviteEmail={inviteEmail}
            inviteRole={inviteRole}
            onInviteEmail={setInviteEmail}
            onInviteRole={setInviteRole}
            onCreateInvitation={createInvitation}
            onCancelInvitation={cancelInvitation}
            onRoleChange={updateMemberRole}
          />
        ) : null}
        {activeSection === 'labels' ? (
          <LabelsSection
            labels={labels}
            name={labelName}
            color={labelColor}
            description={labelDescription}
            onName={setLabelName}
            onColor={setLabelColor}
            onDescription={setLabelDescription}
            onCreate={createLabel}
            onUpdate={updateLabel}
            onDelete={deleteLabel}
          />
        ) : null}
        {activeSection === 'contacts' ? (
          <ContactsSettingsSection
            fields={contactFields}
            fieldKey={fieldKey}
            fieldLabel={fieldLabel}
            fieldType={fieldType}
            fieldRequired={fieldRequired}
            onFieldKey={handleFieldKeyChange}
            onFieldLabel={handleFieldLabelChange}
            onAutoGenerateKey={() => {
              setIsFieldKeyManual(false)
              setFieldKey(toFieldKey(fieldLabel))
            }}
            onFieldType={setFieldType}
            onFieldRequired={setFieldRequired}
            onCreate={createContactField}
            onUpdate={updateContactField}
            onDelete={deleteContactField}
          />
        ) : null}
        {activeSection === 'integrations' ? <IntegrationsSection workspaceId={workspaceId} /> : null}
      </div>
    </div>
  )
}

function ProfileSection({
  canManage,
  form,
  onChange,
  onSubmit,
}: {
  canManage: boolean
  form: { name: string; slug: string; description: string; logoUrl: string; timezone: string }
  onChange: (form: { name: string; slug: string; description: string; logoUrl: string; timezone: string }) => void
  onSubmit: (event: React.FormEvent) => void
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <PageHeader title="Workspace profile" description="Manage the identity and defaults for this workspace." />
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Workspace name">
            <TextInput required disabled={!canManage} value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />
          </FormField>
          <FormField label="Slug">
            <TextInput disabled={!canManage} value={form.slug} onChange={(event) => onChange({ ...form, slug: event.target.value })} />
          </FormField>
          <FormField label="Logo URL">
            <TextInput disabled={!canManage} value={form.logoUrl} onChange={(event) => onChange({ ...form, logoUrl: event.target.value })} />
          </FormField>
          <FormField label="Timezone">
            <TextInput disabled={!canManage} value={form.timezone} onChange={(event) => onChange({ ...form, timezone: event.target.value })} />
          </FormField>
        </div>
        <FormField label="Description">
          <textarea
            disabled={!canManage}
            value={form.description}
            onChange={(event) => onChange({ ...form, description: event.target.value })}
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500/50 focus:ring-2 disabled:opacity-60"
          />
        </FormField>
        <Button type="submit" disabled={!canManage}>
          Save workspace
        </Button>
        {!canManage ? <p className="text-sm text-slate-500">Only owners and admins can update workspace profile settings.</p> : null}
      </form>
    </section>
  )
}

function TeamSection(props: {
  canManage: boolean
  members: MemberRow[]
  invitations: InvitationRow[]
  inviteEmail: string
  inviteRole: InvitationRow['role']
  onInviteEmail: (value: string) => void
  onInviteRole: (value: InvitationRow['role']) => void
  onCreateInvitation: (event: React.FormEvent) => void
  onCancelInvitation: (id: string) => void
  onRoleChange: (member: MemberRow, role: MemberRow['role']) => void
}) {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <PageHeader title="Team" description="Invite teammates, review members, and plan role permissions." />
      <form onSubmit={props.onCreateInvitation} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-[1fr_160px_auto] md:items-end">
        <FormField label="Invite by email">
          <TextInput
            required
            type="email"
            disabled={!props.canManage}
            value={props.inviteEmail}
            onChange={(event) => props.onInviteEmail(event.target.value)}
            placeholder="teammate@example.com"
          />
        </FormField>
        <FormField label="Role">
          <select
            disabled={!props.canManage}
            value={props.inviteRole}
            onChange={(event) => props.onInviteRole(event.target.value as InvitationRow['role'])}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </FormField>
        <Button type="submit" disabled={!props.canManage}>
          Invite
        </Button>
      </form>

      <div className="rounded-xl border border-slate-800">
        <div className="border-b border-slate-800 px-4 py-3">
          <h2 className="font-medium text-white">Members</h2>
        </div>
        {props.members.map((member) => (
          <div key={member.user_id} className="flex flex-col gap-2 border-b border-slate-800 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-sm text-slate-300">{member.user_id}</p>
              <p className="text-xs text-slate-500">Joined {new Date(member.created_at).toLocaleDateString()}</p>
            </div>
            <select
              disabled={!props.canManage || member.role === 'owner'}
              value={member.role}
              onChange={(event) => props.onRoleChange(member, event.target.value as MemberRow['role'])}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800">
        <div className="border-b border-slate-800 px-4 py-3">
          <h2 className="font-medium text-white">Pending invitations</h2>
          <p className="mt-1 text-xs text-slate-500">Email delivery can be connected later. For now, copy the token or invite row.</p>
        </div>
        {props.invitations.length === 0 ? <p className="px-4 py-4 text-sm text-slate-500">No invitations yet.</p> : null}
        {props.invitations.map((invitation) => (
          <div key={invitation.id} className="flex flex-col gap-2 border-b border-slate-800 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-white">{invitation.email}</p>
              <p className="font-mono text-xs text-slate-500">
                {invitation.role} · {invitation.status} · token {invitation.token}
              </p>
            </div>
            {invitation.status === 'pending' ? (
              <Button type="button" variant="ghost" className="py-1.5 text-xs" disabled={!props.canManage} onClick={() => props.onCancelInvitation(invitation.id)}>
                Cancel
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <h2 className="font-medium text-white">Role permissions later</h2>
        <p className="mt-1 text-sm text-slate-400">
          Granular permissions such as viewing automations, deleting chats, and managing labels are reserved for the next role matrix.
        </p>
      </section>
    </section>
  )
}

function LabelsSection(props: {
  labels: LabelRow[]
  name: string
  color: string
  description: string
  onName: (value: string) => void
  onColor: (value: string) => void
  onDescription: (value: string) => void
  onCreate: (event: React.FormEvent) => void
  onUpdate: (label: LabelRow, patch: Partial<LabelRow>) => void
  onDelete: (labelId: string) => void
}) {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <PageHeader title="Labels" description="Create labels that can be attached to conversations in the inbox." />
      <form onSubmit={props.onCreate} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-[1fr_140px_1fr_auto] md:items-end">
        <FormField label="Label name">
          <TextInput required value={props.name} onChange={(event) => props.onName(event.target.value)} placeholder="VIP" />
        </FormField>
        <FormField label="Color">
          <TextInput type="color" value={props.color} onChange={(event) => props.onColor(event.target.value)} />
        </FormField>
        <FormField label="Description">
          <TextInput value={props.description} onChange={(event) => props.onDescription(event.target.value)} placeholder="Optional" />
        </FormField>
        <Button type="submit">Create</Button>
      </form>
      <div className="grid gap-3">
        {props.labels.length === 0 ? <p className="text-sm text-slate-500">No labels yet.</p> : null}
        {props.labels.map((label) => (
          <div key={label.id} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-[1fr_120px_1fr_auto] md:items-center">
            <TextInput value={label.name} onChange={(event) => props.onUpdate(label, { name: event.target.value })} />
            <TextInput type="color" value={label.color} onChange={(event) => props.onUpdate(label, { color: event.target.value })} />
            <TextInput value={label.description ?? ''} onChange={(event) => props.onUpdate(label, { description: event.target.value || null })} />
            <Button type="button" variant="ghost" onClick={() => props.onDelete(label.id)}>
              Delete
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}

function ContactsSettingsSection(props: {
  fields: ContactFieldRow[]
  fieldKey: string
  fieldLabel: string
  fieldType: ContactFieldType
  fieldRequired: boolean
  onFieldKey: (value: string) => void
  onFieldLabel: (value: string) => void
  onAutoGenerateKey: () => void
  onFieldType: (value: ContactFieldType) => void
  onFieldRequired: (value: boolean) => void
  onCreate: (event: React.FormEvent) => void
  onUpdate: (field: ContactFieldRow, patch: Partial<ContactFieldRow>) => void
  onDelete: (fieldId: string) => void
}) {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <PageHeader title="Contact custom fields" description="Create shared custom fields that appear on all contacts and placeholders." />
      <form onSubmit={props.onCreate} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-[1fr_180px_140px_auto_auto_auto] md:items-end">
        <FormField label="Label">
          <TextInput required value={props.fieldLabel} onChange={(event) => props.onFieldLabel(event.target.value)} placeholder="Meeting datetime" />
        </FormField>
        <FormField label="Field key">
          <TextInput required value={props.fieldKey} onChange={(event) => props.onFieldKey(event.target.value)} placeholder="meeting_datetime" />
        </FormField>
        <FormField label="Type">
          <select value={props.fieldType} onChange={(event) => props.onFieldType(event.target.value as ContactFieldType)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
            {contactFieldTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FormField>
        <Button type="button" variant="secondary" onClick={props.onAutoGenerateKey}>
          Regenerate key
        </Button>
        <label className="mb-2 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={props.fieldRequired} onChange={(event) => props.onFieldRequired(event.target.checked)} />
          Required
        </label>
        <Button type="submit">Add field</Button>
      </form>
      <div className="space-y-3">
        {props.fields.length === 0 ? <p className="text-sm text-slate-500">No custom fields yet.</p> : null}
        {props.fields.map((field) => (
          <div key={field.id} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-[140px_1fr_140px_auto_auto] md:items-center">
            <TextInput value={field.key} onChange={(event) => props.onUpdate(field, { key: toFieldKey(event.target.value) })} />
            <TextInput value={field.label} onChange={(event) => props.onUpdate(field, { label: event.target.value })} />
            <select value={field.type} onChange={(event) => props.onUpdate(field, { type: event.target.value as ContactFieldType })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
              {contactFieldTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={field.required} onChange={(event) => props.onUpdate(field, { required: event.target.checked })} />
              Required
            </label>
            <Button type="button" variant="ghost" onClick={() => props.onDelete(field.id)}>
              Delete
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}

function IntegrationsSection({ workspaceId }: { workspaceId: string }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <PageHeader title="Integrations" description="Workspace-level channels and connected services." />
      <div className="grid gap-3 lg:grid-cols-2">
        <IntegrationCard title="WhatsApp numbers" description="Connect Baileys WhatsApp Web sessions." href={`/w/${workspaceId}/whatsapp`} />
        <IntegrationCard title="OpenAI" description="Used by AI reply routing and automation skills. Configure the backend environment key." />
        <IntegrationCard title="Supabase" description="Auth, database, realtime, and row-level security for this workspace." />
        <IntegrationCard title="Webhooks" description="Automation webhook triggers and future outbound event subscriptions." href={`/w/${workspaceId}/automations`} />
      </div>
    </section>
  )
}

function IntegrationCard({ title, description, href }: { title: string; description: string; href?: string }) {
  const content = (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-emerald-500/50">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
      <p className="mt-3 text-sm text-emerald-300">{href ? 'Manage' : 'Configured on server'}</p>
    </div>
  )
  return href ? <Link to={href}>{content}</Link> : content
}
