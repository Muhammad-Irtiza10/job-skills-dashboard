// Types and small pieces shared by the student dashboard tabs.
import React from 'react'
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export interface Major {
  id: number
  name: string
}
export interface Skill {
  id: number
  name: string
}
export interface ProfileResponse {
  major: Major | null
  skills: Skill[]
  first_name?: string
}
export interface JobPosting {
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
export interface MissingResponse {
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
export interface JobField {
  id: number
  name: string
}
export interface MajorSkillsResponse {
  id: number
  name: string
  major_related_skills: Skill[]
  technical_skills: Skill[]
  soft_skills: Skill[]
}

// "today", "3 days ago", "2 weeks ago" from an ISO date
export const postedAgo = (iso?: string | null) => {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  return `${Math.floor(days / 7)} weeks ago`
}

// Card header with an optional coloured station icon and an optional action on the right.
export const PanelHead: React.FC<{
  title: string
  desc: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
  color?: string
}> = ({ title, desc, action, icon, color }) => (
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
