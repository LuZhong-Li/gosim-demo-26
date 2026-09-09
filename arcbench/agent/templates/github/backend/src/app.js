const express = require('express');
const fs = require('fs');
const path = require('path');

const store = require('./gh_store');

const app = express();
app.use(express.json());

// ---------- helpers ----------

function isUsernameValid(value) {
  return /^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/.test(String(value || '').trim()) &&
    String(value || '').trim().length <= 39;
}

function isEmailValid(value) {
  const email = String(value || '').trim();
  if (email.length > 254) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain || !domain.includes('.')) return false;
  return domain.split('.').every((label) => label.length > 0);
}

function isPasswordValid(value) {
  const password = String(value || '');
  return (
    password.length >= 12 &&
    password.length <= 128 &&
    !/\s/.test(password) &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function validateRegistration(body) {
  const errors = [];
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim();
  if (!isUsernameValid(username)) {
    errors.push('Username must be 1-39 lowercase letters, digits, or single hyphens and must not begin or end with a hyphen.');
  }
  if (!isEmailValid(email)) {
    errors.push('Please enter a valid email address.');
  }
  if (!isPasswordValid(body.password)) {
    errors.push('Password must be 12-128 characters without whitespace and include uppercase, lowercase, digit, and special character.');
  }
  if (String(body.password || '') !== String(body.confirmPassword || '')) {
    errors.push("Passwords don't match.");
  }
  if (body.terms !== true) {
    errors.push('You must accept the terms of service.');
  }
  if (store.findUserByUsername(username)) {
    errors.push('That username is already taken.');
  }
  if (store.findUserByEmail(email)) {
    errors.push('An account with that email already exists.');
  }
  return errors;
}

function publicUser(user) {
  return { username: user.username, email: user.email, emailVerified: user.emailVerified };
}

function authToken(req) {
  const header = req.headers.authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function requireUser(req, res, next) {
  const user = store.userByToken(authToken(req));
  if (!user) {
    return res.status(401).json({ error: 'Please sign in first.' });
  }
  req.user = user;
  return next();
}

// ---------- auth ----------

app.get('/api/health', (req, res) => res.json({ code: 200, message: 'GitHub Ready' }));

app.post('/api/auth/register', (req, res) => {
  const body = req.body || {};
  const errors = validateRegistration(body);
  if (errors.length) return res.status(400).json({ error: errors[0] });
  const username = String(body.username).trim().toLowerCase();
  const user = store.createUser({
    username,
    email: String(body.email).trim(),
    password: String(body.password),
  });
  return res.status(201).json({ user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const identifier = String((req.body || {}).identifier || '').trim();
  const user = store.findUserByIdentifier(identifier);
  const generic = { error: 'Invalid username or password.' };
  if (!user || user.password !== String((req.body || {}).password || '')) {
    return res.status(401).json(generic);
  }
  const token = store.createSession(user.username);
  return res.json({ token, user: publicUser(user) });
});

app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/api/auth/logout', (req, res) => {
  store.destroySession(authToken(req));
  res.json({ ok: true });
});

app.post('/api/auth/forgot', (req, res) => {
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  if (!store.findUserByEmail(email)) {
    return res.status(404).json({ error: 'No account is associated with that email.' });
  }
  // The local product directly displays the fixed verification code.
  return res.json({ code: '123456' });
});

app.post('/api/auth/reset', (req, res) => {
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const code = String((req.body || {}).code || '').trim();
  const password = String((req.body || {}).password || '');
  const user = store.findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'No account is associated with that email.' });
  if (code !== '123456') {
    return res.status(400).json({ error: 'The verification code is incorrect.' });
  }
  if (!isPasswordValid(password)) {
    return res.status(400).json({
      error:
        'Password must be 12-128 characters without whitespace and include uppercase, lowercase, digit, and special character.',
    });
  }
  user.password = password;
  return res.json({ ok: true });
});

// ---------- orgs ----------

app.get('/api/orgs', requireUser, (req, res) => {
  const orgs = store.state.memberships
    .filter((m) => String(m.username).toLowerCase() === req.user.username)
    .map((m) => store.findOrg(m.org))
    .filter(Boolean)
    .map((org) => ({ name: org.name, displayName: org.displayName }));
  res.json({ orgs });
});

app.post('/api/orgs', requireUser, (req, res) => {
  const name = String((req.body || {}).name || '').trim().toLowerCase();
  const displayName = String((req.body || {}).displayName || name).trim();
  if (!/^[a-z0-9-]{1,39}$/.test(name)) {
    return res.status(400).json({ error: 'Organization name must be 1-39 lowercase letters, digits, or hyphens.' });
  }
  if (store.findOrg(name)) {
    return res.status(409).json({ error: 'An organization with that name already exists.' });
  }
  store.state.orgs.push({
    name,
    displayName,
    creator: req.user.username,
    createdAt: new Date().toISOString(),
  });
  store.state.memberships.push({ org: name, username: req.user.username, role: 'Owner' });
  return res.status(201).json({ org: { name, displayName } });
});

app.get('/api/orgs/:name', (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const user = store.userByToken(authToken(req));
  const role = user ? store.membership(org.name, user.username)?.role || null : null;
  const repos = store.state.repos
    .filter((repo) => repo.owner === org.name)
    .map((repo) => ({
      owner: repo.owner,
      name: repo.name,
      visibility: repo.visibility,
      description: repo.description,
    }));
  res.json({
    org: { name: org.name, displayName: org.displayName },
    role,
    repos,
    members: store.orgMembers(org.name),
    teams: store.orgTeams(org.name),
  });
});

app.get('/api/discover', (req, res) => {
  const orgs = store.state.orgs
    .filter((org) => store.state.repos.some((repo) => repo.owner === org.name && repo.visibility === 'public'))
    .map((org) => ({ name: org.name, displayName: org.displayName }));
  const user = store.userByToken(authToken(req));
  const repos = store.reposVisibleTo(user ? user.username : null).map((repo) => ({
    owner: repo.owner,
    name: repo.name,
    visibility: repo.visibility,
    description: repo.description,
  }));
  res.json({ orgs, repos });
});

app.post('/api/orgs/:name/members', requireUser, (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const current = store.membership(org.name, req.user.username);
  if (!current || !['Owner', 'Admin'].includes(current.role)) {
    return res.status(403).json({ error: 'Only an organization owner or admin can manage members.' });
  }
  const username = String((req.body || {}).username || '').trim().toLowerCase();
  const role = String((req.body || {}).role || 'Member').trim();
  const user = store.findUserByUsername(username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (!['Read', 'Triage', 'Write', 'Maintain', 'Admin', 'Member', 'Owner'].includes(role)) {
    return res.status(400).json({ error: 'Unsupported role.' });
  }
  const existing = store.membership(org.name, username);
  if (existing) existing.role = role;
  else store.state.memberships.push({ org: org.name, username, role });
  return res.status(201).json({ member: { username, role } });
});

app.post('/api/orgs/:name/teams', requireUser, (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const current = store.membership(org.name, req.user.username);
  if (!current) return res.status(403).json({ error: 'You are not a member of this organization.' });
  const teamName = String((req.body || {}).name || '').trim();
  if (!teamName || teamName.length > 100) {
    return res.status(400).json({ error: 'Team name is required (max 100 characters).' });
  }
  const team = {
    name: teamName,
    description: String((req.body || {}).description || '').trim(),
    members: [],
    createdAt: new Date().toISOString(),
  };
  store.addTeam(org.name, team);
  return res.status(201).json({ team });
});

app.post('/api/orgs/:name/repos', requireUser, (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const member = store.membership(org.name, req.user.username);
  if (!member) return res.status(403).json({ error: 'You are not a member of this organization.' });
  const repoName = String((req.body || {}).name || '').trim().toLowerCase();
  const visibility = String((req.body || {}).visibility || 'private').trim().toLowerCase();
  if (!/^[a-z0-9._-]{1,100}$/.test(repoName)) {
    return res.status(400).json({ error: 'Repository name may only contain letters, digits, dots, underscores, and hyphens.' });
  }
  if (store.findRepo(org.name, repoName)) {
    return res.status(409).json({ error: 'A repository with that name already exists.' });
  }
  if (!['public', 'private'].includes(visibility)) {
    return res.status(400).json({ error: 'Visibility must be public or private.' });
  }
  const repo = {
    owner: org.name,
    ownerType: 'organization',
    name: repoName,
    visibility,
    description: String((req.body || {}).description || '').trim(),
    defaultBranch: 'main',
    creator: req.user.username,
    createdAt: new Date().toISOString(),
  };
  store.state.repos.push(repo);
  return res.status(201).json({ repo });
});

// ---------- repos & issues ----------

app.get('/api/repos', (req, res) => {
  const user = store.userByToken(authToken(req));
  const repos = store.reposVisibleTo(user ? user.username : null).map((repo) => ({
    owner: repo.owner,
    name: repo.name,
    visibility: repo.visibility,
    description: repo.description,
  }));
  res.json({ repos });
});

app.get('/api/repos/:owner/:name', (req, res) => {
  const user = store.userByToken(authToken(req));
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  if (repo.visibility === 'private') {
    const authorized =
      (repo.ownerType === 'user' && user && String(repo.owner).toLowerCase() === user.username) ||
      (repo.ownerType === 'organization' &&
        Boolean(user && store.membership(repo.owner, user.username)));
    if (!authorized) return res.status(403).json({ error: 'Repository is private.' });
  }
  res.json({
    repo: {
      owner: repo.owner,
      name: repo.name,
      visibility: repo.visibility,
      description: repo.description,
      defaultBranch: repo.defaultBranch,
      ownerType: repo.ownerType,
    },
  });
});

app.get('/api/repos/:owner/:name/issues', (req, res) => {
  const issues = store.listIssues(req.params.owner, req.params.name).map((issue) => ({
    number: issue.number,
    title: issue.title,
    author: issue.author,
    state: issue.state,
    createdAt: issue.createdAt,
    comments: (issue.comments || []).length,
  }));
  res.json({ issues });
});

app.post('/api/repos/:owner/:name/issues', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const title = String((req.body || {}).title || '').trim();
  if (!title) return res.status(400).json({ error: 'Issue title is required.' });
  const number = store.nextIssueNumber(repo.owner, repo.name);
  const issue = {
    key: `${repo.owner}/${repo.name}`.toLowerCase(),
    owner: repo.owner,
    repo: repo.name,
    number,
    title,
    body: String((req.body || {}).body || '').trim(),
    author: req.user.username,
    state: 'open',
    createdAt: new Date().toISOString(),
  };
  store.state.issues.push(issue);
  return res.status(201).json({ issue });
});

app.get('/api/repos/:owner/:name/issues/:number', (req, res) => {
  const issue = store.findIssue(req.params.owner, req.params.name, req.params.number);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });
  res.json({ issue });
});

