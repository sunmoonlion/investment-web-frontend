'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  acceptedSchema,
  libraryContentSchema,
  libraryDetailSchema,
  libraryListSchema,
} from '@/contracts/workbench-v2'
import { useWorkbench } from '@/lib/workbench/context'
import { getJson, seg, sendJson } from '@/lib/workbench/http'

const keys = {
  all: ['workbench', 'library'] as const,
  item: (item: string) => ['workbench', 'library', item] as const,
}

// 我的资料：专家交回的底稿、各步交回的东西。按种类、项目筛，按名字找
export function useLibrary(filter: { kind?: string | null; project?: string | null; q?: string }) {
  const search = new URLSearchParams()
  if (filter.kind) search.set('kind', filter.kind)
  if (filter.project) search.set('project', filter.project)
  if (filter.q) search.set('q', filter.q)
  const text = search.toString()
  return useQuery({
    queryKey: [...keys.all, text],
    queryFn: async () =>
      (await getJson(libraryListSchema, `/api/workbench/library${text ? `?${text}` : ''}`)).items,
  })
}

export function useLibraryItem(item: string) {
  return useQuery({
    queryKey: keys.item(item),
    queryFn: async () =>
      (await getJson(libraryDetailSchema, `/api/workbench/library/${seg(item)}`)).item,
  })
}

// 某一版的内容：底稿是整份 Markdown，交回物是它的内容
export function useLibraryContent(item: string, version: number | null) {
  return useQuery({
    queryKey: [...keys.item(item), 'content', version],
    queryFn: () =>
      getJson(
        libraryContentSchema,
        `/api/workbench/library/${seg(item)}/versions/${version}/content`,
      ),
    enabled: version !== null,
  })
}

export function useLibraryActions(item: string) {
  const { csrfToken } = useWorkbench()
  const client = useQueryClient()
  const changed = () => client.invalidateQueries({ queryKey: keys.all })
  return {
    rename: useMutation({
      mutationFn: (title: string) =>
        sendJson(libraryDetailSchema, `/api/workbench/library/${seg(item)}`, {
          csrfToken,
          method: 'PATCH',
          body: { title },
        }),
      onSuccess: changed,
    }),
    // 拿掉的是「从知识库里拿掉」：原委托的记录不动
    remove: useMutation({
      mutationFn: () =>
        sendJson(acceptedSchema, `/api/workbench/library/${seg(item)}`, {
          csrfToken,
          method: 'DELETE',
        }),
      onSuccess: changed,
    }),
  }
}
