// Analytics shown on the profile page, built only from existing API endpoints:
// /profile/ (passed in), /majors/<id>/skills/ and /jobs/.
import React, { useEffect, useState } from "react"
import { CircleCheck, CircleDashed } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarList, EmptyNote } from "@/components/charts"
import { apiFetch } from "@/lib/api"
import { matchPctFor, type NamedSkill } from "@/lib/match"

interface Skill extends NamedSkill {
  category?: "major" | "technical" | "soft"
}
export interface InsightProfile {
  major: { id: number; name: string } | null
  skills: Skill[]
  avatar_url?: string | null
  bio: string
  phone_primary: string
  job_title: string
}
interface MajorSkills {
  major_related_skills: Skill[]
  technical_skills: Skill[]
  soft_skills: Skill[]
}
interface Job {
  id: number
  title: string
  company_name: string
  skills: Skill[]
}

export default function ProfileInsights({ profile }: { profile: InsightProfile }) {
  const [majorSkills, setMajorSkills] = useState<MajorSkills | null>(null)
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const majorId = profile.major?.id

  useEffect(() => {
    if (!majorId) return setMajorSkills(null)
    apiFetch(`/majors/${majorId}/skills/`).then(setMajorSkills).catch(() => setMajorSkills(null))
  }, [majorId])
  useEffect(() => {
    apiFetch("/jobs/").then(setJobs).catch(() => setJobs([]))
  }, [])

  // profile strength: what a complete profile has
  const checklist: Array<[string, boolean]> = [
    ["Profile photo", !!profile.avatar_url],
    ["Major", !!profile.major],
    ["At least 5 skills", profile.skills.length >= 5],
    ["Job title", !!profile.job_title],
    ["Bio", !!profile.bio?.trim()],
    ["Phone number", !!profile.phone_primary?.trim()],
  ]
  const done = checklist.filter(([, ok]) => ok).length
  const strength = Math.round((done / checklist.length) * 100)

  const total = profile.skills.length
  const mix = (["major", "technical", "soft"] as const).map(cat => {
    const n = profile.skills.filter(s => (s.category ?? "major") === cat).length
    const label = cat === "major" ? "Major-Related" : cat === "technical" ? "Technical" : "Soft"
    return { label, pct: total ? (n / total) * 100 : 0, value: String(n), tip: `${label}: ${n} of your ${total} skills` }
  })

  const owned = new Set(profile.skills.map(s => s.id))
  const coverage = majorSkills
    ? ([
        ["Major-Related", majorSkills.major_related_skills],
        ["Technical", majorSkills.technical_skills],
        ["Soft", majorSkills.soft_skills],
      ] as const).map(([label, list]) => {
        const n = list.filter(s => owned.has(s.id)).length
        return { label, pct: list.length ? (n / list.length) * 100 : 0, value: `${n} / ${list.length}`, tip: `${label}: ${n} of ${list.length} skills in your major` }
      })
    : []

  const top = (jobs ?? [])
    .map(j => ({ job: j, pct: matchPctFor(j, profile.skills) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Profile strength</CardTitle>
          <CardDescription>A complete profile gives better matches</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[44px] font-extrabold leading-none tabular-nums">{strength}%</span>
            <span className="text-sm text-ink-2">{done} of {checklist.length} done</span>
          </div>
          <BarList thin color="hsl(var(--line-red))" rows={[{ label: "Complete", pct: strength, value: "", tip: `Profile ${strength}% complete` }]} />
          <ul className="grid gap-1.5 text-sm">
            {checklist.map(([item, ok]) => (
              <li key={item} className={`flex items-center gap-2 ${ok ? "text-ink-3" : ""}`}>
                {ok ? <CircleCheck className="h-4 w-4 text-good" /> : <CircleDashed className="h-4 w-4 text-amber-ink" />}
                {ok ? item : `Add ${item.toLowerCase()}`}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Skill mix</CardTitle>
          <CardDescription>What kind of skills are on your profile</CardDescription>
        </CardHeader>
        <CardContent>
          {total ? <BarList color="hsl(var(--line-teal))" rows={mix} /> : <EmptyNote icon={<CircleDashed />}>No skills yet. Add skills to see your mix.</EmptyNote>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Major coverage</CardTitle>
          <CardDescription>{profile.major ? `Share of ${profile.major.name} skills you have` : "Pick your major on the dashboard"}</CardDescription>
        </CardHeader>
        <CardContent>
          {coverage.length && coverage.some(c => c.value[0] !== "0")
            ? <BarList color="hsl(var(--line-red))" rows={coverage} />
            : <EmptyNote icon={<CircleDashed />}>{profile.major ? "No data yet. Add skills from your major." : "No major selected yet."}</EmptyNote>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Top job matches</CardTitle>
          <CardDescription>Across all jobs in the app</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs === null ? (
            <p className="text-sm text-ink-2" aria-busy="true">Loading jobs…</p>
          ) : total && top.length && top[0].pct > 0 ? (
            <ol className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
              {top.map(({ job, pct }) => (
                <li key={job.id} className="flex min-w-0 items-center justify-between gap-3 rounded-sm border p-3" title={job.title}>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[17px] font-bold leading-snug">{job.title}</p>
                    <p className="truncate text-[13px] text-ink-2">{job.company_name}</p>
                  </div>
                  <span className={`shrink-0 rounded-sm px-2.5 py-1 text-[13px] font-semibold tabular-nums ${pct >= 60 ? "bg-good-soft text-good" : "border bg-surface-2"}`}>{pct}%</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyNote icon={<CircleDashed />}>No matches yet. Add skills that jobs ask for.</EmptyNote>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
