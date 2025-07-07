export interface Skill {
  id: number;
  name: string;
}

export interface ProfileResponse {
  id: number;
  name: string;
  email: string;
  major: { id: number; name: string };
  skills: Skill[];
  // …any other fields your API returns
}