// 工作台各页的地址（PRD/apps/investment.md 第四节）。页面与功能都从这里取，不自己拼。
import type { ConversationKind } from '@/contracts/workbench-v2'

export type Mode = 'chat' | 'work' | 'expert'
export const MODES: readonly Mode[] = ['chat', 'work', 'expert']

function at(locale: string, ...parts: string[]) {
  return `/${[locale, 'workbench', ...parts].map(encodeURIComponent).join('/')}`
}

export const routes = {
  home: (locale: string, mode?: Mode) => (mode ? `${at(locale)}?mode=${mode}` : at(locale)),
  chat: (locale: string, conversation: string) => at(locale, 'chat', conversation),
  projects: (locale: string) => at(locale, 'projects'),
  project: (locale: string, project: string) => at(locale, 'projects', project),
  projectConversation: (locale: string, project: string, conversation: string) =>
    at(locale, 'projects', project, 'c', conversation),
  askExpert: (locale: string, project: string, from?: string) =>
    `${at(locale, 'projects', project, 'expert', 'new')}${from ? `?from=${encodeURIComponent(from)}` : ''}`,
  dossier: (locale: string, project: string, task: string) =>
    at(locale, 'projects', project, 'tasks', task),
  expert: (locale: string) => at(locale, 'expert'),
  review: (locale: string, pending: string) => at(locale, 'review', pending),
  machines: (locale: string) => at(locale, 'machines'),
  settings: (locale: string) => at(locale, 'settings'),
  // 知识库（SDD 0011）：用户自己的底稿与交回物
  library: (locale: string) => at(locale, 'library'),
  libraryItem: (locale: string, item: string) => at(locale, 'library', item),
}

// 一段对话在哪一页
export function conversationRoute(
  locale: string,
  conversation: { id: string; project_id: string | null; kind: ConversationKind },
) {
  return conversation.project_id === null
    ? routes.chat(locale, conversation.id)
    : routes.projectConversation(locale, conversation.project_id, conversation.id)
}

// 第 7 步是一页一页做的。还没做的页不给链接：不放点了没反应的东西。做好一页，在这里加一项。
export type Page =
  | 'home'
  | 'chat'
  | 'projects'
  | 'project'
  | 'projectConversation'
  | 'askExpert'
  | 'dossier'
  | 'expert'
  | 'review'
  | 'machines'
  | 'settings'
  | 'library'
  | 'libraryItem'

const BUILT: ReadonlySet<Page> = new Set([
  'home',
  'chat',
  'projects',
  'project',
  'projectConversation',
  'expert',
  'askExpert',
  'dossier',
  'review',
  'machines',
  'settings',
  'library',
  'libraryItem',
])

export function isBuilt(page: Page) {
  return BUILT.has(page)
}
