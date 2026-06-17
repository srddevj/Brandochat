# Graph Report - .  (2026-06-18)

## Corpus Check
- 121 files · ~59,422 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 684 nodes · 1163 edges · 50 communities (39 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Automation Flow Engine|Automation Flow Engine]]
- [[_COMMUNITY_WhatsApp Session & Backend Server|WhatsApp Session & Backend Server]]
- [[_COMMUNITY_Automation Builder UI|Automation Builder UI]]
- [[_COMMUNITY_Calendly Integration Backend|Calendly Integration Backend]]
- [[_COMMUNITY_Contacts & Hooks|Contacts & Hooks]]
- [[_COMMUNITY_React App Shell & Routing|React App Shell & Routing]]
- [[_COMMUNITY_API Library & Settings Pages|API Library & Settings Pages]]
- [[_COMMUNITY_Frontend Package Dependencies|Frontend Package Dependencies]]
- [[_COMMUNITY_Backend Package Dependencies|Backend Package Dependencies]]
- [[_COMMUNITY_Calendly Mapper & Webhook Routes|Calendly Mapper & Webhook Routes]]
- [[_COMMUNITY_Initial Database Schema|Initial Database Schema]]
- [[_COMMUNITY_Chats Page|Chats Page]]
- [[_COMMUNITY_Frontend TypeScript Config (App)|Frontend TypeScript Config (App)]]
- [[_COMMUNITY_API Client Library|API Client Library]]
- [[_COMMUNITY_WhatsApp History Sync|WhatsApp History Sync]]
- [[_COMMUNITY_Docker & Supabase Deployment|Docker & Supabase Deployment]]
- [[_COMMUNITY_Frontend TypeScript Config (Node)|Frontend TypeScript Config (Node)]]
- [[_COMMUNITY_Graphify Skill & References|Graphify Skill & References]]
- [[_COMMUNITY_Backend TypeScript Config|Backend TypeScript Config]]
- [[_COMMUNITY_Supabase Client Config|Supabase Client Config]]
- [[_COMMUNITY_Pages & Integrations|Pages & Integrations]]
- [[_COMMUNITY_Automation & Triggers|Automation & Triggers]]
- [[_COMMUNITY_Workspace & Labels|Workspace & Labels]]
- [[_COMMUNITY_Contact & Lists|Contact & Lists]]
- [[_COMMUNITY_Graphify & Rules|Graphify & Rules]]
- [[_COMMUNITY_React & Vite|React & Vite]]
- [[_COMMUNITY_Calendly & Webhooks|Calendly & Webhooks]]
- [[_COMMUNITY_Package & Devdependencies|Package & Devdependencies]]
- [[_COMMUNITY_Frontend & Tsconfig|Frontend & Tsconfig]]
- [[_COMMUNITY_Workspace & Integrations|Workspace & Integrations]]
- [[_COMMUNITY_Workspace & Contact|Workspace & Contact]]
- [[_COMMUNITY_Src & Vite|Src & Vite]]
- [[_COMMUNITY_Whatsapp & Instances|Whatsapp & Instances]]
- [[_COMMUNITY_Events & Migrations|Events & Migrations]]
- [[_COMMUNITY_Migrations & 20260425021600|Migrations & 20260425021600]]
- [[_COMMUNITY_Migrations & 20260425022100|Migrations & 20260425022100]]
- [[_COMMUNITY_Workspace & Integration|Workspace & Integration]]
- [[_COMMUNITY_Workspace & Integrations|Workspace & Integrations]]
- [[_COMMUNITY_Whatsapp & Migrations|Whatsapp & Migrations]]

