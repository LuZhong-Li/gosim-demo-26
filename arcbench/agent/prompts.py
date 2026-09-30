"""Prompt text for the generation agent.

The UI contract below is not invented here. It is distilled from the two
official ARC-Bench reference implementations
(``octos-org/arc-adapter``'s ``UI_CONTRACT_PROMPT`` and the ``prompts/``
directory of ``octos-org/octos-arc``), which were themselves written from real
scoring failures. Every clause exists because a run lost points without it, so
removing one is a regression even when it looks redundant.
"""

from __future__ import annotations

UI_CONTRACT = """
Benchmark UI contract — the automated Playwright suite depends on these EXACTLY.
Violating a clause here scores zero on the requirements that touch it, silently.

- TEXT INPUTS: use ``type="text"`` (or ``password``/``email``) for every form
  field. NEVER ``type="date"``, ``type="time"`` or ``type="number"`` — the tests
  fill values like "Sun, May 31" and native pickers reject them. Accept ISO
  strings such as "2035-12-31" in a plain text field.
- LABELS: every control needs a visible associated <label> (``htmlFor`` + ``id``
  in React). The tests locate fields with ``getByLabel``, many with ANCHORED
  regexes such as ``/^name$/i`` — a field the requirement calls "Name" must be
  labelled exactly "Name"; "Full Name" or "Your Name" never matches.
- NO NATIVE VALIDATION: never rely on HTML5 ``required``/``pattern``/tooltips.
  Validate in JavaScript and render the error as inline DOM text containing
  words like "required" / "invalid" / "match".
- BUTTONS: real <button> elements with plain text labels, always visible and
  enabled. Never hide a native input or select behind a custom widget or a
  ``display:none`` container.
- VERBATIM TEXT: copy every visible label, link, button and heading string
  verbatim from the requirement document. If the requirement says the header
  exposes "Sign in" and "Create account" links, those are the exact English
  strings used as <a> link text.
- NAMES ARE ANCHORED: the suite resolves a control with ANCHORED, case
  insensitive regexes such as ``/^Issues$/i``. "Issues" matches; "All issues",
  "Issues (3)" and "Open an issue" do NOT - the count, the prefix and the extra
  words all break the match. Put the bare term on the control itself and move
  any qualifier elsewhere on the page (or into an aria-label-free sibling).
- NAVIGATION BY NAME: the suite never types a URL. A scenario starts at '/'
  and then CLICKS the area it needs by name, then clicks the specific record by
  its exact name. So the home page must expose a visible <a> or <button> for
  every area the requirements name (e.g. Repositories, Issues, Pull requests,
  Branches, Workbooks, Worksheets), each labelled with that bare term; the area
  listing must render every seeded record as a clickable link whose text is the
  record's exact name; and the detail page that opens must show that same exact
  name as visible text. A record reachable only by typing its URL is invisible
  to the suite and scores zero.
- SUCCESS FEEDBACK: after every successful create, update, delete, move or
  import, the page must render a visible ``role="status"`` element whose text
  contains one of success / saved / created / updated / deleted (or its subject
  noun, e.g. "Comment added"). The suite asserts on that element before moving
  on, so a silent mutation fails the test even when the data changed correctly.
  Keep it to ONE element, and keep errors in ``role="alert"`` so the two never
  collide.
- STRICT-MODE UNIQUENESS: any value the page echoes (search criteria, workbook
  names, usernames, dates, organisation names) must appear in EXACTLY ONE
  visible element. Playwright's strict mode fails the whole test when two
  elements match, so repeated echoes are as fatal as missing ones. When an
  entity has a short and a long written form, pick one display form per page.
- SEED DATA: the scenarios carry the data the tests expect. Provision exactly
  those records at start-up, with the verbatim strings shown (a date written
  "Sun, May 31" is data, not an ISO date). Search matching must be
  case-insensitive and trim surrounding whitespace. Concrete example values in
  the requirement (account names, column headers, option values) are fixture
  data too and must appear verbatim as <option>/radio/label text.
- ERROR STATES: a failed validation stays on the same page, shows an inline
  message naming the problem (tests match words like required/invalid/match/
  duplicate), keeps the anonymous header and creates no records. Render EXACTLY
  ONE error element at a time — a per-field error plus a form-level summary
  makes two elements match and fails the assertion.
- SESSIONS: after registering or signing in, redirect to the home page, show the
  exact username plus a "Sign out" link in the header, and keep the session
  across a page reload (persist a token and restore it on boot).
- UNLISTED CONTROL VALUES: when the requirement says a value must be "one of the
  values offered by the control" without listing them, offer a broad standard
  set (for nationalities at least China, Vietnam, United States, Japan, South
  Korea, United Kingdom, France, Germany, Canada, Australia).
- REFRESH CONSISTENCY: anything the requirement says survives a reload must be
  persisted on the server, reloaded on boot, and restored in the UI without an
  extra click.
""".strip()


