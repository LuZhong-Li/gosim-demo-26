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
- ``frontend/src/api/index.ts`` already exports ``client`` (axios, baseURL
  ``/api``), ``tokenStore`` (localStorage) and ``errorMessage(caught)``. Reuse
  them instead of writing your own fetch layer.
- ``backend/`` is Express and MUST listen on ``process.env.PORT || 3000``.
  ``backend/src/app.js`` exports the app; mount your routers there.
- Persist through ``backend/src/store.js`` (a JSON file loaded at start-up and
  rewritten on every successful mutation). Do not add a native database.
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
