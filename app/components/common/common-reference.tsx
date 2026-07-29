'use client'

import { useMemo, useState } from 'react'
import {
  AuditedActionDialog,
  ContractUpload,
  DataTable,
  MarkdownEditor,
  MetricChart,
  ProgressBar,
  ResourceDescription,
  SchemaForm,
  useFeedback,
  type DataColumn,
} from './common-kernel'

type Row = { id: string; name: string; state: string }

export function CommonReference() {
  const [rows, setRows] = useState<Row[]>([{ id: 'common-1', name: 'Public workspace', state: 'active' }])
  const [markdown, setMarkdown] = useState('# Common capability')
  const feedback = useFeedback()
  const columns = useMemo<DataColumn<Row>[]>(
    () => [
      { key: 'name', header: 'Name', render: (row) => row.name },
      { key: 'state', header: 'State', render: (row) => row.state },
    ],
    [],
  )
  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="web-common-kernel">
      <DataTable caption="Common resources" rows={rows} columns={columns} rowKey={(row) => row.id} emptyLabel="No resources" page={1} pageCount={1} onPageChange={() => undefined} />
      <SchemaForm
        fields={[{ name: 'name', label: 'Resource name', required: true }]}
        submitLabel="Add"
        onSubmit={(values) => setRows((current) => [...current, { id: `common-${current.length + 1}`, name: values.name, state: 'active' }])}
      />
      <ResourceDescription title="Common contract" items={[{ label: 'Owner', value: 'Paired Web backend' }, { label: 'Mutation', value: 'CSRF + correlation + audit' }]} />
      <div className="space-y-4 rounded-lg border p-4">
        <AuditedActionDialog triggerLabel="Audited action" title="Confirm mutation" onConfirm={(reason) => feedback.notify('success', reason)} />
        <ContractUpload label="Contract upload" accept=".json,application/json" maxBytes={1024 * 1024} onSelect={(file) => feedback.notify('info', file.name)} />
        <ProgressBar label="Common parity" value={100} />
      </div>
      <div className="lg:col-span-2"><MarkdownEditor value={markdown} onChange={setMarkdown} /></div>
      <div className="lg:col-span-2"><MetricChart title="Common quality gates" points={[{ label: 'Auth', value: 100 }, { label: 'Contract', value: 100 }, { label: 'A11y', value: 92 }]} /></div>
    </div>
  )
}
