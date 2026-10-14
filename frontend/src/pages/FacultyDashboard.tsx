// src/pages/FacultyDashboard.tsx

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from 'recharts'
import {
  TrendingUp,
  Users,
  Briefcase,
  Award,
  Minus,
  Cloud,
  Brain,
  Wrench,
  LogOut,
} from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { useAuth } from '@/App'
import { BarList } from '@/components/charts'
import { useNavigate } from 'react-router-dom'

const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { setToken } = useAuth()
  const [selectedMajor, setSelectedMajor] = useState('Computer Science')
  const [selectedJobField, setSelectedJobField] = useState('Software Development')

  // ——— Static mock data ———
  const skillRelevanceData = [
    { skill: 'Programming', relevanceScore: 95, demandTrend: 'increasing' },
    { skill: 'Machine Learning', relevanceScore: 88, demandTrend: 'increasing' },
    { skill: 'Data Analysis', relevanceScore: 82, demandTrend: 'stable' },
    { skill: 'Cloud Computing', relevanceScore: 79, demandTrend: 'increasing' },
    { skill: 'Cybersecurity', relevanceScore: 85, demandTrend: 'increasing' },
    { skill: 'Mobile Development', relevanceScore: 72, demandTrend: 'stable' },
    { skill: 'Database Management', relevanceScore: 68, demandTrend: 'stable' },
    { skill: 'UI/UX Design', relevanceScore: 75, demandTrend: 'increasing' },
  ]

  const majorJobDistribution = [
    { jobField: 'Software Development', percentage: 35, color: '#3b82f6' },
    { jobField: 'Data Science', percentage: 25, color: '#10b981' },
    { jobField: 'Web Development', percentage: 20, color: '#f59e0b' },
    { jobField: 'Mobile Development', percentage: 12, color: '#ef4444' },
    { jobField: 'DevOps', percentage: 8, color: '#8b5cf6' },
  ]

  const skillDemandTrend = [
    { month: 'Jan', programming: 85, machineLearning: 70, cloudComputing: 60 },
    { month: 'Feb', programming: 87, machineLearning: 75, cloudComputing: 65 },
    { month: 'Mar', programming: 90, machineLearning: 80, cloudComputing: 70 },
    { month: 'Apr', programming: 92, machineLearning: 85, cloudComputing: 75 },
    { month: 'May', programming: 95, machineLearning: 88, cloudComputing: 79 },
    { month: 'Jun', programming: 95, machineLearning: 90, cloudComputing: 82 },
  ]

  const studentSkillGaps = [
    { skill: 'Cloud Computing', gapPercentage: 45, studentsNeedingSkill: 120 },
    { skill: 'Machine Learning', gapPercentage: 38, studentsNeedingSkill: 95 },
    { skill: 'DevOps', gapPercentage: 52, studentsNeedingSkill: 85 },
    { skill: 'Cybersecurity', gapPercentage: 41, studentsNeedingSkill: 78 },
    { skill: 'Mobile Development', gapPercentage: 35, studentsNeedingSkill: 65 },
  ]

  const majors = [
    'Computer Science',
    'Data Science',
    'Software Engineering',
    'Information Technology',
    'Cybersecurity',
    'Business Administration',
  ]

  const jobFields = [
    'Software Development',
    'Data Science',
    'Web Development',
    'Mobile Development',
    'DevOps',
    'Cybersecurity',
  ]
  // —————————————————————————————————————————

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--ink))',
    border: 'none',
    borderRadius: '4px',
    color: 'hsl(var(--card))',
    fontSize: 13,
  }
  const trendLines: Array<[keyof typeof skillDemandTrend[number], string, string]> = [
    ['programming', 'Programming', 'hsl(var(--line-red))'],
    ['machineLearning', 'Machine Learning', 'hsl(var(--line-teal))'],
    ['cloudComputing', 'Cloud Computing', 'hsl(var(--line-blue))'],
  ]

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <AppHeader subtitle="Faculty analytics">
        <Button variant="outline" onClick={() => { setToken(null); navigate('/') }}>
          <LogOut /><span className="hidden sm:inline">Logout</span>
        </Button>
      </AppHeader>

      <main className="fade mx-auto grid max-w-7xl grid-cols-12 gap-5 px-4 py-7 sm:px-8">
        <div className="col-span-12">
          <p className="eyebrow mb-1.5 flex items-center gap-2">
            <span className="bullet h-[22px] w-[22px]" style={{ '--c': 'hsl(var(--line-blue))' } as React.CSSProperties}>DX</span>
            Development Expert
          </p>
          <h1 className="text-[clamp(34px,4.2vw,54px)] font-extrabold leading-tight tracking-[-0.025em]">Faculty Analytics Dashboard</h1>
        </div>

        {/* Controls */}
        <Card className="col-span-12 grid gap-4 p-5 sm:p-6 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="faculty-major">Select Major</Label>
            <Select value={selectedMajor} onValueChange={setSelectedMajor}>
              <SelectTrigger id="faculty-major">
                <SelectValue placeholder="Choose major" />
              </SelectTrigger>
              <SelectContent>
                {majors.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="faculty-field">Select Job Field</Label>
            <Select value={selectedJobField} onValueChange={setSelectedJobField}>
              <SelectTrigger id="faculty-field">
                <SelectValue placeholder="Choose job field" />
              </SelectTrigger>
              <SelectContent>
                {jobFields.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Key Metrics */}
        <Card className="col-span-12 grid grid-cols-2 lg:grid-cols-4">
          {([
            ['Total Students', '1,247', '+12% from last semester', <Users key="u" />],
            ['Job Placements', '892', '71.5% placement rate', <Briefcase key="b" />],
            ['Skill Gap Average', '42%', '-5% from last quarter', <TrendingUp key="t" />],
            ['Active Certifications', '156', '+23% this month', <Award key="a" />],
          ] as const).map(([k, v, d, icon], i) => (
            <div key={k} className={`min-w-0 p-5 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b lg:border-b-0' : ''} lg:border-r lg:last:border-r-0`}>
              <div className="eyebrow flex items-center justify-between gap-2 [&_svg]:h-4 [&_svg]:w-4">{k}{icon}</div>
              <div className="mt-1.5 font-display text-[40px] font-extrabold leading-none tabular-nums">{v}</div>
              <p className="mt-1 text-[13px] text-ink-2">{d}</p>
            </div>
          ))}
        </Card>

        {/* Skill Relevance Analysis */}
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader>
            <CardTitle>Skill Relevance Scores for {selectedMajor}</CardTitle>
            <CardDescription>
              Industry demand and relevance scores for skills in this major
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              color="hsl(var(--line-blue))"
              rows={skillRelevanceData.map(d => ({ label: d.skill, pct: d.relevanceScore, value: `${d.relevanceScore}%`, tip: `${d.skill}: relevance ${d.relevanceScore}%, demand ${d.demandTrend}` }))}
            />
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-ink-2">
              {skillRelevanceData.slice(0, 4).map((d) => (
                <span key={d.skill} className="inline-flex items-center gap-1.5">
                  {d.skill}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${d.demandTrend === 'increasing' ? 'bg-good-soft text-good' : 'bg-surface-2'}`}>
                    {d.demandTrend === 'increasing' ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {d.demandTrend}
                  </span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Job Field Distribution */}
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader>
            <CardTitle>Job Field Distribution – {selectedMajor}</CardTitle>
            <CardDescription>
              Where graduates typically find employment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              thin
              color="hsl(var(--line-teal))"
              rows={majorJobDistribution.map(d => ({ label: d.jobField, pct: (d.percentage / 35) * 100, value: `${d.percentage}%`, tip: `${d.jobField}: ${d.percentage}% of graduates` }))}
            />
          </CardContent>
        </Card>

        {/* Demand Trend */}
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader>
            <CardTitle>Skill Demand Trends</CardTitle>
            <CardDescription>
              6-month trend analysis for top skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2.5 flex flex-wrap gap-4 text-[13px] text-ink-2">
              {trendLines.map(([, label, color]) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <i className="h-1 w-3.5 rounded-sm" style={{ background: color }} />{label}
                </span>
              ))}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={skillDemandTrend} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--ink-3))', fontSize: 12 }} />
                  <YAxis domain={[50, 100]} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--ink-3))', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--card))' }} labelStyle={{ color: 'hsl(var(--card))' }} cursor={{ stroke: 'hsl(var(--ink-3))', strokeDasharray: '3 3' }} />
                  {trendLines.map(([key, label, color]) => (
                    <Line key={key} name={label} type="monotone" dataKey={key} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: 'hsl(var(--card))', strokeWidth: 2 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Student Skill Gaps */}
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader>
            <CardTitle>Student Skill Gap Analysis</CardTitle>
            <CardDescription>
              Skills where students need the most improvement for {selectedJobField}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              color="hsl(var(--line-amber))"
              rows={studentSkillGaps.map(g => ({ label: g.skill, pct: g.gapPercentage, value: `${g.gapPercentage}%`, tip: `${g.skill}: ${g.gapPercentage}% skill gap · ${g.studentsNeedingSkill} students need this skill` }))}
            />
            <p className="mt-3 text-[13px] text-ink-3">Bar = skill gap. Hover a row for how many students need it.</p>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="col-span-12">
          <CardHeader>
            <CardTitle>Curriculum Recommendations</CardTitle>
            <CardDescription>
              Suggested improvements based on industry analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {([
              ['Increase Cloud Computing Focus', '45% of students lack cloud computing skills. Consider adding AWS/Azure certifications to curriculum.', '--line-blue', <Cloud key="c" />],
              ['Machine Learning Integration', 'High demand trend for ML skills. Recommend introducing practical ML projects in coursework.', '--line-teal', <Brain key="b" />],
              ['DevOps Skills Development', '52% skill gap in DevOps. Consider partnering with industry for hands-on training programs.', '--line-amber', <Wrench key="w" />],
            ] as const).map(([title, text, c, icon]) => (
              <div key={title} className="grid grid-cols-[30px_1fr] gap-3 rounded-sm bg-surface-2 p-4">
                <span className="bullet h-[30px] w-[30px] [&_svg]:h-4 [&_svg]:w-4" style={{ '--c': `hsl(var(${c}))` } as React.CSSProperties}>{icon}</span>
                <div>
                  <h4 className="font-semibold">{title}</h4>
                  <p className="mt-0.5 text-sm text-ink-2">{text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default FacultyDashboard
