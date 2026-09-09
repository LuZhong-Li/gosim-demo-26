"""Minimal local stand-in for the ArcBench agent runtime SDK.

The real ``arcbench_agent_runtime`` is provided by the ArcBench runner inside the
submission sandbox. This module mirrors the documented high-level surface so the
agent can be developed and self-tested outside the platform. Event schemas and
table layouts here are approximate and only meant for local traceability.
"""

from __future__ import annotations

import json
import os
import subprocess
import threading
from datetime import datetime, timezone
from types import SimpleNamespace


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class _Events:
    def __init__(self, runtime: "AgentRuntime") -> None:
        self._runtime = runtime

    def _emit(self, event_type: str, **fields: object) -> None:
        self._runtime._append_event(event_type, fields)

    def mark_run_started(self, message: str | None = None) -> None:
        self._emit("mark_run_started", message=message)

    def mark_run_completed(self, message: str | None = None) -> None:
        self._emit("mark_run_completed", message=message)

    def mark_run_failed(self, message: str | None = None) -> None:
        self._emit("mark_run_failed", message=message)

    def mark_run_paused(self, message: str | None = None) -> None:
        self._emit("mark_run_paused", message=message)

    def mark_run_resumed(self, message: str | None = None) -> None:
        self._emit("mark_run_resumed", message=message)

    def mark_design_done(self, node_id: str, message: str | None = None) -> None:
        self._emit("mark_design_done", node_id=node_id, message=message)

    def mark_implementation_done(self, node_id: str, message: str | None = None) -> None:
        self._emit("mark_implementation_done", node_id=node_id, message=message)

    def mark_test_passed(self, node_id: str, message: str | None = None) -> None:
        self._emit("mark_test_passed", node_id=node_id, message=message)

    def mark_test_failed(self, node_id: str, message: str | None = None) -> None:
        self._emit("mark_test_failed", node_id=node_id, message=message)

    def notify_commit_history_changed(self, message: str | None = None) -> None:
        self._emit("notify_commit_history_changed", message=message)

    def notify_traceability_changed(self, message: str | None = None) -> None:
        self._emit("notify_traceability_changed", message=message)


