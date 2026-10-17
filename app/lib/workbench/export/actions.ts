import { baseName } from '@/lib/workbench/file-tree'

import { parseMarkdown, tablesOf } from './markdown'

// 成稿导出的三个按钮（0031）。都在浏览器里做：文件是网页经本机代理读来的，不经云端，导出也不经云端。

/** 去掉扩展名，作为导出文件的名字。 */
export function exportName(path: string): string {
  return baseName(path).replace(/\.(md|markdown)$/i, '') || 'export'
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function hasTables(text: string): boolean {
  return tablesOf(parseMarkdown(text)).length > 0
}

export async function exportWord(text: string, path: string): Promise<void> {
  const { markdownToDocx } = await import('./docx')
  const name = exportName(path)
  saveBlob(await markdownToDocx(parseMarkdown(text), name), `${name}.docx`)
}

export async function exportExcel(
  text: string,
  path: string,
  labels: { sheetSource: string; notes: string },
): Promise<void> {
  const tables = tablesOf(parseMarkdown(text))
  if (tables.length === 0) return
  const { tablesToXlsx } = await import('./xlsx')
  const blob = await tablesToXlsx(tables, { path, exportedAt: new Date(), ...labels })
  saveBlob(blob, `${exportName(path)}.xlsx`)
}

/**
 * 把页面上已经渲染好的成稿放进打印区，打印时只留它（样式在 globals.css 的 @media print）。
 * 标题暂时换成文件名：浏览器「另存为 PDF」默认用它当文件名。打印框关掉后复原。
 */
export function printRendered(source: HTMLElement, path: string): void {
  document.getElementById('export-print-root')?.remove()
  const root = document.createElement('div')
  root.id = 'export-print-root'
  const title = document.createElement('div')
  title.className = 'export-print-title'
  title.textContent = path
  root.appendChild(title)
  root.appendChild(source.cloneNode(true))
  document.body.appendChild(root)
  const html = document.documentElement
  const previousTitle = document.title
  document.title = exportName(path)
  html.classList.add('exporting-print')
  const restore = () => {
    html.classList.remove('exporting-print')
    document.title = previousTitle
    root.remove()
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  window.print()
}