## God Nodes (most connected - your core abstractions)
1. `getServiceRoleClient()` - 19 edges
2. `fetchWithAuth()` - 18 edges
3. `compilerOptions` - 18 edges
4. `readApiError()` - 17 edges
5. `compilerOptions` - 16 edges
6. `executeStateMachine()` - 15 edges
7. `supabase` - 15 edges
8. `ensureWorkspaceSocket()` - 14 edges
9. `useAuth()` - 13 edges
10. `routeTrigger()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `BrandoChat Favicon (SVG)` --conceptually_related_to--> `BrandoChat Platform`  [INFERRED]
  automation-platform/frontend/public/favicon-bc.svg → README.md
- `Graphify Rules for AI Agents` --semantically_similar_to--> `Graph-First Query Policy`  [INFERRED] [semantically similar]
  GEMINI.md → .github/copilot-instructions.md
- `Graphify Rules for Claude` --semantically_similar_to--> `Graph-First Query Policy`  [INFERRED] [semantically similar]
  CLAUDE.md → .github/copilot-instructions.md
- `Agent Rules: Graphify` --semantically_similar_to--> `Graph-First Query Policy`  [INFERRED] [semantically similar]
  .agents/rules/graphify.md → .github/copilot-instructions.md
- `supabase db push Migration Command` --conceptually_related_to--> `Supabase Postgres Database`  [INFERRED]
  supabase/CLI_SETUP.txt → README.md

## Import Cycles
- 3-file cycle: `automation-platform/backend/src/flow/triggerRouter.ts -> automation-platform/backend/src/wa/baileysSession.ts -> automation-platform/backend/src/wa/inboundPipeline.ts -> automation-platform/backend/src/flow/triggerRouter.ts`
- 4-file cycle: `automation-platform/backend/src/flow/runAutomation.ts -> automation-platform/backend/src/wa/baileysSession.ts -> automation-platform/backend/src/wa/inboundPipeline.ts -> automation-platform/backend/src/flow/triggerRouter.ts -> automation-platform/backend/src/flow/runAutomation.ts`

## Hyperedges (group relationships)
- **Graph-First AI Agent Policy (GEMINI.md + CLAUDE.md + copilot-instructions.md)** — geminimd_graphify_rules, claudemd_graphify_rules, copilot_graphify_rules, agents_rules_graphify [EXTRACTED 1.00]
- **Graphify Pipeline: Detect → AST → Semantic → Cluster → Export** — skill_graphify_detect_step, skill_graphify_ast_extract, skill_graphify_semantic_extract, skill_graphify_cluster, ref_exports [EXTRACTED 1.00]

## Communities (50 total, 11 thin omitted)

### Community 0 - "Automation Flow Engine"
Cohesion: 0.07
Nodes (51): env, applyTemplateVars(), AutomationGraph, buildContactPlaceholderVars(), GraphNode, parseGptBranchChoice(), parseGraph(), readVariable() (+43 more)

### Community 1 - "WhatsApp Session & Backend Server"
Cohesion: 0.08
Nodes (44): startScheduler(), getServiceRoleClient(), app, authDir(), connectedSessionForWorkspace(), disconnectWorkspace(), emptySyncSnapshot(), ensureWorkspaceSocket() (+36 more)

### Community 2 - "Automation Builder UI"
Cohesion: 0.06
Nodes (35): AutomationBuilder(), BASE_VARIABLE_OPTIONS, BranchProperties(), BuilderFlowNode, BuilderNode, defaultNode(), findNodeLabel(), FlowNodeData (+27 more)

### Community 3 - "Calendly Integration Backend"
Cohesion: 0.09
Nodes (31): @types/express, CalendlyApiError, CalendlyCurrentUser, CalendlyEventType, calendlyRequest(), CalendlyScheduledEventResource, CalendlyScope, CalendlyWebhookResource (+23 more)

### Community 4 - "Contacts & Hooks"
Cohesion: 0.05
Nodes (29): useWorkspaceId(), AttributePills(), AttributeType, Contact, ContactColumn, ContactList, ContactsPage(), ContactTag (+21 more)

### Community 5 - "React App Shell & Routing"
Cohesion: 0.09
Nodes (23): App(), AppRoutes(), RequireAuth(), AppShell(), ContactListLite, ContactTagLite, Workspace, WorkspaceShell() (+15 more)

### Community 6 - "API Library & Settings Pages"
Cohesion: 0.10
Nodes (17): WhatsAppInstance, ProfileRow, WorkspaceRow, AutomationRun, TraceEntry, ContactOption, Row, Button() (+9 more)

### Community 7 - "Frontend Package Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, react, react-dom, react-qr-code, react-router-dom, @supabase/supabase-js, @xyflow/react, devDependencies (+23 more)

### Community 8 - "Backend Package Dependencies"
Cohesion: 0.07
Nodes (27): dependencies, @cacheable/node-cache, cors, dotenv, express, @hapi/boom, openai, pino (+19 more)

### Community 9 - "Calendly Mapper & Webhook Routes"
Cohesion: 0.16
Nodes (17): getCalendlyScheduledEvent(), AnyRecord, asRecord(), asString(), extractInviteePhone(), normalizePhone(), readQuestionPhone(), readQuestionsAndAnswers() (+9 more)

### Community 10 - "Initial Database Schema"
Cohesion: 0.16
Nodes (23): automations_updated_at, contact_flow_state_updated_at, contacts_updated_at, message_templates_updated_at, on_auth_user_created, on_workspace_created, profiles_updated_at, public.automations (+15 more)

### Community 11 - "Chats Page"
Cohesion: 0.12
Nodes (17): assignedTo(), assignedToName(), assigneeLabel(), ChatsPage(), Contact, contactIdLabel(), ContactIdWithHoverJid(), contactLabel() (+9 more)

### Community 12 - "Frontend TypeScript Config (App)"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 13 - "API Client Library"
Cohesion: 0.27
Nodes (19): authHeader(), calendlyConnect(), calendlyCreateWebhook(), calendlyListWebhooks(), fetchWithAuth(), readApiError(), waConnect(), waConnectInstance() (+11 more)

### Community 14 - "WhatsApp History Sync"
Cohesion: 0.15
Nodes (13): contactDisplayName(), contactNameFromJid(), importHistorySyncBatch(), messageBody(), messageChatJid(), phoneE164FromJid(), SyncArgs, timestampIso() (+5 more)

### Community 15 - "Docker & Supabase Deployment"
Cohesion: 0.12
Nodes (18): supabase db push Migration Command, Supabase TypeScript Type Generation, Supabase CLI Setup Workflow, Backend Docker Service, Frontend Docker Service, wa_sessions Docker Volume, BrandoChat Favicon (SVG), Automation Builder (+10 more)

### Community 16 - "Frontend TypeScript Config (Node)"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 17 - "Graphify Skill & References"
Cohesion: 0.12
Nodes (16): Claude CLAUDE.md: Graphify Skill Registration, Graphify add URL / --watch Auto-rebuild, Graphify Export Formats (HTML/SVG/GraphML/Neo4j), Node ID Naming Rules, Extraction Subagent Spec, Graphify GitHub Clone + Multi-Repo Merge, Graphify Git Commit Hook Integration, Graphify Query / Path / Explain Commands (+8 more)

### Community 18 - "Backend TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, esModuleInterop, module, moduleResolution, noEmit, outDir, resolveJsonModule (+6 more)

### Community 19 - "Supabase Client Config"
Cohesion: 0.23
Nodes (6): getSupabaseBrowserConfig(), isSupabaseConfigured(), supabase, { url, anonKey }, Row, Workspace

### Community 20 - "Pages & Integrations"
Cohesion: 0.18
Nodes (9): CalendlyEventType, CalendlyScope, calendlyEventOptions, CalendlyEventRow, CalendlyWebhookRow, IntegrationCard, integrationCards, IntegrationLog (+1 more)

### Community 21 - "Automation & Triggers"
Cohesion: 0.29
Nodes (9): automation_runs_updated_at, conversations_updated_at, public.automation_runs, public.automations, public.conversations, public.message_events, public.scheduled_trigger_locks, public.webhook_triggers (+1 more)

### Community 22 - "Workspace & Labels"
Cohesion: 0.48
Nodes (6): public.conversation_labels, public.workspace_invitations, public.workspace_labels, public.workspaces, workspace_invitations_updated_at, workspace_labels_updated_at

### Community 23 - "Contact & Lists"
Cohesion: 0.38
Nodes (6): public.contact_list_members, public.contact_tag_members, public.workspace_contact_lists, public.workspace_contact_tags, workspace_contact_lists_updated_at, workspace_contact_tags_updated_at

### Community 24 - "Graphify & Rules"
Cohesion: 0.33
Nodes (6): Agent Rules: Graphify, Agent Workflow: /graphify, Graphify Rules for Claude, Graph-First Query Policy, Graphify Rules for GitHub Copilot, Graphify Rules for AI Agents

### Community 25 - "React & Vite"
Cohesion: 0.40
Nodes (5): React Logo (SVG), React + TypeScript + Vite Stack, BrandoChat Frontend App Entry, DM Sans Google Font, Vite Logo (SVG)

### Community 26 - "Calendly & Webhooks"
Cohesion: 0.50
Nodes (4): calendly_webhook_events_updated_at, public.calendly_webhook_events, public.workspace_calendly_webhooks, workspace_calendly_webhooks_updated_at

### Community 27 - "Package & Devdependencies"
Cohesion: 0.50
Nodes (3): devDependencies, supabase, @supabase/cli-windows-x64

## Knowledge Gaps
- **259 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+254 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@types/express` connect `Calendly Integration Backend` to `Backend Package Dependencies`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Backend Package Dependencies` to `Calendly Integration Backend`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `supabase` connect `Supabase Client Config` to `Automation Builder UI`, `Contacts & Hooks`, `React App Shell & Routing`, `API Library & Settings Pages`, `Chats Page`, `API Client Library`, `Pages & Integrations`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _259 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Automation Flow Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.0679563492063492 - nodes in this community are weakly interconnected._
- **Should `WhatsApp Session & Backend Server` be split into smaller, more focused modules?**
  _Cohesion score 0.0784313725490196 - nodes in this community are weakly interconnected._
- **Should `Automation Builder UI` be split into smaller, more focused modules?**
  _Cohesion score 0.057004830917874394 - nodes in this community are weakly interconnected._