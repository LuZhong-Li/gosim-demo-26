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
  const errors = {};
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim();
  if (!isUsernameValid(username)) {
    errors.username = 'Username format is invalid';
  }
  if (!isEmailValid(email)) {
    errors.email = 'Email format is invalid';
  }
  if (!isPasswordValid(body.password)) {
    errors.password = 'Password requirements are not satisfied';
  }
  if (String(body.password || '') !== String(body.confirmPassword || '')) {
    errors.confirmPassword = 'Password confirmation does not match';
  }
  if (body.terms !== true) {
    errors.terms = 'Agree to terms is required';
  }
  if (store.findUserByUsername(username)) {
    errors.username = 'Username already exists';
  }
  if (store.findUserByEmail(email)) {
    errors.email = 'An account with that email already exists';
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

// REQ-2 / REQ-3-3 / REQ-3-4: a private repository is only readable by its
// personal owner, an organization Owner, or an account with a repository grant.
// The guard runs before every repository route so no read endpoint leaks files,
// issues or pull requests from a private repository.
app.use('/api/repos/:owner/:name', (req, res, next) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return next();
  if (repo.visibility !== 'private') return next();
  const user = store.userByToken(authToken(req));
  if (canReadPrivateRepo(repo, user && user.username)) return next();
  return res.status(403).json({ error: 'Access denied' });
});

app.post('/api/auth/register', (req, res) => {
  const body = req.body || {};
  const errors = validateRegistration(body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });
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
  const generic = { error: 'Invalid credentials' };
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
  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required' });
  }
  if (currentPassword !== String(req.user.password || '')) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (!isPasswordValid(newPassword)) {
    return res.status(400).json({
      error:
        'New password must be 12-128 characters without whitespace and include uppercase, lowercase, digit, and special character.',
    });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Password confirmation does not match' });
  }
  req.user.password = newPassword;
  return res.json({ ok: true, message: 'Password updated' });
});

app.post('/api/auth/forgot', (req, res) => {
  // The local product directly displays the fixed verification code and does not
  // reveal whether an account exists: both known and unknown emails enter the
  // same next step.
  return res.json({ code: '123456' });
});

app.post('/api/auth/reset', (req, res) => {
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const code = String((req.body || {}).code || '').trim();
  const password = String((req.body || {}).password || '');
  const confirmPassword = String((req.body || {}).confirmPassword || '');
  const user = store.findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'No account is associated with that email.' });
  if (code !== '123456') {
    return res.status(400).json({ error: 'Verification code is invalid' });
  }
  if (!isPasswordValid(password)) {
    return res.status(400).json({ error: 'Password requirements are not satisfied' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Password confirmation does not match' });
  }
  user.password = password;
  return res.json({ ok: true, message: 'Password updated' });
});

// ---------- orgs ----------

app.get('/api/orgs', requireUser, (req, res) => {
  const orgs = store.state.memberships
    .filter((m) => String(m.username).toLowerCase() === req.user.username)
    .map((m) => ({ membership: m, org: store.findOrg(m.org) }))
    .filter((entry) => entry.org)
    .map((entry) => ({
      name: entry.org.name,
      displayName: entry.org.displayName,
      // REQ-3-2-2: the fork form only offers namespaces the user can create in.
      role: entry.membership.role || null,
    }));
  res.json({ orgs });
});

