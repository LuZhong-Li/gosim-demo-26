"""工作流步骤执行器。

步骤最小子集：shell / python / http（docs/plans/01-项目定位与执行策略.md 1.2）。
注意：shell/python 步骤会执行任意命令，仅用于本地原型演示。
"""

import subprocess
import sys
import urllib.request
from typing import Any

_STEP_TIMEOUT = 30
_HTTP_TIMEOUT = 10
_OUTPUT_LIMIT = 200


class WorkflowRunner:
    """按顺序执行工作流步骤；任一失败即中断。"""

    def run(self, workflow: Any) -> dict[str, Any]:
        results: list[dict[str, Any]] = []
        for index, step in enumerate(workflow.steps, start=1):
            result = self._run_step(step)
            result["index"] = index
            results.append(result)
            if not result["ok"]:
                break
        return {
            "ok": all(result["ok"] for result in results),
            "steps": results,
            "error": next(
                (result.get("error") for result in results if not result["ok"]),
                None,
            ),
        }

    def _run_step(self, step: dict[str, Any]) -> dict[str, Any]:
        step_type = step.get("type")
        try:
            if step_type == "shell":
                return self._run_shell(str(step.get("command", "")))
            if step_type == "python":
                return self._run_python(str(step.get("code", "")))
            if step_type == "http":
                return self._run_http(step)
            return self._fail(f"未知步骤类型: {step_type}")
        except subprocess.TimeoutExpired as exc:
            return self._fail(f"步骤超时: {exc}")
        except Exception as exc:  # 原型阶段兜底，避免运行记录丢失
            return self._fail(f"步骤执行失败: {exc}")

    def _run_shell(self, command: str) -> dict[str, Any]:
        proc = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=_STEP_TIMEOUT,
        )
        output = self._truncate((proc.stdout or "") + (proc.stderr or ""))
        ok = proc.returncode == 0
        return {
            "ok": ok,
            "output": output,
            "error": None if ok else (output or f"exit {proc.returncode}"),
        }

    def _run_python(self, code: str) -> dict[str, Any]:
        proc = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True,
            text=True,
            timeout=_STEP_TIMEOUT,
        )
        output = self._truncate((proc.stdout or "") + (proc.stderr or ""))
        ok = proc.returncode == 0
        return {
            "ok": ok,
            "output": output,
            "error": None if ok else (output or f"exit {proc.returncode}"),
        }

    def _run_http(self, step: dict[str, Any]) -> dict[str, Any]:
        url = str(step.get("url", ""))
        method = str(step.get("method", "GET")).upper()
        request = urllib.request.Request(url, method=method)
        with urllib.request.urlopen(request, timeout=_HTTP_TIMEOUT) as response:
            status = response.status
        ok = 200 <= status < 300
        return {
            "ok": ok,
            "output": f"HTTP {status}",
            "error": None if ok else f"HTTP {status}",
        }

    @staticmethod
    def _fail(message: str) -> dict[str, Any]:
        return {"ok": False, "output": "", "error": message}

    @staticmethod
    def _truncate(text: str) -> str:
        text = text.strip()
        return text if len(text) <= _OUTPUT_LIMIT else text[:_OUTPUT_LIMIT] + "..."
