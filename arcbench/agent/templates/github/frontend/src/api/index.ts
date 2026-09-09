import axios from 'axios';

export type User = { username: string; email: string; emailVerified: boolean };
export type Org = { name: string; displayName: string };
export type Repo = {
  owner: string;
  name: string;
  visibility: string;
  description: string;
  defaultBranch?: string;
  ownerType?: string;
};
export type Issue = {
  number: number;
  title: string;
  body?: string;
  author: string;
  state: string;
  createdAt: string;
  comments?: Comment[];
};
export type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};
export type Team = { name: string; description: string; members: string[] };
export type Member = { username: string; role: string };
export type OrgDetail = {
  org: Org;
  role: string | null;
  repos: Repo[];
  members: Member[];
  teams: Team[];
};
export type ApiError = { error: string };

const TOKEN_KEY = 'gh_token';

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
      // ignore
    }
  },
  clear: (): void => {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};

const client = axios.create({ baseURL: '/api', timeout: 8000 });
client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function register(input: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}): Promise<{ user: User }> {
  const response = await client.post('/auth/register', input);
  return response.data;
}

export async function login(
  identifier: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const response = await client.post('/auth/login', { identifier, password });
  return response.data;
}

export async function me(): Promise<User> {
  const response = await client.get('/auth/me');
  return response.data.user as User;
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout');
}

export async function listOrgs(): Promise<Org[]> {
  const response = await client.get('/orgs');
  return response.data.orgs as Org[];
}

export async function createOrg(input: { name: string; displayName: string }): Promise<Org> {
  const response = await client.post('/orgs', input);
  return response.data.org as Org;
}

export async function getOrg(name: string): Promise<OrgDetail> {
  const response = await client.get(`/orgs/${encodeURIComponent(name)}`);
  return response.data;
}

export async function createOrgRepo(
  org: string,
  input: { name: string; visibility: string; description: string },
): Promise<Repo> {
  const response = await client.post(`/orgs/${encodeURIComponent(org)}/repos`, input);
  return response.data.repo as Repo;
}

export async function listRepos(): Promise<Repo[]> {
  const response = await client.get('/repos');
  return response.data.repos as Repo[];
}

export async function discover(): Promise<{ orgs: Org[]; repos: Repo[] }> {
  const response = await client.get('/discover');
  return response.data;
}

export async function getRepo(owner: string, name: string): Promise<{ repo: Repo }> {
  const response = await client.get(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`);
  return response.data;
}

export async function listIssues(owner: string, name: string): Promise<Issue[]> {
  const response = await client.get(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues`,
  );
  return response.data.issues as Issue[];
}

export async function createIssue(
  owner: string,
  name: string,
  input: { title: string; body: string },
): Promise<Issue> {
  const response = await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues`,
    input,
  );
  return response.data.issue as Issue;
}

export async function forgotPassword(email: string): Promise<{ code: string }> {
  const response = await client.post('/auth/forgot', { email });
  return response.data;
}

export async function resetPassword(input: {
  email: string;
  code: string;
  password: string;
}): Promise<void> {
  await client.post('/auth/reset', input);
}

export async function addOrgMember(
  org: string,
  input: { username: string; role: string },
): Promise<Member> {
  const response = await client.post(`/orgs/${encodeURIComponent(org)}/members`, input);
  return response.data.member as Member;
}

export async function createTeam(
  org: string,
  input: { name: string; description: string },
): Promise<Team> {
  const response = await client.post(`/orgs/${encodeURIComponent(org)}/teams`, input);
  return response.data.team as Team;
}

export async function getIssue(owner: string, name: string, number: number): Promise<Issue> {
  const response = await client.get(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${number}`,
  );
  return response.data.issue as Issue;
}

export async function setIssueState(
  owner: string,
  name: string,
  number: number,
  state: string,
): Promise<Issue> {
  const response = await client.patch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${number}`,
    { state },
  );
  return response.data.issue as Issue;
}

export async function addIssueComment(
  owner: string,
  name: string,
  number: number,
  body: string,
): Promise<Comment> {
  const response = await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${number}/comments`,
    { body },
  );
  return response.data.comment as Comment;
}

export async function setRepoVisibility(
  owner: string,
  name: string,
  visibility: string,
): Promise<Repo> {
  const response = await client.patch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, {
    visibility,
  });
  return response.data.repo as Repo;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiError | undefined;
    if (payload && payload.error) return payload.error;
  }
  return fallback;
}
