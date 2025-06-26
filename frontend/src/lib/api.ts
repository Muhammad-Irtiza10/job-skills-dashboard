//const API_BASE = "http://127.0.0.1:8000/api";

/*export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("apiToken");
  const headers: Record<string,string> = {
    "Content-Type": "application/json",
    ...(opts.headers as any),
  };
  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}*/

// src/lib/api.ts

export const API_BASE = "http://127.0.0.1:8000/api";

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("apiToken");
  const headers: Record<string,string> = {
    "Content-Type": "application/json",
    ...(opts.headers as any),
  };
  if (token) headers["Authorization"] = `Token ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
  });

  // read & parse body
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text) }
  catch {}

  if (!res.ok) {
    const detail = json && (json.detail || Object.values(json).flat().join("; "));
    throw new Error(`API ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return json;
}

export async function getStudentToken(email: string, password: string) {
  const { token } = await apiFetch('/email-token-auth/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return token
}

export async function getFacultyToken(email: string, password: string) {
  const { token } = await apiFetch('/faculty-token-auth/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return token
}