app.post('/api/orgs', requireUser, (req, res) => {
  const name = String((req.body || {}).name || '').trim().toLowerCase();
  const displayName = String((req.body || {}).displayName || '').trim();
  if (!displayName) {
    return res.status(400).json({ error: 'Display name is required' });
  }
  if (!/^[a-z0-9-]{1,39}$/.test(name)) {
    return res.status(400).json({ error: 'Organization name format is invalid' });
  }
  if (store.findOrg(name)) {
    return res.status(409).json({ error: 'Organization name already exists' });
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
  const existing = store.membership(org.name, username);
  // REQ-2-2-3: the official messages for a known member and an unknown account.
  if (existing) return res.status(409).json({ error: 'Account is already a member' });
  const user = store.findUserByUsername(username);
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (!['Member', 'Owner'].includes(role)) {
    return res.status(400).json({ error: 'Unsupported role.' });
  }
  store.state.memberships.push({ org: org.name, username, role });
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
  // REQ-2-2-1: only an organization Owner may create teams.
  if (!current || current.role !== 'Owner') {
    return res.status(403).json({ error: 'Only an organization owner can create teams.' });
  }
  const teamName = String((req.body || {}).name || '').trim();
  // REQ-2-2-1: 1-50 characters, lowercase ASCII letters, digits or single hyphens.
  if (!/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(teamName)) {
    return res.status(400).json({ error: 'Team name format is invalid' });
  }
  if (store.findTeam(org.name, teamName)) {
    return res.status(409).json({ error: 'Team name already exists.' });
  }
  const timestamp = new Date().toISOString();
  const team = {
    name: teamName,
    description: String((req.body || {}).description || '').trim(),
    members: [],
    parent: String((req.body || {}).parentTeam || '').trim() || null,
    creator: req.user.username,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (team.parent && (!store.findTeam(org.name, team.parent) || team.parent === team.name)) {
    return res.status(400).json({ error: 'Parent team must be another team in this organization.' });
  }
  store.addTeam(org.name, team);
  return res.status(201).json({ team, org: { name: org.name, displayName: org.displayName } });
});

// REQ-2-2-1 / REQ-2-2-2: the team detail page.
app.get('/api/orgs/:name/teams/:team', (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const team = store.findTeam(org.name, req.params.team);
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  const user = store.userByToken(authToken(req));
  const role = user ? store.membership(org.name, user.username)?.role || null : null;
  res.json({
    org: { name: org.name, displayName: org.displayName },
    team: {
      name: team.name,
      description: team.description || '',
      parent: team.parent || null,
      members: team.members || [],
    },
    teams: store.orgTeams(org.name).map((entry) => entry.name),
    role,
  });
});

// REQ-2-2-2 Manage Organization Team Members and Hierarchy
app.patch('/api/orgs/:name/teams/:team', requireUser, (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const current = store.membership(org.name, req.user.username);
  if (!current || current.role !== 'Owner') {
    return res.status(403).json({ error: 'Only an organization owner can change team hierarchy.' });
  }
  const team = store.findTeam(org.name, req.params.team);
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  const parent = String((req.body || {}).parentTeam || '').trim();
  if (parent) {
    if (parent.toLowerCase() === String(team.name).toLowerCase()) {
      return res.status(400).json({ error: 'A team cannot be its own parent.' });
    }
    let cursor = store.findTeam(org.name, parent);
    if (!cursor) {
      return res.status(400).json({ error: 'Parent team must be another team in this organization.' });
    }
    const seen = new Set();
    while (cursor && cursor.parent) {
      const parentName = String(cursor.parent).toLowerCase();
      if (seen.has(parentName)) break;
      seen.add(parentName);
      if (parentName === String(team.name).toLowerCase()) {
        // REQ-2-2-2: the official message for a rejected cycle.
        return res.status(400).json({ error: 'Cyclic team hierarchy is not allowed' });
      }
      cursor = store.findTeam(org.name, cursor.parent);
    }
  }
  team.parent = parent || null;
  team.updatedAt = new Date().toISOString();
  return res.json({ team });
});

app.post('/api/orgs/:name/teams/:team/members', requireUser, (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  if (!store.membership(org.name, req.user.username)) {
    return res.status(403).json({ error: 'You are not a member of this organization.' });
  }
  const username = String((req.body || {}).username || '').trim().toLowerCase();
  if (!store.findUserByUsername(username)) return res.status(404).json({ error: 'Account not found' });
  // REQ-2-2-2: only current organization members can join a team.
  if (!store.membership(org.name, username)) {
    return res.status(400).json({ error: 'That account is not a member of this organization.' });
  }
  const team = store.addTeamMember(org.name, req.params.team, username);
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  return res.status(201).json({ team });
});

// REQ-2-2-2: remove a member from the team (the organization membership stays).
app.delete('/api/orgs/:name/teams/:team/members/:username', requireUser, (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const current = store.membership(org.name, req.user.username);
  if (!current || !['Owner', 'Admin'].includes(current.role)) {
    return res.status(403).json({ error: 'Only an organization owner can manage team members.' });
  }
  const team = store.findTeam(org.name, req.params.team);
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  const target = String(req.params.username || '').trim().toLowerCase();
  team.members = (team.members || []).filter(
    (member) => String(member).toLowerCase() !== target,
  );
  team.updatedAt = new Date().toISOString();
  return res.json({ team });
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
  const username = String((req.body || {}).username || '').trim().toLowerCase();
  const permission = String((req.body || {}).permission || 'Read').trim();
  if (!store.findRepo(org.name, repoName)) {
    return res.status(404).json({ error: 'Repository not found.' });
  }
  if (!teamName && !username) {
    return res.status(400).json({ error: 'Grant access to a member or a team.' });
  }
  if (username && !store.membership(org.name, username)) {
    return res.status(400).json({ error: 'That account is not a member of this organization.' });
  }
  if (teamName && !store.findTeam(org.name, teamName)) {
    return res.status(404).json({ error: 'Team not found.' });
  }
  if (!['Read', 'Triage', 'Write', 'Maintain', 'Admin'].includes(permission)) {
    return res.status(400).json({ error: 'Unsupported repository permission.' });
  }
  store.state.accessGrants = store.state.accessGrants.filter(
    (item) =>
      !(
        item.org === org.name &&
        item.repo === repoName &&
        (username
          ? String(item.user || '').toLowerCase() === username
          : String(item.team || '') === teamName)
      ),
  );
  const grant = {
    org: org.name,
    repo: repoName,
    team: username ? null : teamName,
    user: username || null,
    permission,
  };
  store.state.accessGrants.push(grant);
  return res.status(201).json({ grant });
});

app.get('/api/orgs/:name/access', (req, res) => {
  const org = store.findOrg(req.params.name);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  res.json({ grants: store.state.accessGrants.filter((grant) => grant.org === org.name) });
});

// REQ-3-2-1 Create a Repository with Owner, Visibility, and Initialization Options
// (personal namespace; organization repositories are handled below)
app.post('/api/repos', requireUser, (req, res) => {
  const repoName = String((req.body || {}).name || '').trim().toLowerCase();
  const visibility = String((req.body || {}).visibility || 'private').trim().toLowerCase();
  // REQ-3-2-1: the owner may be the personal account or an organization of the user.
  const owner = String((req.body || {}).owner || req.user.username).trim().toLowerCase();
  const ownerOrg = owner === req.user.username.toLowerCase() ? null : store.findOrg(owner);
  if (ownerOrg && !store.membership(ownerOrg.name, req.user.username)) {
    return res.status(403).json({ error: 'You are not a member of this organization.' });
  }
  if (!ownerOrg && owner !== req.user.username.toLowerCase()) {
    return res.status(404).json({ error: 'Owner not found.' });
  }
  if (!/^[a-z0-9._-]{1,100}$/.test(repoName)) {
    return res.status(400).json({ error: 'Repository name may only contain letters, digits, dots, underscores, and hyphens.' });
  }
  if (!['public', 'private'].includes(visibility)) {
    return res.status(400).json({ error: 'Visibility must be public or private.' });
  }
  const ownerName = ownerOrg ? ownerOrg.name : req.user.username;
  if (store.findRepo(ownerName, repoName)) {
    return res.status(409).json({ error: 'A repository with that name already exists.' });
  }
  // REQ-3-2-1: "Add a README file" controls whether the repository is initialized with one.
  const readme = (req.body || {}).readme === undefined ? true : Boolean(req.body.readme);
  const repo = {
    owner: ownerName,
    ownerType: ownerOrg ? 'organization' : 'user',
    name: repoName,
    visibility,
    description: String((req.body || {}).description || '').trim(),
    defaultBranch: 'main',
    creator: req.user.username,
    createdBy: req.user.username,
    createdAt: new Date().toISOString(),
  };
  store.state.repos.push(repo);
  store.initializeRepoContent(repo, req.user.username, { readme });
  return res.status(201).json({ repo });
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
    if (!allowed) return res.status(403).json({ error: 'Access denied' });
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
  // REQ-3-2-2: a private source always forks into a private repository.
  const forkVisibility = source.visibility === 'private'
    ? 'private'
    : ['public', 'private'].includes(visibility)
      ? visibility
      : 'public';
  const fork = store.forkRepo(
    source,
    targetOwner,
    org ? 'organization' : 'user',
    forkVisibility,
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
  // REQ-3-4: private visibility is enforced by the repository guard middleware.
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
      // REQ-3-4 / REQ-6-1: the UI hides admin-only controls for non-admins.
      canAdmin: store.canAdmin(repo, user && user.username),
      // REQ-4-3-2: only writers may create branches from the selector.
      canWrite: store.canWrite(repo, user && user.username),
      // REQ-6-1: Settings → Branches shows the persisted rule for this repository.
      protection: protectionOf(repo, repo.defaultBranch),
    },
  });
});

