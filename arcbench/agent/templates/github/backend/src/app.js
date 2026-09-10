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

// REQ-1-3 Change Account Password
app.post('/api/auth/password', requireUser, (req, res) => {
  const body = req.body || {};
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  const confirmPassword = String(body.confirmPassword || '');
  if (currentPassword !== String(req.user.password || '')) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (!isPasswordValid(newPassword)) {
    return res.status(400).json({
      error:
        'New password must be 12-128 characters without whitespace and include uppercase, lowercase, digit, and special character.',
    });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "New passwords don't match." });
  }
  req.user.password = newPassword;
  return res.json({ ok: true });
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

// REQ-2-2-4 Remove a Member from an Organization
app.delete('/api/orgs/:name/members/:username', requireUser, (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const current = store.membership(org.name, req.user.username);
  if (!current || current.role !== 'Owner') {
    return res.status(403).json({ error: 'Only an organization owner can remove members.' });
  }
  const username = String(req.params.username || '').trim().toLowerCase();
  const target = store.membership(org.name, username);
  if (!target) return res.status(404).json({ error: 'That account is not a member of this organization.' });
  if (target.role === 'Owner' && store.ownerCount(org.name) <= 1) {
    return res.status(400).json({ error: 'An organization must keep at least one owner.' });
  }
  store.removeMembership(org.name, username);
  // cascade: team memberships in this organization + direct repository grants
  store.removeTeamMemberEverywhere(org.name, username);
  store.state.accessGrants = store.state.accessGrants.filter(
    (grant) =>
      !(
        grant.org === org.name &&
        String(grant.team || '').toLowerCase() === username
      ),
  );
  return res.json({ ok: true, removed: username });
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
    parent: String((req.body || {}).parentTeam || '').trim() || null,
    createdAt: new Date().toISOString(),
  };
  if (team.parent && (!store.findTeam(org.name, team.parent) || team.parent === team.name)) {
    return res.status(400).json({ error: 'Parent team must be another team in this organization.' });
  }
  store.addTeam(org.name, team);
  return res.status(201).json({ team });
});

app.post('/api/orgs/:name/teams/:team/members', requireUser, (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  if (!store.membership(org.name, req.user.username)) {
    return res.status(403).json({ error: 'You are not a member of this organization.' });
  }
  const username = String((req.body || {}).username || '').trim().toLowerCase();
  if (!store.findUserByUsername(username)) {
    return res.status(404).json({ error: 'User not found.' });
  }
  const team = store.addTeamMember(org.name, req.params.team, username);
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  return res.status(201).json({ team });
});

app.post('/api/orgs/:name/access', requireUser, (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const current = store.membership(org.name, req.user.username);
  if (!current || !['Owner', 'Admin'].includes(current.role)) {
    return res.status(403).json({ error: 'Only an organization owner or admin can grant access.' });
  }
  const repoName = String((req.body || {}).repo || '').trim().toLowerCase();
  const teamName = String((req.body || {}).team || '').trim();
  const permission = String((req.body || {}).permission || 'Read').trim();
  if (!store.findRepo(org.name, repoName)) {
    return res.status(404).json({ error: 'Repository not found.' });
  }
  if (!store.findTeam(org.name, teamName)) {
    return res.status(404).json({ error: 'Team not found.' });
  }
  if (!['Read', 'Triage', 'Write', 'Maintain', 'Admin'].includes(permission)) {
    return res.status(400).json({ error: 'Unsupported repository permission.' });
  }
  store.state.accessGrants = store.state.accessGrants.filter(
    (item) => !(item.org === org.name && item.repo === repoName && item.team === teamName),
  );
  const grant = { org: org.name, repo: repoName, team: teamName, permission };
  store.state.accessGrants.push(grant);
  return res.status(201).json({ grant });
});

app.get('/api/orgs/:name/access', (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  res.json({ grants: store.state.accessGrants.filter((grant) => grant.org === org.name) });
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
  store.initializeRepoContent(repo, req.user.username);
  store.state.repos.push(repo);
  return res.status(201).json({ repo });
});

