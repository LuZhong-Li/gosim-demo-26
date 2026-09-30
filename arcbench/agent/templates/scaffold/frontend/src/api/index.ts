import axios from 'axios';

// Shared HTTP client. Generated code should call the API through this module.
export const client = axios.create({ baseURL: '/api', timeout: 8000 });

const TOKEN_KEY = 'app_token';

export const tokenStore = {
  get: (): string | null => {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage may be unavailable */
    }
  },
  clear: (): void => {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage may be unavailable */
    }
  },
};

client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(caught: unknown): string {
  const response = (caught as { response?: { data?: { error?: string } } })?.response;
  return response?.data?.error || (caught as Error)?.message || 'Something went wrong.';
}

export async function health(): Promise<{ code: number; message: string }> {
  const response = await client.get('/health');
  return response.data;
}
