// src/pages/Index.tsx
import React, { useState } from 'react';
import { useAuth } from "@/App"
import { useNavigate } from 'react-router-dom';
import { getStudentToken, getFacultyToken ,apiFetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GraduationCap,
  Users,
  BookOpen,
  TrendingUp,
  Zap,
  Brain,
  Target,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@radix-ui/react-select';
import { validateHeaderName } from 'http';


const Index: React.FC = () => {
  const { setToken } = useAuth()
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const [activePortal, setActivePortal] = useState<"student" | "faculty">("student");

  const [studentLogin, setStudentLogin] = useState({
    email: '',
    password: '',
  });
  const [facultyLogin, setFacultyLogin] = useState({
    email: '',
    password: '',
  });

  const [showCreateAccount, setShowCreateAccount] = useState(false);

  interface NewAccount {
  // identity
  firstName: string;
  lastName: string;
  email: string;
  // login
  password: string;
  confirmPassword: string;
  // “professional” info
  companyName: string;
  jobTitle: "student" | "alumni" | "other";
  otherJobs?: string;     // only used when jobTitle === "other"
  // extra profile bits
  bio: string;
  phonePrimary: string;
  phoneSecondary: string;
  phoneWork: string;
}

  const [newAccount, setNewAccount] = useState<NewAccount>({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  companyName: '',
  jobTitle: 'student' as 'student'|'alumni'|'other',
  otherJobs: '',
  bio: '',
  phonePrimary: '',
  phoneSecondary: '',
  phoneWork: '',
});

  // Student login handler
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const token = await getStudentToken(studentLogin.email, studentLogin.password)
      setToken(token)
      localStorage.setItem('userType', 'student');
      navigate('/student-dashboard');
    } catch (err: any) {
      setError("Invalid credentials or account not yet created");
    }
  };

  // Faculty login handler
  const handleFacultyLogin = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setError(null);
    try {
      const token = await getFacultyToken(facultyLogin.email, facultyLogin.password)
      setToken(token)
      localStorage.setItem('userType', 'faculty');
      navigate('/faculty-dashboard');
    } catch (err: any) {
      setError("Invalid credentials or not authorized as faculty.");
    }
  };

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (newAccount.password !== newAccount.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      await apiFetch("/register/", {
        method: "POST",
        body: JSON.stringify({
          username:         newAccount.email,
          email:            newAccount.email,
          password:         newAccount.password,
          first_name:       newAccount.firstName,
          last_name:        newAccount.lastName,
          company_name:     newAccount.companyName,
          job_title:        newAccount.jobTitle,
          other_job_title:  newAccount.otherJobs || undefined,
          bio:              newAccount.bio,
          phone_primary:    newAccount.phonePrimary,
          phone_secondary:  newAccount.phoneSecondary,
          phone_work:       newAccount.phoneWork,
        }),
      });
      alert("Account created! Please log in.");
      setShowCreateAccount(false);
    } catch (err:any) {
      alert("Error creating account: " + err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black">
      {/* Error banner */}
      {error && (
        <div className="bg-red-700 text-white text-center py-2">
          {error}
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-red-600/30 to-black/50 backdrop-blur-sm border-b border-red-400/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-red-500 to-red-700 rounded-lg shadow-lg shadow-red-400/30">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-300 via-white to-red-200 bg-clip-text text-transparent">
                CareerPath Analyzer
              </h1>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-200">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-red-300" />
                <span>AI-Powered Matching</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-white" />
                <span>Career Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-red-300 via-white to-red-200 bg-clip-text text-transparent mb-6">
            Discover Your Perfect Career Path
          </h2>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
            Match your skills with industry demands, get AI-powered job
            recommendations, and discover certifications to advance your
            career with our innovative platform.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => setActivePortal("student")}
            className={`px-4 py-2 rounded-t-lg -mb-px border-b-2 ${
              activePortal === "student"
                ? "border-red-400 text-red-200 bg-red-900"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            SkillTracker
          </button>
          <button
            onClick={() => setActivePortal("faculty")}
            className={`px-4 py-2 rounded-t-lg -mb-px border-b-2 ${
              activePortal === "faculty"
                ? "border-blue-400 text-blue-200 bg-blue-900"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Dev Expert
          </button>
        </div>
        <div className="relative">
          {activePortal === "student" && (
            <div className="mx-auto max-w-md">
              {/* Student Card */}
              <Card className="bg-gradient-to-br from-red-800/60 via-red-900/40 to-gray-800/60 border-red-400/40 backdrop-blur-sm shadow-2xl shadow-red-400/20 hover:shadow-red-400/30 transition-all duration-300 mt-[-1px] bg-gradient-to-br">
                <CardHeader className="text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-400/40">
                    <GraduationCap className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl bg-gradient-to-r from-red-300 to-white bg-clip-text text-transparent">
                    SkillTracker Portal
                  </CardTitle>
                  <CardDescription className="text-gray-200 text-lg">
                    Analyze your skills and discover career opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!showCreateAccount ? (
                    <form onSubmit={handleStudentLogin} className="space-y-6">
                      <div>
                        <Label htmlFor="student-email" className="text-gray-200">
                          Email
                        </Label>
                        <Input
                          id="student-email"
                          type="email"
                          placeholder="Enter your email"
                          value={studentLogin.email}
                          onChange={(e) =>
                            setStudentLogin({
                              ...studentLogin,
                              email: e.target.value,
                            })
                          }
                          required
                          className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                        />
                      </div>
                      <div>
                        <Label htmlFor="student-password" className="text-gray-200">
                          Password
                        </Label>
                        <Input
                          id="student-password"
                          type="password"
                          placeholder="Enter your password"
                          value={studentLogin.password}
                          onChange={(e) =>
                            setStudentLogin({
                              ...studentLogin,
                              password: e.target.value,
                            })
                          }
                          required
                          className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-semibold py-3 rounded-lg shadow-lg shadow-red-400/30"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Login as Student
                      </Button>
                      <div className="text-center pt-4">
                        <button
                          type="button"
                          onClick={() => setShowCreateAccount(true)}
                          className="text-red-300 hover:text-red-200 text-sm underline transition-colors"
                        >
                          Don't have an account? Create one
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleCreateAccount} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* First Name */}
                        <div>
                          <Label htmlFor="new-first-name" className="text-gray-200">
                            First Name
                          </Label>
                          <Input
                            id="new-first-name"
                            type="text"
                            required
                            value={newAccount.firstName}
                            onChange={e =>
                              setNewAccount({ ...newAccount, firstName: e.target.value })
                            }
                            className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                          />
                        </div>
                        {/* Last Name */}
                        <div>
                          <Label htmlFor="new-last-name" className="text-gray-200">
                            Last Name
                          </Label>
                          <Input
                            id="new-last-name"
                            type="text"
                            required
                            value={newAccount.lastName}
                            onChange={e =>
                              setNewAccount({ ...newAccount, lastName: e.target.value })
                            }
                            className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                          />
                        </div>
                        {/* Email */}
                        <div className="md:col-span-2">
                          <Label htmlFor="new-email" className="text-gray-200">
                            Email
                          </Label>
                          <Input
                            id="new-email"
                            type="email"
                            required
                            value={newAccount.email}
                            onChange={e =>
                              setNewAccount({ ...newAccount, email: e.target.value })
                            }
                            className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                          />
                        </div>
                        {/* Company Name */}
                        <div className="md:col-span-2">
                          <Label htmlFor="new-company" className="text-gray-200">
                            Company Name
                          </Label>
                          <Input
                            id="new-company"
                            type="text"
                            value={newAccount.companyName}
                            onChange={e =>
                              setNewAccount({ ...newAccount, companyName: e.target.value })
                            }
                            className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                          />
                        </div>
                        {/* Job Title */}
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-gray-200">Job Title</Label>

                          <div className="flex items-center space-x-6">
                            {(['student','alumni','other'] as const).map((opt) => (
                              <label key={opt} className="inline-flex items-center text-gray-200">
                                <input
                                  type="radio"
                                  name="jobTitle"
                                  value={opt}
                                  checked={newAccount.jobTitle === opt}
                                  onChange={() =>
                                    setNewAccount({ ...newAccount, jobTitle: opt })
                                  }
                                  className="form-radio h-4 w-4 text-red-500 bg-transparent border-white"
                                />
                                <span className="ml-2 capitalize">{opt}</span>
                              </label>
                            ))}
                          </div>

                          {newAccount.jobTitle === 'other' && (
                            <Input
                              id="new-other-job"
                              placeholder="Please specify"
                              value={newAccount.otherJobs}
                              onChange={(e) =>
                                setNewAccount({ ...newAccount, otherJobs: e.target.value })
                              }
                              className="mt-2 bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                            />
                          )}
                        </div>
                        {/* Password */}
                        <div>
                          <Label htmlFor="new-password" className="text-gray-200">
                            Password
                          </Label>
                          <Input
                            id="new-password"
                            type="password"
                            required
                            value={newAccount.password}
                            onChange={e =>
                              setNewAccount({ ...newAccount, password: e.target.value })
                            }
                            className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                          />
                        </div>
                        {/* Confirm Password */}
                        <div>
                          <Label htmlFor="confirm-password" className="text-gray-200">
                            Confirm Password
                          </Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            required
                            value={newAccount.confirmPassword}
                            onChange={e =>
                              setNewAccount({ ...newAccount, confirmPassword: e.target.value })
                            }
                            className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                          />
                        </div>
                        {/* Bio */}
                        <div className="md:col-span-2">
                          <Label htmlFor="new-bio" className="text-gray-200">
                            Bio
                          </Label>
                          <Textarea
                            id="new-bio"
                            rows={3}
                            value={newAccount.bio}
                            onChange={e =>
                              setNewAccount({ ...newAccount, bio: e.target.value })
                            }
                            className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                          />
                        </div>
                        {/* Phones */}
                        <div>
                          <Label htmlFor="new-phone1" className="text-gray-200">
                            Primary Phone
                          </Label>
                          <Input
                            id="new-phone1"
                            type="tel"
                            value={newAccount.phonePrimary}
                            onChange={e =>
                              setNewAccount({ ...newAccount, phonePrimary: e.target.value })
                            }
                            className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-phone2" className="text-gray-200">
                            Secondary Phone
                          </Label>
                          <Input
                            id="new-phone2"
                            type="tel"
                            value={newAccount.phoneSecondary}
                            onChange={e =>
                              setNewAccount({
                                ...newAccount,
                                phoneSecondary: e.target.value,
                              })
                            }
                            className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="new-phone3" className="text-gray-200">
                            Work Phone
                          </Label>
                          <Input
                            id="new-phone3"
                            type="tel"
                            value={newAccount.phoneWork}
                            onChange={e =>
                              setNewAccount({ ...newAccount, phoneWork: e.target.value })
                            }
                            className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-semibold py-3 rounded-lg shadow-lg shadow-green-400/30"
                      >
                        Create Account
                      </Button>

                      <div className="text-center pt-4">
                        <button
                          type="button"
                          onClick={() => setShowCreateAccount(false)}
                          className="text-gray-300 hover:text-gray-200 text-sm underline transition-colors"
                        >
                          Back to login
                        </button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {activePortal === "faculty" && (
            <div className="mx-auto max-w-md">
              {/* Faculty Card */}
              <Card className="bg-gradient-to-br from-blue-900/60 via-gray-800/60 to-slate-800/60 border-blue-400/40 backdrop-blur-sm shadow-2xl shadow-blue-400/20 hover:shadow-blue-400/30 transition-all duration-300 mt-[-1px] bg-gradient-to-br">
                <CardHeader className="text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-400/40">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">
                    Development Expert Portal
                  </CardTitle>
                  <CardDescription className="text-gray-200 text-lg">
                    Access analytics and insights about career trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleFacultyLogin}
                    className="space-y-6"
                  >
                    <div>
                      <Label
                        htmlFor="faculty-email"
                        className="text-gray-200"
                      >
                        Faculty Email
                      </Label>
                      <Input
                        id="faculty-email"
                        type="email"
                        placeholder="Enter your faculty email"
                        value={facultyLogin.email}
                        onChange={(e) =>
                          setFacultyLogin({
                            ...facultyLogin,
                            email: e.target.value,
                          })
                        }
                        required
                        className="bg-gray-800/50 border-blue-400/50 text-white placeholder-gray-300 focus:border-blue-300 focus:ring-blue-300/30"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="faculty-password"
                        className="text-gray-200"
                      >
                        Password
                      </Label>
                      <Input
                        id="faculty-password"
                        type="password"
                        placeholder="Enter your password"
                        value={facultyLogin.password}
                        onChange={(e) =>
                          setFacultyLogin({
                            ...facultyLogin,
                            password: e.target.value,
                          })
                        }
                        required
                        className="bg-gray-800/50 border-blue-400/50 text-white placeholder-gray-300 focus:border-blue-300 focus:ring-blue-300/30"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-semibold py-3 rounded-lg shadow-lg shadow-blue-400/30"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Login as Faculty
                    </Button>
                    <div className="text-center pt-4 text-sm text-gray-300">
                      Faculty accounts are managed by administration
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="text-center group">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-red-700 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-red-400/30 group-hover:shadow-red-400/50 transition-all duration-300">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-red-200">
              AI Skill Analysis
            </h3>
            <p className="text-gray-200">
              Match your academic skills with industry requirements using
              advanced AI
            </p>
          </div>
          <div className="text-center group">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-white to-gray-200 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-white/20 group-hover:shadow-white/30 transition-all duration-300">
              <Target className="h-8 w-8 text-black" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-white">
              Smart Job Matching
            </h3>
            <p className="text-gray-200">
              Get personalized job suggestions based on your unique profile
            </p>
          </div>
          <div className="text-center group">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-gray-500/30 group-hover:shadow-gray-500/50 transition-all duration-300 border border-red-400/30">
              <GraduationCap className="h-8 w-8 text-red-300" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-200">
              Learning Pathways
            </h3>
            <p className="text-gray-200">
              Discover certifications and courses to bridge skill gaps
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
