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
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import {
  TrendingUp,
  Users,
  BookOpen,
  Briefcase,
  Award,
  BarChart3,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate()
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600/40 to-slate-700/40 backdrop-blur-sm border-b border-blue-300/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
              Faculty Analytics Dashboard
            </h1>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-blue-300/50 text-blue-100 hover:bg-blue-700/30 hover:text-white"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-800/50 to-slate-800/50 border-blue-300/40 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg text-white">Select Major</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                <SelectTrigger className="bg-slate-800/50 border-blue-300/50 text-white">
                  <SelectValue placeholder="Choose major" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-300/50">
                  {majors.map((m) => (
                    <SelectItem
                      key={m}
                      value={m}
                      className="text-white hover:bg-blue-700/50 focus:bg-blue-700/50"
                    >
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-800/50 to-slate-800/50 border-blue-300/40 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg text-white">Select Job Field</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedJobField} onValueChange={setSelectedJobField}>
                <SelectTrigger className="bg-slate-800/50 border-blue-300/50 text-white">
                  <SelectValue placeholder="Choose job field" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-300/50">
                  {jobFields.map((f) => (
                    <SelectItem
                      key={f}
                      value={f}
                      className="text-white hover:bg-blue-700/50 focus:bg-blue-700/50"
                    >
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-800/50 to-slate-800/50 border-blue-300/40 backdrop-blur-sm shadow-xl">
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Total Students
              </CardTitle>
              <Users className="h-4 w-4 text-blue-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">1,247</div>
              <p className="text-xs text-blue-200">+12% from last semester</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-800/50 to-slate-800/50 border-blue-300/40 backdrop-blur-sm shadow-xl">
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Job Placements
              </CardTitle>
              <Briefcase className="h-4 w-4 text-blue-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">892</div>
              <p className="text-xs text-blue-200">71.5% placement rate</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-800/50 to-slate-800/50 border-blue-300/40 backdrop-blur-sm shadow-xl">
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Skill Gap Average
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">42%</div>
              <p className="text-xs text-blue-200">-5% from last quarter</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-800/50 to-slate-800/50 border-blue-300/40 backdrop-blur-sm shadow-xl">
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Active Certifications
              </CardTitle>
              <Award className="h-4 w-4 text-blue-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">156</div>
              <p className="text-xs text-blue-200">+23% this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Skill Relevance Analysis */}
        <Card className="bg-gradient-to-br from-blue-800/50 to-slate-800/50 border-blue-300/40 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-300" />
              <CardTitle className="text-white">
                Skill Relevance Scores for {selectedMajor}
              </CardTitle>
            </div>
            <CardDescription className="text-blue-200">
              Industry demand and relevance scores for skills in this major
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillRelevanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    dataKey="skill"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fill: '#cbd5e1' }}
                  />
                  <YAxis tick={{ fill: '#cbd5e1' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#ffffff',
                    }}
                  />
                  <Bar dataKey="relevanceScore" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {skillRelevanceData.slice(0, 4).map((d) => (
                <div key={d.skill} className="text-center">
                  <p className="font-medium text-sm text-blue-100">{d.skill}</p>
                  <p className="text-2xl font-bold text-blue-300">
                    {d.relevanceScore}%
                  </p>
                  <Badge
                    variant={d.demandTrend === 'increasing' ? 'default' : 'secondary'}
                    className="bg-blue-600 text-white"
                  >
                    {d.demandTrend}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Job Field Distribution & Demand Trend */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="bg-gradient-to-br from-blue-800/50 to-slate-800/50 border-blue-300/40 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">
                Job Field Distribution – {selectedMajor}
              </CardTitle>
              <CardDescription className="text-blue-200">
                Where graduates typically find employment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={majorJobDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="percentage"
                      label={({ jobField, percentage }) => `${jobField}: ${percentage}%`}
                    >
                      {majorJobDistribution.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#ffffff',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-800/50 to-slate-800/50 border-blue-300/40 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Skill Demand Trends</CardTitle>
              <CardDescription className="text-blue-200">
                6-month trend analysis for top skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={skillDemandTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="month" tick={{ fill: '#cbd5e1' }} />
                    <YAxis tick={{ fill: '#cbd5e1' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#ffffff',
                      }}
                    />
                    <Line type="monotone" dataKey="programming" stroke="#3b82f6" strokeWidth={2} />
                    <Line
                      type="monotone"
                      dataKey="machineLearning"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="cloudComputing"
                      stroke="#f59e0b"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Skill Gaps */}
        <Card className="bg-gradient-to-br from-blue-800/50 to-slate-800/50 border-blue-300/40 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Student Skill Gap Analysis</CardTitle>
            <CardDescription className="text-blue-200">
              Skills where students need the most improvement for {selectedJobField}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentSkillGaps.map((g) => (
                <div
                  key={g.skill}
                  className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-blue-300/20"
                >
                  <div>
                    <h4 className="font-medium text-white">{g.skill}</h4>
                    <p className="text-sm text-blue-200">
                      {g.studentsNeedingSkill} students need this skill
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-400">
                      {g.gapPercentage}%
                    </div>
                    <p className="text-sm text-blue-200">skill gap</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="bg-gradient-to-br from-blue-800/50 to-slate-800/50 border-blue-300/40 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Curriculum Recommendations</CardTitle>
            <CardDescription className="text-blue-200">
              Suggested improvements based on industry analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-800/30 rounded-lg border-l-4 border-blue-400">
              <h4 className="font-medium text-blue-200">
                Increase Cloud Computing Focus
              </h4>
              <p className="text-blue-100 text-sm mt-1">
                45% of students lack cloud computing skills. Consider adding
                AWS/Azure certifications to curriculum.
              </p>
            </div>
            <div className="p-4 bg-green-800/30 rounded-lg border-l-4 border-green-400">
              <h4 className="font-medium text-green-200">
                Machine Learning Integration
              </h4>
              <p className="text-green-100 text-sm mt-1">
                High demand trend for ML skills. Recommend introducing practical
                ML projects in coursework.
              </p>
            </div>
            <div className="p-4 bg-yellow-800/30 rounded-lg border-l-4 border-yellow-400">
              <h4 className="font-medium text-yellow-200">
                DevOps Skills Development
              </h4>
              <p className="text-yellow-100 text-sm mt-1">
                52% skill gap in DevOps. Consider partnering with industry for
                hands-on training programs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FacultyDashboard
