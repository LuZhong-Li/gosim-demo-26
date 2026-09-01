"""工作流触发器：手动/数据变更触发。

每次运行写入一条 workflow_runs 记录，并联动审计与 trace（workflow_run 类型）。
参见 docs/plans/04-里程碑任务.md Phase3。
"""

from datetime import datetime, timezone
from typing import Any

from constants import ERR_STORAGE_ROW
from errors import GXError
from gx.domain.enums import RunStatus, Source, TriggerType
from gx.domain.models import Workflow, WorkflowRun
from gx.domain.repositories import WorkflowRepo, WorkflowRunRepo
from gx.services.actions.runner import WorkflowRunner
from gx.services.audit.interceptor import AuditInterceptor


class WorkflowTrigger:
    """按工作流定义执行并生成运行记录。"""

    def __init__(
        self,
        workflow_repo: WorkflowRepo,
        workflow_run_repo: WorkflowRunRepo,
        runner: WorkflowRunner,
        interceptor: AuditInterceptor,
    ) -> None:
        self._workflows = workflow_repo
        self._runs = workflow_run_repo
        self._runner = runner
        self._interceptor = interceptor

    def run_by_name(
        self, name: str, actor: Any, trigger: TriggerType = TriggerType.MANUAL
    ) -> WorkflowRun:
        workflow = self._find_by_name(name)
        return self._execute(workflow, actor, trigger)

    def run(
        self, workflow_id: int, actor: Any, trigger: TriggerType = TriggerType.MANUAL
    ) -> WorkflowRun:
        workflow = self._workflows.get(workflow_id)
        return self._execute(workflow, actor, trigger)

    def _execute(
        self, workflow: Workflow, actor: Any, trigger: TriggerType
    ) -> WorkflowRun:
        now = datetime.now(timezone.utc)
        run = self._runs.create(
            WorkflowRun(
                id=self._next_run_id(),
                workflow_id=workflow.id,
                status=RunStatus.RUNNING,
                trigger=trigger,
                started_at=now,
            )
        )
        result = self._runner.run(workflow)
        status = RunStatus.SUCCESS if result["ok"] else RunStatus.FAILED
        updated = self._runs.update(
            run.id,
            {
                "status": status.value,
                "finished_at": datetime.now(timezone.utc),
                "detail": self._format_detail(result),
            },
        )
        self._interceptor.record(
            actor_id=actor,
            action_type="workflow.run",
            resource_type="workflow",
            resource_id=str(workflow.id),
            after_snapshot={
                "run_id": run.id,
                "workflow": workflow.name,
                "status": status.value,
            },
            source=Source.API,
            success=result["ok"],
            error_msg=result["error"] or "",
            trace_type="workflow_run",
        )
        return updated

    def _find_by_name(self, name: str) -> Workflow:
        for workflow in self._workflows.list():
            if workflow.name == name:
                return workflow
        raise GXError(
            ERR_STORAGE_ROW,
            f"工作流不存在: {name}",
            module="actions",
            context={"name": name},
        )

    def _next_run_id(self) -> int:
        existing = [run.id for run in self._runs.list()]
        return max(existing, default=0) + 1

    @staticmethod
    def _format_detail(result: dict[str, Any]) -> str:
        parts = [f"steps={len(result['steps'])}", "ok" if result["ok"] else "failed"]
        for step in result["steps"]:
            output = step.get("output") or step.get("error") or ""
            parts.append(f"step{step['index']}:{step.get('type')}:{output[:60]}")
        return "; ".join(parts)[:500]
