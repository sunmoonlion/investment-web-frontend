// 底稿页的几条规则。纯函数。
import type { Dossier, DossierBlock } from '@/contracts/workbench-v2'

// 表里的一个格子怎么写。数值那一列按这一行的单位写（比率写成百分数）；年度、页码照原样；
// 别的大数加分隔；是/否；空的写一横。
const PLAIN = /(^|_)(year|page|id|count|checked|unbalanced)$/

export function cell(value: unknown, row: Record<string, unknown>, key = ''): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number') {
    if (PLAIN.test(key)) return String(value)
    const isAmount = key === 'value' || key === 'official' || key === 'dataset'
    if (isAmount && row.unit === '比率') return `${(value * 100).toFixed(1)}%`
    return value.toLocaleString('zh-CN', { maximumFractionDigits: 4 })
  }
  if (Array.isArray(value)) {
    return value.length ? value.map((each) => cell(each, row, key)).join('、') : '—'
  }
  if (typeof value === 'object') return alsoLine(value)
  return String(value)
}

// 附带的一条说明（例如跨期的断点）：有年度的先说年度，有说明的说说明
export function alsoLine(item: unknown): string {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return cell(item, {})
  const record = item as Record<string, unknown>
  const year = typeof record.fiscal_year === 'number' ? `${record.fiscal_year} 年：` : ''
  if (typeof record.note === 'string' && record.note) return `${year}${record.note}`
  return (
    year +
    Object.entries(record)
      .filter(([key]) => key !== 'fiscal_year')
      .map(([key, inner]) => `${key} ${cell(inner, {}, key)}`)
      .join('；')
  )
}

export type Table = {
  title: string | null
  columns: { key: string; title: string }[]
  rows: Record<string, unknown>[]
}

const isRow = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function columnsOf(block: DossierBlock, rows: Record<string, unknown>[]) {
  if (block.columns.length > 0) return block.columns
  // 专家包没有登记列：行里有什么排什么
  return [...new Set(rows.flatMap((row) => Object.keys(row)))].map((key) => ({ key, title: key }))
}

// 一块里的表。`tables` 是好几张；`table`、`checks` 是一张
export function tablesOf(block: DossierBlock): Table[] {
  const content = block.content
  if (block.kind === 'tables' && Array.isArray(content)) {
    return content.filter(isRow).map((each) => {
      const rows = Array.isArray(each.rows) ? each.rows.filter(isRow) : []
      return {
        title: typeof each.title === 'string' ? each.title : null,
        columns: columnsOf(block, rows),
        rows,
      }
    })
  }
  if (Array.isArray(content)) {
    const rows = content.filter(isRow)
    return [{ title: null, columns: columnsOf(block, rows), rows }]
  }
  return []
}

export function listOf(block: DossierBlock): string[] {
  return Array.isArray(block.content) ? block.content.map((each) => alsoLine(each)) : []
}

// 对照表：一行一个名称，一列一个年度。长表（一行一个「名称 × 年度」）读起来费劲，
// 能转就转成这样；转不了（没有这三列，或者同一个名称同一年有两行）就返回 null，照长表摆。
export type Pivot = {
  years: number[]
  rows: { name: string; cells: Record<number, { text: string; note: string | null }> }[]
}

export function pivotOf(table: Table): Pivot | null {
  const keys = new Set(table.columns.map((column) => column.key))
  if (!keys.has('display_name') || !keys.has('fiscal_year') || !keys.has('value')) return null
  const years = [...new Set(table.rows.map((row) => row.fiscal_year))].filter(
    (year): year is number => typeof year === 'number',
  )
  if (years.length < 2) return null
  const rows = new Map<string, Pivot['rows'][number]>()
  for (const row of table.rows) {
    const name = String(row.display_name ?? '')
    const year = row.fiscal_year
    if (!name || typeof year !== 'number') return null
    const entry = rows.get(name) ?? { name, cells: {} }
    if (entry.cells[year]) return null
    const out = row.applicable === false
    const reason = typeof row.reason_if_not === 'string' ? row.reason_if_not : ''
    const basis = typeof row.basis === 'string' ? row.basis : ''
    entry.cells[year] = out
      ? { text: '不适用', note: reason || null }
      : { text: cell(row.value, row, 'value'), note: basis && basis !== '原始披露' ? basis : null }
    rows.set(name, entry)
  }
  return { years: years.sort((a, b) => a - b), rows: [...rows.values()] }
}

// 出处：哪个数据集、哪个版本、数据到哪一天
export function sourceLine(
  source: DossierBlock['source'],
): { dataset: string; version: string; asOf: string } | null {
  if (!source?.dataset) return null
  return {
    dataset: source.dataset,
    version: (source.data_version ?? '').slice(-8),
    asOf: source.as_of ?? '',
  }
}

// 一、二、三……
const NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
export function ordinal(n: number): string {
  return NUMERALS[n - 1] ?? String(n)
}

// 结果边栏折叠时露出的一句：「回答」那一块的第一行；还没有就是 null
export function answerLine(dossier: Dossier): string | null {
  const block = dossier.sections.flatMap((s) => s.blocks).find((b) => b.key === 'answer')
  if (!block || block.status !== 'done' || typeof block.content !== 'string') return null
  const line =
    block.content
      .split('\n')
      .find((each) => each.trim())
      ?.trim() ?? ''
  return line ? line.replace(/^#+\s*/, '') : null
}