SEED_CONTRACT = """
Seed data contract — the hidden tests run against PRE-SEEDED accounts and
workbooks. A test that cannot find its seed fails before it can click anything,
so provisioning the seed is as important as the UI itself.

- Write the seeded accounts, organizations, repositories, workbooks, worksheets
  and cells into the store's initial state at start-up, using the EXACT values
  the GIVEN clauses quote. The seed values listed in this prompt are DATA, not
  prose: put them verbatim into the backend seed (the JSON the store loads), not
  into a comment, README or console.log.
- Seeded accounts must be sign-in ready (username + verified email + password)
  and must survive a page reload; do not make the tester register or import
  them first.
- Seed values that are only TYPED into a field (passwords, verification codes)
  go in the seed store, not rendered on the page.
- Do not regenerate or randomise the seed on boot; the same values must come
  back after every reload, and a rejected write must leave the seed unchanged.
""".strip()


AUTH_CONTRACT = """
Authentication contract — every authenticated scenario starts by signing in, so
if sign-in fails the whole task scores zero. Get these EXACTLY right:

- Seed ONE account at backend start-up, persisted into the store so it survives
  a reload: username ``alice-dev``, email ``alice.dev@example.test``, password
  ``Valid-password-123!``, credential status active. Verify the password with a
  cheap hash (scrypt/pbkdf2) and never echo it back on any page.
- The account-access page is reached from the home page by the links
  ``Sign in`` and ``Create an account``. It shows one form at a time.
- Sign-in form: a textbox labelled EXACTLY ``Username or email``, a password
  input labelled EXACTLY ``Password``, a button whose text is EXACTLY
  ``Sign in``. It accepts the username OR the email. Wrong credentials show ONE
  inline error containing ``incorrect`` and create no session; a missing field
  shows ONE inline error containing ``required``.
- Registration form: fields labelled EXACTLY ``Username``, ``Email``,
  ``Password``, ``Confirm password``, an initially unchecked checkbox
  ``Agree to the terms``, and a button ``Create account``. Duplicate username
  shows ``Username already exists``; a bad email shows ``Email format is
  invalid``.
- Password recovery: the ``Forgot password`` link opens a form that displays the
  fixed code ``123456`` as its own visible text and has fields ``Email``,
  ``Verification code``, ``New password``, ``Confirm password`` plus buttons
  ``Send reset link`` and ``Reset password``; a wrong code shows
  ``Verification code is invalid`` and success shows ``Password updated``.
- Sign-out: one button ``Account menu`` whose menu contains one link
  ``Sign out``; it opens a dialog titled ``Sign out`` with buttons
  ``Confirm sign out`` and ``Cancel``. After confirming, any protected page
  reload shows the unauthenticated header again.
- Password change: fields ``Current password``, ``New password``,
  ``Confirm password`` and a button ``Update password``; an empty current
  password shows ``Current password is required``.
- After ANY successful sign-in or registration the header shows the exact
  username plus a ``Sign out`` link, and a reload keeps the session (persist a
  token and restore it on boot). Use ``tokenStore`` from ``frontend/src/api``.
""".strip()


