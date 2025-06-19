import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, BookOpen, Briefcase, Award, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [selectedMajor, setSelectedMajor] = useState('Computer Science');
  const [selectedJobField, setSelectedJobField] = useState('Software Development');

  // Mock data for analytics - this would come from your backend
  const skillRelevanceData = [
    { skill: 'Programming', relevanceScore: 95, demandTrend: 'increasing' },
    { skill: 'Machine Learning', relevanceScore: 88, demandTrend: 'increasing' },
    { skill: 'Data Analysis', relevanceScore: 82, demandTrend: 'stable' },
    { skill: 'Cloud Computing', relevanceScore: 79, demandTrend: 'increasing' },
    { skill: 'Cybersecurity', relevanceScore: 85, demandTrend: 'increasing' },
    { skill: 'Mobile Development', relevanceScore: 72, demandTrend: 'stable' },
    { skill: 'Database Management', relevanceScore: 68, demandTrend: 'stable' },
    { skill: 'UI/UX Design', relevanceScore: 75, demandTrend: 'increasing' }
  ];

  const majorJobDistribution = [
    { jobField: 'Software Development', percentage: 35, color: '#8884d8' },
    { jobField: 'Data Science', percentage: 25, color: '#82ca9d' },
    { jobField: 'Web Development', percentage: 20, color: '#ffc658' },
    { jobField: 'Mobile Development', percentage: 12, color: '#ff7c7c' },
    { jobField: 'DevOps', percentage: 8, color: '#8dd1e1' }
  ];

  const skillDemandTrend = [
    { month: 'Jan', programming: 85, machineLearning: 70, cloudComputing: 60 },
    { month: 'Feb', programming: 87, machineLearning: 75, cloudComputing: 65 },
    { month: 'Mar', programming: 90, machineLearning: 80, cloudComputing: 70 },
    { month: 'Apr', programming: 92, machineLearning: 85, cloudComputing: 75 },
    { month: 'May', programming: 95, machineLearning: 88, cloudComputing: 79 },
    { month: 'Jun', programming: 95, machineLearning: 90, cloudComputing: 82 }
  ];

  const studentSkillGaps = [
    { skill: 'Cloud Computing', gapPercentage: 45, studentsNeedingSkill: 120 },
    { skill: 'Machine Learning', gapPercentage: 38, studentsNeedingSkill: 95 },
    { skill: 'DevOps', gapPercentage: 52, studentsNeedingSkill: 85 },
    { skill: 'Cybersecurity', gapPercentage: 41, studentsNeedingSkill: 78 },
    { skill: 'Mobile Development', gapPercentage: 35, studentsNeedingSkill: 65 }
  ];

  const majors = [
    'Computer Science',
    'Data Science',
    'Software Engineering',
    'Information Technology',
    'Cybersecurity',
    'Business Administration'
  ];

  const jobFields = [
    'Software Development',
    'Data Science',
    'Web Development',
    'Mobile Development',
    'DevOps',
    'Cybersecurity'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Faculty Analytics Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/')}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Major</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {majors.map((major) => (
                    <SelectItem key={major} value={major}>
                      {major}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Job Field</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedJobField} onValueChange={setSelectedJobField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jobFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <p className="text-xs text-muted-foreground">
                +12% from last semester
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Job Placements</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">892</div>
              <p className="text-xs text-muted-foreground">
                71.5% placement rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skill Gap Average</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42%</div>
              <p className="text-xs text-muted-foreground">
                -5% from last quarter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Certifications</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">
                +23% this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Skill Relevance Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Skill Relevance Scores for {selectedMajor}
            </CardTitle>
            <CardDescription>
              Industry demand and relevance scores for skills in this major
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillRelevanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="skill" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="relevanceScore" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {skillRelevanceData.slice(0, 4).map((skill) => (
                <div key={skill.skill} className="text-center">
                  <p className="font-medium text-sm">{skill.skill}</p>
                  <p className="text-2xl font-bold text-blue-600">{skill.relevanceScore}%</p>
                  <Badge variant={skill.demandTrend === 'increasing' ? 'default' : 'secondary'}>
                    {skill.demandTrend}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Job Field Distribution and Skill Demand Trend */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Job Field Distribution - {selectedMajor}</CardTitle>
              <CardDescription>
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
                      fill="#8884d8"
                      dataKey="percentage"
                      label={({ jobField, percentage }) => `${jobField}: ${percentage}%`}
                    >
                      {majorJobDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skill Demand Trends</CardTitle>
              <CardDescription>
                6-month trend analysis for top skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={skillDemandTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="programming" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="machineLearning" stroke="#82ca9d" strokeWidth={2} />
                    <Line type="monotone" dataKey="cloudComputing" stroke="#ffc658" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Skill Gaps */}
        <Card>
          <CardHeader>
            <CardTitle>Student Skill Gap Analysis</CardTitle>
            <CardDescription>
              Skills where students need the most improvement for {selectedJobField}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentSkillGaps.map((gap) => (
                <div key={gap.skill} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{gap.skill}</h4>
                    <p className="text-sm text-gray-600">
                      {gap.studentsNeedingSkill} students need this skill
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">{gap.gapPercentage}%</div>
                    <p className="text-sm text-gray-600">skill gap</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Curriculum Recommendations</CardTitle>
            <CardDescription>
              Suggested improvements based on industry analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-medium text-blue-900">Increase Cloud Computing Focus</h4>
                <p className="text-blue-800 text-sm mt-1">
                  45% of students lack cloud computing skills. Consider adding AWS/Azure certifications to curriculum.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <h4 className="font-medium text-green-900">Machine Learning Integration</h4>
                <p className="text-green-800 text-sm mt-1">
                  High demand trend for ML skills. Recommend introducing practical ML projects in coursework.
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <h4 className="font-medium text-yellow-900">DevOps Skills Development</h4>
                <p className="text-yellow-800 text-sm mt-1">
                  52% skill gap in DevOps. Consider partnering with industry for hands-on training programs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FacultyDashboard;