// ---------- repos & issues ----------

app.get('/api/search', (req, res) => {
  const user = store.userByToken(authToken(req));
  const query = String(req.query.q || '').trim().toLowerCase();
  const visible = store.reposVisibleTo(user ? user.username : null);
  const repos = visible
    .filter(
      (repo) =>
        !query ||
        repo.name.toLowerCase().includes(query) ||
        `${repo.owner}/${repo.name}`.toLowerCase().includes(query) ||
        String(repo.description || '').toLowerCase().includes(query),
    )
    .map((repo) => ({
      owner: repo.owner,
      name: repo.name,
      visibility: repo.visibility,
      description: repo.description,
    }));
  res.json({ repos });
});

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

// REQ-3-2-2 Fork a Repository into Another Namespace
app.post('/api/repos/:owner/:name/fork', requireUser, (req, res) => {
  const source = store.findRepo(req.params.owner, req.params.name);
  if (!source) return res.status(404).json({ error: 'Repository not found.' });
  if (source.visibility === 'private') {
    const allowed =
      (source.ownerType === 'user' &&
        String(source.owner).toLowerCase() === req.user.username) ||
      (source.ownerType === 'organization' &&
        Boolean(
          store.membership(source.owner, req.user.username) ||
            store.bestGrantPermission(source.owner, source.name, req.user.username),
        ));
    if (!allowed) return res.status(403).json({ error: 'Repository is private.' });
  }
  const targetOwner = String((req.body || {}).targetOwner || req.user.username)
    .trim()
    .toLowerCase();
  const org = store.findOrg(targetOwner);
  if (org) {
    const member = store.membership(org.name, req.user.username);
    if (!member || !['Owner', 'Admin'].includes(member.role)) {
      return res
        .status(403)
        .json({ error: 'You need owner or admin rights in the target organization.' });
    }
  } else if (targetOwner !== req.user.username) {
    return res.status(403).json({ error: 'You can only fork into your own account or an organization you own.' });
  }
  const forkName = String((req.body || {}).name || source.name).trim().toLowerCase();
  if (!/^[a-z0-9._-]{1,100}$/.test(forkName)) {
    return res.status(400).json({ error: 'Repository name may only contain letters, digits, dots, underscores, and hyphens.' });
  }
  if (store.findRepo(targetOwner, forkName)) {
    return res.status(409).json({ error: 'A repository with that name already exists.' });
  }
  const visibility = String((req.body || {}).visibility || 'public').trim().toLowerCase();
  const fork = store.forkRepo(
    source,
    targetOwner,
    org ? 'organization' : 'user',
    ['public', 'private'].includes(visibility) ? visibility : 'public',
    req.user.username,
  );
  fork.name = forkName;
  const sha = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  fork.commits = [
    {
      sha,
      message: `Fork of ${source.owner}/${source.name}`,
      author: req.user.username,
      parents: [],
      timestamp: new Date().toISOString(),
      changed: [],
    },
    ...(fork.commits || []),
  ];
  fork.branches = (fork.branches || []).map((branch, index) =>
    index === 0 ? { ...branch, head: sha } : branch,
  );
  return res.status(201).json({ repo: store.findRepo(fork.owner, fork.name) });
});

app.get('/api/repos/:owner/:name', (req, res) => {
  const user = store.userByToken(authToken(req));
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  if (repo.visibility === 'private') {
    const authorized =
      (repo.ownerType === 'user' && user && String(repo.owner).toLowerCase() === user.username) ||
      (repo.ownerType === 'organization' &&
        Boolean(
          user &&
            (store.membership(repo.owner, user.username) ||
              store.bestGrantPermission(repo.owner, repo.name, user.username)),
        ));
    if (!authorized) return res.status(403).json({ error: 'Repository is private.' });
  }
  res.json({
    repo: {
      owner: repo.owner,
      name: repo.name,
      cloneUrl: `https://arc-bench.local/${repo.owner}/${repo.name}.git`,
      forkedFrom: repo.forkedFrom || null,
      visibility: repo.visibility,
      description: repo.description,
      defaultBranch: repo.defaultBranch,
      ownerType: repo.ownerType,
    },
  });
});

