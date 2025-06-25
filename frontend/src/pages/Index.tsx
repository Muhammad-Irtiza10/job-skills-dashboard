// src/pages/Index.tsx
import React, { useState } from 'react';
import { useAuth } from "@/App"
import { useNavigate } from 'react-router-dom';
import { apiFetch } from "@/lib/api";
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

// Helper to fetch a token from your DRF endpoint
async function getToken(email: string, password: string): Promise<string> {
  const res = await fetch('http://127.0.0.1:8000/api/email-token-auth/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Login failed');
  }
  return data.token;
}

const Index: React.FC = () => {
  const { setToken } = useAuth()
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const [studentLogin, setStudentLogin] = useState({
    email: '',
    password: '',
  });
  const [facultyLogin, setFacultyLogin] = useState({
    email: '',
    password: '',
  });

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Student login handler
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const token = await getToken(studentLogin.email, studentLogin.password);
      setToken(token)
      localStorage.setItem('userType', 'student');
      navigate('/student-dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Faculty login handler
  const handleFacultyLogin = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setError(null);
    try {
      const token = await getToken(
        facultyLogin.email,
        facultyLogin.password,
      );
      setToken(token)
      localStorage.setItem('userType', 'faculty');
      navigate('/faculty-dashboard');
    } catch (err: any) {
      setError(err.message);
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
          username: newAccount.email,        // or you could let them choose a username
          email: newAccount.email,
          password: newAccount.password,
          first_name: newAccount.name.split(" ")[0],
          last_name: newAccount.name.split(" ").slice(1).join(" "),
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

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Student Card */}
          <Card className="bg-gradient-to-br from-red-800/60 via-red-900/40 to-gray-800/60 border-red-400/40 backdrop-blur-sm shadow-2xl shadow-red-400/20 hover:shadow-red-400/30 transition-all duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-400/40">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl bg-gradient-to-r from-red-300 to-white bg-clip-text text-transparent">
                Student Portal
              </CardTitle>
              <CardDescription className="text-gray-200 text-lg">
                Analyze your skills and discover career opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateAccount ? (
                <form
                  onSubmit={handleStudentLogin}
                  className="space-y-6"
                >
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
                    <Label
                      htmlFor="student-password"
                      className="text-gray-200"
                    >
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
                <form
                  onSubmit={handleCreateAccount}
                  className="space-y-4"
                >
                  <div>
                    <Label
                      htmlFor="new-name"
                      className="text-gray-200"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="new-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={newAccount.name}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          name: e.target.value,
                        })
                      }
                      required
                      className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="new-email"
                      className="text-gray-200"
                    >
                      Email
                    </Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="Enter your email"
                      value={newAccount.email}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          email: e.target.value,
                        })
                      }
                      required
                      className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="new-password"
                      className="text-gray-200"
                    >
                      Password
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Create a password"
                      value={newAccount.password}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          password: e.target.value,
                        })
                      }
                      required
                      className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="confirm-password"
                      className="text-gray-200"
                    >
                      Confirm Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={newAccount.confirmPassword}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      className="bg-gray-800/50 border-red-400/50 text-white placeholder-gray-300 focus:border-red-300 focus:ring-red-300/30"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-semibold py-3 rounded-lg shadow-lg shadow-green-400/30"
                  >
                    Create Account
                  </Button>
                  <div className="text-center pt-2">
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

          {/* Faculty Card */}
          <Card className="bg-gradient-to-br from-blue-900/60 via-gray-800/60 to-slate-800/60 border-blue-400/40 backdrop-blur-sm shadow-2xl shadow-blue-400/20 hover:shadow-blue-400/30 transition-all duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-400/40">
                <Users className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">
                Faculty Portal
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
