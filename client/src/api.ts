const TOKEN_KEY = 'expense-tracker.token'

export type User = {
  id: string
  email: string
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, { ...options, headers })
  } catch {
    throw new Error("can't reach the server. start it and try again.")
  }

  const data = (await response.json().catch(() => ({}))) as { message?: string }
  if (!response.ok) {
    throw new Error(data.message || 'something went wrong.')
  }
  return data as T
}