app.get('/api/repos/:owner/:name/tree', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const branch =
    req.query.branch || (repo.branches && repo.branches[0] ? repo.branches[0].name : 'main');
  res.json({
    branch,
    defaultBranch: repo.defaultBranch,
    files: (repo.files || []).map((file) => file.path),
    branches: (repo.branches || []).map((branchItem) => branchItem.name),
  });
});

app.get('/api/repos/:owner/:name/contents', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const filePath = String(req.query.path || '');
  const file = store.findFile(repo, filePath);
  if (!file) return res.status(404).json({ error: 'File not found.' });
  res.json({ path: file.path, content: file.content });
});

app.post('/api/repos/:owner/:name/contents', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  if (!store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have write permission to this repository.' });
  }
  const filePath = String((req.body || {}).path || '');
  const content = String((req.body || {}).content || '');
  const message = String((req.body || {}).message || '').trim() || `Update ${filePath}`;
  const branchName = String((req.body || {}).branch || 'main').trim();
  if (!filePath || !/^[A-Za-z0-9_./-]{1,200}$/.test(filePath)) {
    return res.status(400).json({ error: 'Invalid file path.' });
  }
  if (!(repo.branches || []).some((branch) => branch.name === branchName)) {
    return res.status(400).json({ error: 'Branch not found.' });
  }
  store.addFile(repo, filePath, content, req.user.username, message, branchName);
  return res.status(201).json({ path: filePath, message });
});

app.get('/api/repos/:owner/:name/commits', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  res.json({
    commits: (repo.commits || []).map((commit) => ({
      sha: commit.sha,
      message: commit.message,
      author: commit.author,
      timestamp: commit.timestamp,
      changed: commit.changed,
    })),
  });
});

app.post('/api/repos/:owner/:name/branches', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  if (!store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have write permission to this repository.' });
  }
  const branchName = String((req.body || {}).name || '').trim();
  if (!/^[A-Za-z0-9_.-]{1,200}$/.test(branchName)) {
    return res.status(400).json({ error: 'Invalid branch name.' });
  }
  const head = store.addBranch(repo, branchName, req.user.username);
  if (!head) return res.status(409).json({ error: 'A branch with that name already exists.' });
  return res.status(201).json({ name: branchName });
});

app.get('/api/repos/:owner/:name/issues', (req, res) => {
  const issues = store.listIssues(req.params.owner, req.params.name).map((issue) => ({
    number: issue.number,
    title: issue.title,
    author: issue.author,
    state: issue.state,
    createdAt: issue.createdAt,
    assignee: issue.assignee || null,
    labels: issue.labels || [],
    milestone: issue.milestone || null,
    comments: (issue.comments || []).length,
  }));
  res.json({ issues });
});

app.post('/api/repos/:owner/:name/issues', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const title = String((req.body || {}).title || '').trim();
  if (!title) return res.status(400).json({ error: 'Issue title is required.' });
  if (!store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have write permission to create issues.' });
  }
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
    assignee: String((req.body || {}).assignee || '').trim() || null,
    labels: Array.isArray((req.body || {}).labels)
      ? (req.body || {}).labels.map((label) => String(label).trim()).filter(Boolean)
      : [],
    milestone: String((req.body || {}).milestone || '').trim() || null,
  };
  store.state.issues.push(issue);
  return res.status(201).json({ issue });
});

app.patch('/api/repos/:owner/:name/issues/:number', requireUser, (req, res) => {
  const issue = store.findIssue(req.params.owner, req.params.name, req.params.number);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });
  const body = req.body || {};
  if (body.state) {
    const state = String(body.state).trim().toLowerCase();
    if (!['open', 'closed'].includes(state)) {
      return res.status(400).json({ error: 'Issue state must be open or closed.' });
    }
    issue.state = state;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'assignee')) {
    issue.assignee = String(body.assignee || '').trim() || null;
  }
  if (body.milestone !== undefined) {
    issue.milestone = String(body.milestone || '').trim() || null;
  }
  if (Array.isArray(body.labels)) {
    issue.labels = body.labels.map((label) => String(label).trim()).filter(Boolean);
  }
  return res.json({ issue });
});

