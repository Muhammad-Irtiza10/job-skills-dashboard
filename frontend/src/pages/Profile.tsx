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
import {
  User,
  Mail,
  Briefcase,
  Users,
  Phone,
  Zap,
  Plus,
  X,
  Check,
  Pencil,
  ArrowLeft,
  LogOut,
  Camera,
  KeyRound,
} from "lucide-react"
import AppHeader from "@/components/AppHeader"
import ProfileInsights from "@/components/ProfileInsights"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "../App"
import { apiFetch, apiUpload } from "../lib/api"

interface Skill {
  id: number
  name: string
  category?: "major" | "technical" | "soft"
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024

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
  avatar_url?:     string | null
}

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { token, setToken } = useAuth()
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" })
  const [pwMsg, setPwMsg] = useState<{ text: string; error?: boolean } | null>(null)

  // change password; the server returns a fresh token so this session stays signed in
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) return setPwMsg({ text: "The new passwords don't match.", error: true })
    try {
      const r = await apiFetch("/password-change/", {
        method: "POST",
        body: JSON.stringify({ current_password: pw.current, new_password: pw.next }),
      })
      setToken(r.token)
      setPw({ current: "", next: "", confirm: "" })
      setPwMsg({ text: "Password changed." })
    } catch (err: any) {
      setPwMsg({ text: err.message.replace(/^API \d+: /, ""), error: true })
    }
  }

  const [editing, setEditing] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [photoMsg, setPhotoMsg] = useState<{ text: string; error?: boolean } | null>(null)

  // Upload a new profile photo (server checks type/size again and shrinks it to 512px)
  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return setPhotoMsg({ text: "Use a JPG, PNG or WebP image.", error: true })
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return setPhotoMsg({ text: "Image must be 2 MB or smaller.", error: true })
    }
    setPhotoMsg({ text: "Uploading photo…" })
    try {
      const form = new FormData()
      form.append("avatar", file)
      setProfile(await apiUpload("/profile/avatar/", form))
      setPhotoMsg({ text: "Photo updated." })
    } catch (err: any) {
      setPhotoMsg({ text: err.message || "Could not upload photo.", error: true })
    }
  }

  const removePhoto = async () => {
    try {
      setProfile(await apiFetch("/profile/avatar/", { method: "DELETE" }))
      setPhotoMsg({ text: "Photo removed." })
    } catch (err: any) {
      setPhotoMsg({ text: err.message || "Could not remove photo.", error: true })
    }
  }
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
      <div className="flex min-h-screen items-center justify-center" aria-busy="true">
        <p className="font-display text-xl text-ink-2">Loading your profile…</p>
      </div>
    )
  }

  // 4) Define personal info fields
  const personalFields: Array<[keyof ProfileData, string, JSX.Element]> = [
    ["first_name",      "First Name",      <User />],
    ["last_name",       "Last Name",       <User />],
    ["email",           "Email",           <Mail />],
    ["company_name",    "Company",         <Briefcase />],
    ["job_title",       "Job Title",       <Users />],
    ["other_job_title", "Other Title",     <Zap />],
    ["phone_primary",   "Phone #1",        <Phone />],
    ["phone_secondary", "Phone #2",        <Phone />],
    ["phone_work",      "Work Phone",      <Phone />],
    ["bio",             "Bio",             <User />],
  ]

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <AppHeader subtitle="My profile">
        <Button variant="outline" onClick={() => navigate("/student-dashboard")}>
          <ArrowLeft /><span className="hidden sm:inline">Back to Dashboard</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem("apiToken")
            navigate("/")
          }}
        >
          <LogOut /><span className="hidden sm:inline">Logout</span>
        </Button>
      </AppHeader>

      <main className="fade mx-auto grid max-w-4xl gap-5 px-4 py-7 sm:px-8">
        {/* Profile Banner */}
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  className="h-[84px] w-[84px] rounded-full border-[5px] border-line-red bg-station object-cover"
                />
              ) : (
                <div className="grid h-[84px] w-[84px] place-items-center rounded-full border-[6px] border-line-red bg-station font-display text-[28px] font-extrabold" aria-hidden="true">
                  {(profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")}
                </div>
              )}
              <label
                className="absolute -bottom-1 -right-1 grid h-9 w-9 cursor-pointer place-items-center rounded-full border bg-card text-foreground shadow-sm hover:bg-surface-2 focus-within:ring-2 focus-within:ring-ring [&_svg]:h-4 [&_svg]:w-4"
                title="Change photo"
              >
                <Camera />
                <span className="sr-only">Change profile photo</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadPhoto} />
              </label>
            </div>
            <div>
              <h1 className="text-[clamp(24px,3vw,32px)] font-extrabold leading-tight">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-ink-2">
                {profile.major?.name || "No Major"} • {profile.job_title || "No Title"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px]">
                {profile.avatar_url && (
                  <button type="button" onClick={removePhoto} className="font-semibold text-red-ink underline underline-offset-4">
                    Remove photo
                  </button>
                )}
                {photoMsg && (
                  <span role="status" className={photoMsg.error ? "font-semibold text-red-ink" : "text-ink-2"}>{photoMsg.text}</span>
                )}
              </div>
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
            variant={editing ? "outline" : "default"}
            className={editing ? "border-good text-good hover:text-good" : ""}
          >
            {editing ? <Check /> : <Pencil />}
            {editing ? "Done Editing" : "Edit Profile"}
          </Button>
        </Card>

        {/* Insights */}
        <ProfileInsights profile={profile} />

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-4 gap-y-3.5 md:grid-cols-2">
            {personalFields.map(([field, labelText, IconEl]) => (
              <div key={field} className={field === "bio" ? "md:col-span-2" : ""}>
                <Label htmlFor={String(field)} className="mb-1.5 flex items-center gap-2 [&_svg]:h-[15px] [&_svg]:w-[15px] [&_svg]:text-ink-3">
                  {IconEl}
                  {labelText}
                </Label>
                {field === "bio" ? (
                  <Textarea
                    id="bio"
                    rows={3}
                    disabled={!editing}
                    value={profile.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                  />
                ) : (
                  <Input
                    id={String(field)}
                    disabled={!editing}
                    value={(profile[field] as string) || ""}
                    placeholder={editing ? "" : "—"}
                    onChange={(e) => handleChange(field, e.target.value)}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Other devices will be signed out.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pw-current">Current password</Label>
                <Input id="pw-current" type="password" autoComplete="current-password" required value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-new">New password</Label>
                <Input id="pw-new" type="password" autoComplete="new-password" required value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-confirm">Confirm new password</Label>
                <Input id="pw-confirm" type="password" autoComplete="new-password" required value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} />
              </div>
              <div className="flex flex-wrap items-center gap-3 md:col-span-3">
                <Button type="submit" variant="outline"><KeyRound />Update password</Button>
                {pwMsg && <span role="status" className={`text-sm ${pwMsg.error ? "font-semibold text-red-ink" : "text-ink-2"}`}>{pwMsg.text}</span>}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>My Skills</CardTitle>
            <CardDescription>
              {profile.skills.length} skill
              {profile.skills.length !== 1 && "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                aria-label="New skill"
                placeholder={editing ? "Add a new skill…" : "Turn on Edit Profile to add skills"}
                value={newSkill}
                disabled={!editing}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addSkill()}
              />
              <Button
                size="icon"
                onClick={addSkill}
                disabled={!editing}
                aria-label="Add skill"
              >
                <Plus />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span key={s.id} className="chip chip--mine">
                  {s.name}
                  {editing && (
                    <button
                      onClick={() => removeSkill(s.id)}
                      aria-label={`Remove ${s.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  )
}

export default Profile