app.get('/api/repos/:owner/:name/search', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  // REQ-4-2-3: private visibility is enforced by the repository guard middleware.
  const matches = store.searchCode(repo, req.query.q, req.query.path);
  res.json({ matches });
});

app.get('/api/repos/:owner/:name/tree', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  // REQ-4-3-3: opening the repository without a branch shows the saved default branch.
  const branch =
    req.query.branch ||
    repo.defaultBranch ||
    (repo.branches && repo.branches[0] ? repo.branches[0].name : 'main');
  // REQ-4-1 / REQ-4-3-1: the file list belongs to the selected branch's snapshot.
  const headCommit = store.commitBySha(repo, store.branchHead(repo, branch));
  const files =
    headCommit && Array.isArray(headCommit.snapshot)
      ? headCommit.snapshot.map((file) => file.path)
      : (repo.files || []).map((file) => file.path);
  res.json({
    branch,
    defaultBranch: repo.defaultBranch,
    files,
    branches: (repo.branches || []).map((branchItem) => branchItem.name),
  });
});

app.get('/api/repos/:owner/:name/compare', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  // REQ-6-2-2: only Write, Maintain, Admin or organization Owner may compare.
  if (!store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const base = String(req.query.base || 'main').trim();
  const head = String(req.query.head || '').trim();
  if (!head) return res.status(400).json({ error: 'A head branch is required.' });
  const result = store.compareBranches(repo, base, head);
  if (!result) return res.status(404).json({ error: 'One of the branches was not found.' });
  return res.json(result);
});

app.get('/api/repos/:owner/:name/contents', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const filePath = String(req.query.path || '');
  // REQ-4-1: a file is read from the selected branch's snapshot when one is given.
  const branch = String(req.query.branch || '').trim();
  let file = null;
  if (branch) {
    const commit = store.commitBySha(repo, store.branchHead(repo, branch));
    file = (commit && (commit.snapshot || []).find((entry) => entry.path === filePath)) || null;
  }
  if (!file) file = store.findFile(repo, filePath);
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
  const message = String((req.body || {}).message || '').trim();
  const branchName = String((req.body || {}).branch || 'main').trim();
  // REQ-4-4: a path must not be absolute or contain a ".." segment.
  if (!filePath || !isValidFilePath(filePath)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }
  // REQ-4-4: an empty commit message is rejected with the official message.
  if (!message) return res.status(400).json({ error: 'Commit message is required' });
  if (message.length > 72) {
    return res.status(400).json({ error: 'Commit message must be between 1 and 72 characters.' });
  }
  if (!(repo.branches || []).some((branch) => branch.name === branchName)) {
    return res.status(400).json({ error: 'Branch not found.' });
  }
  // REQ-6-1: a branch protection rule blocks direct writes to that branch.
  if (isProtectedBranch(repo, branchName) && !store.canAdmin(repo, req.user.username)) {
    return res.status(403).json({ error: 'Branch is protected. Commit through a pull request.' });
  }
  store.addFile(repo, filePath, content, req.user.username, message, branchName);
  return res.status(201).json({ path: filePath, message });
});
app.delete('/api/repos/:owner/:name/contents', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  if (!store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have write permission to this repository.' });
  }
  const filePath = String(req.query.path || '');
  const branchName = String(req.query.branch || 'main').trim();
  if (!filePath || !isValidFilePath(filePath)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }
  const existing = store.findFile(repo, filePath);
  if (!existing) return res.status(404).json({ error: 'File not found.' });
  if (!(repo.branches || []).some((branch) => branch.name === branchName)) {
    return res.status(400).json({ error: 'Branch not found.' });
  }
  // REQ-6-1: a branch protection rule blocks direct writes to that branch.
  if (isProtectedBranch(repo, branchName) && !store.canAdmin(repo, req.user.username)) {
    return res.status(403).json({ error: 'Branch is protected. Commit through a pull request.' });
  }
  const message = String(req.query.message || '').trim() || `Delete ${filePath}`;
  if (message.length < 1 || message.length > 72) {
    return res.status(400).json({ error: 'Commit message must be between 1 and 72 characters.' });
  }
  const sha = store.removeFile(repo, filePath, req.user.username, message, branchName);
  return res.json({ deleted: filePath, sha });
});


// REQ-4-2-2 Inspect Commit and Revision Differences
app.get('/api/repos/:owner/:name/commits/:sha', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const commit = store.commitBySha(repo, req.params.sha);
  if (!commit) return res.status(404).json({ error: 'Commit not found.' });
  // commits are stored newest-first; the next entry is the revision this one was based on
  const index = (repo.commits || []).findIndex((item) => item.sha === commit.sha);
  const parent = (repo.commits || [])[index + 1] || null;
  const result = store.diffSnapshots(
    parent ? parent.snapshot || [] : [],
    commit.snapshot || [],
  );
  return res.json({
    commit: { sha: commit.sha, message: commit.message, author: commit.author, timestamp: commit.timestamp },
    parentSha: parent ? parent.sha : null,
    files: result.files,
    stats: result.stats,
  });
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
  if (!/^[A-Za-z0-9_.-]{1,200}$/.test(branchName) || branchName.includes('..')) {
    // REQ-4-3-2: the official message for a malformed branch name.
    return res.status(400).json({ error: 'Invalid branch' });
  }
  const head = store.addBranch(repo, branchName, req.user.username);
  if (!head) return res.status(409).json({ error: 'A branch with that name already exists.' });
  return res.status(201).json({ name: branchName });
});

app.get('/api/repos/:owner/:name/issues', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  const user = store.userByToken(authToken(req));
  const issues = store.listIssues(req.params.owner, req.params.name).map((issue) => ({
    number: issue.number,
    title: issue.title,
    author: issue.author,
    state: issue.state,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt || issue.createdAt,
    assignee: issue.assignee || null,
    labels: issue.labels || [],
    milestone: issue.milestone || null,
    comments: (issue.comments || []).length,
    // REQ-5-2-2 / REQ-5-4: the list can hide edit/close affordances for read-only users.
    canEdit: Boolean(repo && store.canWrite(repo, user && user.username)),
    canClose: Boolean(repo && canTriage(repo, user && user.username)),
    canTriage: Boolean(repo && canTriage(repo, user && user.username)),
  }));
  res.json({ issues });
});