app.get('/api/repos/:owner/:name/issues/:number', (req, res) => {
  const issue = store.findIssue(req.params.owner, req.params.name, req.params.number);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });
  res.json({ issue });
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
  const canAdmin = store.canAdmin(repo, req.user.username);
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

// ---------- pull requests, reviews, protection, merge ----------

function protectionOf(repo, branchName) {
  return (
    store.state.protections[store.repoKey(repo.owner, repo.name)] || {
      branch: branchName,
      requiredApprovals: 0,
      requiredChecks: [],
    }
  );
}

function approvalCount(pull, repo) {
  const reviewers = new Set();
  const headSha = store.branchHead(repo, pull.headBranch);
  for (const review of pull.reviews || []) {
    if (
      review.state === 'APPROVED' &&
      review.author !== pull.author &&
      review.headSha &&
      review.headSha === headSha
    ) {
      reviewers.add(review.author);
    }
  }
  return reviewers.size;
}

app.get('/api/repos/:owner/:name/pulls', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  res.json({
    pulls: (repo.pulls || [])
      .slice()
      .sort((a, b) => b.number - a.number)
      .map((pull) => ({
        number: pull.number,
        title: pull.title,
        author: pull.author,
        state: pull.state,
        baseBranch: pull.baseBranch,
        headBranch: pull.headBranch,
        createdAt: pull.createdAt,
      })),
  });
});

app.post('/api/repos/:owner/:name/pulls', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  if (!store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have write permission to open a pull request.' });
  }
  const title = String((req.body || {}).title || '').trim();
  const baseBranch = String((req.body || {}).baseBranch || 'main').trim();
  const headBranch = String((req.body || {}).headBranch || '').trim();
  if (!title) return res.status(400).json({ error: 'Pull request title is required.' });
  const branchNames = (repo.branches || []).map((branch) => branch.name);
  if (!branchNames.includes(baseBranch) || !branchNames.includes(headBranch)) {
    return res.status(400).json({ error: 'Base and head branches must exist.' });
  }
  if (baseBranch === headBranch) {
    return res.status(400).json({ error: 'Base and head branches must be different.' });
  }
  const pull = {
    number: store.nextPullNumber(repo),
    title,
    body: String((req.body || {}).body || '').trim(),
    author: req.user.username,
    // REQ-6-2-4 Create a Draft Pull Request
    state: (req.body || {}).draft === true ? 'draft' : 'open',
    baseBranch,
    headBranch,
    headSha: store.branchHead(repo, headBranch),
    createdAt: new Date().toISOString(),
    reviews: [],
    checks: [],
  };
  repo.pulls = repo.pulls || [];
  repo.pulls.push(pull);
  return res.status(201).json({ pull });
});

app.get('/api/repos/:owner/:name/pulls/:number', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  const protection = protectionOf(repo, pull.baseBranch);
  res.json({
    pull,
    protection,
    approvals: approvalCount(pull, repo),
  });
});

app.patch('/api/repos/:owner/:name/pulls/:number', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  const body = req.body || {};
  // REQ-6-2-4: only the author (or a maintainer) may mark a draft ready for review.
  if (body.ready === true) {
    if (pull.state !== 'draft') {
      return res.status(400).json({ error: 'Only a draft pull request can be marked ready for review.' });
    }
    if (pull.author !== req.user.username && !store.canWrite(repo, req.user.username)) {
      return res.status(403).json({ error: 'You cannot change this pull request.' });
    }
    pull.state = 'open';
    pull.readyAt = new Date().toISOString();
    return res.json({ pull });
  }
  const state = String(body.state || '').trim().toLowerCase();
  if (!['open', 'closed'].includes(state)) {
    return res.status(400).json({ error: 'Pull request state must be open or closed.' });
  }
  if (pull.author !== req.user.username && !store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You cannot change this pull request.' });
  }
  pull.state = state;
  return res.json({ pull });
});

