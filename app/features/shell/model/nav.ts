// 侧栏里有什么、指到哪。纯函数：数据进来，要显示的东西出去。
import type { Conversation, Machine, Project, Workspace } from '@/contracts/workbench-v2'
import { conversationRoute, isBuilt, routes, type Mode, type Page } from '@/lib/workbench/routes'

// ---------------- 当前在哪个功能 ----------------
export function modeOf(pathname: string, search: string, conversation?: Conversation): Mode {
  const rest = pathname.split('/workbench')[1] ?? ''
  if (rest.startsWith('/expert') || /\/expert\/new$/.test(rest) || /\/tasks\//.test(rest)) {
    return 'expert'
  }
  if (rest.startsWith('/chat/')) return 'chat'
  if (conversation) return conversation.kind
  const asked = new URLSearchParams(search).get('mode')
  return asked === 'work' || asked === 'expert' ? asked : 'chat'
}

// ---------------- 工作区与项目 ----------------
export function workspaceKey(workspace: { environment_id: string; root: string }) {
  return `${workspace.environment_id}\n${workspace.root}`
}

export function projectsIn(projects: Project[], workspace: Workspace | undefined) {
  if (!workspace) return []
  return projects
    .filter(
      (project) =>
        !project.archived &&
        project.environment_id === workspace.environment_id &&
        project.workspace_root === workspace.root,
    )
    .sort((a, b) => (b.last_active_at ?? '').localeCompare(a.last_active_at ?? ''))
}

// 没选过的时候：最近用过的项目所在的那个工作区；一个项目都没有，就第一个
export function defaultWorkspace(workspaces: Workspace[], projects: Project[]) {
  const latest = [...projects]
    .filter((project) => !project.archived)
    .sort((a, b) => (b.last_active_at ?? '').localeCompare(a.last_active_at ?? ''))[0]
  const home = latest
    ? workspaces.find(
        (w) => w.environment_id === latest.environment_id && w.root === latest.workspace_root,
      )
    : undefined
  return home ?? workspaces[0]
}

// ---------------- 最近的对话 ----------------
export type RecentItem = {
  id: string
  title: string | null
  kind: Conversation['kind']
  busy: boolean // 专家正在这段对话里做事
  project: string | null
  href: string | null
}

export function recent(
  conversations: Conversation[],
  projects: Project[],
  locale: string,
  limit = 8,
): RecentItem[] {
  const names = new Map(projects.map((project) => [project.id, project.title]))
  return [...conversations]
    .sort((a, b) =>
      (b.last_active_at ?? b.created_at).localeCompare(a.last_active_at ?? a.created_at),
    )
    .slice(0, limit)
    .map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      kind: conversation.kind,
      busy: conversation.wheel === 'advisor',
      project: conversation.project_id ? (names.get(conversation.project_id) ?? null) : null,
      href: isBuilt(conversation.project_id === null ? 'chat' : 'projectConversation')
        ? conversationRoute(locale, conversation)
        : null,
    }))
}

// ---------------- 我的机器 ----------------
export type MachineLight = 'online' | 'offline' | 'none'

export function machineLight(machines: Machine[]): MachineLight {
  if (!machines.length) return 'none'
  return machines.some((machine) => machine.status === 'online') ? 'online' : 'offline'
}

// ---------------- 侧栏底部的条目 ----------------
// 由这份清单生成。以后加「技能」「连接器」「助理」，只在这里加一项（PRD investment.md 11.3）。
export type FootEntry =
  | { key: string; kind: 'page'; page: Page; href: (locale: string) => string }
  | { key: string; kind: 'elsewhere'; to: 'knowledge.catalog' | 'info.request' }

export const FOOT: readonly FootEntry[] = [
  { key: 'pending', kind: 'page', page: 'home', href: (locale) => routes.home(locale) },
  { key: 'catalog', kind: 'elsewhere', to: 'knowledge.catalog' },
  { key: 'request', kind: 'elsewhere', to: 'info.request' },
  { key: 'machines', kind: 'page', page: 'machines', href: routes.machines },
  { key: 'settings', kind: 'page', page: 'settings', href: routes.settings },
]

export function footHref(entry: FootEntry, locale: string): string | null {
  if (entry.kind !== 'page') return null
  return isBuilt(entry.page) ? entry.href(locale) : null
}
