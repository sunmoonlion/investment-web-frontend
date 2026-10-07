// 知识库的状态与算法：不取数、不渲染。
import type { LibraryItem } from '@/contracts/workbench-v2'

export type Kind = LibraryItem['kind']
export const KINDS: readonly Kind[] = ['dossier', 'deliverable']

// 清单按项目归组；没有项目的放最后
export function byProject(items: LibraryItem[], names: Map<string, string | null>) {
  const groups = new Map<string | null, LibraryItem[]>()
  for (const item of items) {
    const list = groups.get(item.project_id) ?? []
    list.push(item)
    groups.set(item.project_id, list)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : 0))
    .map(([project, list]) => ({
      project,
      title: project ? (names.get(project) ?? null) : null,
      items: list,
    }))
}

export function sizeText(bytes: number | null): string | null {
  if (bytes === null) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// 改名时去掉两头空白；空的不许
export function cleanTitle(raw: string): string | null {
  const title = raw.trim().slice(0, 400)
  return title ? title : null
}
