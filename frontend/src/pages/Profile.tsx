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
import { Badge } from "@/components/ui/badge"
import { Plus, X, User } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "../App"
import { apiFetch } from "../lib/api"

interface Skill {
  id: number
  name: string
}

interface ProfileData {
  major: { id: number; name: string } | null
  skills: Skill[]
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

  // 2) Skill handlers
  const addSkill = async () => {
    if (!profile) return
    const trimmed = newSkill.trim()
    if (!trimmed) return

    try {
      const skill: Skill = await apiFetch("/skills/", {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      })
      const updated = await apiFetch("/profile/", {
        method: "PATCH",
        body: JSON.stringify({
          skills: [...profile.skills.map((s) => s.id), skill.id],
        }),
      })
      setProfile(updated)
      setNewSkill("")
      toast({ title: "Added", description: `"${skill.name}" added.` })
    } catch (err: any) {
      console.error(err)
      toast({ title: "Error", description: err.message || "Couldn’t add skill." })
    }
  }

  const removeSkill = async (skillId: number) => {
    if (!profile) return
    const updated = await apiFetch("/profile/", {
      method: "PATCH",
      body: JSON.stringify({
        skills: profile.skills.filter((s) => s.id !== skillId).map((s) => s.id),
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
              Back
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white/20"
              onClick={() => {
                localStorage.removeItem("apiToken");
                navigate("/");
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Major */}
        <Card className="bg-white/80 backdrop-blur-sm border border-white/30">
          <CardHeader>
            <CardTitle className="text-2xl text-black">My Major</CardTitle>
            <CardDescription className="text-gray-700">
              {profile.major?.name ?? "Not set"}
            </CardDescription>
          </CardHeader>
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

        <div className="text-right">
          <Button
            onClick={() => setEditing((e) => !e)}
            className="bg-red-800 hover:bg-red-900 text-white"
          >
            {editing ? "Done Editing" : "Edit Skills"}
          </Button>
        </div>
      </main>
    </div>
  )
}

export default Profile