WORKED_EXAMPLE = """
WORKED EXAMPLE - the shape every page must take. Complete code, exact labels,
ONE inline error element, a real route. Copy the PATTERN, not the text.

frontend/src/pages/SignIn.tsx
```tsx
import { useState } from 'react';
import { client, errorMessage } from '../api';

export default function SignIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Username or email and password are required');
      return;
    }
    try {
      const { data } = await client.post('/auth/sign-in', { username, password });
      localStorage.setItem('arc-token', data.token);
      window.location.href = '/';
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };
  return (
    <form onSubmit={submit}>
      <label htmlFor="f-user">Username or email</label>
      <input id="f-user" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
      <label htmlFor="f-pass">Password</label>
      <input id="f-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Sign in</button>
    </form>
  );
}
```

backend/src/auth.js
```js
const express = require('express');
const store = require('./store');
const router = express.Router();

router.post('/auth/sign-in', (req, res) => {
  const accounts = store.collection('accounts', { users: {} });
  const user = Object.values(accounts.users).find(
    (u) => u.username === req.body.username || u.email === req.body.username
  );
  if (!user) return res.status(401).json({ message: 'Username or password is incorrect' });
  res.json({ token: user.id });
});

module.exports = router;
```

The pattern the example demonstrates:
- ``type="text"`` for free-text fields, ``type="password"`` only for secrets.
- A visible ``<label>`` with ``htmlFor`` for EVERY input, matched by ``id``.
- EXACTLY ONE inline error element (``role="alert"``); never a per-field error
  plus a form-level summary.
- A real ``<button>`` whose visible text is the requirement's exact action name.
- Collections come from ``store.collection('name', default)`` - never read
  ``store.state.x.y`` directly.
- The router is mounted in ``app.js`` and the page calls it through ``client``
  (baseURL ``/api``).
""".strip()


PERFORMANCE_CONTRACT = """
Performance contract — one test that exceeds its 10-second budget fails, and a
test that waits on a hung resource fails with it:

- Zero external requests: no CDN fonts, no avatar hosts, no analytics. The
  grading container has no useful outbound network and ``page.reload()`` waits
  for the load event.
- The first meaningful paint must complete in well under a second; keep the
  bundle small and do not block the first render on an API round trip.
- Keep any password hashing cheap (Node's built-in ``crypto.scryptSync`` with
  default cost, or pbkdf2 with a modest iteration count).
- Sessions must survive a reload with at most one same-origin request. No
  polling loops, no setTimeout refreshes, no service worker, no debounced
  writes.
""".strip()


