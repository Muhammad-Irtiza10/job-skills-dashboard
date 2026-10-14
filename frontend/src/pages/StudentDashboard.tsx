// src/pages/StudentDashboard.tsx
// Loads the student's data and keeps it in sync with the API; each tab's layout lives in ./student/.
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Skill as ApiSkill } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { User, LayoutDashboard, CircleDot, Route, LogOut, TrainFront } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import AppHeader from '@/components/AppHeader'
import { useAuth } from '@/App'
import type { Major, Skill, ProfileResponse, JobPosting, MissingResponse, JobField, MajorSkillsResponse } from './student/shared'
import OverviewTab from './student/OverviewTab'
import SkillsTab from './student/SkillsTab'
import JobsTab from './student/JobsTab'

type Tab = 'overview' | 'skills' | 'jobs'

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

  // --- 4b) Add custom skill (true when it was added) ---
  const addCustomSkill = async (raw: string) => {
    const name = raw.trim()
    if (!name) return false

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
      return true
    } catch {
      alert('Could not add that skill.')
      return false
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

  const changeJobField = (field: string) => {
    setSelectedJobField(field)
    setSelectedJob(null)
    setMissingData(null)
  }

  // --- 6) When job selected, get missing ---
  const handleJobSelect = (job: JobPosting) => {
    setSelectedJob(job)
    setLoadingMissing(true)
    apiFetch(`/jobs/${job.id}/missing/`)
      .then(setMissingData)
      .catch(() => setMissingData(null))
      .finally(() => setLoadingMissing(false))
  }

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

  const majorName = majors.find(m => m.id === selectedMajorId)?.name
  const tabs: Array<[Tab, string, React.ReactNode]> = [
    ['overview', 'Overview', <LayoutDashboard key="o" />],
    ['skills', 'My Skills', <CircleDot key="s" />],
    ['jobs', 'Explore Jobs', <Route key="j" />],
  ]
  const ti = tabs.findIndex(t => t[0] === tab)

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

        {tab === 'overview' && (
          <OverviewTab
            firstName={firstName}
            userSkills={userSkills}
            majorSkills={majorSkills}
            jobs={jobs}
            selectedJobField={selectedJobField}
            loadingJobs={loadingJobs}
            onExplore={() => setTab('jobs')}
          />
        )}

        {tab === 'skills' && (
          <SkillsTab
            majors={majors}
            selectedMajorId={selectedMajorId}
            onMajorChange={setSelectedMajorId}
            majorSkills={majorSkills}
            userSkills={userSkills}
            onAddFromMajor={addSkillFromMajor}
            onAddCustom={addCustomSkill}
            onRemove={removeSkill}
          />
        )}

        {tab === 'jobs' && (
          <JobsTab
            jobFields={jobFields}
            selectedJobField={selectedJobField}
            onFieldChange={changeJobField}
            jobs={jobs}
            loadingJobs={loadingJobs}
            userSkills={userSkills}
            selectedJob={selectedJob}
            onSelectJob={handleJobSelect}
            missingData={missingData}
            loadingMissing={loadingMissing}
          />
        )}
      </main>
    </div>
  )
}

export default StudentDashboard
