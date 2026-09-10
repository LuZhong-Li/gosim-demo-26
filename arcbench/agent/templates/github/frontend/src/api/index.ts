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
  cloneUrl?: string;
  forkedFrom?: string | null;
};
export type Issue = {
  number: number;
  title: string;
  body?: string;
  author: string;
  state: string;
  createdAt: string;
  comments?: Comment[];
  assignee?: string | null;
  assignees?: string[];
  labels?: string[];
  milestone?: string | null;
  reactions?: Reaction[];
};
export type Reaction = { user: string; type: string; commentId?: string | null };
export type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};
export type Review = {
  id: string;
  author: string;
  state: string;
  body: string;
  createdAt: string;
};
export type PullRequest = {
  number: number;
  title: string;
  body?: string;
  author: string;
  state: string;
  baseBranch: string;
  headBranch: string;
  createdAt: string;
  reviews?: Review[];
  checks?: { name: string; state: string }[];
  reviewers?: ReviewerRequest[];
  mergedBy?: string;
};
export type PullDetail = {
  pull: PullRequest;
  protection: { branch: string; requiredApprovals: number; requiredChecks: string[] };
  approvals: number;
};
export type DiffLine = { type: string; text: string };
export type DiffFile = { path: string; status: string; lines: DiffLine[] };
export type PullFiles = {
  baseBranch: string;
  headBranch: string;
  files: DiffFile[];
  stats: { changedFiles: number; added: number; removed: number };
};
export type Team = {
  name: string;
  description: string;
  members: string[];
  parent?: string | null;
};
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

export async function searchRepos(query: string): Promise<Repo[]> {
  const response = await client.get('/search', { params: { q: query } });
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
  input: { title: string; body: string; assignee?: string; labels?: string[]; milestone?: string },
): Promise<Issue> {
  const response = await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues`,
    input,
  );
  return response.data.issue as Issue;
}

export async function updateIssue(
  owner: string,
  name: string,
  number: number,
  input: { state?: string; assignee?: string | null; labels?: string[]; milestone?: string | null },
): Promise<Issue> {
  const response = await client.patch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${number}`,
    input,
  );
  return response.data.issue as Issue;
}

export async function getTree(
  owner: string,
  name: string,
): Promise<{ branch: string; defaultBranch: string; files: string[]; branches: string[] }> {
  const response = await client.get(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/tree`,
  );
  return response.data;
}

export async function getFile(
  owner: string,
  name: string,
  filePath: string,
): Promise<{ path: string; content: string }> {
  const response = await client.get(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents`,
    { params: { path: filePath } },
  );
  return response.data;
}

export async function createFile(
  owner: string,
  name: string,
  filePath: string,
  input: { content: string; message: string; branch?: string },
): Promise<{ path: string; message: string }> {
  const response = await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents`,
    { ...input, path: filePath },
  );
  return response.data;
}

export async function listCommits(
  owner: string,
  name: string,
): Promise<{ sha: string; message: string; author: string; timestamp: string; changed: string[] }[]> {
  const response = await client.get(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits`,
  );
  return response.data.commits;
}

export async function createBranch(
  owner: string,
  name: string,
  branchName: string,
): Promise<void> {
  await client.post(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/branches`, {
    name: branchName,
  });
}

export async function listPulls(owner: string, name: string): Promise<PullRequest[]> {
  const response = await client.get(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls`,
  );
  return response.data.pulls as PullRequest[];
}

export async function createPull(
  owner: string,
  name: string,
  input: {
    title: string;
    body: string;
    baseBranch: string;
    headBranch: string;
    draft?: boolean;
  },
): Promise<PullRequest> {
  const response = await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls`,
    input,
  );
  return response.data.pull as PullRequest;
}

export async function getPull(owner: string, name: string, number: number): Promise<PullDetail> {
  const response = await client.get(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}`,
  );
  return response.data;
}

// REQ-6-3-2: changed files and aggregate diff for the pull request.
export type ReviewComment = {
  id: string;
  author: string;
  path: string;
  line: number;
  body: string;
  state: string;
  outdated?: boolean;
  published?: boolean;
};

// REQ-6-3-3: inline review comments anchored to a file and line.
export type ReviewerRequest = { username: string; requestedBy?: string; createdAt?: string };

// REQ-6-4: request or remove a pull-request reviewer.
export type CommitDiff = {
  commit: { sha: string; message: string; author: string; timestamp: string };
  parentSha: string | null;
  files: DiffFile[];
  stats: { changedFiles: number; added: number; removed: number };
};