app.post('/api/repos/:owner/:name/issues', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const title = String((req.body || {}).title || '').trim();
  // REQ-5-2-1: an empty (or whitespace-only) issue title uses the official message.
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (title.length > 256) {
    return res.status(400).json({ error: 'Issue title must be 256 characters or fewer.' });
  }
  if (!store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have write permission to create issues.' });
  }
  // REQ-5-3-1 / 5-3-2 / 5-3-3: metadata must already exist on this repository,
  // and validation runs before a number is allocated so failures leave no trace.
  const labelNames = Array.isArray((req.body || {}).labels)
    ? (req.body.labels || []).map((label) => String(label).trim()).filter(Boolean)
    : [];
  const missingLabels = unknownLabels(repo, labelNames);
  if (missingLabels.length) {
    return res.status(422).json({ error: `Label not found: ${missingLabels.join(', ')}` });
  }
  const assigneeNames = Array.isArray((req.body || {}).assignees)
    ? (req.body.assignees || []).map((entry) => String(entry).trim()).filter(Boolean)
    : [];
  const notAssignable = nonAssignableUsers(repo, assigneeNames);
  if (notAssignable.length) {
    return res.status(422).json({ error: `Users not in organization: ${notAssignable.join(', ')}` });
  }
  const milestoneName = String((req.body || {}).milestone || '').trim() || null;
  if (milestoneName && !(repo.milestones || []).includes(milestoneName)) {
    return res.status(422).json({ error: 'Milestone not found' });
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
    // REQ-5-3-1: issues may be assigned to several participants.
    assignees: assigneeNames,
    createdAt: new Date().toISOString(),
    assignee: assigneeNames[0] || String((req.body || {}).assignee || '').trim() || null,
    labels: labelNames,
    milestone: milestoneName,
    // REQ-5-2-1: creation is recorded in the activity timeline.
    activities: [
      { type: 'Created issue', actor: req.user.username, at: new Date().toISOString() },
    ],
    updatedAt: new Date().toISOString(),
  };
  store.state.issues.push(issue);
  return res.status(201).json({ issue });
});

app.patch('/api/repos/:owner/:name/issues/:number', requireUser, (req, res) => {
  const issue = store.findIssue(req.params.owner, req.params.name, req.params.number);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const body = req.body || {};
  // REQ-5-2-2: editing the title/description needs Write, Maintain or Admin.
  const editingContent =
    Object.prototype.hasOwnProperty.call(body, 'title') ||
    Object.prototype.hasOwnProperty.call(body, 'body');
  if (editingContent && !store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have write permission to edit issues.' });
  }
  // REQ-5-4: closing or reopening needs Triage, Maintain or Admin.
  if (body.state && !canTriage(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have permission to change the issue status.' });
  }
  // REQ-5-3-3: milestone assignment needs Triage, Maintain or Admin.
  if (Object.prototype.hasOwnProperty.call(body, 'milestone') && !canTriage(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have permission to change the milestone.' });
  }
  // REQ-5-3-1: assignee changes need Triage, Maintain or Admin.
  if (Array.isArray(body.assignees) && !canTriage(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have permission to change assignees.' });
  }
  // REQ-5-3-2: label changes need Triage, Maintain or Admin.
  if (Array.isArray(body.labels) && !canTriage(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have permission to change labels.' });
  }
  // REQ-5-3-1: only accounts with triage-or-higher are assignable.
  if (Array.isArray(body.assignees)) {
    const names = body.assignees.map((name) => String(name).trim()).filter(Boolean);
    const notAssignable = nonAssignableUsers(repo, names);
    if (notAssignable.length) {
      return res
        .status(422)
        .json({ error: `Users not in organization: ${notAssignable.join(', ')}` });
    }
  }
  // REQ-5-3-2: labels come from the repository catalog only.
  if (Array.isArray(body.labels)) {
    const names = body.labels.map((label) => String(label).trim()).filter(Boolean);
    const missing = unknownLabels(repo, names);
    if (missing.length) {
      return res.status(422).json({ error: `Label not found: ${missing.join(', ')}` });
    }
  }
  // REQ-5-3-3: a milestone must exist in the same repository.
  if (body.milestone !== undefined) {
    const name = String(body.milestone || '').trim();
    if (name && !(repo.milestones || []).includes(name)) {
      return res.status(422).json({ error: 'Milestone not found' });
    }
  }
  // REQ-5-2-2: editing an issue title rejects a whitespace-only value.
  if (Object.prototype.hasOwnProperty.call(body, 'title')) {
    const title = String(body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (title.length > 256) {
      return res.status(400).json({ error: 'Issue title must be 256 characters or fewer.' });
    }
    if (title !== issue.title) {
      pushActivity(issue, 'Edited the issue title', req.user.username, {
        from: issue.title,
        to: title,
      });
    }
    issue.title = title;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'body')) {
    if (String(body.body || '') !== String(issue.body || '')) {
      pushActivity(issue, 'Edited the issue description', req.user.username);
    }
    issue.body = String(body.body || '');
  }
  if (body.state) {
    const state = String(body.state).trim().toLowerCase();
    if (!['open', 'closed'].includes(state)) {
      return res.status(400).json({ error: 'Issue state must be open or closed.' });
    }
    if (state !== issue.state) {
      issue.state = state;
      issue.stateChangedBy = req.user.username;
      issue.stateChangedAt = new Date().toISOString();
      // REQ-5-4: the transition is recorded in the activity timeline.
      pushActivity(issue, state === 'closed' ? 'Closed issue' : 'Reopened issue', req.user.username);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, 'assignee')) {
    issue.assignee = String(body.assignee || '').trim() || null;
  }
  // REQ-5-3-1: an issue may carry several assignees.
  if (Array.isArray(body.assignees)) {
    const next = body.assignees.map((name) => String(name).trim()).filter(Boolean);
    const { added, removed } = addedAndRemoved(issue.assignees, next);
    issue.assignees = next;
    issue.assignee = issue.assignees[0] || null;
    if (added.length) pushActivity(issue, `Assigned ${added.join(', ')}`, req.user.username);
    if (removed.length) pushActivity(issue, `Unassigned ${removed.join(', ')}`, req.user.username);
  }
  if (body.milestone !== undefined) {
    const next = String(body.milestone || '').trim() || null;
    if (next !== (issue.milestone || null)) {
      pushActivity(
        issue,
        next ? `Set milestone to ${next}` : 'Removed the milestone',
        req.user.username,
      );
    }
    issue.milestone = next;
  }
  if (Array.isArray(body.labels)) {
    const next = body.labels.map((label) => String(label).trim()).filter(Boolean);
    const { added, removed } = addedAndRemoved(issue.labels, next);
    issue.labels = next;
    if (added.length) pushActivity(issue, `Added the ${added.join(', ')} label`, req.user.username);
    if (removed.length) {
      pushActivity(issue, `Removed the ${removed.join(', ')} label`, req.user.username);
    }
  }
  return res.json({ issue });
});

// REQ-5-2-3: reactions on an issue or one of its comments (toggle per user).
app.post('/api/repos/:owner/:name/issues/:number/reactions', requireUser, (req, res) => {
  const issue = store.findIssue(req.params.owner, req.params.name, req.params.number);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });
  const type = String((req.body || {}).type || '👍').trim();
  const commentId = (req.body || {}).commentId ? String((req.body || {}).commentId) : null;
  issue.reactions = issue.reactions || [];
  const existing = issue.reactions.find(
    (reaction) =>
      reaction.user === req.user.username &&
      reaction.type === type &&
      (reaction.commentId || null) === commentId,
  );
  if (existing) {
    issue.reactions = issue.reactions.filter((reaction) => reaction !== existing);
    return res.json({ ok: true, removed: true, issue });
  }
  issue.reactions.push({
    user: req.user.username,
    type,
    commentId,
    createdAt: new Date().toISOString(),
  });
  return res.status(201).json({ ok: true, issue });
});

app.get('/api/repos/:owner/:name/issues/:number', (req, res) => {
  const issue = store.findIssue(req.params.owner, req.params.name, req.params.number);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });
  const repo = store.findRepo(req.params.owner, req.params.name);
  const user = store.userByToken(authToken(req));
  res.json({
    issue,
    canEdit: Boolean(repo && store.canWrite(repo, user && user.username)),
    canClose: Boolean(repo && canTriage(repo, user && user.username)),
    canTriage: Boolean(repo && canTriage(repo, user && user.username)),
  });
});

