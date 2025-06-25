const API_BASE = "http://127.0.0.1:8000/api";

export async function apiFetch(path: string, opts: RequestInit = {}) {
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
}