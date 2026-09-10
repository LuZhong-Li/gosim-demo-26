// In-memory GitHub clone store. One server process serves the whole run, so
// memory persistence is enough for refresh/re-login consistency.

const state = {
  users: [],
  sessions: {},
  orgs: [],
  memberships: [], // { org, username, role }
  teams: [], // { id, org, name, description, createdAt }
  accessGrants: [], // { org, repo, team, permission }
  protections: {}, // repoKey -> { branch, requiredApprovals, requiredChecks }
  repos: [],
  issues: [], // { owner, repo, number, title, body, author, state, createdAt }
  issueCounter: {}, // "owner/repo" -> next number
};

function save() {
  // no-op: memory only
}

function randomToken() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function findUserByUsername(username) {
  return state.users.find(
    (user) => String(user.username).toLowerCase() === String(username || '').trim().toLowerCase(),
  );
}

function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return state.users.find((user) => user.email.toLowerCase() === normalized);
}

function findUserByIdentifier(identifier) {
  const trimmed = String(identifier || '').trim();
  return findUserByUsername(trimmed) || findUserByEmail(trimmed);
}

function createUser(fields) {
  const user = { ...fields, createdAt: new Date().toISOString(), emailVerified: true };
  state.users.push(user);
  save();
  return user;
}

function createSession(username) {
  const token = randomToken();
  state.sessions[token] = username;
  save();
  return token;
}

function userByToken(token) {
  if (!token) return null;
  const username = state.sessions[String(token)];
  return username ? findUserByUsername(username) : null;
}

function destroySession(token) {
  if (token) delete state.sessions[String(token)];
}

function findOrg(name) {
  const normalized = String(name || '').trim().toLowerCase();
  return state.orgs.find((org) => org.name === normalized) || null;
}

function membership(orgName, username) {
  const normalizedOrg = String(orgName || '').trim().toLowerCase();
  return (
    state.memberships.find(
      (item) =>
        item.org === normalizedOrg &&
        String(item.username).toLowerCase() === String(username || '').toLowerCase(),
    ) || null
  );
}