// REQ-5-3-3: milestones belong to one repository and are selectable metadata.
app.get('/api/repos/:owner/:name/milestones', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  res.json({ milestones: repo.milestones || [] });
});

// REQ-5-3-2: the issue label selector only offers labels defined in this repository.
app.get('/api/repos/:owner/:name/labels', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  res.json({ labels: labelCatalog(repo) });
});

// REQ-5-3-1: assignable participants are the accounts with triage-or-higher.
app.get('/api/repos/:owner/:name/members', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  res.json({ members: assignableMembers(repo) });
});

// REQ-2-3: Manage access lives under repository Settings.
app.get('/api/repos/:owner/:name/access', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const user = store.userByToken(authToken(req));
  const isOrgRepo = repo.ownerType === 'organization';
  const grants = isOrgRepo
    ? store.grantsFor(repo.owner, repo.name).map((grant) => ({
        subject: grant.user || grant.team,
        kind: grant.user ? 'user' : 'team',
        permission: grant.permission,
      }))
    : [];
  res.json({
    canManage: store.canAdmin(repo, user && user.username),
    grants,
    // Candidates come from the owning organization, never from another one.
    members: isOrgRepo ? store.orgMembers(repo.owner).map((member) => member.username) : [],
    teams: isOrgRepo ? store.orgTeams(repo.owner).map((team) => team.name) : [],
  });
});

app.post('/api/repos/:owner/:name/access', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  if (!store.canAdmin(repo, req.user.username)) {
    return res.status(403).json({ error: 'Only a repository admin can manage access.' });
  }
  if (repo.ownerType !== 'organization') {
    return res.status(400).json({ error: 'Access grants apply to organization repositories.' });
  }
  const body = req.body || {};
  const subject = String(body.subject || '').trim();
  const kind = String(body.kind || 'team').trim() === 'user' ? 'user' : 'team';
  const permission = String(body.permission || 'Read').trim();
  if (!subject) return res.status(400).json({ error: 'Choose a member or a team.' });
  if (!['Read', 'Triage', 'Write', 'Maintain', 'Admin'].includes(permission)) {
    return res.status(400).json({ error: 'Unsupported repository permission.' });
  }
  if (kind === 'team') {
    if (!store.findTeam(repo.owner, subject)) {
      return res.status(404).json({ error: 'Team not found.' });
    }
  } else if (!store.membership(repo.owner, subject.toLowerCase())) {
    return res.status(400).json({ error: 'That account is not a member of this organization.' });
  }
  // Exactly one grant per subject: an existing grant is replaced, not duplicated.
  store.state.accessGrants = store.state.accessGrants.filter(
    (grant) =>
      !(
        grant.org === repo.owner &&
        grant.repo === repo.name &&
        (kind === 'user'
          ? String(grant.user || '').toLowerCase() === subject.toLowerCase()
          : String(grant.team || '') === subject)
      ),
  );
  const grant = {
    org: repo.owner,
    repo: repo.name,
    team: kind === 'team' ? subject : null,
    user: kind === 'user' ? subject.toLowerCase() : null,
    permission,
  };
  store.state.accessGrants.push(grant);
  return res.status(201).json({ grant });
});

app.post('/api/repos/:owner/:name/issues/:number/comments', requireUser, (req, res) => {
  const issue = store.findIssue(req.params.owner, req.params.name, req.params.number);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });
  const body = String((req.body || {}).body || '').trim();
  // REQ-5-2-3: the official message for a whitespace-only comment.
  if (!body) return res.status(400).json({ error: 'Comment is required' });
  issue.comments = issue.comments || [];
  const comment = {
    id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    author: req.user.username,
    body,
    createdAt: new Date().toISOString(),
  };
  issue.comments.push(comment);
  // REQ-5-2-3: the comment is appended to the activity timeline as its own record.
  pushActivity(issue, 'Commented', req.user.username, { body, commentId: comment.id });
  return res.status(201).json({ comment });
});

