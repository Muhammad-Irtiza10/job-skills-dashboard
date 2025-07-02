// src/pages/Profile.tsx
import React, { useState, useEffect } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Mail,
  Briefcase,
  Users,
  Phone,
  Zap,
  Plus,
  X,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "../App"
import { apiFetch } from "../lib/api"

interface Skill {
  id: number
  name: string
}

interface ProfileData {
  first_name:      string
  last_name:       string
  email:           string
  company_name:    string
  job_title:       string
  other_job_title: string
  phone_primary:   string
  phone_secondary: string
  phone_work:      string
  bio:             string
  major:           { id: number; name: string } | null
  skills:          Skill[]
}

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { token } = useAuth()

  const [editing, setEditing] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // 1) Load profile
  useEffect(() => {
    if (!token) return
    setLoading(true)
    apiFetch("/profile/")
      .then((data: ProfileData) => setProfile(data))
      .catch((err) => {
        console.error("Profile load failed:", err)
        toast({ title: "Error", description: "Could not load profile." })
      })
      .finally(() => setLoading(false))
  }, [token])

  // 2) Generic field‐change handler
  const handleChange = (field: keyof ProfileData, value: string) => {
    if (!profile) return
    setProfile({ ...profile, [field]: value })
  }

  // inside your component…

// helper: given an existing skillId, PATCH it into the profile
  async function attachSkillToProfile(skillId: number) {
    if (!profile) return;
    const newIds = Array.from(new Set([ 
      ...profile.skills.map((s) => s.id), 
      skillId 
    ]));
    const updated: ProfileData = await apiFetch("/profile/", {
      method: "PATCH",
      body: JSON.stringify({ skills: newIds }),
    });
    setProfile(updated);
    toast({ title: "Added", description: `Skill added.` });
  }

