import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, MarkdownEditor, SchemaForm } from '@/components/common/common-kernel'

describe('Web common frontend kernel', () => {
  it('covers empty and paginated table states', () => {
    render(
      <DataTable
        caption="Resources"
        rows={[]}
        columns={[{ key: 'name', header: 'Name', render: () => 'name' }]}
        rowKey={() => 'id'}
        emptyLabel="No resources"
        page={1}
        pageCount={2}
        onPageChange={vi.fn()}
      />,
    )
    expect(screen.getByText('No resources')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  })

  it('validates schema-driven required fields before mutation', () => {
    const onSubmit = vi.fn()
    render(<SchemaForm fields={[{ name: 'name', label: 'Name', required: true }]} submitLabel="Save" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders rich text as safe text instead of HTML', () => {
    render(<MarkdownEditor value={'<script>alert(1)</script>safe'} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Safe text preview')).toHaveTextContent('alert(1)safe')
    expect(document.querySelector('script')).toBeNull()
  })
})
