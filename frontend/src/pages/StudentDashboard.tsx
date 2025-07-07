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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  User,
  BookOpen,
  Target,
  Award,
  Plus,
  X,
  ExternalLink,
  GraduationCap,
  Briefcase,
  Trophy,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

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
}
interface JobPosting {
  id: number
  title: string
  company_name: string
  location: string
  skills: Skill[]
  job_field: string
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

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate()

  // Profile + major
  const [majors, setMajors] = useState<Major[]>([])
  const [selectedMajorId, setSelectedMajorId] = useState<number | "">("")
  const [majorSkills, setMajorSkills] = useState<Skill[]>([])
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
      })
      .catch(() => {
        localStorage.removeItem('apiToken')
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
    if (!selectedMajorId) return setMajorSkills([])
    apiFetch(`/majors/${selectedMajorId}/skills/`)
      .then((m: { skills: Skill[] }) => setMajorSkills(m.skills))
      .catch(() => setMajorSkills([]))
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

  // --- Helpers for match % ---
  const getMatchingSkills = () => {
    if (!selectedJob) return [] as Skill[]
    const ids = new Set(selectedJob.skills.map(s=>s.id))
    return userSkills.filter(s => ids.has(s.id))
  }
  const getMissingLocal = () => {
    if (!selectedJob) return [] as Skill[]
    const ids = new Set(userSkills.map(s=>s.id))
    return selectedJob.skills.filter(s => !ids.has(s.id))
  }
  const getMatchPct = () => {
    if (!selectedJob) return 0
    const total = selectedJob.skills.length
    if (!total) return 0
    return Math.round((getMatchingSkills().length/total)*100)
  }

  // --- Loading skeleton ---
  if (loadingProfile || loadingMajors || loadingJobFields) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2b0000]">
        <p className="text-white">Loading dashboard…</p>
      </div>
    )
  }

  // --- Render everything ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2b0000] via-[#550000] to-[#2b0000]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#550000]/80 to-[#2b0000]/80 backdrop-blur-sm border-b border-black/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Student Dashboard</h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white/20"
              onClick={() => navigate('/profile')}
            >
              <User className="h-4 w-4 mr-1"/>Profile
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white/20"
              onClick={() => {
                localStorage.removeItem('apiToken')
                navigate('/')
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Major Selection */}
        <Card className="bg-gradient-to-br from-[#2b0000]/60 via-[#550000]/60 to-[#2b0000]/60 border-black/40 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-600 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">Select Your Major</CardTitle>
                <CardDescription className="text-gray-300">
                  Choose your field of study to get started
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedMajorId.toString()}
              onValueChange={val => {
                const n = parseInt(val,10)
                setSelectedMajorId(isNaN(n) ? "" : n)
              }}
            >
              <SelectTrigger className="bg-[#300000] border-gray-600 text-white">
                <SelectValue placeholder="Pick a major…" />
              </SelectTrigger>
              <SelectContent className="bg-[#300000] border-gray-600">
                {majors.map(m => (
                  <SelectItem
                    key={m.id}
                    value={m.id.toString()}
                    className="text-white hover:bg-red-600"
                  >
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Skills management */}
        {selectedMajorId && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Major Skills */}
            <Card className="bg-gradient-to-br from-[#2b0000]/50 via-[#550000]/50 to-[#2b0000]/50 border-black/30 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-600 rounded-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Major Related Skills</CardTitle>
                    <CardDescription className="text-gray-300">
                      Baseline skills for your major
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {majorSkills.map(s => (
                  <div
                    key={s.id}
                    className="flex justify-between items-center p-3 bg-[#300000] rounded-lg border border-black/20"
                  >
                    <span className="text-white">{s.name}</span>
                    <Button
                      size="sm"
                      onClick={() => addSkillFromMajor(s)}
                      disabled={userSkills.some(u=>u.id===s.id)}
                      className="bg-red-600 hover:bg-black text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {!majorSkills.length && (
                  <p className="text-gray-400">No skills found for this major.</p>
                )}
              </CardContent>
            </Card>

            {/* Additional Skills */}
            <Card className="bg-gradient-to-br from-[#2b0000]/50 via-[#550000]/50 to-[#2b0000]/50 border-black/30 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-600 rounded-lg">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Additional Skills</CardTitle>
                    <CardDescription className="text-gray-300">
                      Add any other skills
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Skill name…"
                    value={customSkill}
                    onChange={e => setCustomSkill(e.target.value)}
                    className="bg-[#300000] border-gray-600 text-white"
                    onKeyPress={e => e.key==='Enter' && addCustomSkill()}
                  />
                  <Button
                    onClick={addCustomSkill}
                    className="bg-red-600 hover:bg-black text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-gray-500 text-sm">
                  * New skills will be created automatically.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Your Skills */}
        {userSkills.length>0 && (
          <Card className="bg-gradient-to-br from-[#2b0000]/50 via-[#550000]/50 to-[#2b0000]/50 border-black/30 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-600 rounded-lg">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">Your Skills</CardTitle>
                  <CardDescription className="text-gray-300">
                    Skills you’ve added
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {userSkills.map(s => (
                  <Badge
                    key={s.id}
                    className="bg-red-600 text-white border-transparent"
                  >
                    {s.name}
                    <button
                      onClick={()=>removeSkill(s)}
                      className="ml-2 text-white hover:text-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Fields */}
        {jobFields.length>0 && (
          <Card className="bg-gradient-to-br from-[#2b0000]/50 via-[#550000]/50 to-[#2b0000]/50 border-black/30 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-600 rounded-lg">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">Job Fields</CardTitle>
                  <CardDescription className="text-gray-300">
                    Industries & roles
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedJobField}
                onValueChange={val => {
                  setSelectedJobField(val)
                  setSelectedJob(null)
                  setMissingData(null)
                }}
              >
                <SelectTrigger className="bg-[#300000] border-gray-600 text-white">
                  <SelectValue placeholder="Pick a job field…"/>
                </SelectTrigger>
                <SelectContent className="bg-[#300000] border-gray-600">
                  {jobFields.map(f=>(
                    <SelectItem
                      key={f.id}
                      value={f.name}
                      className="text-white hover:bg-red-600"
                    >
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Jobs */}
        {selectedJobField && (
          <Card className="bg-gradient-to-br from-[#2b0000]/50 via-[#550000]/50 to-[#2b0000]/50 border-black/30 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-600 rounded-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">
                    Jobs in {selectedJobField}
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Click to analyze match
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <p className="text-gray-300">Loading jobs…</p>
              ) : !jobs.length ? (
                <p className="text-gray-300">No jobs found.</p>
              ) : (
                <div className="space-y-4">
                  {jobs.map(job => (
                    <div
                      key={job.id}
                      onClick={()=>handleJobSelect(job)}
                      className="cursor-pointer p-4 bg-[#300000] rounded-lg border border-black/20 hover:border-red-600"
                    >
                      <h3 className="text-lg font-semibold text-white">
                        {job.title}
                      </h3>
                      <p className="text-gray-300">{job.company_name}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {job.skills.map(sk=>(
                          <Badge
                            key={sk.id}
                            className={
                              userSkills.some(u=>u.id===sk.id)
                                ? 'bg-green-500 text-white'
                                : 'bg-red-600 text-white'
                            }
                          >
                            {sk.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Job Analysis */}
        {selectedJob && (
          <Card className="bg-gradient-to-br from-[#2b0000]/50 via-[#550000]/50 to-[#2b0000]/50 border-black/30 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-600 rounded-lg">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">
                    Analysis: {selectedJob.title}
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Skill match breakdown
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Match % */}
              <div>
                <div className="flex justify-between">
                  <span className="text-white font-medium">Match</span>
                  <span className="text-white font-bold">{getMatchPct()}%</span>
                </div>
                <Progress
                  value={getMatchPct()}
                  className="h-3 bg-[#300000] mt-1"
                />
              </div>
              {/* ✓ Have */}
              {getMatchingSkills().length>0 && (
                <div>
                  <h4 className="text-green-400 font-semibold mb-2">✓ You have:</h4>
                  <div className="flex flex-wrap gap-2">
                    {getMatchingSkills().map(s=>(
                      <Badge key={s.id} className="bg-green-500 text-white">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {/* ✗ Need */}
              {getMissingLocal().length>0 ? (
                <div>
                  <h4 className="text-red-400 font-semibold mb-2">✗ You need:</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {getMissingLocal().map(s=>(
                      <Badge key={s.id} className="bg-red-600 text-white">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                  {loadingMissing ? (
                    <p className="text-gray-300">Loading suggestions…</p>
                  ) : missingData ? (
                    <div className="space-y-4">
                      {Object.entries(missingData.suggestions).map(([skill, recs])=>(
                        <div key={skill}>
                          <p className="text-gray-300 mb-2">For {skill}:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                           {recs.map(cert => (
                             <Card
                               key={cert.id}
                               className="bg-red-800/50 border-red-400/30 hover:shadow-xl transition-shadow"
                             >
                               <CardHeader>
                                 <CardTitle className="text-lg text-white">{cert.name}</CardTitle>
                                 <CardDescription className="text-sm text-red-200">
                                   {cert.provider}
                                 </CardDescription>
                               </CardHeader>
                               <CardContent className="flex flex-col justify-between">
                                 <p className="text-red-100 text-sm mb-4">
                                   Relevance: {Math.round(cert.relevance_score * 100)}%
                                 </p>
                                 <Button
                                   size="sm"
                                   className="mt-auto bg-red-500 hover:bg-red-600 text-white"
                                   onClick={() => window.open(cert.url, '_blank')}
                                 >
                                   View Course
                                 </Button>
                               </CardContent>
                             </Card>
                           ))}
                         </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-300">No recs found.</p>
                  )}
                </div>
              ) : (
                <div className="text-center p-6 bg-green-800/30 rounded-lg">
                  <Trophy className="mx-auto h-16 w-16 text-green-400 mb-4" />
                  <h3 className="text-xl font-bold text-green-400">🎉 Perfect Match!</h3>
                  <p className="text-green-200">You have all required skills.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

export default StudentDashboard
