// Seed data for the GitHub-style task (see requirement `data:` section).
// Requirement tests assume these objects already exist, so every server start
// recreates them: verified accounts with distinct roles, a public organization
// with public + private repositories, code/branch/commit history, labels,
// milestones, issues and pull requests.

const PASSWORD = 'Valid-password-123!';

function seed(store) {
  const users = ['alice', 'bob', 'carol', 'dave'];
  for (const username of users) {
    if (store.findUserByUsername(username)) continue;
    store.createUser({
      username,
      email: `${username}@example.test`,
      password: PASSWORD,
    });
  }

  const org = store.findOrg('acme') || { name: 'acme', displayName: 'Acme Org' };
  if (!store.findOrg('acme')) store.state.orgs.push(org);

  // roles: Owner / Member / Triage / Read / Admin
  const membershipRoles = [
    ['alice', 'Owner'],
    ['bob', 'Member'],
    ['carol', 'Member'],
    ['dave', 'Member'],
  ];
  for (const [username, role] of membershipRoles) {
    const existing = store.membership('acme', username);
    if (existing) existing.role = role;
    else store.state.memberships.push({ org: 'acme', username, role });
  }

  if (!store.findTeam('acme', 'core')) {
    store.addTeam('acme', { name: 'core', description: 'Core maintainers', members: ['bob'], parent: null });
  }
  if (!store.findTeam('acme', 'inner')) {
    store.addTeam('acme', { name: 'inner', description: 'Nested team', members: [], parent: 'core' });
  }

  const repos = [
    { name: 'public-repo', visibility: 'public', ownerType: 'organization' },
    { name: 'private-repo', visibility: 'private', ownerType: 'organization' },
    { name: 'forkable-repo', visibility: 'public', ownerType: 'organization' },
  ];
  for (const spec of repos) {
    if (store.findRepo('acme', spec.name)) continue;
    const repo = {
      owner: 'acme',
      ownerType: spec.ownerType,
      name: spec.name,
      visibility: spec.visibility,
      description: `${spec.name} seed repository`,
      defaultBranch: 'main',
      createdBy: 'alice',
      createdAt: new Date().toISOString(),
    };
    store.state.repos.push(repo);
    store.initializeRepoContent(repo, 'alice');
    store.addFile(repo, 'src/app.js', 'export const app = 1;\n', 'alice', 'Add application entry', 'main');
    store.addFile(repo, 'docs/guide.md', '# Guide\n', 'alice', 'Add documentation', 'main');
  }

  const privateRepo = store.findRepo('acme', 'private-repo');
  if (privateRepo && !(privateRepo.branches || []).some((branch) => branch.name === 'feature/login')) {
    store.addBranch(privateRepo, 'feature/login', 'alice');
    store.addFile(
      privateRepo,
      'src/login.js',
      'export const login = () => true;\n',
      'alice',
      'Add login flow',
      'feature/login',
    );
  }

  // direct + team grants so permission tests have seeded subjects
  if (privateRepo) {
    store.state.accessGrants = store.state.accessGrants.filter(
      (grant) => !(grant.org === 'acme' && grant.repo === 'private-repo'),
    );
    store.state.accessGrants.push({ org: 'acme', repo: 'private-repo', team: null, user: 'carol', permission: 'Write' });
    store.state.accessGrants.push({ org: 'acme', repo: 'private-repo', team: 'core', permission: 'Triage' });
  }

  if (privateRepo && store.listIssues('acme', 'private-repo').length === 0) {
    const number = store.nextIssueNumber('acme', 'private-repo');
    store.state.issues.push({
      key: 'acme/private-repo',
      owner: 'acme',
      repo: 'private-repo',
      number,
      title: 'Login button does not respond',
      body: 'Seed issue used by issue tests.',
      author: 'alice',
      state: 'open',
      assignees: ['bob'],
      labels: ['bug', 'documentation'],
      milestone: 'v1.0',
      comments: [
        { id: 'seed-comment-1', author: 'bob', body: 'Reproduced on main.', createdAt: new Date().toISOString() },
      ],
      reactions: [],
      createdAt: new Date().toISOString(),
    });
    const closed = store.nextIssueNumber('acme', 'private-repo');
    store.state.issues.push({
      key: 'acme/private-repo',
      owner: 'acme',
      repo: 'private-repo',
      number: closed,
      title: 'Closed seed issue',
      body: 'Seed issue for status filters.',
      author: 'alice',
      state: 'closed',
      assignees: [],
      labels: [],
      milestone: null,
      comments: [],
      reactions: [],
      createdAt: new Date().toISOString(),
    });
  }

  if (privateRepo && (privateRepo.pulls || []).length === 0) {
    const openPull = {
      number: store.nextPullNumber(privateRepo),
      title: 'Add login flow',
      body: 'Seed pull request for review tests.',
      author: 'alice',
      state: 'open',
      baseBranch: 'main',
      headBranch: 'feature/login',
      headSha: store.branchHead(privateRepo, 'feature/login'),
      createdAt: new Date().toISOString(),
      reviews: [],
      checks: [],
      reviewers: [],
      reviewComments: [],
    };
    privateRepo.pulls = [openPull];
    const draftPull = {
      number: store.nextPullNumber(privateRepo),
      title: 'Draft work in progress',
      body: 'Seed draft pull request.',
      author: 'alice',
      state: 'draft',
      baseBranch: 'main',
      headBranch: 'feature/login',
      headSha: store.branchHead(privateRepo, 'feature/login'),
      createdAt: new Date().toISOString(),
      reviews: [],
      checks: [],
      reviewers: [],
      reviewComments: [],
    };
    privateRepo.pulls.push(draftPull);
  }

  if (!store.findRepo('alice', 'demo')) {
    const personal = {
      owner: 'alice',
      ownerType: 'user',
      name: 'demo',
      visibility: 'public',
      description: 'Personal seed repository',
      defaultBranch: 'main',
      createdBy: 'alice',
      createdAt: new Date().toISOString(),
    };
    store.state.repos.push(personal);
    store.initializeRepoContent(personal, 'alice');
    store.addFile(personal, 'README.md', '# Demo\n', 'alice', 'Start demo', 'main');
  }

  const forkable = store.findRepo('acme', 'forkable-repo');
  if (forkable && !store.findRepo('bob', 'forkable-repo')) {
    store.forkRepo(forkable, 'bob', 'user', 'public', 'bob');
  }
}

module.exports = { seed, PASSWORD };