app.post('/api/repos/:owner/:name/pulls/:number/reviews', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  if (!store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have permission to review.' });
  }
  const state = String((req.body || {}).state || '').trim().toUpperCase();
  if (!['APPROVED', 'COMMENTED', 'CHANGES_REQUESTED'].includes(state)) {
    return res.status(400).json({ error: 'Review state must be APPROVED, COMMENTED, or CHANGES_REQUESTED.' });
  }
  const review = {
    id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    author: req.user.username,
    state,
    body: String((req.body || {}).body || '').trim(),
    headSha: store.branchHead(repo, pull.headBranch),
    createdAt: new Date().toISOString(),
  };
  pull.reviews = pull.reviews || [];
  pull.reviews.push(review);
  return res.status(201).json({ review, approvals: approvalCount(pull, repo) });
});

app.post('/api/repos/:owner/:name/pulls/:number/checks', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  const name = String((req.body || {}).name || '').trim();
  const state = String((req.body || {}).state || 'success').trim().toLowerCase();
  if (!name) return res.status(400).json({ error: 'Check name is required.' });
  pull.checks = pull.checks || [];
  const existing = pull.checks.find((check) => check.name === name);
  if (existing) existing.state = state;
  else pull.checks.push({ name, state });
  return res.json({ checks: pull.checks });
});

app.get('/api/repos/:owner/:name/branches/:branch/protection', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  res.json({ protection: protectionOf(repo, req.params.branch) });
});

app.put('/api/repos/:owner/:name/branches/:branch/protection', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const canAdmin = store.canAdmin(repo, req.user.username);
  if (!canAdmin) return res.status(403).json({ error: 'Only repository admins can protect branches.' });
  const requiredApprovals = Math.max(0, Number((req.body || {}).requiredApprovals) || 0);
  const requiredChecks = Array.isArray((req.body || {}).requiredChecks)
    ? (req.body || {}).requiredChecks.map((check) => String(check)).filter(Boolean)
    : [];
  store.state.protections[store.repoKey(repo.owner, repo.name)] = {
    branch: String(req.params.branch || repo.defaultBranch),
    requiredApprovals,
    requiredChecks,
  };
  return res.json({ protection: store.state.protections[store.repoKey(repo.owner, repo.name)] });
});

app.post('/api/repos/:owner/:name/pulls/:number/merge', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  if (!store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have permission to merge.' });
  }
  if (pull.state !== 'open') return res.status(409).json({ error: 'Pull request is not open.' });
  const protection = protectionOf(repo, pull.baseBranch);
  const headSha = store.branchHead(repo, pull.headBranch);
  const approvals = approvalCount(pull, repo);
  const staleApprovals = (pull.reviews || []).some(
    (review) =>
      review.state === 'APPROVED' &&
      review.headSha &&
      review.headSha !== headSha,
  );
  if (protection.requiredApprovals > 0 && approvals < protection.requiredApprovals && staleApprovals) {
    return res
      .status(422)
      .json({ error: 'Approvals are stale because the head branch changed.' });
  }
  if (approvals < protection.requiredApprovals) {
    return res.status(422).json({
      error: `This branch requires ${protection.requiredApprovals} approval(s).`,
    });
  }
  const checks = pull.checks || [];
  const failed = protection.requiredChecks.filter(
    (name) => !checks.some((check) => check.name === name && check.state === 'success'),
  );
  if (failed.length) {
    return res.status(422).json({ error: `Required checks not successful: ${failed.join(', ')}` });
  }
  pull.state = 'merged';
  pull.mergedAt = new Date().toISOString();
  pull.mergedBy = req.user.username;
  const base = repo.branches.find((branch) => branch.name === pull.baseBranch);
  const head = repo.branches.find((branch) => branch.name === pull.headBranch);
  if (base && head && head.head) base.head = head.head;
  return res.json({ pull });
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
