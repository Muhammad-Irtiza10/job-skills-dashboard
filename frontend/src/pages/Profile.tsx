// src/pages/Profile.tsx
import React, { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, X, User, Mail, Phone, MapPin, Calendar, Save, Edit,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "../App"          // <-- our token context
import { apiFetch } from "../lib/api"     // <-- our helper

interface ProfileData {
  name: string
  email: string
  phone: string
  location: string
  major: string
  graduationYear: string
  bio: string
  skills: string[]
}

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { token } = useAuth()

  const [editing, setEditing] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // 1) Fetch your profile on mount
  useEffect(() => {
    if (!token) return
    setLoading(true)
    apiFetch("/api/profile/")
      .then((data: ProfileData) => {
        setProfile(data)
      })
      .catch((err) => {
        console.error("Profile load failed:", err)
        toast({ title: "Error", description: "Could not load profile." })
      })
      .finally(() => setLoading(false))
  }, [token])

  // 2) Handlers
  const addSkill = () => {
    if (!profile) return
    const s = newSkill.trim()
    if (s && !profile.skills.includes(s)) {
      setProfile({ ...profile, skills: [...profile.skills, s] })
      setNewSkill("")
      toast({ title: "Skill Added", description: `${s} has been added.` })
    }
  }

  const removeSkill = (skillToRemove: string) => {
    if (!profile) return
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s !== skillToRemove),
    })
    toast({ title: "Skill Removed", description: `${skillToRemove} removed.` })
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    if (!profile) return
    setProfile({ ...profile, [field]: value })
  }

  // 3) Save back to API
  const handleSave = () => {
    if (!profile) return
    apiFetch("/api/profile/", {
      method: "PUT",
      body: JSON.stringify(profile),
    })
      .then((data: ProfileData) => {
        setProfile(data)
        setEditing(false)
        toast({ title: "Saved", description: "Your profile was updated." })
      })
      .catch((err) => {
        console.error("Save failed:", err)
        toast({ title: "Error", description: "Could not save profile." })
      })
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading your profile…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate("/student-dashboard")}
            >
              Back
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Header */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">{profile.name}</CardTitle>
                <CardDescription className="text-lg">
                  {profile.major} • Class of {profile.graduationYear}
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => (editing ? handleSave() : setEditing(true))}
              variant={editing ? "default" : "outline"}
            >
              {editing ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
          </CardHeader>
        </Card>

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your contact/details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {(
                [
                  ["name", "Full Name", <></>] as const,
                  ["email", "Email", <Mail className="h-4 w-4 text-gray-400" />] as const,
                  ["phone", "Phone", <Phone className="h-4 w-4 text-gray-400" />] as const,
                  ["location", "Location", <MapPin className="h-4 w-4 text-gray-400" />] as const,
                  ["major", "Major", <></>] as const,
                  ["graduationYear", "Graduation Year", <Calendar className="h-4 w-4 text-gray-400" />] as const,
                ] as Array<[keyof ProfileData, string, JSX.Element]>
              ).map(([field, label, Icon]) => (
                <div key={field}>
                  <Label htmlFor={field}>{label}</Label>
                  <div className="flex items-center space-x-2">
                    {Icon}
                    <Input
                      id={field}
                      value={profile[field]}
                      disabled={!editing}
                      onChange={(e) =>
                        handleInputChange(field, e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                disabled={!editing}
                value={profile.bio}
                onChange={(e) =>
                  handleInputChange("bio", e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>My Skills</CardTitle>
            <CardDescription>
              Manage the skills on your profile
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
              />
              <Button
                onClick={addSkill}
                disabled={!editing}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">
                Current Skills ({profile.skills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="px-3 py-1 flex items-center"
                  >
                    {skill}
                    {editing && (
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-2 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Profile
