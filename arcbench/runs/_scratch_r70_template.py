"""Dry-run the agent's own template pipeline on templates/sheet (no LLM).

Mimics main.py: task_slug -> copy_template -> guard.validate -> the deterministic
passes that run before the rehearsal. Any surprise here would show up as a
broken Sheet submission, so it is cheaper to find it now.
"""

from __future__ import annotations

import sys
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402
import main as agent_main  # noqa: E402

WORK = Path("D:/gosim-demo-26/arcbench/runs/_scratch_r70_template")


def main() -> None:
    slug = agent_main.task_slug("hackathon--sheet")
    print("task_slug ->", slug)
    assert slug == "sheet"
    assert (agent_main.TEMPLATES / slug).is_dir(), "templates/sheet is not picked up"

    WORK.mkdir(parents=True, exist_ok=True)
    copied = agent_main.copy_template(slug, WORK)
    print("copy_template ->", copied)
    assert copied

    # guard.validate() checks a single file, so the protected files are each
    # validated the way guard() does after a generation turn.
    for relative in guard.PROTECTED:
        target = WORK / relative
        if not target.is_file():
            continue
        ok, reason = guard.validate(target)
        print(f"guard.validate({relative}) ->", ok, reason)
        assert ok, (relative, reason)

    for name in guard.REQUIRED_SCRIPTS:
        package = agent_main.json.loads((WORK / name / "package.json").read_text(encoding="utf-8"))
        for script, expected in guard.REQUIRED_SCRIPTS[name].items():
            assert package.get("scripts", {}).get(script) == expected, (name, script)
    print("required scripts OK")

    router = guard.ensure_app_router(WORK)
    print("ensure_app_router ->", router)
    print("unrouted pages ->", guard.unrouted_pages(WORK))
    print("unresolved imports ->", guard.check_local_imports(WORK))
    print("orphan routers ->", guard.mount_orphan_routers(WORK))
    print("static list issues ->", guard.static_list_issues(WORK))
    print("accessibility contract ->", guard.accessibility_contract_issues(WORK) or "clean")

    store_before = (WORK / "backend" / "src" / "store.js").read_text(encoding="utf-8")
    issues = agent_main.backend_store_contract(WORK) if hasattr(
        agent_main, "backend_store_contract") else None
    print("store contract ->", issues)
    if issues:
        added = guard.complete_store_methods(WORK, issues)
        print("complete_store_methods ->", added)
    store_after = (WORK / "backend" / "src" / "store.js").read_text(encoding="utf-8")
    print("store.js untouched by the store contract pass:",
          store_before == store_after)

    defaults = guard.ensure_default_exports(WORK)
    named = guard.ensure_named_exports(WORK)
    print("default export sweep ->", defaults)
    print("named export sweep ->", named)

    routes = guard.find_register_route(WORK)
    print("find_register_route ->", routes)
    print("seed record literal ->", agent_main.seed_record_literal([{"text": "the seeded workbook `Q3 Sales`"}]))

    # The r58 regression this pass exists for must still be caught, and only the
    # page should be blamed (not the entry, not the grid component).
    probe_dir = Path("D:/gosim-demo-26/arcbench/runs/_scratch_r70_r58probe")
    broken = probe_dir / "frontend" / "src" / "pages" / "BrokenWorkbookPage.tsx"
    broken.parent.mkdir(parents=True, exist_ok=True)
    broken.write_text(
        "export default function BrokenWorkbookPage() {\n"
        "  const workbooks = ['Sample Workbook'];\n"
        "  return <ul>{workbooks.map((name) => <li key={name}>{name}</li>)}</ul>;\n"
        "}\n",
        encoding="utf-8",
    )
    caught = guard.static_list_issues(probe_dir)
    print("hard-coded page caught ->", caught)
    assert caught and "BrokenWorkbookPage.tsx" in caught[0], caught
    assert guard.static_list_issues(WORK) == [], "the sheet template must stay clean"
    print("DONE")


if __name__ == "__main__":
    main()