// revised addSkill
  const addSkill = async () => {
    if (!profile) return;
    const name = newSkill.trim();
    if (!name) return;

    try {
      // 1) Try creating it
      const skill: Skill = await apiFetch("/skills/", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      // success → attach it
      await attachSkillToProfile(skill.id);
    } catch (err: any) {
      // 2) If it already exists (400), look it up instead
      if (err.message.startsWith("API 400")) {
        const hits: Skill[] = await apiFetch(
          `/skills/?search=${encodeURIComponent(name)}`
        );
        if (hits.length > 0) {
          await attachSkillToProfile(hits[0].id);
        } else {
          toast({ title: "Error", description: "Could not find skill." });
        }
      } else {
        toast({ title: "Error", description: err.message });
      }
    } finally {
      setNewSkill("");
    }
  };

  /** 3.5) Save all the edited personal fields back to the API */
  const handleSave = async () => {
    if (!profile) return

    try {
      // send everything in one go
      const updated: ProfileData = await apiFetch("/profile/", {
        method: "PATCH",
        body: JSON.stringify({
          // user.* fields are handled by your serializer/update()
          first_name:       profile.first_name,
          last_name:        profile.last_name,
          email:            profile.email,
          company_name:     profile.company_name,
          job_title:        profile.job_title,
          other_job_title:  profile.other_job_title,
          phone_primary:    profile.phone_primary,
          phone_secondary:  profile.phone_secondary,
          phone_work:       profile.phone_work,
          bio:              profile.bio,
          // leave major/skills intact if you don’t want to edit here
          // major: profile.major?.id,
          // skills: profile.skills.map((s) => s.id),
        }),
      })

    setProfile(updated)
    setEditing(false)
    toast({ title: "Saved", description: "Profile updated." })
  } catch (err: any) {
    console.error("Save failed:", err)
    toast({ title: "Error", description: err.message || "Could not save." })
  }
}

  const removeSkill = async (skillId: number) => {
    if (!profile) return
    const updated: ProfileData = await apiFetch("/profile/", {
      method: "PATCH",
      body: JSON.stringify({
        skills: profile.skills
          .filter((s) => s.id !== skillId)
          .map((s) => s.id),
      }),
    })
    setProfile(updated)
    toast({ title: "Removed", description: "Skill removed." })
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-800 to-black">
        <p className="text-white text-lg">Loading your profile…</p>
      </div>
    )
  }

  // 4) Define personal info fields
  const personalFields: Array<[keyof ProfileData, string, JSX.Element]> = [
    ["first_name",      "First Name",      <User className="h-4 w-4 text-gray-600" />],
    ["last_name",       "Last Name",       <User className="h-4 w-4 text-gray-600" />],
    ["email",           "Email",           <Mail className="h-4 w-4 text-gray-600" />],
    ["company_name",    "Company",         <Briefcase className="h-4 w-4 text-gray-600" />],
    ["job_title",       "Job Title",       <Users className="h-4 w-4 text-gray-600" />],
    ["other_job_title", "Other Title",     <Zap className="h-4 w-4 text-gray-600" />],
    ["phone_primary",   "Phone #1",        <Phone className="h-4 w-4 text-gray-600" />],
    ["phone_secondary", "Phone #2",        <Phone className="h-4 w-4 text-gray-600" />],
    ["phone_work",      "Work Phone",      <Phone className="h-4 w-4 text-gray-600" />],
    ["bio",             "Bio",             <User className="h-4 w-4 text-gray-600" />],
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-800 to-black pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-900 to-black">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          <div className="space-x-2">
            <Button
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white/20"
              onClick={() => navigate("/student-dashboard")}
            >
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white/20"
              onClick={() => {
                localStorage.removeItem("apiToken")
                navigate("/")
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
       {/* Profile Banner */}
        <Card className="bg-white/80 backdrop-blur-sm border border-white/30 mb-8">
          <CardHeader className="flex flex-row items-center justify-between px-8 py-6">
            {/* left side: avatar + text */}
            <div className="flex flex-row items-center space-x-6">
              <User className="h-12 w-12 text-gray-600" />
              <div className="text-left">
                <h2 className="text-3xl font-semibold text-black">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-lg text-gray-700 mt-1">
                  {profile.major?.name || "No Major"} • {profile.job_title || "No Title"}
                </p>
              </div>
            </div>

            {/* right side: edit button */}
            <Button
              onClick={() => {
                if (editing) {
                  handleSave()
                } else {
                  setEditing(true)
                }
              }}
              className={`${
                editing ? "bg-green-600 hover:bg-green-700" : "bg-red-800 hover:bg-red-900"
              } text-white`}
            >
              {editing ? "Done Editing" : "Edit Profile"}
            </Button>
          </CardHeader>
        </Card>
        {/* Personal Info */}
        <Card className="bg-white/80 backdrop-blur-sm border border-white/30">
          <CardHeader>
            <CardTitle className="text-2xl text-black">Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            {personalFields.map(([field, labelText, IconEl]) => (
              <div key={field}>
                <Label htmlFor={String(field)} className="block text-gray-800 mb-1">
                  {labelText}
                </Label>
                <div className="flex items-center space-x-2">
                  {IconEl}
                  {field === "bio" ? (
                    <Textarea
                      id="bio"
                      rows={3}
                      disabled={!editing}
                      value={profile.bio}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      className="bg-white/60 text-black w-full"
                    />
                  ) : (
                    <Input
                      id={String(field)}
                      disabled={!editing}
                      value={(profile[field] as string) || ""}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="bg-white/60 text-black w-full"
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="bg-white/80 backdrop-blur-sm border border-white/30">
          <CardHeader>
            <CardTitle className="text-2xl text-black">My Skills</CardTitle>
            <CardDescription className="text-gray-700">
              {profile.skills.length} skill
              {profile.skills.length !== 1 && "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Add a new skill…"
                value={newSkill}
                disabled={!editing}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addSkill()}
                className="bg-white/60 placeholder-gray-500 text-black"
              />
              <Button
                onClick={addSkill}
                disabled={!editing}
                className="bg-red-800 hover:bg-red-900 text-white"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <Badge
                  key={s.id}
                  className="bg-red-800 text-white px-3 py-1 flex items-center"
                >
                  {s.name}
                  {editing && (
                    <button
                      onClick={() => removeSkill(s.id)}
                      className="ml-1 hover:text-gray-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  )
}

export default Profile
