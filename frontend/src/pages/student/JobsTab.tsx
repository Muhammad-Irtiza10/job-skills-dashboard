// Explore Jobs tab: pick a field, browse its jobs, and see the skill gap and courses for one job.
import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Briefcase, Trophy, ArrowUpRight, CircleCheck, CircleDashed, BookOpen, MousePointerClick } from 'lucide-react'
import { BarList, EmptyNote } from '@/components/charts'
import { matchPctFor, haveFor } from '@/lib/match'
import { isWebUrl } from '@/lib/utils'
import { PanelHead, postedAgo, type JobField, type JobPosting, type MissingResponse, type Skill } from './shared'

interface Props {
  jobFields: JobField[]
  selectedJobField: string
  onFieldChange: (field: string) => void
  jobs: JobPosting[]
  loadingJobs: boolean
  userSkills: Skill[]
  selectedJob: JobPosting | null
  onSelectJob: (job: JobPosting) => void
  missingData: MissingResponse | null
  loadingMissing: boolean
}

const JobsTab: React.FC<Props> = ({
  jobFields, selectedJobField, onFieldChange, jobs, loadingJobs, userSkills,
  selectedJob, onSelectJob, missingData, loadingMissing,
}) => {
  // these are the actual job‐skill objects…
  const haveSkills = selectedJob ? haveFor(selectedJob, userSkills) : []
  // and anything _not_ in haveSkills is truly missing:
  const needSkills = selectedJob ? selectedJob.skills.filter(js => !haveSkills.includes(js)) : []
  const matchPct = selectedJob ? matchPctFor(selectedJob, userSkills) : 0

  return (
    <div className="fade grid grid-cols-12 items-start gap-5" role="tabpanel">
      {/* Job Fields */}
      <Card className="col-span-12">
        <PanelHead title="Job Fields" desc="Industries & roles" icon={<Briefcase />} color="hsl(var(--line-teal))" />
        <CardContent>
          <Select value={selectedJobField} onValueChange={onFieldChange}>
            <SelectTrigger aria-label="Job field">
              <SelectValue placeholder="Pick a job field…"/>
            </SelectTrigger>
            <SelectContent>
              {jobFields.map(f=>(
                <SelectItem key={f.id} value={f.name}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Jobs */}
      <Card className="col-span-12 lg:col-span-7">
        <PanelHead
          title={selectedJobField ? `Jobs in ${selectedJobField}` : 'Jobs'}
          desc="Click to analyze match"
          action={
            <span className="flex gap-4 text-[13px] text-ink-2">
              <span className="flex items-center gap-1.5"><span className="h-[11px] w-[11px] rounded-full border-2 border-good bg-good" />You have</span>
              <span className="flex items-center gap-1.5"><span className="h-[11px] w-[11px] rounded-full border-2 border-line-amber" />You need</span>
            </span>
          }
        />
        <CardContent>
          {!selectedJobField ? (
            <EmptyNote icon={<Briefcase />}>Pick a job field above to see open jobs.</EmptyNote>
          ) : loadingJobs ? (
            <p className="text-ink-2">Loading jobs…</p>
          ) : jobs.length === 0 ? (
            <EmptyNote icon={<CircleDashed />}>No jobs found.</EmptyNote>
          ) : (
            <div className="grid gap-2.5">
              {jobs.map((job) => {
                // same rule as the match % and the analysis panel, so a chip is never green here but "needed" there
                const have = haveFor(job, userSkills)
                const pct = matchPctFor(job, userSkills)

                return (
                  <button
                    key={job.id}
                    onClick={() => onSelectJob(job)}
                    aria-pressed={selectedJob?.id === job.id}
                    className="grid w-full gap-2.5 rounded-sm border bg-card p-4 text-left transition-colors hover:border-ink-3 aria-pressed:border-line-red aria-pressed:shadow-[inset_4px_0_0_hsl(var(--line-red))]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[19px] font-bold leading-snug">{job.title}</h3>
                        <p className="text-sm text-ink-2">{job.company_name}{job.location ? ` · ${job.location}` : ''}</p>
                        {job.source && (
                          <p className="eyebrow mt-1 text-[11px]">
                            via {job.source}{job.date_posted ? ` · ${postedAgo(job.date_posted)}` : ''}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-sm px-2.5 py-1 text-[13px] font-semibold tabular-nums ${pct >= 60 ? 'bg-good-soft text-good' : 'border bg-surface-2'}`}>
                        {pct}% match
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(job.skills || []).map((sk) => (
                        <span key={sk.id} className={`chip ${have.includes(sk) ? 'chip--have' : 'chip--need'}`}>
                          {sk.name}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Analysis */}
      <Card className="col-span-12 p-5 sm:p-6 lg:sticky lg:top-24 lg:col-span-5">
        {!selectedJob ? (
          <EmptyNote icon={<MousePointerClick />}>Pick a job to see how your skills line up.</EmptyNote>
        ) : (
          <div>
            <p className="eyebrow">Analysis</p>
            <h2 className="mt-0.5 text-2xl font-extrabold">{selectedJob.title}</h2>
            <p className="text-ink-2">
              {selectedJob.company_name}{selectedJob.source ? ` · via ${selectedJob.source}` : ''}
              {selectedJob.date_posted ? ` · ${postedAgo(selectedJob.date_posted)}` : ''}
            </p>
            {isWebUrl(selectedJob.url) && (
              <a
                href={selectedJob.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonVariants({ size: 'sm' })} mt-3`}
              >
                Apply on {selectedJob.source || 'the job site'} <ArrowUpRight />
              </a>
            )}
            <p className="mb-5 mt-4 text-ink-2">Skill match breakdown</p>

            {/* Match % */}
            <div className="grid gap-2">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Match</span>
                <span className="font-display text-[44px] font-extrabold leading-none tabular-nums">{matchPct}%</span>
              </div>
              <BarList
                color={matchPct >= 60 ? 'hsl(var(--good))' : 'hsl(var(--line-red))'}
                rows={[{ label: 'Skill match', pct: matchPct, value: '', tip: `Match ${matchPct}%` }]}
              />
            </div>

            {/* ✓ You have */}
            {haveSkills.length > 0 && (
              <div>
                <h4 className="mb-2.5 mt-5 flex items-center gap-2 text-sm font-semibold"><CircleCheck className="h-4 w-4 text-good" />You have</h4>
                <div className="flex flex-wrap gap-2">
                  {haveSkills.map(s => (
                    <span key={s.id} className="chip chip--have">{s.name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ✗ You need */}
            {needSkills.length > 0 ? (
              <div>
                <h4 className="mb-2.5 mt-5 flex items-center gap-2 text-sm font-semibold"><CircleDashed className="h-4 w-4 text-amber-ink" />You need</h4>
                <div className="mb-4 flex flex-wrap gap-2">
                  {needSkills.map(s => (
                    <span key={s.id} className="chip chip--need">{s.name}</span>
                  ))}
                </div>

                <h4 className="mb-2.5 mt-5 flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4" />Courses for what you need</h4>
                {loadingMissing ? (
                  <p className="text-ink-2">Loading suggestions…</p>
                ) : missingData ? (
                  <div className="grid gap-3">
                    {Object.entries(missingData.suggestions)
                      // only show suggestions for truly missing skills
                      .filter(([skillName]) =>
                        needSkills.some(ms => ms.name === skillName)
                      )
                      .map(([skillName, recs]) =>
                        recs.map(cert => (
                          <div key={`${skillName}-${cert.id}`} className="grid min-w-0 gap-2 rounded-sm border p-3.5">
                            <span className="eyebrow text-amber-ink">For {skillName}</span>
                            <h3 className="text-[17px] font-bold leading-snug">{cert.name}</h3>
                            <div className="flex items-center justify-between gap-2 text-[13px] text-ink-2">
                              <span>{cert.provider}</span>
                              <span className="rounded-sm border bg-surface-2 px-2 py-0.5 font-semibold">
                                Relevance: {Math.round(cert.relevance_score * 100)}%
                              </span>
                            </div>
                            {isWebUrl(cert.url) && (
                              <a
                                href={cert.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${buttonVariants({ size: 'sm', variant: 'outline' })} justify-self-start`}
                              >
                                View Course <ArrowUpRight />
                              </a>
                            )}
                          </div>
                        ))
                      )}
                  </div>
                ) : (
                  <p className="text-ink-2">No recs found.</p>
                )}
              </div>
            ) : (
              <div className="mt-5 flex items-center gap-3.5 rounded-sm bg-good-soft p-4">
                <Trophy className="h-8 w-8 shrink-0 text-good" />
                <div>
                  <h3 className="text-lg font-bold">Perfect Match!</h3>
                  <p className="text-ink-2">You have all required skills.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

export default JobsTab
