import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { apiFetch } from '@/lib/api'  // your helper calling fetch with token

// Interfaces for fetched data:
interface Major {
  id: number
  name: string
  // department, description if needed
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
  job_field: string  // from serializer
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
      // ...other fields if in serializer
    }>
  }
}
interface JobField {
  id: number
  name: string
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate()

  // State for profile & majors
  const [majors, setMajors] = useState<Major[]>([])
  const [selectedMajorId, setSelectedMajorId] = useState<number | "">("")
  const [majorSkills, setMajorSkills] = useState<Skill[]>([])

  const [userSkills, setUserSkills] = useState<Skill[]>([])
  const [customSkill, setCustomSkill] = useState<string>('')

  // Job fields
  const [jobFields, setJobFields] = useState<JobField[]>([])
  const [selectedJobField, setSelectedJobField] = useState<string>('')

  // Jobs & selection
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [missingData, setMissingData] = useState<MissingResponse | null>(null)

  // Loading / error states
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true)
  const [loadingMajors, setLoadingMajors] = useState<boolean>(true)
  const [loadingJobFields, setLoadingJobFields] = useState<boolean>(true)
  const [loadingJobs, setLoadingJobs] = useState<boolean>(false)
  const [loadingMissing, setLoadingMissing] = useState<boolean>(false)

  // 1) On mount: fetch profile, majors, job fields
  useEffect(() => {
    // 1.a) Fetch profile
    apiFetch('/profile/')
      .then((data: ProfileResponse) => {
        if (data.major) {
          setSelectedMajorId(data.major.id)
          // after setting selectedMajorId, we will fetch majorSkills below
        }
        setUserSkills(data.skills)
      })
      .catch(err => {
        console.error("Failed to load profile:", err)
        // if unauthorized or no token, redirect to login
        localStorage.removeItem('apiToken')
        navigate('/')
      })
      .finally(() => setLoadingProfile(false))

    // 1.b) Fetch majors list
    apiFetch('/majors/')
      .then((data: Major[]) => {
        setMajors(data)
      })
      .catch(err => {
        console.error("Failed to load majors:", err)
      })
      .finally(() => setLoadingMajors(false))

    // 1.c) Fetch job fields list from /jobfields/
    apiFetch('/jobfields/')
      .then((data: JobField[]) => {
        setJobFields(data)
      })
      .catch(err => {
        console.error("Failed to load job fields:", err)
      })
      .finally(() => setLoadingJobFields(false))
  }, [navigate])

  // 2) Whenever selectedMajorId changes (and is non-empty), fetch major skills
  useEffect(() => {
    if (!selectedMajorId) {
      setMajorSkills([])
      return
    }
    apiFetch(`/majors/${selectedMajorId}/skills/`)
      .then((data: { id: number; name: string; skills: Skill[] }) => {
        // MajorSkillsDetail returns { id, name, skills: [...] }
        setMajorSkills(data.skills || [])
      })
      .catch(err => {
        console.error("Failed to load major skills:", err)
        setMajorSkills([])
      })
  }, [selectedMajorId])

  // 3) Whenever selectedMajorId changes, update profile major on backend
  //    Debounce or immediate? We’ll do immediate on change:
  useEffect(() => {
    if (loadingProfile) return
    if (selectedMajorId) {
      // PUT profile with new major id
      // Build payload: we must send skill IDs as well to avoid overwriting them.
      const skillIds = userSkills.map(s => s.id)
      apiFetch('/profile/', {
        method: 'PUT',
        body: JSON.stringify({
          major: selectedMajorId,
          skills: skillIds,
        }),
      })
      .then((data: ProfileResponse) => {
        // backend returns updated profile; update userSkills from it
        setUserSkills(data.skills || [])
        // major is same
      })
      .catch(err => {
        console.error("Failed to update profile major:", err)
      })
    }
  // Note: userSkills in dependency ensures we don't overwrite unintendedly.
  }, [selectedMajorId])

  // 4) Handlers for adding/removing skills:
  const addSkillFromMajor = (skill: Skill) => {
    // If not already in userSkills
    if (userSkills.some(s => s.id === skill.id)) return
    const newSkills = [...userSkills, skill]
    setUserSkills(newSkills)
    // Send PUT to update profile
    const skillIds = newSkills.map(s => s.id)
    apiFetch('/profile/', {
      method: 'PUT',
      body: JSON.stringify({
        skills: skillIds,
        // also include major so backend doesn’t drop it:
        major: selectedMajorId || undefined,
      }),
    })
    .then((data: ProfileResponse) => {
      setUserSkills(data.skills || [])
    })
    .catch(err => {
      console.error("Failed to add skill:", err)
    })
  }

  const addCustomSkill = () => {
    const trimmed = customSkill.trim()
    if (!trimmed) return
    // We need to check if this skill exists in global Skill table, or create it?
    // Approach A: Try to find existing skill via an API endpoint (not currently available).
    // Approach B: We assume custom skills are already in Skill table or skip creation.
    // For simplicity, let's call backend to create a new Skill if not exists.
    // Suppose you add an endpoint POST /api/skills/ to create new skill:
    //    { name: trimmed }
    // Then it returns the skill {id, name}. We then add to profile.
    // If you don't have that endpoint, you need to create it in backend. Here we assume it:
    apiFetch('/skills/', {
      method: 'POST',
      body: JSON.stringify({ name: trimmed }),
    })
    .then((newSkillObj: Skill) => {
      // now add to profile
      const newSkills = [...userSkills, newSkillObj]
      setUserSkills(newSkills)
      setCustomSkill('')
      const skillIds = newSkills.map(s => s.id)
      return apiFetch('/profile/', {
        method: 'PUT',
        body: JSON.stringify({
          skills: skillIds,
          major: selectedMajorId || undefined,
        }),
      })
    })
    .then((data: ProfileResponse) => {
      setUserSkills(data.skills || [])
    })
    .catch(err => {
      // If 404 on /skills/, fallback: we cannot create; skip adding
      console.error("Failed to create or add custom skill:", err)
      // Optionally alert user
    })
  }

  const removeSkill = (skill: Skill) => {
    const newSkills = userSkills.filter(s => s.id !== skill.id)
    setUserSkills(newSkills)
    const skillIds = newSkills.map(s => s.id)
    apiFetch('/profile/', {
      method: 'PUT',
      body: JSON.stringify({
        skills: skillIds,
        major: selectedMajorId || undefined,
      }),
    })
    .then((data: ProfileResponse) => {
      setUserSkills(data.skills || [])
    })
    .catch(err => {
      console.error("Failed to remove skill:", err)
    })
  }

  // 5) When selectedJobField changes, fetch jobs for that field
  useEffect(() => {
    if (!selectedJobField) {
      setJobs([])
      return
    }
    setLoadingJobs(true)
    // Query: /api/jobs/?job_field=<selectedJobField>
    apiFetch(`/jobs/?job_field=${encodeURIComponent(selectedJobField)}`)
      .then((data: JobPosting[]) => {
        setJobs(data)
      })
      .catch(err => {
        console.error("Failed to fetch jobs:", err)
        setJobs([])
      })
      .finally(() => setLoadingJobs(false))
  }, [selectedJobField])

  // Handler when user selects a job
  const handleJobSelect = (job: JobPosting) => {
    setSelectedJob(job)
    setLoadingMissing(true)
    apiFetch(`/jobs/${job.id}/missing/`)
      .then((data: MissingResponse) => {
        setMissingData(data)
      })
      .catch(err => {
        console.error("Failed to fetch missing skills:", err)
        setMissingData(null)
      })
      .finally(() => setLoadingMissing(false))
  }

  // Helpers for match percentage:
  const getMatchingSkills = (): Skill[] => {
    if (!selectedJob) return []
    const jobSkillIds = new Set(selectedJob.skills.map(s => s.id))
    return userSkills.filter(s => jobSkillIds.has(s.id))
  }
  const getMissingSkillsLocal = (): Skill[] => {
    if (!selectedJob) return []
    const userSkillIds = new Set(userSkills.map(s => s.id))
    return selectedJob.skills.filter(s => !userSkillIds.has(s.id))
  }
  const getSkillMatchPercentage = (): number => {
    if (!selectedJob) return 0
    const total = selectedJob.skills.length
    if (total === 0) return 0
    const matchCount = getMatchingSkills().length
    return Math.round((matchCount / total) * 100)
  }

  // Render loading state:
  if (loadingProfile || loadingMajors || loadingJobFields) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading dashboard…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-red-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600/40 to-pink-600/30 backdrop-blur-sm border-b border-red-300/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-200 to-white bg-clip-text text-transparent">
              Student Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate('/profile')}
              variant="outline"
              className="border-red-300/50 text-red-100 hover:bg-red-700/30 hover:text-white"
            >
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button
              onClick={() => {
                localStorage.removeItem('apiToken')
                navigate('/')
              }}
              variant="outline"
              className="border-red-300/50 text-red-100 hover:bg-red-700/30 hover:text-white"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8">
          {/* Major Selection */}
          <Card className="bg-gradient-to-br from-red-700/50 to-pink-800/40 border-red-300/40 backdrop-blur-sm shadow-2xl">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">
                    Select Your Major
                  </CardTitle>
                  <CardDescription className="text-red-100">
                    Choose your field of study to get started
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedMajorId.toString()}
                onValueChange={(val) => {
                  const idNum = parseInt(val, 10)
                  setSelectedMajorId(isNaN(idNum) ? "" : idNum)
                }}
              >
                <SelectTrigger className="bg-red-800/40 border-red-300/50 text-white">
                  <SelectValue placeholder="Choose your major" />
                </SelectTrigger>
                <SelectContent className="bg-red-900 border-red-300/50">
                  {majors.map((major) => (
                    <SelectItem
                      key={major.id}
                      value={major.id.toString()}
                      className="text-white hover:bg-red-700/50 focus:bg-red-700/50"
                    >
                      {major.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Skills Management */}
          {selectedMajorId && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Major Skills */}
              <Card className="bg-gradient-to-br from-red-700/50 to-pink-800/40 border-red-300/40 backdrop-blur-sm shadow-2xl">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-white">
                        Major Skills
                      </CardTitle>
                      <CardDescription className="text-red-100">
                        Skills from your major
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {majorSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between p-3 bg-red-800/30 rounded-lg border border-red-300/20"
                      >
                        <span className="text-white">{skill.name}</span>
                        <Button
                          size="sm"
                          onClick={() => addSkillFromMajor(skill)}
                          disabled={userSkills.some(s => s.id === skill.id)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {majorSkills.length === 0 && (
                      <p className="text-red-200">No baseline skills found for this major.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Skills */}
              <Card className="bg-gradient-to-br from-red-700/50 to-pink-800/40 border-red-300/40 backdrop-blur-sm shadow-2xl">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-white">
                        Additional Skills
                      </CardTitle>
                      <CardDescription className="text-red-100">
                        Add your other skills
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter a skill"
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      className="bg-red-800/40 border-red-300/50 text-white placeholder-red-200"
                      onKeyPress={(e) =>
                        e.key === 'Enter' && addCustomSkill()
                      }
                    />
                    <Button
                      onClick={addCustomSkill}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-red-200 text-sm mt-2">
                    * If the skill does not exist yet, it will be created.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Skills Display */}
          {userSkills.length > 0 && (
            <Card className="bg-gradient-to-br from-red-700/50 to-pink-800/40 border-red-300/40 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">
                      Your Skills
                    </CardTitle>
                    <CardDescription className="text-red-100">
                      Skills you have acquired
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {userSkills.map((skill) => (
                    <Badge
                      key={skill.id}
                      variant="secondary"
                      className="bg-red-500/30 text-red-50 border-red-300/40 hover:bg-red-500/50 flex items-center"
                    >
                      {skill.name}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSkill(skill)}
                        className="ml-2 h-4 w-4 p-0 text-red-200 hover:text-white hover:bg-red-500/50"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Job Field Selection */}
          {jobFields.length > 0 && (
            <Card className="bg-gradient-to-br from-red-700/50 to-pink-800/40 border-red-300/40 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">
                      Job Fields
                    </CardTitle>
                    <CardDescription className="text-red-100">
                      Explore career opportunities
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedJobField}
                  onValueChange={(val) => {
                    setSelectedJobField(val)
                    setSelectedJob(null)
                    setMissingData(null)
                  }}
                >
                  <SelectTrigger className="bg-red-800/40 border-red-300/50 text-white">
                    <SelectValue placeholder="Choose a job field" />
                  </SelectTrigger>
                  <SelectContent className="bg-red-900 border-red-300/50">
                    {jobFields.map((f) => (
                      <SelectItem
                        key={f.id}
                        value={f.name}
                        className="text-white hover:bg-red-700/50 focus:bg-red-700/50"
                      >
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Job Listings */}
          {selectedJobField && (
            <Card className="bg-gradient-to-br from-red-700/50 to-pink-800/40 border-red-300/40 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">
                      Available Jobs in {selectedJobField}
                    </CardTitle>
                    <CardDescription className="text-red-100">
                      Click on a job to see details
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingJobs ? (
                  <p className="text-red-200">Loading jobs…</p>
                ) : jobs.length === 0 ? (
                  <p className="text-red-200">No jobs found for this field.</p>
                ) : (
                  <div className="grid gap-4">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => handleJobSelect(job)}
                        className="p-6 bg-gradient-to-r from-red-800/40 to-pink-700/30 rounded-lg border border-red-300/30 cursor-pointer hover:border-red-200 hover:shadow-lg hover:shadow-red-400/20 transition-all duration-300"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-1">
                              {job.title}
                            </h3>
                            <p className="text-red-100">{job.company_name}</p>
                            {job.location && <p className="text-red-200 text-sm">{job.location}</p>}
                          </div>
                          <Badge className="bg-red-500 text-white">
                            {/* We don't have salary in backend; if you add salary field, include here */}
                            {/* Placeholder: */}
                            {job.job_field}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {job.skills.map((skill) => (
                            <Badge
                              key={skill.id}
                              variant={userSkills.some(s => s.id === skill.id) ? 'default' : 'outline'}
                              className={
                                userSkills.some(s => s.id === skill.id)
                                  ? 'bg-green-500 text-white'
                                  : 'border-red-300/50 text-red-200'
                              }
                            >
                              {skill.name}
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
            <Card className="bg-gradient-to-br from-red-700/50 to-pink-800/40 border-red-300/40 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">
                      Job Analysis: {selectedJob.title}
                    </CardTitle>
                    <CardDescription className="text-red-100">
                      Skills match analysis
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">Skill Match</span>
                      <span className="text-white font-bold">
                        {getSkillMatchPercentage()}%
                      </span>
                    </div>
                    <Progress
                      value={getSkillMatchPercentage()}
                      className="h-3 bg-red-800/50"
                    />
                  </div>

                  {/* Matching Skills */}
                  {getMatchingSkills().length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-green-300 mb-3">
                        ✓ Skills You Have
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {getMatchingSkills().map((skill) => (
                          <Badge
                            key={skill.id}
                            className="bg-green-500 text-white"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {getMissingSkillsLocal().length > 0 ? (
                    <div>
                      <h4 className="text-lg font-semibold text-red-200 mb-3">
                        ✗ Skills You Need
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {getMissingSkillsLocal().map((skill) => (
                          <Badge
                            key={skill.id}
                            variant="outline"
                            className="border-red-300 text-red-200"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                      {/* Show suggestions from missingData, if loaded */}
                      {loadingMissing ? (
                        <p className="text-red-200">Loading suggestions…</p>
                      ) : missingData ? (
                        <div className="space-y-4">
                          <h4 className="text-white font-medium">Recommendations:</h4>
                          {Object.entries(missingData.suggestions).map(([skillName, certs]) => (
                            <div key={skillName} className="space-y-2">
                              <p className="text-red-200 font-medium">For skill: {skillName}</p>
                              <div className="flex flex-wrap gap-2">
                                {certs.map(cert => (
                                  <Button
                                    key={cert.id}
                                    size="sm"
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                    onClick={() => window.open(cert.url, '_blank')}
                                  >
                                    {cert.name}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-red-200">No suggestions available.</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-gradient-to-r from-green-800/30 to-green-700/30 rounded-lg border border-green-400/30">
                      <Trophy className="h-16 w-16 text-green-300 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-green-300 mb-2">
                        🎉 You’re Ready!
                      </h3>
                      <p className="text-green-100">
                        You have all the required skills for this job!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* (Optional) Further Recommendations: courses, etc. */}
          {/* You can implement similar pattern: fetch from /api/courses/?skill=<name> or your own endpoints */}
        </div>
      </main>
    </div>
  )
}

export default StudentDashboard