// My Skills tab: pick a major, add skills from its lists or by name, remove skills.
import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Plus, X, Check, GraduationCap, CircleDashed } from 'lucide-react'
import { EmptyNote } from '@/components/charts'
import { PanelHead, type Major, type MajorSkillsResponse, type Skill } from './shared'

interface SkillCardProps {
  title: string
  skills: Skill[]
  onAdd: (skill: Skill) => void
  userSkills: Skill[]
  color: string
}

// One line per category: filled station = already on your profile.
const SkillCard: React.FC<SkillCardProps> = ({ title, skills, onAdd, userSkills, color }) => {
  const owned = (s: Skill) => userSkills.some(u => u.id === s.id)
  return (
    <Card className="p-5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="eyebrow">{skills.filter(owned).length}/{skills.length}</span>
      </div>
      {skills.length > 0 ? (
        <div className="-mr-2 max-h-[560px] overflow-y-auto pr-2">
        <ul className="stations" style={{ '--c': color } as React.CSSProperties}>
          {skills.map(s => (
            <li key={s.id} className={owned(s) ? 'on' : ''}>
              <span className="s" />
              <span className="min-w-0 text-sm font-medium">{s.name}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAdd(s)}
                disabled={owned(s)}
                aria-label={owned(s) ? `${s.name} added` : `Add ${s.name}`}
              >
                {owned(s) ? <Check /> : <Plus />}
              </Button>
            </li>
          ))}
        </ul>
        </div>
      ) : (
        <p className="text-sm text-ink-3">
          No skills in this category
        </p>
      )}
    </Card>
  )
}

interface Props {
  majors: Major[]
  selectedMajorId: number | ''
  onMajorChange: (id: number | '') => void
  majorSkills: MajorSkillsResponse | null
  userSkills: Skill[]
  onAddFromMajor: (skill: Skill) => void
  onAddCustom: (name: string) => Promise<boolean>  // true when the skill was added
  onRemove: (skill: Skill) => void
}

const SkillsTab: React.FC<Props> = ({ majors, selectedMajorId, onMajorChange, majorSkills, userSkills, onAddFromMajor, onAddCustom, onRemove }) => {
  const [customSkill, setCustomSkill] = useState('')
  const addCustom = async () => {
    if (await onAddCustom(customSkill)) setCustomSkill('')
  }

  return (
    <div className="fade grid grid-cols-12 gap-5" role="tabpanel">
      {/* Major Selection */}
      <Card className="col-span-12 lg:col-span-8">
        <PanelHead title="Select Your Major" desc="Choose your field of study to get started" icon={<GraduationCap />} />
        <CardContent>
          <Select
            value={selectedMajorId.toString()}
            onValueChange={val => {
              const n = parseInt(val,10)
              onMajorChange(isNaN(n) ? "" : n)
            }}
          >
            <SelectTrigger aria-label="Major">
              <SelectValue placeholder="Pick a major…" />
            </SelectTrigger>
            <SelectContent>
              {majors.map(m => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Additional Skills */}
      <Card className="col-span-12 lg:col-span-4">
        <PanelHead title="Additional Skills" desc="Add any other skills" icon={<Plus />} color="hsl(var(--ink))" />
        <CardContent>
          <div className="flex gap-2">
            <Input
              aria-label="Skill name"
              placeholder="Skill name…"
              value={customSkill}
              onChange={e => setCustomSkill(e.target.value)}
              onKeyPress={e => e.key==='Enter' && addCustom()}
            />
            <Button size="icon" onClick={addCustom} aria-label="Add skill">
              <Plus />
            </Button>
          </div>
          <p className="mt-2 text-[13px] text-ink-3">
            * New skills will be created automatically.
          </p>
        </CardContent>
      </Card>

      {/* Skills management */}
      {selectedMajorId ? (
        majorSkills && (
          <>
            <div className="col-span-12 md:col-span-4">
              <SkillCard title="Major-Related" skills={majorSkills.major_related_skills} onAdd={onAddFromMajor} userSkills={userSkills} color="hsl(var(--line-red))" />
            </div>
            <div className="col-span-12 md:col-span-4">
              <SkillCard title="Technical" skills={majorSkills.technical_skills} onAdd={onAddFromMajor} userSkills={userSkills} color="hsl(var(--line-teal))" />
            </div>
            <div className="col-span-12 md:col-span-4">
              <SkillCard title="Soft" skills={majorSkills.soft_skills} onAdd={onAddFromMajor} userSkills={userSkills} color="hsl(var(--line-amber))" />
            </div>
            {majorSkills.major_related_skills.length === 0 && (
              <p className="col-span-12 text-ink-3">No skills found for this major.</p>
            )}
          </>
        )
      ) : (
        <div className="col-span-12">
          <EmptyNote icon={<GraduationCap />}>Pick a major above to see its baseline skills.</EmptyNote>
        </div>
      )}

      {/* Your Skills */}
      <Card className="col-span-12">
        <PanelHead title="Your Skills" desc={`${userSkills.length} skill${userSkills.length === 1 ? '' : 's'} you've added`} />
        <CardContent>
          {userSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {userSkills.map(s => (
                <span key={s.id} className="chip chip--mine">
                  {s.name}
                  <button onClick={()=>onRemove(s)} aria-label={`Remove ${s.name}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <EmptyNote icon={<CircleDashed />}>No skills yet. Add them from the lists above.</EmptyNote>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SkillsTab
