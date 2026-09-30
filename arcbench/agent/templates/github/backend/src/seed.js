// Seed data for the GitHub-style task (official TASK-011 seed, arc-bench.com).
// The evaluation supplies predefined objects and asserts their exact names:
//   account  alice-dev  (alice.dev@example.test / Valid-password-123!)
//   organization  Acme Demo  (identifier acme-demo), repository  acme-docs
//   member  bob-reviewer, team  frontend-team
//   pull requests  Improve onboarding / Fix search, branches  main / feature-search
//   personal private repository  secret-research  (owner  alice-dev )
//   branch  release  on  acme-docs  (default-branch scenarios)
//   reviewer  bob-reviewer, check  test
//   known changed file  src/search.ts  (one added file + one modified file)
// Every server start recreates these records so refresh/re-login keep state.

const PASSWORD = 'Valid-password-123!';

function sha(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function pushCommit(repo, { message, author, parents, changed, snapshot, branch }) {
  const commit = {
    sha: sha('c'),
    message,
    author,
    parents,
    timestamp: new Date().toISOString(),
    changed,
    snapshot: snapshot.map((file) => ({ ...file })),
  };
  repo.commits = repo.commits || [];
  repo.commits.unshift(commit);
  if (branch) {
    const target = repo.branches.find((item) => item.name === branch);
    if (target) target.head = commit.sha;
  }
  return commit;
}

function seed(store) {
  // ----- accounts -----
  const accounts = [
    { username: 'alice-dev', email: 'alice.dev@example.test', role: 'Owner' },
    { username: 'bob-reviewer', email: 'bob.reviewer@example.test', role: 'Member' },
    { username: 'carol-reader', email: 'carol.reader@example.test', role: 'Read' },
  ];
  for (const account of accounts) {
    if (store.findUserByUsername(account.username)) continue;
    store.createUser({
      username: account.username,
      email: account.email,
      password: PASSWORD,
    });
  }

  // ----- organization -----
  const orgName = 'acme-demo';
  if (!store.findOrg(orgName)) {
    store.state.orgs.push({
      name: orgName,
      displayName: 'Acme Demo',
      creator: 'alice-dev',
      createdAt: new Date().toISOString(),
    });
  }
  const membershipRoles = [
    ['alice-dev', 'Owner'],
    ['bob-reviewer', 'Member'],
    ['carol-reader', 'Member'],
  ];
  for (const [username, role] of membershipRoles) {
    const existing = store.membership(orgName, username);
    if (existing) existing.role = role;
    else store.state.memberships.push({ org: orgName, username, role });
  }

  // ----- team -----
  if (!store.findTeam(orgName, 'frontend-team')) {
    store.addTeam(orgName, {
      name: 'frontend-team',
      description: 'Frontend engineering team',
      members: ['bob-reviewer'],
      parent: null,
    });
  }

  // ----- repositories -----
  const repos = [
    { name: 'acme-docs', visibility: 'public' },
    { name: 'acme-private', visibility: 'private' },
  ];
  for (const spec of repos) {
    if (store.findRepo(orgName, spec.name)) continue;
    const repo = {
      owner: orgName,
      ownerType: 'organization',
      name: spec.name,
      visibility: spec.visibility,
      description: `${spec.name} seed repository`,
      defaultBranch: 'main',
      creator: 'alice-dev',
      createdBy: 'alice-dev',
      createdAt: new Date().toISOString(),
    };
    store.state.repos.push(repo);
    store.initializeRepoContent(repo, 'alice-dev');
  }

  const docs = store.findRepo(orgName, 'acme-docs');
  const privateRepo = store.findRepo(orgName, 'acme-private');

  // ----- personal private repository (REQ-3-1 / REQ-3-3 / REQ-3-4 seed) -----
  let secretResearch = store.findRepo('alice-dev', 'secret-research');
  if (!secretResearch) {
    secretResearch = {
      owner: 'alice-dev',
      ownerType: 'user',
      name: 'secret-research',
      visibility: 'private',
      description: 'Private research notes (not readable by visitors).',
      defaultBranch: 'main',
      creator: 'alice-dev',
      createdBy: 'alice-dev',
      createdAt: new Date().toISOString(),
    };
    store.state.repos.push(secretResearch);
    store.initializeRepoContent(secretResearch, 'alice-dev');
  }

  // ----- access grants (repo-level roles) -----
  for (const repo of [docs, privateRepo]) {
    if (!repo) continue;
    store.state.accessGrants = store.state.accessGrants.filter(
      (grant) => !(grant.org === orgName && grant.repo === repo.name),
    );
    store.state.accessGrants.push({
      org: orgName,
      repo: repo.name,
      team: null,
      user: 'bob-reviewer',
      // REQ-6-4 / REQ-6-5: a non-owner collaborator with Maintain rights.
      permission: 'Maintain',
    });
    store.state.accessGrants.push({
      org: orgName,
      repo: repo.name,
      team: null,
      user: 'carol-reader',
      permission: 'Read',
    });
  }

  // ----- acme-docs code history: main + feature-search -----
  const SEARCH_BASE = 'export function search(items, query) {\n  return items;\n}\n';
  const SEARCH_HEAD = 'export function search(items, query) {\n  const q = query.toLowerCase();\n  return items.filter((item) => item.includes(q));\n}\n';
  // REQ-4-3-1 seed: a file that exists only on the feature-search branch.
  const MAIN_ONLY = 'Main-only note.\n';

  if (docs && !store.findFile(docs, 'src/search.ts')) {
    store.addFile(docs, 'src/search.ts', SEARCH_BASE, 'alice-dev', 'Document search flow', 'main');
  }

  if (docs && !(docs.branches || []).some((branch) => branch.name === 'feature-search')) {
    store.addBranch(docs, 'feature-search', 'alice-dev');
  }

  // REQ-4-3-3 seed: a second long-lived branch so the default branch can be switched.
  if (docs && !(docs.branches || []).some((branch) => branch.name === 'release')) {
    store.addBranch(docs, 'release', 'alice-dev');
  }

  // REQ-6-2-2 / REQ-6-2-3 seed: release is ahead of main with no PR, so the comparison
  // and PR-creation flow has a usable branch pair that is not already taken.
  if (docs) {
    const releaseBranch = (docs.branches || []).find((branch) => branch.name === 'release');
    const mainBranch = (docs.branches || []).find((branch) => branch.name === 'main');
    if (releaseBranch && mainBranch && releaseBranch.head === mainBranch.head) {
      const releaseFiles = (docs.files || [])
        .map((file) => ({ ...file }))
        .concat([
          {
            path: 'docs/release-notes.md',
            content: '# Release notes\n\nPrepared on the release branch.\n',
          },
        ]);
      pushCommit(docs, {
        message: 'Draft release notes',
        author: 'alice-dev',
        parents: mainBranch.head ? [mainBranch.head] : [],
        changed: ['docs/release-notes.md'],
        snapshot: releaseFiles,
        branch: 'release',
      });
    }
  }

  // Build a single feature-search commit ahead of main that modifies src/search.ts
  // and adds main-only.md (one added file + one modified file).
  if (docs) {
    const featureBranch = (docs.branches || []).find((branch) => branch.name === 'feature-search');
    const mainBranch = (docs.branches || []).find((branch) => branch.name === 'main');
    const mainHead = mainBranch ? mainBranch.head : null;
    const headFiles = (docs.files || [])
      .map((file) =>
        file.path === 'src/search.ts' ? { ...file, content: SEARCH_HEAD } : file,
      )
      .concat([{ path: 'main-only.md', content: MAIN_ONLY }]);
    if (featureBranch && featureBranch.head === mainHead) {
      pushCommit(docs, {
        message: 'Refine search and add utilities',
        author: 'alice-dev',
        parents: mainHead ? [mainHead] : [],
        changed: ['src/search.ts', 'main-only.md'],
        snapshot: headFiles,
        branch: 'feature-search',
      });
    }
  }

  // ----- draft-feature branch (for the ready-for-review draft PR) -----
  if (docs && !(docs.branches || []).some((branch) => branch.name === 'draft-feature')) {
    store.addBranch(docs, 'draft-feature', 'alice-dev');
    const draftBranch = (docs.branches || []).find((branch) => branch.name === 'draft-feature');
    const mainBranch = (docs.branches || []).find((branch) => branch.name === 'main');
    if (draftBranch && mainBranch) {
      pushCommit(docs, {
        message: 'Draft onboarding changes',
        author: 'alice-dev',
        parents: [mainBranch.head],
        changed: ['README.md'],
        snapshot: (docs.files || []).map((file) => ({ ...file })),
        branch: 'draft-feature',
      });
    }
  }

  // ----- branch protection on main -----
  if (docs) {
    store.state.protections[store.repoKey(docs.owner, docs.name)] = {
      branch: 'main',
      requiredApprovals: 1,
      requiredChecks: ['test'],
    };
  }

  // ----- pull requests -----
  if (docs && (docs.pulls || []).length === 0) {
    docs.pulls = [];
    docs.pullCounter = 0;
    const featureHead = store.branchHead(docs, 'feature-search');

    docs.pulls.push({
      number: store.nextPullNumber(docs),
      title: 'Improve onboarding',
      body: 'Improve the onboarding flow for new contributors.',
      author: 'alice-dev',
      state: 'open',
      baseBranch: 'main',
      headBranch: 'feature-search',
      headSha: featureHead,
      milestone: null,
      createdAt: new Date().toISOString(),
      reviews: [],
      // REQ-6-1: this protected-branch PR starts with test pending.
      checks: [{ name: 'test', state: 'pending' }],
      reviewers: [{ username: 'bob-reviewer' }],
      reviewComments: [],
    });

    docs.pulls.push({
      number: store.nextPullNumber(docs),
      title: 'Fix search',
      body: 'Fix case-insensitive search matching.',
      author: 'alice-dev',
      state: 'open',
      baseBranch: 'main',
      headBranch: 'feature-search',
      headSha: featureHead,
      milestone: null,
      createdAt: new Date().toISOString(),
      reviews: [
        {
          id: 'seed-review-approve',
          author: 'bob-reviewer',
          state: 'APPROVED',
          body: 'Looks good.',
          headSha: featureHead,
          createdAt: new Date().toISOString(),
        },
      ],
      checks: [
        {
          name: 'test',
          state: 'success',
          headSha: featureHead,
          setBy: 'alice-dev',
          setAt: new Date().toISOString(),
        },
      ],
      reviewers: [],
      reviewComments: [],
    });

    const draftHead = store.branchHead(docs, 'draft-feature');
    docs.pulls.push({
      number: store.nextPullNumber(docs),
      title: 'Draft onboarding update',
      body: 'Work in progress.',
      author: 'alice-dev',
      state: 'draft',
      baseBranch: 'main',
      headBranch: 'draft-feature',
      headSha: draftHead,
      milestone: null,
      createdAt: new Date().toISOString(),
      reviews: [],
      checks: [],
      reviewers: [],
      reviewComments: [],
    });

    // REQ-6-2-1 seed: a Closed PR authored by a second account, used by the author filter.
    const releaseHead = store.branchHead(docs, 'release');
    docs.pulls.push({
      number: store.nextPullNumber(docs),
      title: 'Retire legacy banner',
      body: 'Superseded by the new onboarding flow.',
      author: 'bob-reviewer',
      state: 'closed',
      baseBranch: 'main',
      headBranch: 'release',
      headSha: releaseHead,
      milestone: null,
      createdAt: new Date().toISOString(),
      reviews: [],
      checks: [],
      reviewers: [],
      reviewComments: [],
    });
  }

  // ----- repository milestones (REQ-5-3-3 seed) -----
  if (docs && (!docs.milestones || docs.milestones.length === 0)) {
    docs.milestones = ['Q3 launch', 'v1.0'];
  }
  // ----- repository label catalog (REQ-5-3-2 seed) -----
  if (docs && (!docs.labels || docs.labels.length === 0)) {
    docs.labels = [
      { name: 'bug', color: 'd73a4a' },
      { name: 'documentation', color: '0075ca' },
      { name: 'enhancement', color: 'a2eeef' },
    ];
  }

  // ----- seed issues (REQ-5-1-1 / REQ-5-2-2 / REQ-5-4 seeds) -----
  if (docs && store.listIssues(orgName, 'acme-docs').length === 0) {
    const now = new Date().toISOString();
    store.state.issues.push({
      key: `${orgName}/acme-docs`,
      owner: orgName,
      repo: 'acme-docs',
      number: store.nextIssueNumber(orgName, 'acme-docs'),
      title: 'Improve onboarding',
      body: 'Seed issue used by issue tests.',
      author: 'alice-dev',
      state: 'open',
      assignees: ['bob-reviewer'],
      labels: ['bug', 'documentation'],
      milestone: 'Q3 launch',
      comments: [
        { id: 'seed-issue-comment', author: 'bob-reviewer', body: 'Confirmed.', createdAt: now },
      ],
      reactions: [],
      activities: [],
      createdAt: now,
    });
    // REQ-5-1-1: the closed issue used by the Open/Closed filter scenarios.
    store.state.issues.push({
      key: `${orgName}/acme-docs`,
      owner: orgName,
      repo: 'acme-docs',
      number: store.nextIssueNumber(orgName, 'acme-docs'),
      title: 'Legacy welcome text',
      body: 'Closed seed issue.',
      author: 'bob-reviewer',
      state: 'closed',
      assignees: [],
      labels: ['bug'],
      milestone: null,
      comments: [],
      reactions: [],
      activities: [],
      createdAt: now,
    });
    // REQ-5-2-2: a separate issue used by the invalid-edit scenario.
    store.state.issues.push({
      key: `${orgName}/acme-docs`,
      owner: orgName,
      repo: 'acme-docs',
      number: store.nextIssueNumber(orgName, 'acme-docs'),
      title: 'Original issue title',
      body: 'Original issue description.',
      author: 'alice-dev',
      state: 'open',
      assignees: [],
      labels: [],
      milestone: null,
      comments: [],
      reactions: [],
      activities: [],
      createdAt: now,
    });
  }
}

module.exports = { seed, PASSWORD };
