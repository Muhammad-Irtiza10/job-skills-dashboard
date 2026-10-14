// Overview tab: welcome, headline numbers and charts, all derived from data the dashboard already loaded.
import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, CircleCheck, CircleDashed, TrainFront } from 'lucide-react'
import { BarList, EmptyNote, MatchDial } from '@/components/charts'
import { matchPctFor, haveFor } from '@/lib/match'
import { PanelHead, type JobPosting, type MajorSkillsResponse, type Skill } from './shared'

interface Props {
  firstName: string
  userSkills: Skill[]
  majorSkills: MajorSkillsResponse | null
  jobs: JobPosting[]
  selectedJobField: string
  loadingJobs: boolean
  onExplore: () => void
}

const OverviewTab: React.FC<Props> = ({ firstName, userSkills, majorSkills, jobs, selectedJobField, loadingJobs, onExplore }) => {
  const ranked = jobs.map(j => ({ job: j, pct: matchPctFor(j, userSkills) })).sort((a, b) => b.pct - a.pct)
  const best = ranked[0]
  const gapCounts = new Map<string, number>()
  jobs.forEach(j => {
    const have = haveFor(j, userSkills)
    j.skills.filter(s => !have.includes(s)).forEach(s => gapCounts.set(s.name, (gapCounts.get(s.name) || 0) + 1))
  })
  const gaps = [...gapCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const coverage = majorSkills
    ? ([
        ['Major-Related', majorSkills.major_related_skills],
        ['Technical', majorSkills.technical_skills],
        ['Soft', majorSkills.soft_skills],
      ] as const).map(([label, list]) => {
        const n = list.filter(s => userSkills.some(u => u.id === s.id)).length
        const pct = list.length ? (n / list.length) * 100 : 0
        return { label, pct, value: `${n} / ${list.length}`, tip: `${label}: you have ${n} of ${list.length} skills (${Math.round(pct)}%)`, n }
      })
    : []

  const goExplore = (
    <Button variant="outline" size="sm" onClick={onExplore}>
      Explore <ArrowRight />
    </Button>
  )

  return (
    <div className="fade grid grid-cols-12 gap-5" role="tabpanel">
      {jobs.length > 0 && (
        <div className="board col-span-12 rounded-sm" aria-label={`Now hiring in ${selectedJobField}`}>
          <span className="flex shrink-0 items-center gap-2 bg-primary px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-primary-foreground">
            <TrainFront className="h-[15px] w-[15px]" />Now hiring
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="tk">
              {[...jobs, ...jobs].map((j, i) => (
                <span key={i}>{j.title}<i>{j.company_name}{j.location ? ` · ${j.location}` : ''}</i></span>
              ))}
            </div>
          </div>
        </div>
      )}

      <Card className="col-span-12 grid items-center gap-8 p-5 sm:p-6 lg:grid-cols-[.9fr_1.1fr] lg:gap-12">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="mb-1.5 text-[30px] font-extrabold leading-tight">Welcome back{firstName ? `, ${firstName}` : ''}</h2>
              <p className="text-ink-2">
                {userSkills.length === 0
                  ? 'Your line is empty. Pick your major and add the skills you already have.'
                  : selectedJobField
                    ? <>Here's where your skills take you in <b>{selectedJobField}</b> right now.</>
                    : 'Pick a job field in Explore Jobs to see where your skills take you.'}
              </p>
            </div>
            {best && userSkills.length > 0 && <MatchDial value={best.pct} />}
          </div>
          <dl className="mt-5 grid overflow-hidden rounded-sm border sm:grid-cols-3">
            {[
              ['Skills on profile', String(userSkills.length), userSkills.length ? 'across your profile' : 'Add your first skill'],
              ['Best match', best ? `${best.pct}%` : '–', best ? best.job.title : 'Pick a job field'],
              ['Strong matches', best ? `${ranked.filter(r => r.pct >= 60).length} / ${ranked.length}` : '–', 'jobs at 60% or more'],
            ].map(([k, v, d]) => (
              <div key={k} className="min-w-0 border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <dt className="eyebrow">{k}</dt>
                <dd className="mt-1.5 font-display text-[40px] font-extrabold leading-none tabular-nums">{v}</dd>
                <dd className="mt-1 truncate text-[13px] text-ink-2" title={d}>{d}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="text-[23px] font-bold">Major coverage</h2>
          <p className="mb-3 text-sm text-ink-2">Share of your major's skills you already have</p>
          {coverage.length && coverage.some(c => c.n > 0)
            ? <BarList rows={coverage} color="hsl(var(--line-red))" />
            : <EmptyNote icon={<CircleDashed />}>No data yet. Add skills in <b>My Skills</b> to see how much of your major you cover.</EmptyNote>}
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-7">
        <PanelHead title="Match across jobs" desc={selectedJobField ? `${selectedJobField} · % of each job's skills you have` : 'Pick a job field to compare jobs'} action={goExplore} />
        <CardContent>
          {loadingJobs ? <p className="text-ink-2">Loading jobs…</p>
            : ranked.length && userSkills.length
              ? <BarList thin color="hsl(var(--line-red))" rows={ranked.map(r => ({ label: r.job.title, pct: r.pct, value: `${r.pct}%`, tip: `${r.job.title} · ${r.job.company_name}: ${r.pct}% match` }))} />
              : <EmptyNote icon={<CircleDashed />}>No data yet. {selectedJobField ? 'Your match scores appear once you add skills.' : 'Choose a job field in Explore Jobs.'}</EmptyNote>}
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-5">
        <PanelHead title="Skills to pick up next" desc={selectedJobField ? `How many ${selectedJobField} jobs ask for each skill you don't have` : 'Pick a job field to see your gaps'} />
        <CardContent>
          {gaps.length
            ? <BarList color="hsl(var(--line-amber))" rows={gaps.map(([name, n]) => ({ label: name, pct: (n / jobs.length) * 100, value: `${n} job${n > 1 ? 's' : ''}`, tip: `${name}: asked for by ${n} of ${jobs.length} jobs` }))} />
            : <EmptyNote icon={jobs.length ? <CircleCheck /> : <CircleDashed />}>{jobs.length ? 'You cover every skill these jobs ask for.' : 'No data yet.'}</EmptyNote>}
        </CardContent>
      </Card>
    </div>
  )
}

export default OverviewTab
