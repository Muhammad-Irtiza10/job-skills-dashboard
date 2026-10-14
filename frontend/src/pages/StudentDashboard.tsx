// src/pages/StudentDashboard.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  Skill as ApiSkill,
  ProfileResponse as ApiProfileResponse,
} from '@/lib/types'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  User,
  Plus,
  X,
  Check,
  GraduationCap,
  Briefcase,
  Trophy,
  LayoutDashboard,
  CircleDot,
  Route,
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  CircleDashed,
  BookOpen,
  LogOut,
  MousePointerClick,
  TrainFront,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import AppHeader from '@/components/AppHeader'
import { BarList, EmptyNote, MatchDial } from '@/components/charts'
import { matchPctFor as sharedMatchPct, haveFor as sharedHaveFor } from '@/lib/match'
import { isWebUrl } from '@/lib/utils'
import { useAuth } from '@/App'

// --- Types for fetched data ---
interface Major {
  id: number
  name: string
}
interface Skill {
  id: number
  name: string
}
interface ProfileResponse {
  major: Major | null
  skills: Skill[]
  first_name?: string
}
interface JobPosting {
  id: number
  title: string
  company_name: string
  location: string
  skills: Skill[]
  job_field: string
  source?: string      // e.g. "LinkedIn" for live jobs, empty for older scraped ones
  url?: string         // original posting
  date_posted?: string | null
}

// "today", "3 days ago", "2 weeks ago" from an ISO date
const postedAgo = (iso?: string | null) => {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  return `${Math.floor(days / 7)} weeks ago`
}
interface MissingResponse {
  missing_skills: Skill[]
  suggestions: {
    [skillName: string]: Array<{
      id: number
      name: string
      provider: string
      url: string
      relevance_score: number
    }>
  }
}
interface JobField {
  id: number
  name: string
}

interface SkillCardProps {
  title: string
  skills: Skill[]
  onAdd: (skill: Skill) => void
  userSkills: Skill[]        // ← new prop
  color: string
}

interface MajorSkillsResponse {
  id: number
  name: string
  major_related_skills: Skill[]
  technical_skills: Skill[]
  soft_skills: Skill[]
}

type Tab = 'overview' | 'skills' | 'jobs'

