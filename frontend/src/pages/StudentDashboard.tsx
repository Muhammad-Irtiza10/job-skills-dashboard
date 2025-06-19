import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { User, BookOpen, Target, Award, Plus, X, ExternalLink, GraduationCap, Briefcase, Trophy, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  // State variables
  const [selectedMajor, setSelectedMajor] = useState('');
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [selectedJobField, setSelectedJobField] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const navigate = useNavigate();

  // Sample data
  const majors = [
    { id: 'cs', name: 'Computer Science', skills: ['Programming', 'Data Structures', 'Algorithms', 'Database Management', 'Web Development'] },
    { id: 'business', name: 'Business Administration', skills: ['Management', 'Marketing', 'Finance', 'Leadership', 'Communication'] },
    { id: 'engineering', name: 'Engineering', skills: ['Problem Solving', 'Technical Analysis', 'Project Management', 'CAD Design', 'Mathematics'] }
  ];

  const jobFields = [
    { id: 'tech', name: 'Technology', majors: ['cs', 'engineering'] },
    { id: 'finance', name: 'Finance', majors: ['business', 'cs'] },
    { id: 'consulting', name: 'Consulting', majors: ['business', 'engineering'] }
  ];

  const jobs = [
    {
      id: 1,
      title: 'Software Developer',
      field: 'tech',
      company: 'TechCorp',
      salary: '$75,000 - $120,000',
      requiredSkills: ['Programming', 'Web Development', 'Database Management', 'Git', 'Testing'],
      description: 'Develop and maintain software applications using modern technologies.'
    },
    {
      id: 2,
      title: 'Financial Analyst',
      field: 'finance',
      company: 'FinanceInc',
      salary: '$60,000 - $90,000',
      requiredSkills: ['Finance', 'Data Analysis', 'Excel', 'Financial Modeling', 'Communication'],
      description: 'Analyze financial data and create reports for investment decisions.'
    }
  ];

  const certifications = [
    { id: 1, name: 'AWS Certified Developer', skills: ['Cloud Computing', 'AWS'], provider: 'Amazon', duration: '3 months', link: 'https://aws.amazon.com/certification/' },
    { id: 2, name: 'Google Analytics Certified', skills: ['Data Analysis', 'Marketing Analytics'], provider: 'Google', duration: '1 month', link: 'https://analytics.google.com/analytics/academy/' },
    { id: 3, name: 'Git Version Control', skills: ['Git', 'Version Control'], provider: 'GitLab', duration: '2 weeks', link: 'https://about.gitlab.com/learn/' },
    { id: 4, name: 'Software Testing Fundamentals', skills: ['Testing', 'Quality Assurance'], provider: 'ISTQB', duration: '6 weeks', link: 'https://www.istqb.org/' },
    { id: 5, name: 'Financial Modeling', skills: ['Financial Modeling', 'Excel'], provider: 'CFA Institute', duration: '8 weeks', link: 'https://www.cfainstitute.org/' }
  ];

  const courses = [
    { id: 1, name: 'Complete Web Development Bootcamp', skills: ['Web Development', 'Programming'], provider: 'Udemy', duration: '12 weeks', link: 'https://www.udemy.com/course/the-complete-web-development-bootcamp/' },
    { id: 2, name: 'Data Structures and Algorithms', skills: ['Data Structures', 'Algorithms'], provider: 'Coursera', duration: '8 weeks', link: 'https://www.coursera.org/specializations/data-structures-algorithms' },
    { id: 3, name: 'Git and GitHub Mastery', skills: ['Git', 'Version Control'], provider: 'Pluralsight', duration: '4 weeks', link: 'https://www.pluralsight.com/courses/git-fundamentals' },
    { id: 4, name: 'Software Testing Complete Course', skills: ['Testing', 'Quality Assurance'], provider: 'edX', duration: '10 weeks', link: 'https://www.edx.org/course/software-testing-fundamentals' },
    { id: 5, name: 'Financial Analysis and Modeling', skills: ['Financial Modeling', 'Data Analysis'], provider: 'LinkedIn Learning', duration: '6 weeks', link: 'https://www.linkedin.com/learning/financial-analysis-and-modeling' }
  ];

  // Handler functions
  const handleMajorSelect = (majorId: string) => {
    setSelectedMajor(majorId);
    const major = majors.find(m => m.id === majorId);
    if (major) {
      setUserSkills([]);
    }
  };

  const addSkillFromMajor = (skill: string) => {
    if (!userSkills.includes(skill)) {
      setUserSkills([...userSkills, skill]);
    }
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !userSkills.includes(customSkill.trim())) {
      setUserSkills([...userSkills, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setUserSkills(userSkills.filter(s => s !== skill));
  };

  const handleJobSelect = (job: any) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  const getMissingSkills = () => {
    if (!selectedJob) return [];
    return selectedJob.requiredSkills.filter((skill: string) => !userSkills.includes(skill));
  };

  const getMatchingSkills = () => {
    if (!selectedJob) return [];
    return selectedJob.requiredSkills.filter((skill: string) => userSkills.includes(skill));
  };

  const getSkillMatchPercentage = () => {
    if (!selectedJob) return 0;
    const matchingSkills = getMatchingSkills().length;
    const totalRequired = selectedJob.requiredSkills.length;
    return Math.round((matchingSkills / totalRequired) * 100);
  };

  const getRelevantCertifications = () => {
    const missingSkills = getMissingSkills();
    return certifications.filter(cert => 
      cert.skills.some(skill => missingSkills.includes(skill))
    );
  };

  const getRelevantCourses = () => {
    const missingSkills = getMissingSkills();
    return courses.filter(course => 
      course.skills.some(skill => missingSkills.includes(skill))
    );
  };

  const selectedMajorData = majors.find(m => m.id === selectedMajor);
  const availableJobFields = jobFields.filter(field => field.majors.includes(selectedMajor));
  const availableJobs = jobs.filter(job => job.field === selectedJobField);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-900/20 to-black/40 backdrop-blur-sm border-b border-red-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-red-600 to-red-800 rounded-lg shadow-lg">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-white bg-clip-text text-transparent">
                Student Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/profile')}
                variant="outline"
                className="border-red-500/50 text-red-300 hover:bg-red-900/20 hover:text-white"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="border-red-500/50 text-red-300 hover:bg-red-900/20 hover:text-white"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8">
          {/* Major Selection */}
          <Card className="bg-gradient-to-br from-red-900/30 to-black/60 border-red-500/30 backdrop-blur-sm shadow-2xl">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-red-600 to-red-800 rounded-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">Select Your Major</CardTitle>
                  <CardDescription className="text-red-200">Choose your field of study to get started</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={selectedMajor} onValueChange={handleMajorSelect}>
                <SelectTrigger className="bg-black/50 border-red-500/50 text-white">
                  <SelectValue placeholder="Choose your major" />
                </SelectTrigger>
                <SelectContent className="bg-black border-red-500/50">
                  {majors.map(major => (
                    <SelectItem key={major.id} value={major.id} className="text-white hover:bg-red-900/30">
                      {major.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Skills Management */}
          {selectedMajorData && (
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-gradient-to-br from-red-900/30 to-black/60 border-red-500/30 backdrop-blur-sm shadow-2xl">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-red-600 to-red-800 rounded-lg">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-white">Major Skills</CardTitle>
                      <CardDescription className="text-red-200">Skills from {selectedMajorData.name}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedMajorData.skills.map(skill => (
                      <div key={skill} className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-red-500/20">
                        <span className="text-white">{skill}</span>
                        <Button
                          size="sm"
                          onClick={() => addSkillFromMajor(skill)}
                          disabled={userSkills.includes(skill)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-900/30 to-black/60 border-red-500/30 backdrop-blur-sm shadow-2xl">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-red-600 to-red-800 rounded-lg">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-white">Additional Skills</CardTitle>
                      <CardDescription className="text-red-200">Add your other skills</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter a skill"
                        value={customSkill}
                        onChange={(e) => setCustomSkill(e.target.value)}
                        className="bg-black/50 border-red-500/50 text-white placeholder-red-300"
                        onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                      />
                      <Button onClick={addCustomSkill} className="bg-red-600 hover:bg-red-700 text-white">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Skills Display */}
          {userSkills.length > 0 && (
            <Card className="bg-gradient-to-br from-red-900/30 to-black/60 border-red-500/30 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-red-600 to-red-800 rounded-lg">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Your Skills</CardTitle>
                    <CardDescription className="text-red-200">Skills you have acquired</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {userSkills.map(skill => (
                    <Badge key={skill} variant="secondary" className="bg-red-600/20 text-red-100 border-red-500/30 hover:bg-red-600/30">
                      {skill}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSkill(skill)}
                        className="ml-2 h-4 w-4 p-0 text-red-300 hover:text-white hover:bg-red-600/50"
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
          {selectedMajor && availableJobFields.length > 0 && (
            <Card className="bg-gradient-to-br from-red-900/30 to-black/60 border-red-500/30 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-red-600 to-red-800 rounded-lg">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Job Fields</CardTitle>
                    <CardDescription className="text-red-200">Explore career opportunities</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Select value={selectedJobField} onValueChange={setSelectedJobField}>
                  <SelectTrigger className="bg-black/50 border-red-500/50 text-white">
                    <SelectValue placeholder="Choose a job field" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-red-500/50">
                    {availableJobFields.map(field => (
                      <SelectItem key={field.id} value={field.id} className="text-white hover:bg-red-900/30">
                        {field.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Job Listings */}
          {selectedJobField && availableJobs.length > 0 && (
            <Card className="bg-gradient-to-br from-red-900/30 to-black/60 border-red-500/30 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-red-600 to-red-800 rounded-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Available Jobs</CardTitle>
                    <CardDescription className="text-red-200">Click on a job to see details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {availableJobs.map(job => (
                    <div
                      key={job.id}
                      onClick={() => handleJobSelect(job)}
                      className="p-6 bg-gradient-to-r from-black/40 to-red-900/20 rounded-lg border border-red-500/30 cursor-pointer hover:border-red-400 hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-1">{job.title}</h3>
                          <p className="text-red-200">{job.company}</p>
                        </div>
                        <Badge className="bg-red-600 text-white">{job.salary}</Badge>
                      </div>
                      <p className="text-red-100 mb-3">{job.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {job.requiredSkills.map((skill: string) => (
                          <Badge
                            key={skill}
                            variant={userSkills.includes(skill) ? "default" : "outline"}
                            className={userSkills.includes(skill) 
                              ? "bg-green-600 text-white" 
                              : "border-red-500/50 text-red-300"
                            }
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Job Analysis */}
          {showJobDetails && selectedJob && (
            <Card className="bg-gradient-to-br from-red-900/30 to-black/60 border-red-500/30 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-red-600 to-red-800 rounded-lg">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Job Analysis: {selectedJob.title}</CardTitle>
                    <CardDescription className="text-red-200">Skills match analysis</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">Skill Match</span>
                      <span className="text-white font-bold">{getSkillMatchPercentage()}%</span>
                    </div>
                    <Progress value={getSkillMatchPercentage()} className="h-3 bg-black/50" />
                  </div>

                  {getMatchingSkills().length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-green-400 mb-3">✓ Skills You Have</h4>
                      <div className="flex flex-wrap gap-2">
                        {getMatchingSkills().map(skill => (
                          <Badge key={skill} className="bg-green-600 text-white">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {getMissingSkills().length > 0 ? (
                    <div>
                      <h4 className="text-lg font-semibold text-red-400 mb-3">✗ Skills You Need</h4>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {getMissingSkills().map(skill => (
                          <Badge key={skill} variant="outline" className="border-red-500 text-red-300">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-gradient-to-r from-green-900/20 to-green-800/20 rounded-lg border border-green-500/30">
                      <Trophy className="h-16 w-16 text-green-400 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-green-400 mb-2">🎉 You're Ready!</h3>
                      <p className="text-green-200">You have all the required skills for this job!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certifications and Courses */}
          {showJobDetails && selectedJob && getMissingSkills().length > 0 && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Certifications */}
              {getRelevantCertifications().length > 0 && (
                <Card className="bg-gradient-to-br from-red-900/30 to-black/60 border-red-500/30 backdrop-blur-sm shadow-2xl">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-red-600 to-red-800 rounded-lg">
                        <Award className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-white">Recommended Certifications</CardTitle>
                        <CardDescription className="text-red-200">Get certified to fill skill gaps</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getRelevantCertifications().map(cert => (
                        <div key={cert.id} className="p-4 bg-gradient-to-r from-black/40 to-red-900/20 rounded-lg border border-red-500/20">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-white">{cert.name}</h4>
                            <Badge className="bg-red-600 text-white">{cert.duration}</Badge>
                          </div>
                          <p className="text-red-200 text-sm mb-2">by {cert.provider}</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {cert.skills.map(skill => (
                              <Badge key={skill} variant="outline" className="text-xs border-red-500/50 text-red-300">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-red-600 hover:bg-red-700 text-white w-full"
                            onClick={() => window.open(cert.link, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Certification
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Courses */}
              {getRelevantCourses().length > 0 && (
                <Card className="bg-gradient-to-br from-red-900/30 to-black/60 border-red-500/30 backdrop-blur-sm shadow-2xl">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-red-600 to-red-800 rounded-lg">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-white">Recommended Courses</CardTitle>
                        <CardDescription className="text-red-200">Learn through comprehensive courses</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getRelevantCourses().map(course => (
                        <div key={course.id} className="p-4 bg-gradient-to-r from-black/40 to-red-900/20 rounded-lg border border-red-500/20">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-white">{course.name}</h4>
                            <Badge className="bg-red-600 text-white">{course.duration}</Badge>
                          </div>
                          <p className="text-red-200 text-sm mb-2">by {course.provider}</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {course.skills.map(skill => (
                              <Badge key={skill} variant="outline" className="text-xs border-red-500/50 text-red-300">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-red-600 hover:bg-red-700 text-white w-full"
                            onClick={() => window.open(course.link, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Course
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;