STACK_RULES = """
Stack contract — the project is already scaffolded; build on it and do not
replace it:

- ``frontend/`` is Vite + React, built to ``frontend/dist`` and served by the
  backend. ``frontend/src/main.tsx`` mounts ``App.tsx``; add pages under
  ``frontend/src/pages/`` and route them in ``App.tsx``.
- There is EXACTLY ONE App shell: ``frontend/src/App.tsx``. EDIT it - never add
  an ``App.jsx`` (Vite resolves ``.jsx`` before ``.tsx``, so a second file
  silently shadows your routes). One concept = one file: if a page, router or
  store for something already exists in the file list above, extend that file
  instead of creating another ``HomePage``/``SignInPage``/``RepoPage`` next to
  it. Prefer ``.tsx`` for any new file.
- ``frontend/src/api/index.ts`` already exports ``client`` (axios, baseURL
  ``/api``), ``tokenStore`` (localStorage) and ``errorMessage(caught)``. Reuse
  them instead of writing your own fetch layer.
- ``frontend/src/components/Form.tsx`` already exports the generic form
  primitives ``Field``, ``TextArea``, ``SelectField``, ``CheckboxField``,
  ``RadioGroup``, ``FormError`` and ``Button``; ``frontend/src/components/
  Layout.tsx`` exports ``Page``, ``TabLinks`` and ``Section``. BUILD EVERY PAGE
  FROM THESE - never hand-write a bare ``<input>``/``<label>``/``<select>``.
  The primitives already associate a visible ``<label>`` with every control (so
  ``getByLabel``/``getByRole`` match the exact text) and render at most one
  inline ``role="alert"`` error, which is exactly what the suite checks.
- ``backend/`` is Express and MUST listen on ``process.env.PORT || 3000``.
  ``backend/src/app.js`` exports the app; mount your routers there.
- Express here is version 5: a bare ``'*'`` route path THROWS at startup
  (``PathError: Missing parameter name``). For a catch-all use the RegExp form
  already in ``app.js`` (``app.get(/^(?!\\/api(?:\\/|$)).*/, handler)``) — never
  ``app.get('*', ...)``.
- Persist through ``backend/src/store.js`` (a JSON file loaded at start-up and
  rewritten on every successful mutation). Do not add a native database.
- ``backend/src/store.js`` is the ONE shared data layer every module uses.
  Before a router or page calls a store method, make sure it exists — emit or
  verify the store methods your code needs. A router calling ``store.getState()``
  when the store only defines ``get()``/``set()`` makes every request 500 and
  the whole run scores zero.
- Get a collection through ``store.collection('users', [])`` (for a list) or
  ``store.collection('settings')`` (for a record): it auto-initialises and never
  returns null. Never read ``store.state.x.y`` directly without first ensuring
  ``store.state.x`` exists — a direct read of a missing key throws
  ``TypeError: Cannot read properties of undefined/null`` at module load and
  crashes the backend before a single test runs.
- The store must be complete when ``backend/src/store.js`` finishes loading.
  Calling a store method the file never defines — ``store.getData()`` when the
  store exports only ``state``/``save``/``hydrate`` — throws at require time and
  the backend never opens the port, so all 100 tests score zero. Every module
  shares that one store; either emit the method you need or call only methods
  that already exist, and never read store data at module scope before the
  store has initialised it.
- Do not add npm dependencies. Everything needed is already installed; a new
  dependency is a real risk of a failed install at grading time.
- Emit complete files, never fragments or diffs: the project must build and run
  as-is. Do not emit reports, notes or other markdown.
""".strip()


GENERATION_SYSTEM = (
    "You are a senior full-stack engineer inside a requirement-to-application "
    "factory. You receive one module of a requirement document and must emit "
    "the application source that satisfies it. Reply with JSON only, shaped "
    '{"files":[{"path":"relative/path","content":"file body"}],"covered":["REQ-..."]}. '
    "Paths are relative to the project root and must stay inside it. Every file "
    "you list must be complete: the project is built and tested exactly as you "
    "write it, with no further editing pass."
)


REPAIR_SYSTEM = (
    "You are repairing a full-stack web application that failed its pre-grading "
    "build or start-up rehearsal. Reply with JSON only, shaped "
    '{"files":[{"path":"relative/path","content":"file body"}],"covered":[]}, '
    "containing ONLY the files you are changing, each complete. Fix the reported "
    "cause; do not rewrite working code around it."
)

#: Sent when a reply could not be turned into files at all. The previous reply is
#: echoed back so the model can see what went wrong with its own output.
UNUSABLE_REPLY_NUDGE = (
    "Your previous reply could not be used: it was not a single valid JSON "
    "object of the required shape, or it contained no file entries, or its paths "
    "were not project-relative. Reply again with ONLY the JSON envelope, no "
    "prose, no markdown fence, shaped:\n"
    '{"files":[{"path":"frontend/src/pages/Example.tsx","content":"...full file body..."}],'
    '"covered":["REQ-..."]}\n'
    "Rules for the reply:\n"
    "- One JSON object, nothing before or after it.\n"
    "- Every path is relative to the project root and starts with `frontend/` or "
    "`backend/` (never an absolute path).\n"
    "- Every `content` is the COMPLETE file body as a JSON string, with newlines "
    "escaped as \\n; never truncate a file, never use placeholders such as "
    '"..." or "rest of the code".\n'
    "- Keep the module's scope: the files needed for THIS module's requirements."
)