app.patch('/api/repos/:owner/:name', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  if (!store.canAdmin(repo, req.user.username)) {
    return res.status(403).json({
      error: 'Only a repository admin can change visibility or the default branch.',
    });
  }
  const body = req.body || {};
  const visibility = String(body.visibility || '').trim().toLowerCase();
  if (visibility && !['public', 'private'].includes(visibility)) {
    return res.status(400).json({ error: 'Visibility must be public or private.' });
  }
  // REQ-4-3-3: the new default branch must be an existing branch of this repository.
  const defaultBranch = String(body.defaultBranch || '').trim();
  if (defaultBranch && !(repo.branches || []).some((branch) => branch.name === defaultBranch)) {
    return res.status(400).json({ error: 'Branch not found.' });
  }
  const timestamp = new Date().toISOString();
  if (visibility && visibility !== repo.visibility) {
    // REQ-3-4: visibility changes are persisted with the operator and time.
    repo.visibility = visibility;
    repo.visibilityUpdatedBy = req.user.username;
    repo.visibilityUpdatedAt = timestamp;
  }
  if (defaultBranch && defaultBranch !== repo.defaultBranch) {
    repo.defaultBranch = defaultBranch;
    repo.defaultBranchUpdatedBy = req.user.username;
    repo.defaultBranchUpdatedAt = timestamp;
  }
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

// REQ-6-1: an explicitly saved rule (not the empty fallback) protects its exact branch.
function isProtectedBranch(repo, branchName) {
  const rule = store.state.protections[store.repoKey(repo.owner, repo.name)];
  return Boolean(rule && rule.branch === branchName);
}

// REQ-4-4: repository file paths must be relative and free of ".." segments.
function isValidFilePath(filePath) {
  if (!/^[A-Za-z0-9_./-]{1,200}$/.test(filePath)) return false;
  if (filePath.startsWith('/')) return false;
  return !filePath.split('/').includes('..');
}

// REQ-6-6: closing/reopening is limited to the author, Maintain, Admin or organization Owner.
function canManagePull(repo, username, pull) {
  if (!username) return false;
  if (pull && String(pull.author).toLowerCase() === String(username).toLowerCase()) return true;
  return canMaintain(repo, username);
}

// REQ-6-1: Checks are attached to the current compare commit; a new commit resets them to pending.
function normalizedChecks(pull, protection, headSha) {
  const names = new Set([
    ...((protection && protection.requiredChecks) || []),
    ...((pull.checks || []).map((check) => check.name)),
  ]);
  return Array.from(names)
    .filter(Boolean)
    .map((name) => {
      const stored = (pull.checks || []).find(
        (check) => check.name === name && (!check.headSha || check.headSha === headSha),
      );
      if (stored) return { state: 'pending', ...stored };
      return { name, state: 'pending' };
    });
}

// REQ-6-1: only each reviewer's latest decision on the current compare commit counts.
function latestReviews(pull) {
  const latest = new Map();
  for (const review of pull.reviews || []) {
    const previous = latest.get(review.author);
    if (!previous || String(review.createdAt || '') >= String(previous.createdAt || '')) {
      latest.set(review.author, review);
    }
  }
  return Array.from(latest.values());
}

function approvalCount(pull, repo) {
  const headSha = store.branchHead(repo, pull.headBranch);
  const reviewers = new Set();
  for (const review of latestReviews(pull)) {
    if (review.state !== 'APPROVED') continue;
    if (review.author === pull.author) continue;
    if (review.headSha && review.headSha !== headSha) continue;
    reviewers.add(review.author);
  }
  return reviewers.size;
}

// REQ-6-5: Maintain, Admin or organization Owner may merge.
function canMaintain(repo, username) {
  if (!username) return false;
  if (store.canAdmin(repo, username)) return true;
  const grant = store.bestGrantPermission(repo.owner, repo.name, username);
  if (['Maintain', 'Admin'].includes(grant)) return true;
  const member = store.membership(repo.owner, username);
  return ['Maintain', 'Admin', 'Owner'].includes((member && member.role) || '');
}

// REQ-5-3-3 / REQ-5-4: Triage, Maintain or Admin may manage issue metadata and status.
function canTriage(repo, username) {
  if (!username) return false;
  if (canMaintain(repo, username)) return true;
  const grant = store.bestGrantPermission(repo.owner, repo.name, username);
  if (grant === 'Triage') return true;
  const member = store.membership(repo.owner, username);
  return (member && member.role) === 'Triage';
}

// REQ-5-1-2 / REQ-5-2 / REQ-5-3 / REQ-5-4: every issue/PR mutation appends an
// activity record so the timeline shows creation, edits, comments, assignment,
// labels, milestones and status changes.
function pushActivity(subject, type, actor, extra = {}) {
  subject.activities = subject.activities || [];
  subject.activities.push({ type, actor, at: new Date().toISOString(), ...extra });
  subject.updatedAt = new Date().toISOString();
}

function addedAndRemoved(before, after) {
  const previous = new Set(before || []);
  const next = new Set(after || []);
  return {
    added: [...next].filter((value) => !previous.has(value)),
    removed: [...previous].filter((value) => !next.has(value)),
  };
}

// REQ-5-3-2: a label must already exist in this repository; the selector never
// creates labels and never reaches across repositories.
function labelCatalog(repo) {
  return (repo.labels || []).map((label) => (typeof label === 'string' ? label : label.name));
}

function unknownLabels(repo, names) {
  const catalog = new Set(labelCatalog(repo));
  return names.filter((name) => !catalog.has(name));
}

// REQ-5-3-1: assignable members are accounts with at least Triage on the repo.
function assignableMembers(repo) {
  if (repo.ownerType === 'user') return [repo.owner];
  return store
    .orgMembers(repo.owner)
    .map((member) => member.username)
    .filter((username) => canTriage(repo, username));
}

function nonAssignableUsers(repo, names) {
  const allowed = new Set(assignableMembers(repo).map((name) => String(name).toLowerCase()));
  if (store.findUserByUsername(repo.owner)) allowed.add(String(repo.owner).toLowerCase());
  return names.filter((name) => !allowed.has(String(name).toLowerCase()));
}

// REQ-2: organization membership alone does not grant private repository access.
function canReadPrivateRepo(repo, username) {
  if (!username) return false;
  if (repo.ownerType === 'user') {
    return String(repo.owner).toLowerCase() === String(username).toLowerCase();
  }
  const member = store.membership(repo.owner, username);
  if (member && member.role === 'Owner') return true;
  return Boolean(store.bestGrantPermission(repo.owner, repo.name, username));
}

// REQ-5-3-2: file contents at a specific commit, keyed by path.
function snapshotOfCommit(repo, sha) {
  const commit = store.commitBySha(repo, sha);
  if (!commit) return null;
  const files = {};
  for (const file of commit.snapshot || []) files[file.path] = file.content;
  return files;
}

// REQ-6-5: a merge is blocked when both branches changed the same file relative
// to the commit the pull request was opened from.
function mergeConflicts(repo, pull) {
  // Without a recorded creation-time base commit there is no ancestor to
  // compare against, so nothing can be reported as conflicting.
  if (!store.commitBySha(repo, pull.baseSha)) return [];
  const ancestor = snapshotOfCommit(repo, pull.baseSha) || {};
  const base = snapshotOfCommit(repo, store.branchHead(repo, pull.baseBranch)) || {};
  const head = snapshotOfCommit(repo, store.branchHead(repo, pull.headBranch)) || {};
  const paths = new Set([...Object.keys(base), ...Object.keys(head)]);
  const conflicts = [];
  for (const path of paths) {
    const original = ancestor[path];
    const baseChanged = base[path] !== original;
    const headChanged = head[path] !== original;
    if (baseChanged && headChanged && base[path] !== head[path]) conflicts.push(path);
  }
  return conflicts;
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
  // REQ-6-2-3: a whitespace-only title is rejected with the official message.
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (title.length > 256) {
    return res.status(400).json({ error: 'Pull request title must be 256 characters or fewer.' });
  }
  const branchNames = (repo.branches || []).map((branch) => branch.name);
  if (!branchNames.includes(baseBranch) || !branchNames.includes(headBranch)) {
    return res.status(400).json({ error: 'Base and head branches must exist.' });
  }
  if (baseBranch === headBranch) {
    return res.status(400).json({ error: 'Base and head branches must be different.' });
  }
  // REQ-6-2 / REQ-6-2-3: an open or draft pull request for the same branch pair
  // already exists, so no second record may be created.
  const duplicate = (repo.pulls || []).find(
    (item) =>
      item.baseBranch === baseBranch &&
      item.headBranch === headBranch &&
      (item.state === 'open' || item.state === 'draft'),
  );
  if (duplicate) {
    return res.status(422).json({ error: 'A pull request already exists for these branches' });
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
    // REQ-6-5: the creation-time base commit is the ancestor used for conflicts.
    baseSha: store.branchHead(repo, baseBranch),
    headSha: store.branchHead(repo, headBranch),
    milestone: String((req.body || {}).milestone || '').trim() || null,
    createdAt: new Date().toISOString(),
    reviews: [],
    checks: [],
  };
  repo.pulls = repo.pulls || [];
  repo.pulls.push(pull);
  // REQ-6-2-3: creation is an activity record on the pull request.
  pushActivity(pull, 'Opened this pull request', req.user.username);
  return res.status(201).json({ pull });
});

