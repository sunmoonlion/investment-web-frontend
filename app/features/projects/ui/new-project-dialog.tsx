'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { WorkbenchError } from '@/lib/workbench/http'
import { useMachines } from '@/lib/workbench/queries'
import { cn } from '@/lib/utils'

import { useProjectActions } from '../api/projects'
import { defaultTitle, fullDirectory, onlyMachine, pathProblem, rootsOf } from '../model/projects'

const label = 'text-muted-foreground mb-1.5 block text-xs font-medium'
const choice = 'hover:bg-muted/60 w-full rounded-lg border px-3 py-2 text-left text-sm'

// 新建项目。三步：选机器（只有一台就跳过）、选工作区、填子目录与名字。
export function NewProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (project: string) => void
}) {
  const t = useTranslations('projects.create')
  const machines = useMachines()
  const { create } = useProjectActions()
  const all = machines.data ?? []
  const [picked, setPicked] = useState<string | null>(null)
  const [root, setRoot] = useState<string | null>(null)
  const [path, setPath] = useState('')
  const [title, setTitle] = useState('')

  const machine = picked ?? onlyMachine(all)
  const roots = rootsOf(all, machine)
  const workspace = root && roots.includes(root) ? root : roots.length === 1 ? roots[0] : null
  const wrong = pathProblem(path)
  const failed = create.isError ? (create.error as WorkbenchError).code : null

  async function submit() {
    if (!machine || !workspace || wrong) return
    try {
      const made = await create.mutateAsync({
        environment_id: machine,
        workspace_root: workspace,
        path: path.trim(),
        title,
      })
      onCreated(made.id)
    } catch {
      // 原因显示在下面
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {all.length > 1 ? (
            <div>
              <span className={label}>{t('machine')}</span>
              <ul className="space-y-1.5">
                {all.map((each) => (
                  <li key={each.id}>
                    <button
                      type="button"
                      aria-pressed={machine === each.id}
                      onClick={() => {
                        setPicked(each.id)
                        setRoot(null)
                      }}
                      className={cn(choice, machine === each.id && 'border-foreground bg-muted/60')}
                    >
                      {each.name}
                      {each.status === 'online' ? '' : t('machineOffline')}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {machine ? (
            <div>
              <span className={label}>{t('workspace')}</span>
              <ul className="space-y-1.5">
                {roots.map((each) => (
                  <li key={each}>
                    <button
                      type="button"
                      aria-pressed={workspace === each}
                      onClick={() => setRoot(each)}
                      className={cn(
                        choice,
                        'font-mono text-[13px]',
                        workspace === each && 'border-foreground bg-muted/60',
                      )}
                    >
                      {each}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {workspace ? (
            <>
              <div>
                <label htmlFor="project-path" className={label}>
                  {t('path')}
                </label>
                <Input
                  id="project-path"
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                  aria-invalid={wrong !== null}
                  className="font-mono"
                />
                <p className="text-muted-foreground mt-1.5 text-[13px]">{t('pathHint')}</p>
                {wrong ? (
                  <p role="alert" className="text-destructive mt-1 text-[13px]">
                    {t(`problem.${wrong}`)}
                  </p>
                ) : (
                  <p className="mt-1 text-[13px]">
                    <span className="text-muted-foreground">{t('directory')}：</span>
                    <span className="font-mono">{fullDirectory(workspace, path)}</span>
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="project-name" className={label}>
                  {t('name')}
                </label>
                <Input
                  id="project-name"
                  value={title}
                  maxLength={400}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <p className="text-muted-foreground mt-1.5 text-[13px]">
                  {t('nameHint', { title: defaultTitle(workspace, path) })}
                </p>
              </div>
            </>
          ) : null}

          {failed ? (
            <p role="alert" className="text-destructive text-[13px]">
              {t.has(`problem.${failed}`) ? t(`problem.${failed}`) : t('problem.other')}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            disabled={!machine || !workspace || wrong !== null || create.isPending}
            onClick={() => void submit()}
          >
            {create.isPending ? t('submitting') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