app.patch('/api/repos/:owner/:name/issues/:number', requireUser, (req, res) => {
  const issue = store.findIssue(req.params.owner, req.params.name, req.params.number);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });
  const state = String((req.body || {}).state || '').trim().toLowerCase();
  if (!['open', 'closed'].includes(state)) {
    return res.status(400).json({ error: 'Issue state must be open or closed.' });
  }
  issue.state = state;
  return res.json({ issue });
});

app.post('/api/repos/:owner/:name/issues/:number/comments', requireUser, (req, res) => {
  const issue = store.findIssue(req.params.owner, req.params.name, req.params.number);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });
  const body = String((req.body || {}).body || '').trim();
  if (!body) return res.status(400).json({ error: 'Comment body is required.' });
  issue.comments = issue.comments || [];
  const comment = {
    id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    author: req.user.username,
    body,
    createdAt: new Date().toISOString(),
  };
  issue.comments.push(comment);
  return res.status(201).json({ comment });
});

app.patch('/api/repos/:owner/:name', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const canAdmin =
    (repo.ownerType === 'user' && repo.owner === req.user.username) ||
    (repo.ownerType === 'organization' &&
      ['Owner', 'Admin'].includes(store.membership(repo.owner, req.user.username)?.role || ''));
  if (!canAdmin) {
    return res.status(403).json({ error: 'Only a repository admin can change visibility.' });
  }
  const visibility = String((req.body || {}).visibility || '').trim().toLowerCase();
  if (visibility && !['public', 'private'].includes(visibility)) {
    return res.status(400).json({ error: 'Visibility must be public or private.' });
  }
  if (visibility) repo.visibility = visibility;
  return res.json({ repo });
});

// ---------- static frontend hosting ----------

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(503).type('html').send('<!doctype html><html><body><h1>Frontend build missing</h1></body></html>');
  });
}

module.exports = app;