app.get('/api/repos/:owner/:name/pulls/:number', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  const user = store.userByToken(authToken(req));
  const protection = protectionOf(repo, pull.baseBranch);
  const headSha = store.branchHead(repo, pull.headBranch);
  res.json({
    pull: { ...pull, checks: normalizedChecks(pull, protection, headSha) },
    protection,
    approvals: approvalCount(pull, repo),
    // REQ-6-5: conflicting paths block the merge and are surfaced to the UI.
    conflicts: mergeConflicts(repo, pull),
    canAdmin: store.canAdmin(repo, user && user.username),
    // REQ-6-6: only the author, Maintain, Admin or Owner may close or reopen.
    canClose: canManagePull(repo, user && user.username, pull),
    // REQ-6-5: only Maintain, Admin or organization Owner may merge.
    canMerge: canMaintain(repo, user && user.username),
    // REQ-5-3-3: milestone changes need Triage, Maintain or Admin.
    canTriage: canTriage(repo, user && user.username),
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
    if (!canManagePull(repo, req.user.username, pull)) {
      return res.status(403).json({ error: 'You cannot change this pull request.' });
    }
    pull.state = 'open';
    pull.readyAt = new Date().toISOString();
    return res.json({ pull });
  }
  const hasState = body.state !== undefined;
  const hasMilestone = Object.prototype.hasOwnProperty.call(body, 'milestone');
  if (!hasState && !hasMilestone) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }
  // REQ-5-3-3: milestone changes on a PR need Triage, Maintain or Admin.
  if (hasMilestone) {
    if (!canTriage(repo, req.user.username)) {
      return res.status(403).json({ error: 'You do not have permission to change the milestone.' });
    }
    pull.milestone = String(body.milestone || '').trim() || null;
  }
  if (hasState) {
    const state = String(body.state).trim().toLowerCase();
    if (!['open', 'closed'].includes(state)) {
      return res.status(400).json({ error: 'Pull request state must be open or closed.' });
    }
    if (!canManagePull(repo, req.user.username, pull)) {
      return res.status(403).json({ error: 'You cannot change this pull request.' });
    }
    pull.state = state;
  }
  return res.json({ pull });
});

// REQ-6-3-2 Inspect Changed Files and Aggregate Diff
// REQ-6-3-1 View Pull Request Overview and Commits
app.get('/api/repos/:owner/:name/pulls/:number/commits', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  const baseHead = store.branchHead(repo, pull.baseBranch);
  const comparison = store.compareBranches(repo, pull.baseBranch, pull.headBranch);
  // Commits on the compare branch relative to base (the base head itself is not part of the PR).
  const commits = (comparison ? comparison.commits : []).filter((commit) => commit.sha !== baseHead);
  res.json({
    baseBranch: pull.baseBranch,
    headBranch: pull.headBranch,
    commits,
    stats: comparison ? comparison.stats : { changedFiles: 0, added: 0, removed: 0 },
  });
});

app.get('/api/repos/:owner/:name/pulls/:number/files', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  const baseCommit = store.commitBySha(repo, store.branchHead(repo, pull.baseBranch));
  const headCommit = store.commitBySha(repo, store.branchHead(repo, pull.headBranch));
  const baseFiles = baseCommit ? baseCommit.snapshot || [] : [];
  const headFiles = headCommit ? headCommit.snapshot || [] : repo.files || [];
  const result = store.diffSnapshots(baseFiles, headFiles);
  return res.json({
    baseBranch: pull.baseBranch,
    headBranch: pull.headBranch,
    files: result.files,
    stats: result.stats,
  });
});

// REQ-6-3-3 Add Review Comments to Changed Code Lines
// REQ-6-4 Request or Remove Pull Request Reviewers
app.post('/api/repos/:owner/:name/pulls/:number/reviewers', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  if (pull.author !== req.user.username && !store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You cannot change reviewers for this pull request.' });
  }
  const username = String((req.body || {}).username || '').trim().toLowerCase();
  const candidate = store.findUserByUsername(username);
  if (!candidate) return res.status(404).json({ error: 'User not found.' });
  if (username === String(pull.author).toLowerCase()) {
    return res.status(400).json({ error: 'The pull request author cannot be a reviewer.' });
  }
  if (!store.canWrite(repo, username)) {
    return res.status(400).json({ error: 'That account does not have write access to this repository.' });
  }
  pull.reviewers = pull.reviewers || [];
  if (!pull.reviewers.some((item) => String(item.username).toLowerCase() === username)) {
    pull.reviewers.push({
      username,
      requestedBy: req.user.username,
      createdAt: new Date().toISOString(),
    });
  }
  return res.status(201).json({ reviewers: pull.reviewers });
});

