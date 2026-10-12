// src/pages/Index.tsx
import React, { useState } from 'react';
import { useAuth } from "@/App"
import { Link, useNavigate } from 'react-router-dom';
import { getStudentToken, getFacultyToken ,apiFetch } from "@/lib/api";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brain, TrainFront } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
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

  const portalTab = (key: "student" | "faculty", code: string, label: string, color: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={activePortal === key}
      onClick={() => setActivePortal(key)}
      style={{ "--c": color } as React.CSSProperties}
      className="flex items-center justify-center gap-2.5 border-b-4 border-transparent bg-surface-2 px-3 py-4 font-display text-[17px] font-semibold text-ink-2 aria-selected:border-[color:var(--c)] aria-selected:bg-card aria-selected:text-foreground"
    >
      <span className="bullet">{code}</span>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen">
      {/* Error banner */}
      {error && (
        <div role="alert" className="relative z-10 bg-primary py-2 text-center text-sm font-semibold text-primary-foreground">
          {error}
        </div>
      )}

      {/* Header */}
      <AppHeader subtitle="Skills → jobs, mapped" plain>
        <span className="chip chip--mine hidden sm:inline-flex">AI-Powered Matching</span>
        <span className="chip hidden sm:inline-flex" style={{ "--d": "hsl(var(--line-teal))" } as React.CSSProperties}>
          Career Analytics
        </span>
      </AppHeader>

      {/* Main Content */}
      <main className="mx-auto grid max-w-7xl items-start gap-10 px-4 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:pt-14">
        <section>
          <p className="eyebrow mb-4 flex items-center gap-2 text-red-ink">
            <span className="bullet h-[22px] w-[22px]">CP</span>
            Your career, as a route map
          </p>
          <h1 className="rv text-[clamp(44px,5.8vw,80px)] font-extrabold leading-[0.97] tracking-[-0.03em]">
            {["Discover", "your", "perfect"].map((w, i) => (
              <React.Fragment key={w}>
                <span style={{ "--i": i } as React.CSSProperties}>{w}</span>{" "}
              </React.Fragment>
            ))}
            <em className="text-line-red">
              <span style={{ "--i": 3 } as React.CSSProperties}>career</span>{" "}
              <span style={{ "--i": 4 } as React.CSSProperties}>path</span>
            </em>
          </h1>
          <p className="mt-5 max-w-[34em] font-display text-xl leading-relaxed text-ink-2">
            Match your skills with industry demands, get AI-powered job
            recommendations, and discover certifications to advance your
            career with our innovative platform.
          </p>

          {/* Features: three stops on one line */}
          <ul className="relative mt-9 before:absolute before:bottom-3.5 before:left-[14px] before:top-3.5 before:w-1.5 before:rounded before:bg-ink">
            {[
              ["AI Skill Analysis", "Match your academic skills with industry requirements using advanced AI", "--line-red"],
              ["Smart Job Matching", "Get personalized job suggestions based on your unique profile", "--line-teal"],
              ["Learning Pathways", "Discover certifications and courses to bridge skill gaps", "--line-amber"],
            ].map(([title, text, c]) => (
              <li key={title} className="relative grid grid-cols-[34px_1fr] gap-4 py-2.5">
                <span className="relative z-[1] h-[34px] w-[34px] rounded-full border-[5px] bg-station" style={{ borderColor: `hsl(var(${c}))` }} />
                <div>
                  <h3 className="text-[19px] font-bold">{title}</h3>
                  <p className="text-ink-2">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="news-block overflow-hidden" style={{ borderTopWidth: 4 }} aria-label="Sign in">
          <div className="grid grid-cols-2 border-b" role="tablist">
            {portalTab("student", "ST", "SkillTracker", "hsl(var(--line-red))")}
            {portalTab("faculty", "DX", "Dev Expert", "hsl(var(--line-blue))")}
          </div>

          {activePortal === "student" && (
            <div className="grid gap-5 p-5 sm:p-8">
              <div>
                <h2 className="text-3xl font-extrabold">SkillTracker Portal</h2>
                <p className="mt-1 text-ink-2">Analyze your skills and discover career opportunities</p>
              </div>
              {!showCreateAccount ? (
                <form onSubmit={handleStudentLogin} className="grid gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="student-email">Email</Label>
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
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="student-password">Password</Label>
                      <Link to="/forgot-password" className="text-sm font-semibold text-red-ink underline underline-offset-4">Forgot password?</Link>
                    </div>
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
                    />
                  </div>
                  <Button type="submit" className="h-11">
                    <TrainFront />
                    Login as Student
                  </Button>
                  <p className="text-center text-sm text-ink-2">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setShowCreateAccount(true)}
                      className="font-semibold text-red-ink underline underline-offset-4"
                    >
                      Create one
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleCreateAccount} className="grid gap-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* First Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="new-first-name">First Name</Label>
                      <Input
                        id="new-first-name"
                        type="text"
                        required
                        value={newAccount.firstName}
                        onChange={e =>
                          setNewAccount({ ...newAccount, firstName: e.target.value })
                        }
                      />
                    </div>
                    {/* Last Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="new-last-name">Last Name</Label>
                      <Input
                        id="new-last-name"
                        type="text"
                        required
                        value={newAccount.lastName}
                        onChange={e =>
                          setNewAccount({ ...newAccount, lastName: e.target.value })
                        }
                      />
                    </div>
                    {/* Email */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="new-email">Email</Label>
                      <Input
                        id="new-email"
                        type="email"
                        required
                        value={newAccount.email}
                        onChange={e =>
                          setNewAccount({ ...newAccount, email: e.target.value })
                        }
                      />
                    </div>
                    {/* Company Name */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="new-company">Company Name</Label>
                      <Input
                        id="new-company"
                        type="text"
                        value={newAccount.companyName}
                        onChange={e =>
                          setNewAccount({ ...newAccount, companyName: e.target.value })
                        }
                      />
                    </div>
                    {/* Job Title */}
                    <div className="space-y-2 md:col-span-2">
                      <Label>Job Title</Label>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Job title">
                        {(['student','alumni','other'] as const).map((opt) => (
                          <label
                            key={opt}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border bg-field px-3.5 py-2 font-medium has-[:checked]:border-line-red has-[:checked]:bg-red-soft"
                          >
                            <input
                              type="radio"
                              name="jobTitle"
                              value={opt}
                              checked={newAccount.jobTitle === opt}
                              onChange={() =>
                                setNewAccount({ ...newAccount, jobTitle: opt })
                              }
                              className="m-0 accent-[hsl(var(--line-red))]"
                            />
                            <span className="capitalize">{opt}</span>
                          </label>
                        ))}
                      </div>

                      {newAccount.jobTitle === 'other' && (
                        <Input
                          id="new-other-job"
                          aria-label="Other job title"
                          placeholder="Please specify"
                          value={newAccount.otherJobs}
                          onChange={(e) =>
                            setNewAccount({ ...newAccount, otherJobs: e.target.value })
                          }
                        />
                      )}
                    </div>
                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="new-password">Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        required
                        value={newAccount.password}
                        onChange={e =>
                          setNewAccount({ ...newAccount, password: e.target.value })
                        }
                      />
                    </div>
                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        required
                        value={newAccount.confirmPassword}
                        onChange={e =>
                          setNewAccount({ ...newAccount, confirmPassword: e.target.value })
                        }
                      />
                    </div>
                    {/* Bio */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="new-bio">Bio</Label>
                      <Textarea
                        id="new-bio"
                        rows={3}
                        value={newAccount.bio}
                        onChange={e =>
                          setNewAccount({ ...newAccount, bio: e.target.value })
                        }
                      />
                    </div>
                    {/* Phones */}
                    <div className="space-y-1.5">
                      <Label htmlFor="new-phone1">Primary Phone</Label>
                      <Input
                        id="new-phone1"
                        type="tel"
                        value={newAccount.phonePrimary}
                        onChange={e =>
                          setNewAccount({ ...newAccount, phonePrimary: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-phone2">Secondary Phone</Label>
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
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="new-phone3">Work Phone</Label>
                      <Input
                        id="new-phone3"
                        type="tel"
                        value={newAccount.phoneWork}
                        onChange={e =>
                          setNewAccount({ ...newAccount, phoneWork: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <Button type="submit" className="h-11">
                    Create Account
                  </Button>

                  <p className="text-center text-sm">
                    <button
                      type="button"
                      onClick={() => setShowCreateAccount(false)}
                      className="font-semibold text-red-ink underline underline-offset-4"
                    >
                      Back to login
                    </button>
                  </p>
                </form>
              )}
            </div>
          )}

          {activePortal === "faculty" && (
            <form onSubmit={handleFacultyLogin} className="grid gap-5 p-5 sm:p-8">
              <div>
                <h2 className="text-3xl font-extrabold">Development Expert Portal</h2>
                <p className="mt-1 text-ink-2">Access analytics and insights about career trends</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faculty-email">Faculty Email</Label>
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
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="faculty-password">Password</Label>
                  <Link to="/forgot-password" className="text-sm font-semibold text-red-ink underline underline-offset-4">Forgot password?</Link>
                </div>
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
                />
              </div>
              <Button type="submit" className="h-11 bg-line-blue text-white hover:bg-line-blue/90">
                <Brain />
                Login as Faculty
              </Button>
              <p className="text-center text-sm text-ink-2">
                Faculty accounts are managed by administration
              </p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
