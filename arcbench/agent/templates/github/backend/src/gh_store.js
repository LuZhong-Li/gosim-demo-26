// In-memory GitHub clone store. One server process serves the whole run, so
// memory persistence is enough for refresh/re-login consistency.

const state = {
  users: [],
  sessions: {},
  orgs: [],
  memberships: [], // { org, username, role }
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
    return Boolean(member && member.role !== 'Read');
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

module.exports = {
  createSession,
  createUser,
  destroySession,
  findOrg,
  findRepo,
  findUserByEmail,
  findUserByIdentifier,
  findUserByUsername,
  listIssues,
  membership,
  nextIssueNumber,
  reposVisibleTo,
  state,
  userByToken,
};