// One line per category: filled station = already on your profile.
const SkillCard: React.FC<SkillCardProps> = ({
  title,
  skills,
  onAdd,
  userSkills,
  color,
}) => {
  const owned = (s: Skill) => userSkills.some(u => u.id === s.id)
  return (
    <Card className="p-5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="eyebrow">{skills.filter(owned).length}/{skills.length}</span>
      </div>
      {skills.length > 0 ? (
        <div className="-mr-2 max-h-[560px] overflow-y-auto pr-2">
        <ul className="stations" style={{ '--c': color } as React.CSSProperties}>
          {skills.map(s => (
            <li key={s.id} className={owned(s) ? 'on' : ''}>
              <span className="s" />
              <span className="min-w-0 text-sm font-medium">{s.name}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAdd(s)}
                // use the new prop here instead of userSkills
                disabled={owned(s)}
                aria-label={owned(s) ? `${s.name} added` : `Add ${s.name}`}
              >
                {owned(s) ? <Check /> : <Plus />}
              </Button>
            </li>
          ))}
        </ul>
        </div>
      ) : (
        <p className="text-sm text-ink-3">
          No skills in this category
        </p>
      )}
    </Card>
  )
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { setToken } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [firstName, setFirstName] = useState('')

  // Profile + major
  const [majors, setMajors] = useState<Major[]>([])
  const [selectedMajorId, setSelectedMajorId] = useState<number | "">("")
  const [majorSkills, setMajorSkills] = useState<MajorSkillsResponse | null>(null)
  const [userSkills, setUserSkills] = useState<ApiSkill[]>([])
  const [customSkill, setCustomSkill] = useState<string>('')

  // Job fields + postings
  const [jobFields, setJobFields] = useState<JobField[]>([])
  const [selectedJobField, setSelectedJobField] = useState<string>('')
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [missingData, setMissingData] = useState<MissingResponse | null>(null)

  // Loading flags
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingMajors, setLoadingMajors] = useState(true)
  const [loadingJobFields, setLoadingJobFields] = useState(true)
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [loadingMissing, setLoadingMissing] = useState(false)


  // --- 1) On mount: fetch profile, majors, jobFields ---
  useEffect(() => {
    apiFetch('/profile/')
      .then((data: ProfileResponse) => {
        if (data.major) {
          setSelectedMajorId(data.major.id)
        }
        setUserSkills(data.skills)
        setFirstName(data.first_name || '')
      })
      .catch(() => {
        setToken(null)
        navigate('/')
      })
      .finally(() => setLoadingProfile(false))

    apiFetch('/majors/')
      .then(setMajors)
      .catch(console.error)
      .finally(() => setLoadingMajors(false))

    apiFetch('/jobfields/')
      .then(setJobFields)
      .catch(console.error)
      .finally(() => setLoadingJobFields(false))
  }, [navigate])

  // --- 2) Fetch majorSkills when major changes ---
  useEffect(() => {
  if (!selectedMajorId) {
    setMajorSkills(null)
    return
  }

  apiFetch(`/majors/${selectedMajorId}/skills/`)
    .then((maj: MajorSkillsResponse) => setMajorSkills(maj))
    .catch(() => setMajorSkills(null))
}, [selectedMajorId])


  // --- 3) Update profile.major on backend ---
  useEffect(() => {
    if (loadingProfile) return
    if (selectedMajorId) {
      apiFetch('/profile/', {
        method: 'PUT',
        body: JSON.stringify({
          major: selectedMajorId,
          skills: userSkills.map(s => s.id),
        }),
      }).then((p: ProfileResponse) => {
        setUserSkills(p.skills)
      }).catch(console.error)
    }
  }, [selectedMajorId])

  // --- 4a) Add from major ---
  const addSkillFromMajor = (skill: Skill) => {
    if (userSkills.some(s => s.id === skill.id)) return
    const next = [...userSkills, skill]
    setUserSkills(next)
    apiFetch('/profile/', {
      method: 'PUT',
      body: JSON.stringify({ major: selectedMajorId, skills: next.map(s=>s.id) }),
    })
      .then((p: ProfileResponse) => setUserSkills(p.skills))
      .catch(console.error)
  }

  // --- 4b) Add custom skill ---
  const addCustomSkill = async () => {
    const name = customSkill.trim()
    if (!name) return

    try {
      let skillObj: ApiSkill
      try {
        skillObj = await apiFetch('/skills/', {
          method: 'POST',
          body: JSON.stringify({ name }),
        })
      } catch (err: any) {
        if (err.message.startsWith('API 400')) {
          const hits: ApiSkill[] = await apiFetch(`/skills/?search=${encodeURIComponent(name)}`)
          if (!hits.length) throw new Error('Not found')
          skillObj = hits[0]
        } else throw err
      }
      const nextIds = Array.from(new Set([...userSkills.map(s=>s.id), skillObj.id]))
      const updated: ProfileResponse = await apiFetch('/profile/', {
        method: 'PATCH',
        body: JSON.stringify({ skills: nextIds }),
      })
      setUserSkills(updated.skills)
      setCustomSkill('')
    } catch {
      alert('Could not add that skill.')
    }
  }


  // --- 4c) Remove skill ---
  const removeSkill = (skill: Skill) => {
    const next = userSkills.filter(s => s.id !== skill.id)
    setUserSkills(next)
    apiFetch('/profile/', {
      method: 'PUT',
      body: JSON.stringify({ major: selectedMajorId, skills: next.map(s=>s.id) }),
    })
      .then((p: ProfileResponse) => setUserSkills(p.skills))
      .catch(console.error)
  }

  // --- 5) Fetch jobs when field changes ---
  useEffect(() => {
    if (!selectedJobField) return setJobs([])
    setLoadingJobs(true)
    apiFetch(`/jobs/?job_field=${encodeURIComponent(selectedJobField)}`)
      .then(setJobs)
      .catch(console.error)
      .finally(() => setLoadingJobs(false))
  }, [selectedJobField])

  // --- 6) When job selected, get missing ---
  const handleJobSelect = (job: JobPosting) => {
    setSelectedJob(job)
    setLoadingMissing(true)
    apiFetch(`/jobs/${job.id}/missing/`)
      .then(setMissingData)
      .catch(() => setMissingData(null))
      .finally(() => setLoadingMissing(false))
  }

  // --- Helpers for match % (shared with the profile page, see lib/match.ts) ---
  const matchPctFor = (job: JobPosting) => sharedMatchPct(job, userSkills)
  // job-skills you have / still need (word overlap with your skills)
  const haveFor = (job: JobPosting) => sharedHaveFor(job, userSkills)

  // these are the actual job‐skill objects…
  const haveSkills = selectedJob ? haveFor(selectedJob) : [];

  // and anything _not_ in haveSkills is truly missing:
  const needSkills = selectedJob
    ? selectedJob.skills.filter(js =>
        !haveSkills.includes(js)
      )
    : [];

  const getMatchPct = () => (selectedJob ? matchPctFor(selectedJob) : 0)

  // --- Loading skeleton ---
  if (loadingProfile || loadingMajors || loadingJobFields) {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-busy="true">
        <p className="flex items-center gap-3 font-display text-xl text-ink-2">
          <TrainFront className="h-5 w-5 text-line-red" /> Loading dashboard…
        </p>
      </div>
    )
  }

  // --- Overview numbers, all derived from data already loaded above ---
  const majorName = majors.find(m => m.id === selectedMajorId)?.name
  const ranked = jobs.map(j => ({ job: j, pct: matchPctFor(j) })).sort((a, b) => b.pct - a.pct)
  const best = ranked[0]
  const gapCounts = new Map<string, number>()
  jobs.forEach(j => {
    const have = haveFor(j)
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

  const tabs: Array<[Tab, string, React.ReactNode]> = [
    ['overview', 'Overview', <LayoutDashboard key="o" />],
    ['skills', 'My Skills', <CircleDot key="s" />],
    ['jobs', 'Explore Jobs', <Route key="j" />],
  ]
  const ti = tabs.findIndex(t => t[0] === tab)
  const panelHead = (title: string, desc: React.ReactNode, action?: React.ReactNode, icon?: React.ReactNode, color?: string) => (
    <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-4">
      <div className="flex items-start gap-3">
        {icon && <span className="bullet h-[30px] w-[30px] [&_svg]:h-4 [&_svg]:w-4" style={{ '--c': color } as React.CSSProperties}>{icon}</span>}
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{desc}</CardDescription>
        </div>
      </div>
      {action}
    </CardHeader>
  )
  const goExplore = (
    <Button variant="outline" size="sm" onClick={() => setTab('jobs')}>
      Explore <ArrowRight />
    </Button>
  )

  // --- Render everything ---
  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <AppHeader subtitle="Student dashboard">
        <Button variant="outline" onClick={() => navigate('/profile')}>
          <User /><span className="hidden sm:inline">Profile</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setToken(null) // clears the saved login and the in-memory one, so protected pages lock again
            navigate('/')
          }}
        >
          <LogOut /><span className="hidden sm:inline">Logout</span>
        </Button>
      </AppHeader>

      <main className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="pb-2 pt-7">
          <p className="eyebrow mb-1.5">{majorName ? `Your line · ${majorName}` : 'No major selected yet'}</p>
          <h1 className="text-[clamp(34px,4.2vw,54px)] font-extrabold leading-tight tracking-[-0.025em]">Student Dashboard</h1>
        </div>

        {/* Section tabs drawn as stations on your line */}
        <div className="tabline mb-7 mt-4" role="tablist" aria-label="Dashboard sections">
          <span className="prog" style={{ width: `calc(${ti / (tabs.length - 1)} * (100% - 36px))` }} />
          {tabs.map(([key, label, icon], i) => (
            <button key={key} role="tab" aria-selected={tab === key} className={`tab ${i < ti ? 'passed' : ''}`} onClick={() => setTab(key)}>
              <span className="st">{icon}</span>
              <span className="font-display text-[19px]">{label}</span>
            </button>
          ))}
        </div>

        {/* ================= OVERVIEW ================= */}
        {tab === 'overview' && (
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
              {panelHead('Match across jobs', selectedJobField ? `${selectedJobField} · % of each job's skills you have` : 'Pick a job field to compare jobs', goExplore)}
              <CardContent>
                {loadingJobs ? <p className="text-ink-2">Loading jobs…</p>
                  : ranked.length && userSkills.length
                    ? <BarList thin color="hsl(var(--line-red))" rows={ranked.map(r => ({ label: r.job.title, pct: r.pct, value: `${r.pct}%`, tip: `${r.job.title} · ${r.job.company_name}: ${r.pct}% match` }))} />
                    : <EmptyNote icon={<CircleDashed />}>No data yet. {selectedJobField ? 'Your match scores appear once you add skills.' : 'Choose a job field in Explore Jobs.'}</EmptyNote>}
              </CardContent>
            </Card>

            <Card className="col-span-12 lg:col-span-5">
              {panelHead('Skills to pick up next', selectedJobField ? `How many ${selectedJobField} jobs ask for each skill you don't have` : 'Pick a job field to see your gaps')}
              <CardContent>
                {gaps.length
                  ? <BarList color="hsl(var(--line-amber))" rows={gaps.map(([name, n]) => ({ label: name, pct: (n / jobs.length) * 100, value: `${n} job${n > 1 ? 's' : ''}`, tip: `${name}: asked for by ${n} of ${jobs.length} jobs` }))} />
                  : <EmptyNote icon={jobs.length ? <CircleCheck /> : <CircleDashed />}>{jobs.length ? 'You cover every skill these jobs ask for.' : 'No data yet.'}</EmptyNote>}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ================= MY SKILLS ================= */}
        {tab === 'skills' && (
          <div className="fade grid grid-cols-12 gap-5" role="tabpanel">
            {/* Major Selection */}
            <Card className="col-span-12 lg:col-span-8">
              {panelHead('Select Your Major', 'Choose your field of study to get started', undefined, <GraduationCap />)}
              <CardContent>
                <Select
                  value={selectedMajorId.toString()}
                  onValueChange={val => {
                    const n = parseInt(val,10)
                    setSelectedMajorId(isNaN(n) ? "" : n)
                  }}
                >
                  <SelectTrigger aria-label="Major">
                    <SelectValue placeholder="Pick a major…" />
                  </SelectTrigger>
                  <SelectContent>
                    {majors.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Additional Skills */}
            <Card className="col-span-12 lg:col-span-4">
              {panelHead('Additional Skills', 'Add any other skills', undefined, <Plus />, 'hsl(var(--ink))')}
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    aria-label="Skill name"
                    placeholder="Skill name…"
                    value={customSkill}
                    onChange={e => setCustomSkill(e.target.value)}
                    onKeyPress={e => e.key==='Enter' && addCustomSkill()}
                  />
                  <Button size="icon" onClick={addCustomSkill} aria-label="Add skill">
                    <Plus />
                  </Button>
                </div>
                <p className="mt-2 text-[13px] text-ink-3">
                  * New skills will be created automatically.
                </p>
              </CardContent>
            </Card>

            {/* Skills management */}
            {selectedMajorId ? (
              majorSkills && (
                <>
                  <div className="col-span-12 md:col-span-4">
                    <SkillCard title="Major-Related" skills={majorSkills.major_related_skills} onAdd={addSkillFromMajor} userSkills={userSkills} color="hsl(var(--line-red))" />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <SkillCard title="Technical" skills={majorSkills.technical_skills} onAdd={addSkillFromMajor} userSkills={userSkills} color="hsl(var(--line-teal))" />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <SkillCard title="Soft" skills={majorSkills.soft_skills} onAdd={addSkillFromMajor} userSkills={userSkills} color="hsl(var(--line-amber))" />
                  </div>
                  {majorSkills.major_related_skills.length === 0 && (
                    <p className="col-span-12 text-ink-3">No skills found for this major.</p>
                  )}
                </>
              )
            ) : (
              <div className="col-span-12">
                <EmptyNote icon={<GraduationCap />}>Pick a major above to see its baseline skills.</EmptyNote>
              </div>
            )}

            {/* Your Skills */}
            <Card className="col-span-12">
              {panelHead('Your Skills', `${userSkills.length} skill${userSkills.length === 1 ? '' : 's'} you've added`)}
              <CardContent>
                {userSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userSkills.map(s => (
                      <span key={s.id} className="chip chip--mine">
                        {s.name}
                        <button onClick={()=>removeSkill(s)} aria-label={`Remove ${s.name}`}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyNote icon={<CircleDashed />}>No skills yet. Add them from the lists above.</EmptyNote>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ================= EXPLORE JOBS ================= */}
        {tab === 'jobs' && (
          <div className="fade grid grid-cols-12 items-start gap-5" role="tabpanel">
            {/* Job Fields */}
            <Card className="col-span-12">
              {panelHead('Job Fields', 'Industries & roles', undefined, <Briefcase />, 'hsl(var(--line-teal))')}
              <CardContent>
                <Select
                  value={selectedJobField}
                  onValueChange={val => {
                    setSelectedJobField(val)
                    setSelectedJob(null)
                    setMissingData(null)
                  }}
                >
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
              {panelHead(selectedJobField ? `Jobs in ${selectedJobField}` : 'Jobs', 'Click to analyze match',
                <span className="flex gap-4 text-[13px] text-ink-2">
                  <span className="flex items-center gap-1.5"><span className="h-[11px] w-[11px] rounded-full border-2 border-good bg-good" />You have</span>
                  <span className="flex items-center gap-1.5"><span className="h-[11px] w-[11px] rounded-full border-2 border-line-amber" />You need</span>
                </span>)}
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
                      // build a Set of all your skill‐names (lowercased & trimmed)
                      const mySkills = new Set(
                        userSkills.map((u) => u.name.toLowerCase().trim())
                      );
                      const pct = matchPctFor(job)

                      return (
                        <button
                          key={job.id}
                          onClick={() => handleJobSelect(job)}
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
                            {(job.skills || []).map((sk) => {
                              // split the job‐skill into words/tokens
                              const tokens = sk.name
                                .toLowerCase()
                                .split(/\W+/)
                                .filter(Boolean);

                              // check if any token is one of your skills
                              const isMatch = tokens.some((t) => mySkills.has(t));

                              return (
                                <span key={sk.id} className={`chip ${isMatch ? 'chip--have' : 'chip--need'}`}>
                                  {sk.name}
                                </span>
                              );
                            })}
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
                      <span className="font-display text-[44px] font-extrabold leading-none tabular-nums">{getMatchPct()}%</span>
                    </div>
                    <BarList
                      color={getMatchPct() >= 60 ? 'hsl(var(--good))' : 'hsl(var(--line-red))'}
                      rows={[{ label: 'Skill match', pct: getMatchPct(), value: '', tip: `Match ${getMatchPct()}%` }]}
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
        )}
      </main>
    </div>
  )
}

export default StudentDashboard