class _Traceability:
    TABLES = (
        "requirements",
        "scenarios",
        "interfaces",
        "tests",
        "node_states",
        "call_edges",
        "node_contracts",
    )

    def __init__(self, runtime: "AgentRuntime") -> None:
        self._runtime = runtime
        self._lock = threading.Lock()
        self._store: dict[str, dict[str, dict]] = {t: {} for t in self.TABLES}

    def _write(self) -> None:
        for table, rows in self._store.items():
            path = os.path.join(self._runtime.paths.traceability_dir, f"{table}.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(rows, f, ensure_ascii=False, indent=2)
        self._runtime._append_event("traceability_refresh", {})

    def _load(self) -> None:
        for table in self.TABLES:
            path = os.path.join(self._runtime.paths.traceability_dir, f"{table}.json")
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    self._store[table] = json.load(f)

    def init_db(self, reset: bool = False) -> None:
        with self._lock:
            if reset:
                self._store = {t: {} for t in self.TABLES}
                self._write()
            else:
                self._load()

    def _upsert(self, table: str, key: str, fields: dict) -> None:
        with self._lock:
            row = dict(self._store[table].get(key, {}))
            row.update({k: v for k, v in fields.items() if v is not None})
            self._store[table][key] = row
            self._write()

    def _delete(self, table: str, key: str) -> None:
        with self._lock:
            self._store[table].pop(key, None)
            self._write()

    def upsert_requirement(self, req_id: str, name: str | None = None, description: str | None = None, **kw: object) -> None:
        self._upsert("requirements", req_id, {"id": req_id, "name": name, "description": description, **kw})

    def update_requirement_fields(self, req_id: str, **fields: object) -> None:
        self._upsert("requirements", req_id, fields)

    def delete_requirement(self, req_id: str) -> None:
        self._delete("requirements", req_id)

    def upsert_scenario(self, scenario_id: str, req_id: str | None = None, name: str | None = None, **kw: object) -> None:
        self._upsert("scenarios", scenario_id, {"id": scenario_id, "req_id": req_id, "name": name, **kw})

    def delete_scenario(self, scenario_id: str) -> None:
        self._delete("scenarios", scenario_id)

    def upsert_interface(self, interface_id: str, req_ids: list[str] | None = None, type: str | None = None, content: str | None = None, file_path: str | None = None, first_line: str | None = None, **kw: object) -> None:
        self._upsert("interfaces", interface_id, {
            "id": interface_id, "req_ids": req_ids, "type": type, "content": content,
            "file_path": file_path, "first_line": first_line, **kw,
        })

    def update_interface_fields(self, interface_id: str, **fields: object) -> None:
        self._upsert("interfaces", interface_id, fields)

    def set_interface_implemented(self, interface_id: str, implemented: bool, message: str | None = None) -> None:
        self._upsert("interfaces", interface_id, {"implemented": implemented, "message": message})

    def delete_interface(self, interface_id: str) -> None:
        self._delete("interfaces", interface_id)

    def upsert_test(self, test_id: str, req_id: str | None = None, type: str | None = None, file_path: str | None = None, first_line: str | None = None, interface_ids: list[str] | None = None, **kw: object) -> None:
        self._upsert("tests", test_id, {
            "id": test_id, "req_id": req_id, "type": type, "file_path": file_path,
            "first_line": first_line, "interface_ids": interface_ids, **kw,
        })

    def update_test_fields(self, test_id: str, **fields: object) -> None:
        self._upsert("tests", test_id, fields)

    def set_test_pass_status(self, test_id: str, passed: bool, message: str | None = None) -> None:
        self._upsert("tests", test_id, {"passed": passed, "message": message})

    def set_test_pass_statuses(self, statuses: list[tuple[str, bool]] | None = None, **kw: object) -> None:
        for test_id, passed in statuses or []:
            self.set_test_pass_status(test_id, passed)

    def reset_test_pass_statuses_for_requirement(self, req_id: str) -> None:
        with self._lock:
            for test_id, row in list(self._store["tests"].items()):
                if row.get("req_id") == req_id:
                    row.pop("passed", None)
                    self._store["tests"][test_id] = row
            self._write()

    def delete_test(self, test_id: str) -> None:
        self._delete("tests", test_id)

    def upsert_node_state(self, node_id: str, state: str, **kw: object) -> None:
        self._upsert("node_states", node_id, {"id": node_id, "state": state, **kw})

    def delete_node_state(self, node_id: str) -> None:
        self._delete("node_states", node_id)

    def insert_call_edge(self, source: str, target: str, **kw: object) -> None:
        key = f"{source}->{target}"
        self._upsert("call_edges", key, {"source": source, "target": target, **kw})

    def delete_call_edge(self, source: str, target: str) -> None:
        self._delete("call_edges", f"{source}->{target}")

    def upsert_node_contract(self, node_id: str, contract: object = None, **kw: object) -> None:
        self._upsert("node_contracts", node_id, {"id": node_id, "contract": contract, **kw})

    def delete_node_contract(self, node_id: str) -> None:
        self._delete("node_contracts", node_id)

    def clear_node_design_artifacts(self, node_id: str) -> None:
        self._upsert("node_contracts", node_id, {"design_artifacts": []})


class _Git:
    def __init__(self, runtime: "AgentRuntime") -> None:
        self._runtime = runtime

    def _git(self, *args: str) -> str:
        return subprocess.run(
            ["git", "-C", self._runtime.paths.project_dir, *args],
            check=True, capture_output=True, text=True, encoding="utf-8", errors="replace",
        ).stdout.strip()

    def configure_identity(self) -> None:
        try:
            self._git("config", "user.email", "agent@arc-bench.local")
            self._git("config", "user.name", "ARC Agent")
        except subprocess.CalledProcessError:
            pass

    def ensure_repo(self, create_initial_commit: bool = True) -> None:
        if not os.path.isdir(os.path.join(self._runtime.paths.project_dir, ".git")):
            subprocess.run(["git", "init", "-q", self._runtime.paths.project_dir], check=True)
        self.configure_identity()

    def ensure_arc_gitignore(self) -> None:
        path = os.path.join(self._runtime.paths.project_dir, ".gitignore")
        with open(path, "a", encoding="utf-8") as f:
            f.write("\n.arc/\n__pycache__/\n*.pyc\n")

    def commit(self, message: str) -> None:
        self.ensure_repo()
        self._git("add", "-A")
        self._git("commit", "-m", message, "--allow-empty")
        self._runtime.events.notify_commit_history_changed(message)

    def status_porcelain(self) -> str:
        return self._git("status", "--porcelain")

    def current_head(self) -> str:
        return self._git("rev-parse", "--short", "HEAD")

    def rollback_last_commit(self, hard: bool = False) -> None:
        self._git("reset", "--hard" if hard else "--soft", "HEAD~1")

    def reset_to_commit(self, commit_oid: str, hard: bool = True) -> None:
        self._git("reset", "--hard" if hard else "--soft", commit_oid)

    def restore_worktree(self) -> None:
        self._git("checkout", "--", ".")

    def clean_untracked(self) -> None:
        self._git("clean", "-fd")


class AgentRuntime:
    @classmethod
    def from_env(cls) -> "AgentRuntime":
        workspace = os.environ.get("ARC_WORKSPACE", os.getcwd())
        return cls(workspace)

    def __init__(self, workspace: str) -> None:
        project_dir = os.environ.get("ARC_PROJECT_DIR") or os.path.join(workspace, "project")
        arc_dir = os.path.join(project_dir, ".arc")
        traceability_dir = os.path.join(arc_dir, "traceability")
        os.makedirs(traceability_dir, exist_ok=True)
        self.workspace = workspace
        self.paths = SimpleNamespace(
            workspace=workspace,
            project_dir=project_dir,
            arc_dir=arc_dir,
            traceability_dir=traceability_dir,
        )
        self.events = _Events(self)
        self.traceability = _Traceability(self)
        self.git = _Git(self)

    def _append_event(self, event_type: str, fields: dict[str, object]) -> None:
        path = os.path.join(self.paths.arc_dir, "runner-events.jsonl")
        line = {"timestamp": _now(), "type": event_type, **fields}
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(line, ensure_ascii=False) + "\n")
