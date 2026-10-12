// Skill-to-job matching shared by the student dashboard and the profile page.
// A job skill counts as "had" when it shares a word with one of the user's skills.

export interface NamedSkill {
  id: number
  name: string
}
export interface MatchableJob {
  skills: NamedSkill[]
}

// split a skill name into lowercase word tokens
export const tokensOf = (name: string) => name.toLowerCase().split(/\W+/).filter(Boolean)

// job-skills you already have (word overlap with your skills)
export function haveFor<J extends MatchableJob>(job: J, userSkills: NamedSkill[]) {
  const userTokens = new Set(userSkills.flatMap(us => tokensOf(us.name)))
  return job.skills.filter(js => tokensOf(js.name).some(tok => userTokens.has(tok)))
}

// share of the job's skills you have: 0–100, and always agrees with the "You have" list
export function matchPctFor(job: MatchableJob, userSkills: NamedSkill[]) {
  const total = job.skills.length
  if (!total) return 0
  return Math.round((haveFor(job, userSkills).length / total) * 100)
}

// ponytail: self-check, run with `npx tsx src/lib/match.ts`
if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("match.ts")) {
  const job = { skills: [{ id: 1, name: "Arabic speaking" }, { id: 2, name: "Docker" }] }
  const mine = ["arabic listening", "arabic reading", "arabic writing", "arabic speaking"].map((name, id) => ({ id, name }))
  console.assert(matchPctFor(job, mine) === 50, "4 Arabic skills still only cover 1 of 2 job skills")
  console.assert(matchPctFor({ skills: [] }, mine) === 0, "a job with no skills is 0%")
  console.log("match.ts self-check done")
}