app.delete('/api/repos/:owner/:name/pulls/:number/reviewers/:username', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  if (pull.author !== req.user.username && !store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You cannot change reviewers for this pull request.' });
  }
  const username = String(req.params.username || '').trim().toLowerCase();
  pull.reviewers = (pull.reviewers || []).filter(
    (item) => String(item.username).toLowerCase() !== username,
  );
  return res.json({ reviewers: pull.reviewers });
});

app.post('/api/repos/:owner/:name/pulls/:number/comments', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  const path_ = String((req.body || {}).path || '').trim();
  const body = String((req.body || {}).body || '').trim();
  const line = Number((req.body || {}).line || 0);
  if (!body) {
    return res.status(400).json({ error: 'Comment is required' });
  }
  if (!store.canWrite(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have permission to comment.' });
  }
  // REQ-6-3-1: a comment without a code location is an ordinary conversation
  // comment, which the pull request author may also post.
  if (!path_) {
    pull.comments = pull.comments || [];
    const conversationComment = {
      id: `pc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      author: req.user.username,
      body,
      createdAt: new Date().toISOString(),
    };
    pull.comments.push(conversationComment);
    pushActivity(pull, 'Commented', req.user.username, {
      body,
      commentId: conversationComment.id,
    });
    return res.status(201).json({ comment: conversationComment });
  }
  // REQ-6-3-3: an inline review comment is anchored to a changed line and the
  // author of the pull request cannot review their own change.
  if (pull.author === req.user.username) {
    return res.status(403).json({ error: 'The author cannot review their own pull request.' });
  }
  pull.reviewComments = pull.reviewComments || [];
  const comment = {
    id: `rc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    author: req.user.username,
    path: path_,
    line,
    body,
    commit: store.branchHead(repo, pull.headBranch),
    // "Add single comment" publishes immediately; "Start a review" keeps a draft.
    state: (req.body || {}).pending === true ? 'pending' : 'published',
    createdAt: new Date().toISOString(),
  };
  pull.reviewComments.push(comment);
  return res.status(201).json({ comment });
});

app.get('/api/repos/:owner/:name/pulls/:number/comments', (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  const head = store.branchHead(repo, pull.headBranch);
  const comments = (pull.reviewComments || []).map((comment) => ({
    ...comment,
    // published comments survive a new compare commit but become Outdated
    outdated: comment.state === 'published' && comment.commit !== head,
    published: comment.state === 'published',
  }));
  return res.json({ comments });
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
  // REQ-6-1: only a repository Admin may update the check status from the Checks area.
  if (!store.canAdmin(repo, req.user.username)) {
    return res.status(403).json({ error: 'Only a repository admin can update check status.' });
  }
  const name = String((req.body || {}).name || 'test').trim() || 'test';
  const state = String((req.body || {}).state || 'pending').trim().toLowerCase();
  if (!['pending', 'success', 'failure'].includes(state)) {
    return res.status(400).json({ error: 'Check status must be pending, success, or failure.' });
  }
  const headSha = store.branchHead(repo, pull.headBranch);
  pull.checks = pull.checks || [];
  const existing = pull.checks.find((check) => check.name === name);
  const record = existing || { name };
  record.state = state;
  record.headSha = headSha;
  record.setBy = req.user.username;
  record.setAt = new Date().toISOString();
  if (!existing) pull.checks.push(record);
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
  // REQ-6-1: the rule is bound to one exact branch name (no wildcard semantics).
  const pattern =
    String((req.body || {}).branch || req.params.branch || repo.defaultBranch).trim() ||
    repo.defaultBranch;
  store.state.protections[store.repoKey(repo.owner, repo.name)] = {
    branch: pattern,
    requiredApprovals,
    requiredChecks,
    updatedBy: req.user.username,
    updatedAt: new Date().toISOString(),
  };
  return res.json({ protection: store.state.protections[store.repoKey(repo.owner, repo.name)] });
});

app.post('/api/repos/:owner/:name/pulls/:number/merge', requireUser, (req, res) => {
  const repo = store.findRepo(req.params.owner, req.params.name);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  const pull = store.findPull(repo, req.params.number);
  if (!pull) return res.status(404).json({ error: 'Pull request not found.' });
  // REQ-6-5: only Maintain, Admin or organization Owner may merge.
  if (!canMaintain(repo, req.user.username)) {
    return res.status(403).json({ error: 'You do not have permission to merge.' });
  }
  if (pull.state !== 'open') return res.status(409).json({ error: 'Pull request is not open.' });
  // REQ-6-5: merge conflicts block the merge before anything is written.
  const conflicts = mergeConflicts(repo, pull);
  if (conflicts.length) {
    return res.status(409).json({ error: `Merge conflict in ${conflicts.join(', ')}` });
  }
  const protection = protectionOf(repo, pull.baseBranch);
  const headSha = store.branchHead(repo, pull.headBranch);
  const approvals = approvalCount(pull, repo);
  // REQ-6-3-4 / REQ-6-5: a current Request changes decision blocks merging.
  const blockingChanges = latestReviews(pull).some(
    (review) =>
      review.state === 'CHANGES_REQUESTED' && (!review.headSha || review.headSha === headSha),
  );
  if (blockingChanges) {
    return res.status(422).json({ error: 'Changes requested by a reviewer must be resolved.' });
  }
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
  const checks = normalizedChecks(pull, protection, headSha);
  const failed = protection.requiredChecks.filter(
    (name) => !checks.some((check) => check.name === name && check.state === 'success'),
  );
  if (failed.length) {
    return res.status(422).json({ error: `Required checks not successful: ${failed.join(', ')}` });
  }
  pull.state = 'merged';
  pull.mergedAt = new Date().toISOString();
  pull.mergedBy = req.user.username;
  // REQ-6-5: the sole supported method is a merge commit with both heads as parents.
  const mergeResult = store.mergeBranches(repo, {
    baseBranch: pull.baseBranch,
    headBranch: pull.headBranch,
    author: req.user.username,
  });
  if (mergeResult) {
    pull.mergeCommit = mergeResult.sha;
    pull.mergeMethod = 'Create a merge commit';
  }
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
