
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Users, BookOpen, TrendingUp, Zap, Brain, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const [studentLogin, setStudentLogin] = useState({ email: '', password: '' });
  const [facultyLogin, setFacultyLogin] = useState({ email: '', password: '' });
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const navigate = useNavigate();

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Student login:', studentLogin);
    // Here you would validate credentials with your backend
    navigate('/student-dashboard');
  };

  const handleFacultyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Faculty login:', facultyLogin);
    // Here you would validate credentials with your backend
    navigate('/faculty-dashboard');
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAccount.password !== newAccount.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    console.log('Creating account:', newAccount);
    // Here you would create account with your backend
    setShowCreateAccount(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-900/20 to-black/40 backdrop-blur-sm border-b border-red-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-red-600 to-red-800 rounded-lg shadow-lg shadow-red-500/20">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-white to-red-300 bg-clip-text text-transparent">
                CareerPath Analyzer
              </h1>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-red-400" />
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
          <h2 className="text-5xl font-bold bg-gradient-to-r from-red-400 via-white to-red-300 bg-clip-text text-transparent mb-6">
            Discover Your Perfect Career Path
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Match your skills with industry demands, get AI-powered job recommendations, 
            and discover certifications to advance your career with our futuristic platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Student Login */}
          <Card className="bg-gradient-to-br from-red-900/40 via-black/60 to-gray-900/40 border-red-500/30 backdrop-blur-sm shadow-2xl shadow-red-500/10 hover:shadow-red-500/20 transition-all duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-500/30">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl bg-gradient-to-r from-red-400 to-white bg-clip-text text-transparent">Student Portal</CardTitle>
              <CardDescription className="text-gray-300 text-lg">
                Analyze your skills and discover career opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateAccount ? (
                <form onSubmit={handleStudentLogin} className="space-y-6">
                  <div>
                    <Label htmlFor="student-email" className="text-gray-300">Email</Label>
                    <Input
                      id="student-email"
                      type="email"
                      placeholder="Enter your email"
                      value={studentLogin.email}
                      onChange={(e) => setStudentLogin({ ...studentLogin, email: e.target.value })}
                      required
                      className="bg-black/50 border-red-500/30 text-white placeholder-gray-400 focus:border-red-400 focus:ring-red-400/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-password" className="text-gray-300">Password</Label>
                    <Input
                      id="student-password"
                      type="password"
                      placeholder="Enter your password"
                      value={studentLogin.password}
                      onChange={(e) => setStudentLogin({ ...studentLogin, password: e.target.value })}
                      required
                      className="bg-black/50 border-red-500/30 text-white placeholder-gray-400 focus:border-red-400 focus:ring-red-400/20"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-semibold py-3 rounded-lg shadow-lg shadow-red-500/20">
                    <Zap className="h-4 w-4 mr-2" />
                    Login as Student
                  </Button>
                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateAccount(true)}
                      className="text-red-400 hover:text-red-300 text-sm underline transition-colors"
                    >
                      Don't have an account? Create one
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div>
                    <Label htmlFor="new-name" className="text-gray-300">Full Name</Label>
                    <Input
                      id="new-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      required
                      className="bg-black/50 border-red-500/30 text-white placeholder-gray-400 focus:border-red-400 focus:ring-red-400/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-email" className="text-gray-300">Email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="Enter your email"
                      value={newAccount.email}
                      onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                      required
                      className="bg-black/50 border-red-500/30 text-white placeholder-gray-400 focus:border-red-400 focus:ring-red-400/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password" className="text-gray-300">Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Create a password"
                      value={newAccount.password}
                      onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                      required
                      className="bg-black/50 border-red-500/30 text-white placeholder-gray-400 focus:border-red-400 focus:ring-red-400/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password" className="text-gray-300">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={newAccount.confirmPassword}
                      onChange={(e) => setNewAccount({ ...newAccount, confirmPassword: e.target.value })}
                      required
                      className="bg-black/50 border-red-500/30 text-white placeholder-gray-400 focus:border-red-400 focus:ring-red-400/20"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white font-semibold py-3 rounded-lg shadow-lg shadow-green-500/20">
                    Create Account
                  </Button>
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateAccount(false)}
                      className="text-gray-400 hover:text-gray-300 text-sm underline transition-colors"
                    >
                      Back to login
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Faculty Login */}
          <Card className="bg-gradient-to-br from-gray-900/40 via-black/60 to-red-900/40 border-gray-500/30 backdrop-blur-sm shadow-2xl shadow-gray-500/10 hover:shadow-gray-500/20 transition-all duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-gray-500/30">
                <Users className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Faculty Portal</CardTitle>
              <CardDescription className="text-gray-300 text-lg">
                Access analytics and insights about career trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFacultyLogin} className="space-y-6">
                <div>
                  <Label htmlFor="faculty-email" className="text-gray-300">Faculty Email</Label>
                  <Input
                    id="faculty-email"
                    type="email"
                    placeholder="Enter your faculty email"
                    value={facultyLogin.email}
                    onChange={(e) => setFacultyLogin({ ...facultyLogin, email: e.target.value })}
                    required
                    className="bg-black/50 border-gray-500/30 text-white placeholder-gray-400 focus:border-gray-400 focus:ring-gray-400/20"
                  />
                </div>
                <div>
                  <Label htmlFor="faculty-password" className="text-gray-300">Password</Label>
                  <Input
                    id="faculty-password"
                    type="password"
                    placeholder="Enter your password"
                    value={facultyLogin.password}
                    onChange={(e) => setFacultyLogin({ ...facultyLogin, password: e.target.value })}
                    required
                    className="bg-black/50 border-gray-500/30 text-white placeholder-gray-400 focus:border-gray-400 focus:ring-gray-400/20"
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white font-semibold py-3 rounded-lg shadow-lg shadow-gray-500/20">
                  <Brain className="h-4 w-4 mr-2" />
                  Login as Faculty
                </Button>
                <div className="text-center pt-4 text-sm text-gray-400">
                  Faculty accounts are managed by administration
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="text-center group">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-600 to-red-800 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/20 group-hover:shadow-red-500/30 transition-all duration-300">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-red-300">AI Skill Analysis</h3>
            <p className="text-gray-300">Match your academic skills with industry requirements using advanced AI</p>
          </div>
          <div className="text-center group">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-white to-gray-300 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-white/10 group-hover:shadow-white/20 transition-all duration-300">
              <Target className="h-8 w-8 text-black" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-white">Smart Job Matching</h3>
            <p className="text-gray-300">Get personalized job suggestions based on your unique profile</p>
          </div>
          <div className="text-center group">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-black to-gray-800 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-black/30 group-hover:shadow-black/50 transition-all duration-300 border border-red-500/20">
              <GraduationCap className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-300">Learning Pathways</h3>
            <p className="text-gray-300">Discover certifications and courses to bridge skill gaps</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;