# GitHub Issue 草稿（code-philia/arc-bench）

## Title
Official hackathon evaluation completes in ~1s with 0 tests executed (0.0%) — task test suite not running

## Body

**Summary**

Our team (ARC-Bench account `LiMengYuan`, "Agentic Software Factory Hackathon") submitted four agent snapshots (arc-agent-r14 / r14-fixed / r15 / r16). All official runs score **0.00 / 0.0%** and complete in **~1s with 0 tokens and ¥0 cost**. The run Stdout ends right after `Backend listening at http://127.0.0.1:3000` — there is **no Playwright output at all** in STAGE 3. This is the same pattern as the earlier `No Playwright tests found; skipping test execution` behavior, suggesting the evaluation runner is not finding/executing test cases for the hackathon task packs.

**Runs**

| Submission | GitHub run | Sheet run | Score | Tests | Time | Tokens |
|---|---|---|---|---|---|---|
| arc-agent-r14 | e42e0c085b89 | cf5bf1fe4be3 | 0.00 | 0/200 | ~1s | 0 |
| arc-agent-r14-fixed | cd0e85c9ad84 | ec37083a6e8e | 0.00 | 0/200 | — | 0 |
| arc-agent-r15 | da8e7531667c | ceec9ef57284 | 0.00 | 0/200 | ~1s | 0 |
| arc-agent-r16 | 443e0bacf2f4 | b7511d28f837 | 0.00 | 0/200 | ~1s | 0 |

All runs initialized traceability with 65 requirements / 100 scenarios (GitHub) and 42 requirements / 100 scenarios (Sheet), built the frontend successfully (vite, 99 modules), and started the backend on port 3000 — then STAGE 3 produced no test output.

**Local reproduction with the official command works**

Using the reproduction harness (`scripts/run-playwright.js` + root `playwright.config.ts` + `apps.config.json` layout), we ran the exact official invocation against the same app:

```
node node_modules/@playwright/test/cli.js test arc-bench/webapp/github/tests --config playwright.config.ts --workers 1 --reporter list
```

Result: **12/12 passed (17.9s)** with full `list` output. Log attached as `local-official-shape-12passed.log`. So the generated app builds, starts, and passes real Playwright tests locally — the platform-side 0% is not explained by the app.

**Requested check**

Please verify that the hackathon task packs (TASK-001 GitHub, TASK-002 Sheets) actually mount a populated `tests/` directory (REQ-*.spec.ts) into the evaluation runner's workspace, and that `npx playwright test <task tests dir> --config playwright.config.ts` discovers test files. If the suite is present but still reports 0, please share the STAGE 3 command/config used so we can align.

**Attachments / evidence**

- 4×0.0% runs table with run IDs (above)
- Official evaluation contract: `scripts/run-playwright.js`, `playwright.config.ts`, `apps.config.json`
- Local official-command log: `local-official-shape-12passed.log` (12/12)
