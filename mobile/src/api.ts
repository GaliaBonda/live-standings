const API = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3003";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "host" | "player";
};

export type RankedEntry = {
  userId: string;
  name: string;
  score: number;
  rank: number;
};

export type Contest = {
  id: string;
  name: string;
  status: string;
};

export async function api<T>(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.message ?? `Request failed (${response.status})`);
  }
  return data;
}

export function apiUrl() {
  return API;
}