// REQ-4-2-2: diff introduced by a single commit.
export async function getCommitDiff(
  owner: string,
  name: string,
  sha: string,
): Promise<CommitDiff> {
  const response = await client.get(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits/${encodeURIComponent(sha)}`,
  );
  return response.data as CommitDiff;
}

export async function requestPullReviewer(
  owner: string,
  name: string,
  number: number,
  username: string,
): Promise<ReviewerRequest[]> {
  const response = await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}/reviewers`,
    { username },
  );
  return response.data.reviewers as ReviewerRequest[];
}

export async function removePullReviewer(
  owner: string,
  name: string,
  number: number,
  username: string,
): Promise<ReviewerRequest[]> {
  const response = await client.delete(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}/reviewers/${encodeURIComponent(username)}`,
  );
  return response.data.reviewers as ReviewerRequest[];
}

export async function getPullComments(
  owner: string,
  name: string,
  number: number,
): Promise<ReviewComment[]> {
  const response = await client.get(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}/comments`,
  );
  return response.data.comments as ReviewComment[];
}

export async function addPullComment(
  owner: string,
  name: string,
  number: number,
  input: { path: string; line: number; body: string; pending?: boolean },
): Promise<ReviewComment> {
  const response = await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}/comments`,
    input,
  );
  return response.data.comment as ReviewComment;
}

export async function getPullFiles(
  owner: string,
  name: string,
  number: number,
): Promise<PullFiles> {
  const response = await client.get(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}/files`,
  );
  return response.data as PullFiles;
}

export async function setPullState(
  owner: string,
  name: string,
  number: number,
  state: string,
): Promise<PullRequest> {
  const response = await client.patch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}`,
    { state },
  );
  return response.data.pull as PullRequest;
}

export async function addPullReview(
  owner: string,
  name: string,
  number: number,
  input: { state: string; body: string },
): Promise<void> {
  await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}/reviews`,
    input,
  );
}

export async function addPullCheck(
  owner: string,
  name: string,
  number: number,
  checkName: string,
): Promise<void> {
  await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}/checks`,
    { name: checkName, state: 'success' },
  );
}

export async function setBranchProtection(
  owner: string,
  name: string,
  branch: string,
  input: { requiredApprovals: number; requiredChecks: string[] },
): Promise<void> {
  await client.put(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/branches/${encodeURIComponent(branch)}/protection`,
    input,
  );
}

export async function mergePull(owner: string, name: string, number: number): Promise<PullRequest> {
  const response = await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}/merge`,
  );
  return response.data.pull as PullRequest;
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

// REQ-2-2-2: change a team's parent (server rejects cycles).
export async function setTeamParent(
  org: string,
  team: string,
  parentTeam: string,
): Promise<Team> {
  const response = await client.patch(
    `/orgs/${encodeURIComponent(org)}/teams/${encodeURIComponent(team)}`,
    { parentTeam },
  );
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

// REQ-5-2-3: toggle a 👍 reaction on an issue or one of its comments.
export async function toggleIssueReaction(
  owner: string,
  name: string,
  number: number,
  input: { type?: string; commentId?: string | null } = {},
): Promise<Issue> {
  const response = await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${number}/reactions`,
    input,
  );
  return response.data.issue as Issue;
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

// REQ-1-3: change the current account password.
// REQ-3-2-1: create a repository in the current personal namespace.
export async function createPersonalRepo(input: {
  name: string;
  visibility: string;
  description?: string;
}): Promise<Repo> {
  const response = await client.post('/repos', input);
  return response.data.repo as Repo;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  await client.post('/auth/password', input);
}

// REQ-2-2-4: remove a member (and their team memberships) from an organization.
export async function removeOrgMember(org: string, username: string): Promise<void> {
  await client.delete(
    `/orgs/${encodeURIComponent(org)}/members/${encodeURIComponent(username)}`,
  );
}

// REQ-3-2-2: fork a repository into the current account or an owned organization.
export async function forkRepo(
  owner: string,
  name: string,
  input: { name?: string; targetOwner?: string; visibility?: string } = {},
): Promise<Repo> {
  const response = await client.post(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/fork`,
    input,
  );
  return response.data.repo as Repo;
}

// REQ-6-2-4: mark a draft pull request as ready for review.
export async function markPullReady(
  owner: string,
  name: string,
  number: number,
): Promise<PullRequest> {
  const response = await client.patch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}`,
    { ready: true },
  );
  return response.data.pull as PullRequest;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiError | undefined;
    if (payload && payload.error) return payload.error;
  }
  return fallback;
}