function findRepo(owner, name) {
  const normalizedOwner = String(owner || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim().toLowerCase();
  return (
    state.repos.find(
      (repo) => repo.owner === normalizedOwner && repo.name === normalizedName,
    ) || null
  );
}

function reposVisibleTo(username) {
  return state.repos.filter((repo) => {
    if (repo.visibility === 'public') return true;
    if (!username) return false;
    if (repo.ownerType === 'user') {
      return String(repo.owner).toLowerCase() === String(username).toLowerCase();
    }
    const member = membership(repo.owner, username);
    if (member && member.role !== 'Read') return true;
    return Boolean(bestGrantPermission(repo.owner, repo.name, username));
  });
}

function listIssues(owner, repo) {
  const key = `${owner}/${repo}`.toLowerCase();
  return state.issues
    .filter((issue) => issue.key === key)
    .sort((a, b) => b.number - a.number);
}

function nextIssueNumber(owner, repo) {
  const key = `${owner}/${repo}`.toLowerCase();
  const next = (state.issueCounter[key] || 0) + 1;
  state.issueCounter[key] = next;
  return next;
}

function findIssue(owner, repo, number) {
  const key = `${owner}/${repo}`.toLowerCase();
  return (
    state.issues.find(
      (issue) => issue.key === key && Number(issue.number) === Number(number),
    ) || null
  );
}

function orgMembers(orgName) {
  const normalized = String(orgName || '').trim().toLowerCase();
  return state.memberships
    .filter((item) => item.org === normalized)
    .map((item) => ({ username: item.username, role: item.role }));
}

function orgTeams(orgName) {
  const normalized = String(orgName || '').trim().toLowerCase();
  return state.teams
    .filter((team) => team.org === normalized)
    .map((team) => ({
      name: team.name,
      description: team.description,
      parent: team.parent || null,
      members: team.members || [],
    }));
}

function addTeam(orgName, team) {
  state.teams.push({ org: String(orgName).trim().toLowerCase(), ...team });
  save();
  return team;
}

function findTeam(orgName, teamName) {
  const normalizedOrg = String(orgName || '').trim().toLowerCase();
  return (
    state.teams.find(
      (team) =>
        team.org === normalizedOrg &&
        String(team.name).toLowerCase() === String(teamName || '').trim().toLowerCase(),
    ) || null
  );
}

function addTeamMember(orgName, teamName, username) {
  const team = findTeam(orgName, teamName);
  if (!team) return null;
  team.members = team.members || [];
  const normalized = String(username).toLowerCase();
  if (!team.members.some((member) => String(member).toLowerCase() === normalized)) {
    team.members.push(username);
  }
  return team;
}

function grantsFor(orgName, repoName) {
  return state.accessGrants.filter(
    (grant) =>
      grant.org === String(orgName).toLowerCase() &&
      grant.repo === String(repoName).toLowerCase(),
  );
}

function bestGrantPermission(orgName, repoName, username) {
  const order = ['Read', 'Triage', 'Write', 'Maintain', 'Admin'];
  let best = -1;
  for (const grant of grantsFor(orgName, repoName)) {
    const team = findTeam(orgName, grant.team);
    if (!team || !(team.members || []).some((member) => String(member).toLowerCase() === String(username).toLowerCase())) {
      continue;
    }
    const rank = order.indexOf(grant.permission);
    if (rank > best) best = rank;
  }
  return best >= 0 ? order[best] : null;
}

function repoKey(owner, name) {
  return `${owner}/${name}`.toLowerCase();
}

function findPull(repo, number) {
  return (repo.pulls || []).find((pull) => Number(pull.number) === Number(number)) || null;
}

function nextPullNumber(repo) {
  const next = (repo.pullCounter || 0) + 1;
  repo.pullCounter = next;
  return next;
}

function initializeRepoContent(repo, author) {
  const sha = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  repo.files = [{ path: 'README.md', content: `# ${repo.name}\n` }];
  repo.branches = [{ name: 'main', head: sha }];
  repo.commits = [
    {
      sha,
      message: 'Initial commit',
      author,
      parents: [],
      timestamp: new Date().toISOString(),
      changed: ['README.md'],
    },
  ];
  return sha;
}

function addFile(repo, filePath, content, author, message, branchName) {
  const existing = (repo.files || []).find((file) => file.path === filePath);
  if (existing) existing.content = content;
  else repo.files.push({ path: filePath, content });
  const sha = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const branch =
    repo.branches.find(
      (item) => String(item.name).toLowerCase() === String(branchName || 'main').toLowerCase(),
    ) || repo.branches[0];
  if (branch) branch.head = sha;
  repo.commits.unshift({
    sha,
    message: String(message || `Update ${filePath}`),
    author,
    parents: branch && branch.head ? [branch.head] : [],
    timestamp: new Date().toISOString(),
    changed: [filePath],
  });
  return sha;
}

function addBranch(repo, name, author) {
  const head = repo.branches[0]?.head || null;
  if (repo.branches.some((branch) => branch.name === name)) return null;
  repo.branches.push({ name, head });
  return head;
}

function findFile(repo, filePath) {
  return (repo.files || []).find((file) => file.path === filePath) || null;
}

function canWrite(repo, username) {
  if (!username) return false;
  if (repo.ownerType === 'user') {
    return String(repo.owner).toLowerCase() === String(username).toLowerCase();
  }
  const grant = bestGrantPermission(repo.owner, repo.name, username);
  if (grant && ['Write', 'Maintain', 'Admin'].includes(grant)) return true;
  const member = membership(repo.owner, username);
  const order = ['Read', 'Triage', 'Write', 'Maintain', 'Admin', 'Owner', 'Member'];
  const role = member ? member.role : '';
  if (role === 'Member') return true;
  return order.indexOf(role) >= order.indexOf('Write');
}

function canAdmin(repo, username) {
  if (!username) return false;
  if (repo.ownerType === 'user') {
    return String(repo.owner).toLowerCase() === String(username).toLowerCase();
  }
  const grant = bestGrantPermission(repo.owner, repo.name, username);
  if (grant === 'Admin') return true;
  return ['Owner', 'Admin'].includes(membership(repo.owner, username)?.role || '');
}

function branchHead(repo, branchName) {
  const branch = (repo.branches || []).find(
    (item) => String(item.name).toLowerCase() === String(branchName || '').toLowerCase(),
  );
  return branch ? branch.head : null;
}

function removeMembership(orgName, username) {
  const normalizedOrg = String(orgName || '').trim().toLowerCase();
  const target = String(username || '').trim().toLowerCase();
  const before = state.memberships.length;
  state.memberships = state.memberships.filter(
    (item) => !(item.org === normalizedOrg && String(item.username).toLowerCase() === target),
  );
  save();
  return state.memberships.length !== before;
}

function removeTeamMemberEverywhere(orgName, username) {
  const normalizedOrg = String(orgName || '').trim().toLowerCase();
  const target = String(username || '').trim().toLowerCase();
  let changed = 0;
  for (const team of state.teams) {
    if (team.org !== normalizedOrg) continue;
    const before = (team.members || []).length;
    team.members = (team.members || []).filter(
      (member) => String(member).toLowerCase() !== target,
    );
    if (team.members.length !== before) changed += 1;
  }
  return changed;
}

function ownerCount(orgName) {
  const normalizedOrg = String(orgName || '').trim().toLowerCase();
  return state.memberships.filter(
    (item) => item.org === normalizedOrg && item.role === 'Owner',
  ).length;
}

function forkRepo(source, owner, ownerType, visibility, author) {
  const copy = JSON.parse(JSON.stringify(source));
  copy.owner = String(owner).trim().toLowerCase();
  copy.ownerType = ownerType;
  copy.visibility = visibility;
  copy.forkedFrom = `${source.owner}/${source.name}`;
  copy.createdBy = author;
  copy.createdAt = new Date().toISOString();
  copy.pulls = [];
  copy.pullCounter = 0;
  state.repos.push(copy);
  save();
  return copy;
}

module.exports = {
  createSession,
  createUser,
  destroySession,
  addTeam,
  addTeamMember,
  addBranch,
  addFile,
  bestGrantPermission,
  branchHead,
  canAdmin,
  canWrite,
  findTeam,
  grantsFor,
  findPull,
  nextPullNumber,
  repoKey,
  findIssue,
  findOrg,
  findRepo,
  findFile,
  initializeRepoContent,
  findUserByEmail,
  findUserByIdentifier,
  findUserByUsername,
  listIssues,
  membership,
  orgMembers,
  orgTeams,
  nextIssueNumber,
  reposVisibleTo,
  removeMembership,
  removeTeamMemberEverywhere,
  ownerCount,
  forkRepo,
  state,
  userByToken,
};
